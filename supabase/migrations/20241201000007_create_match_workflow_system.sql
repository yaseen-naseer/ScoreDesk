-- Create match workflow logs table
CREATE TABLE IF NOT EXISTS public.match_workflow_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    from_status VARCHAR(20) NOT NULL CHECK (from_status IN ('scheduled', 'live', 'paused', 'half_time', 'second_half', 'completed', 'cancelled', 'postponed')),
    to_status VARCHAR(20) NOT NULL CHECK (to_status IN ('scheduled', 'live', 'paused', 'half_time', 'second_half', 'completed', 'cancelled', 'postponed')),
    from_phase VARCHAR(20) NOT NULL CHECK (from_phase IN ('pre_match', 'first_half', 'half_time', 'second_half', 'post_match', 'extra_time', 'penalties')),
    to_phase VARCHAR(20) NOT NULL CHECK (to_phase IN ('pre_match', 'first_half', 'half_time', 'second_half', 'post_match', 'extra_time', 'penalties')),
    action VARCHAR(30) NOT NULL CHECK (action IN ('start_match', 'pause_match', 'resume_match', 'end_half', 'start_second_half', 'end_match', 'cancel_match', 'postpone_match')),
    performed_by UUID NOT NULL REFERENCES auth.users(id),
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    automatic BOOLEAN NOT NULL DEFAULT FALSE,
    match_time_elapsed INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create match timer state table
CREATE TABLE IF NOT EXISTS public.match_timer_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE UNIQUE,
    is_running BOOLEAN NOT NULL DEFAULT FALSE,
    current_half INTEGER NOT NULL DEFAULT 1 CHECK (current_half >= 1 AND current_half <= 2),
    elapsed_minutes INTEGER NOT NULL DEFAULT 0 CHECK (elapsed_minutes >= 0 AND elapsed_minutes <= 120),
    total_minutes INTEGER NOT NULL DEFAULT 90 CHECK (total_minutes >= 45 AND total_minutes <= 120),
    added_time INTEGER NOT NULL DEFAULT 0 CHECK (added_time >= 0 AND added_time <= 10),
    start_time TIMESTAMPTZ,
    pause_time TIMESTAMPTZ,
    total_pause_duration INTEGER NOT NULL DEFAULT 0 CHECK (total_pause_duration >= 0),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_match_workflow_logs_match_id ON public.match_workflow_logs(match_id);
CREATE INDEX IF NOT EXISTS idx_match_workflow_logs_performed_at ON public.match_workflow_logs(performed_at);
CREATE INDEX IF NOT EXISTS idx_match_workflow_logs_action ON public.match_workflow_logs(action);

CREATE INDEX IF NOT EXISTS idx_match_timer_states_match_id ON public.match_timer_states(match_id);
CREATE INDEX IF NOT EXISTS idx_match_timer_states_is_running ON public.match_timer_states(is_running);

-- Enable RLS
ALTER TABLE public.match_workflow_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_timer_states ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for match workflow logs
CREATE POLICY "Users can view workflow logs for their organization matches" ON public.match_workflow_logs
    FOR SELECT USING (
        match_id IN (
            SELECT m.id FROM public.matches m
            JOIN public.tournaments t ON m.tournament_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
        )
    );

CREATE POLICY "Users can create workflow logs for their organization matches" ON public.match_workflow_logs
    FOR INSERT WITH CHECK (
        match_id IN (
            SELECT m.id FROM public.matches m
            JOIN public.tournaments t ON m.tournament_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
            AND om.role IN ('owner', 'admin', 'manager', 'referee')
        )
    );

-- Create RLS policies for match timer states
CREATE POLICY "Users can view timer states for their organization matches" ON public.match_timer_states
    FOR SELECT USING (
        match_id IN (
            SELECT m.id FROM public.matches m
            JOIN public.tournaments t ON m.tournament_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
        )
    );

CREATE POLICY "Users can update timer states for their organization matches" ON public.match_timer_states
    FOR INSERT WITH CHECK (
        match_id IN (
            SELECT m.id FROM public.matches m
            JOIN public.tournaments t ON m.tournament_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
            AND om.role IN ('owner', 'admin', 'manager', 'referee', 'stats_operator')
        )
    );

CREATE POLICY "Users can update timer states for their organization matches" ON public.match_timer_states
    FOR UPDATE USING (
        match_id IN (
            SELECT m.id FROM public.matches m
            JOIN public.tournaments t ON m.tournament_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
            AND om.role IN ('owner', 'admin', 'manager', 'referee', 'stats_operator')
        )
    );

-- Create function to automatically process match transitions
CREATE OR REPLACE FUNCTION public.process_match_auto_transitions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    match_record RECORD;
    match_time INTEGER;
    timer_state RECORD;
BEGIN
    -- Process live matches that might need automatic transitions
    FOR match_record IN 
        SELECT m.id, m.status, m.actual_start_time, m.match_duration
        FROM public.matches m
        WHERE m.status IN ('live', 'half_time')
        AND m.actual_start_time IS NOT NULL
    LOOP
        -- Calculate match time
        SELECT 
            CASE 
                WHEN mts.is_running THEN 
                    EXTRACT(EPOCH FROM (NOW() - mts.start_time)) / 60 - mts.total_pause_duration
                ELSE 
                    mts.elapsed_minutes
            END as calculated_time
        INTO match_time
        FROM public.match_timer_states mts
        WHERE mts.match_id = match_record.id;

        -- If no timer state exists, calculate based on actual_start_time
        IF match_time IS NULL THEN
            SELECT EXTRACT(EPOCH FROM (NOW() - match_record.actual_start_time)) / 60
            INTO match_time;
        END IF;

        -- Auto-transition to half_time if 45+ minutes in first half
        IF match_record.status = 'live' AND match_time >= 45 AND match_time < 90 THEN
            -- Check if we have a timer state to determine current half
            SELECT current_half INTO timer_state FROM public.match_timer_states WHERE match_id = match_record.id;
            
            IF timer_state IS NULL OR timer_state.current_half = 1 THEN
                UPDATE public.matches 
                SET status = 'half_time', updated_at = NOW()
                WHERE id = match_record.id;

                -- Log the automatic transition
                INSERT INTO public.match_workflow_logs (
                    match_id, from_status, to_status, from_phase, to_phase, action, 
                    performed_by, automatic, notes, match_time_elapsed
                ) VALUES (
                    match_record.id, 'live', 'half_time', 'first_half', 'half_time', 'end_half',
                    '00000000-0000-0000-0000-000000000000'::UUID, true, 
                    'Automatic transition: first half ended', FLOOR(match_time)
                );

                -- Update timer state
                UPDATE public.match_timer_states 
                SET is_running = false, current_half = 1, elapsed_minutes = 45, last_updated = NOW()
                WHERE match_id = match_record.id;
            END IF;
        END IF;

        -- Auto-transition to completed if 90+ minutes in second half
        IF match_record.status = 'live' AND match_time >= 90 THEN
            UPDATE public.matches 
            SET 
                status = 'completed', 
                actual_end_time = NOW(),
                updated_at = NOW()
            WHERE id = match_record.id;

            -- Log the automatic transition
            INSERT INTO public.match_workflow_logs (
                match_id, from_status, to_status, from_phase, to_phase, action, 
                performed_by, automatic, notes, match_time_elapsed
            ) VALUES (
                match_record.id, 'live', 'completed', 'second_half', 'post_match', 'end_match',
                '00000000-0000-0000-0000-000000000000'::UUID, true, 
                'Automatic transition: full time reached', FLOOR(match_time)
            );

            -- Finalize timer state
            UPDATE public.match_timer_states 
            SET 
                is_running = false, 
                current_half = 2, 
                elapsed_minutes = 90, 
                last_updated = NOW()
            WHERE match_id = match_record.id;
        END IF;
    END LOOP;
END;
$$;

-- Create function to initialize match timer
CREATE OR REPLACE FUNCTION public.initialize_match_timer(p_match_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.match_timer_states (
        match_id, is_running, current_half, elapsed_minutes, total_minutes, 
        added_time, start_time, total_pause_duration
    ) VALUES (
        p_match_id, true, 1, 0, 90, 0, NOW(), 0
    ) ON CONFLICT (match_id) DO UPDATE SET
        is_running = true,
        current_half = 1,
        elapsed_minutes = 0,
        start_time = NOW(),
        last_updated = NOW();
END;
$$;

-- Create function to update match timer
CREATE OR REPLACE FUNCTION public.update_match_timer(
    p_match_id UUID,
    p_is_running BOOLEAN,
    p_current_half INTEGER DEFAULT NULL,
    p_elapsed_minutes INTEGER DEFAULT NULL,
    p_added_time INTEGER DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_state RECORD;
BEGIN
    -- Get current timer state
    SELECT * INTO current_state FROM public.match_timer_states WHERE match_id = p_match_id;
    
    IF NOT FOUND THEN
        -- Initialize timer if it doesn't exist
        PERFORM public.initialize_match_timer(p_match_id);
        current_state.is_running := true;
        current_state.current_half := 1;
        current_state.elapsed_minutes := 0;
        current_state.added_time := 0;
    END IF;

    -- Update timer state
    UPDATE public.match_timer_states 
    SET 
        is_running = COALESCE(p_is_running, current_state.is_running),
        current_half = COALESCE(p_current_half, current_state.current_half),
        elapsed_minutes = COALESCE(p_elapsed_minutes, current_state.elapsed_minutes),
        added_time = COALESCE(p_added_time, current_state.added_time),
        pause_time = CASE 
            WHEN p_is_running = false AND current_state.is_running = true THEN NOW()
            WHEN p_is_running = true AND current_state.is_running = false THEN NULL
            ELSE pause_time
        END,
        total_pause_duration = CASE 
            WHEN p_is_running = true AND current_state.is_running = false AND pause_time IS NOT NULL THEN
                total_pause_duration + EXTRACT(EPOCH FROM (NOW() - pause_time)) / 60
            ELSE total_pause_duration
        END,
        last_updated = NOW()
    WHERE match_id = p_match_id;
END;
$$;

-- Create function to get match timer state
CREATE OR REPLACE FUNCTION public.get_match_timer_state(p_match_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    timer_record RECORD;
    result JSON;
BEGIN
    SELECT * INTO timer_record 
    FROM public.match_timer_states 
    WHERE match_id = p_match_id;

    IF NOT FOUND THEN
        result := json_build_object(
            'is_running', false,
            'current_half', 1,
            'elapsed_minutes', 0,
            'total_minutes', 90,
            'added_time', 0
        );
    ELSE
        result := json_build_object(
            'is_running', timer_record.is_running,
            'current_half', timer_record.current_half,
            'elapsed_minutes', timer_record.elapsed_minutes,
            'total_minutes', timer_record.total_minutes,
            'added_time', timer_record.added_time,
            'start_time', timer_record.start_time,
            'pause_time', timer_record.pause_time,
            'total_pause_duration', timer_record.total_pause_duration
        );
    END IF;

    RETURN result;
END;
$$;

-- Create trigger to automatically initialize match timer when match starts
CREATE OR REPLACE FUNCTION public.auto_initialize_match_timer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Initialize timer when match status changes to 'live'
    IF NEW.status = 'live' AND (OLD.status IS NULL OR OLD.status != 'live') THEN
        PERFORM public.initialize_match_timer(NEW.id);
    END IF;

    -- Log status changes
    IF OLD.status IS NOT NULL AND OLD.status != NEW.status THEN
        INSERT INTO public.match_workflow_logs (
            match_id, from_status, to_status, from_phase, to_phase, action, 
            performed_by, automatic, notes
        ) VALUES (
            NEW.id, OLD.status, NEW.status, 'pre_match', 'pre_match', 'status_change',
            '00000000-0000-0000-0000-000000000000'::UUID, true, 
            'Status changed from ' || OLD.status || ' to ' || NEW.status
        );
    END IF;

    RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_auto_initialize_match_timer ON public.matches;
CREATE TRIGGER trigger_auto_initialize_match_timer
    AFTER UPDATE ON public.matches
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_initialize_match_timer();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.process_match_auto_transitions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_match_timer(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_match_timer(UUID, BOOLEAN, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_match_timer_state(UUID) TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.process_match_auto_transitions() IS 'Processes automatic match status transitions. Should be called periodically by a scheduler.';
COMMENT ON FUNCTION public.initialize_match_timer(UUID) IS 'Initializes match timer state for a match.';
COMMENT ON FUNCTION public.update_match_timer(UUID, BOOLEAN, INTEGER, INTEGER, INTEGER) IS 'Updates match timer state with new values.';
COMMENT ON FUNCTION public.get_match_timer_state(UUID) IS 'Returns current match timer state as JSON.';
