-- Create tournament workflow logs table
CREATE TABLE IF NOT EXISTS public.tournament_workflow_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    from_status VARCHAR(20) NOT NULL CHECK (from_status IN ('draft', 'registration', 'active', 'completed', 'cancelled')),
    to_status VARCHAR(20) NOT NULL CHECK (to_status IN ('draft', 'registration', 'active', 'completed', 'cancelled')),
    action VARCHAR(50) NOT NULL CHECK (action IN ('start_registration', 'close_registration', 'start_tournament', 'complete_tournament', 'cancel_tournament')),
    performed_by UUID NOT NULL REFERENCES auth.users(id),
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    automatic BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_tournament_workflow_logs_tournament_id ON public.tournament_workflow_logs(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_workflow_logs_performed_at ON public.tournament_workflow_logs(performed_at);

-- Enable RLS
ALTER TABLE public.tournament_workflow_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view workflow logs for their organization tournaments" ON public.tournament_workflow_logs
    FOR SELECT USING (
        tournament_id IN (
            SELECT t.id FROM public.tournaments t
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
        )
    );

CREATE POLICY "Users can create workflow logs for their organization tournaments" ON public.tournament_workflow_logs
    FOR INSERT WITH CHECK (
        tournament_id IN (
            SELECT t.id FROM public.tournaments t
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
            AND om.role IN ('owner', 'admin', 'manager')
        )
    );

-- Create function to automatically transition tournaments
CREATE OR REPLACE FUNCTION public.process_tournament_auto_transitions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    tournament_record RECORD;
    current_status VARCHAR(20);
    new_status VARCHAR(20);
    team_count INTEGER;
    match_count INTEGER;
    completed_matches INTEGER;
    total_matches INTEGER;
BEGIN
    -- Process tournaments in registration status
    FOR tournament_record IN 
        SELECT t.id, t.tournament_status, t.registration_deadline, t.start_date
        FROM public.tournaments t
        WHERE t.tournament_status = 'registration' 
        AND t.is_active = true
        AND (t.registration_deadline IS NULL OR NOW() > t.registration_deadline)
    LOOP
        -- Check if tournament has minimum teams and schedule
        SELECT COUNT(*) INTO team_count
        FROM public.tournament_teams tt
        WHERE tt.tournament_id = tournament_record.id 
        AND tt.registration_status = 'approved';

        SELECT COUNT(*) INTO match_count
        FROM public.matches m
        WHERE m.tournament_id = tournament_record.id;

        -- Auto-transition to active if requirements are met
        IF team_count >= 2 AND match_count > 0 THEN
            UPDATE public.tournaments 
            SET tournament_status = 'active', updated_at = NOW()
            WHERE id = tournament_record.id;

            -- Log the automatic transition
            INSERT INTO public.tournament_workflow_logs (
                tournament_id, from_status, to_status, action, 
                performed_by, automatic, notes
            ) VALUES (
                tournament_record.id, 'registration', 'active', 'close_registration',
                '00000000-0000-0000-0000-000000000000'::UUID, true, 'Automatic transition: registration deadline passed and requirements met'
            );
        END IF;
    END LOOP;

    -- Process tournaments in active status
    FOR tournament_record IN 
        SELECT t.id, t.tournament_status
        FROM public.tournaments t
        WHERE t.tournament_status = 'active' 
        AND t.is_active = true
    LOOP
        -- Check if all matches are completed
        SELECT COUNT(*) INTO total_matches
        FROM public.matches m
        WHERE m.tournament_id = tournament_record.id;

        SELECT COUNT(*) INTO completed_matches
        FROM public.matches m
        WHERE m.tournament_id = tournament_record.id 
        AND m.status = 'completed';

        -- Auto-transition to completed if all matches are done
        IF total_matches > 0 AND completed_matches = total_matches THEN
            UPDATE public.tournaments 
            SET tournament_status = 'completed', updated_at = NOW()
            WHERE id = tournament_record.id;

            -- Log the automatic transition
            INSERT INTO public.tournament_workflow_logs (
                tournament_id, from_status, to_status, action, 
                performed_by, automatic, notes
            ) VALUES (
                tournament_record.id, 'active', 'completed', 'complete_tournament',
                '00000000-0000-0000-0000-000000000000'::UUID, true, 'Automatic transition: all matches completed'
            );
        END IF;
    END LOOP;
END;
$$;

-- Create a trigger to automatically update tournament status based on match completion
CREATE OR REPLACE FUNCTION public.update_tournament_status_on_match_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    tournament_id UUID;
    total_matches INTEGER;
    completed_matches INTEGER;
BEGIN
    -- Only process when match status changes to completed
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        tournament_id := NEW.tournament_id;
        
        -- Count total and completed matches for this tournament
        SELECT COUNT(*) INTO total_matches
        FROM public.matches m
        WHERE m.tournament_id = tournament_id;

        SELECT COUNT(*) INTO completed_matches
        FROM public.matches m
        WHERE m.tournament_id = tournament_id 
        AND m.status = 'completed';

        -- If all matches are completed and tournament is active, mark as completed
        IF total_matches > 0 AND completed_matches = total_matches THEN
            UPDATE public.tournaments 
            SET tournament_status = 'completed', updated_at = NOW()
            WHERE id = tournament_id AND tournament_status = 'active';

            -- Log the automatic transition
            INSERT INTO public.tournament_workflow_logs (
                tournament_id, from_status, to_status, action, 
                performed_by, automatic, notes
            ) VALUES (
                tournament_id, 'active', 'completed', 'complete_tournament',
                '00000000-0000-0000-0000-000000000000'::UUID, true, 'Automatic transition: final match completed'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_tournament_status_on_match_completion ON public.matches;
CREATE TRIGGER trigger_update_tournament_status_on_match_completion
    AFTER UPDATE ON public.matches
    FOR EACH ROW
    EXECUTE FUNCTION public.update_tournament_status_on_match_completion();

-- Create a function to check tournament workflow requirements
CREATE OR REPLACE FUNCTION public.check_tournament_workflow_requirements(
    p_tournament_id UUID,
    p_requirement VARCHAR(50)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    tournament_record RECORD;
    team_count INTEGER;
    match_count INTEGER;
    result BOOLEAN := FALSE;
BEGIN
    -- Get tournament details
    SELECT * INTO tournament_record
    FROM public.tournaments
    WHERE id = p_tournament_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Check specific requirement
    CASE p_requirement
        WHEN 'has_name' THEN
            result := tournament_record.name IS NOT NULL AND LENGTH(tournament_record.name) >= 2;
            
        WHEN 'has_dates' THEN
            result := tournament_record.start_date IS NOT NULL AND tournament_record.end_date IS NOT NULL;
            
        WHEN 'has_format' THEN
            result := tournament_record.format IS NOT NULL;
            
        WHEN 'has_max_teams' THEN
            result := tournament_record.max_teams IS NOT NULL AND tournament_record.max_teams >= 2;
            
        WHEN 'has_minimum_teams' THEN
            SELECT COUNT(*) INTO team_count
            FROM public.tournament_teams tt
            WHERE tt.tournament_id = p_tournament_id 
            AND tt.registration_status = 'approved';
            result := team_count >= 2;
            
        WHEN 'registration_deadline_passed' THEN
            result := tournament_record.registration_deadline IS NOT NULL AND NOW() > tournament_record.registration_deadline;
            
        WHEN 'has_schedule' THEN
            SELECT COUNT(*) INTO match_count
            FROM public.matches m
            WHERE m.tournament_id = p_tournament_id;
            result := match_count > 0;
            
        WHEN 'all_matches_completed' THEN
            SELECT 
                COUNT(*) FILTER (WHERE status = 'completed') as completed,
                COUNT(*) as total
            INTO completed_matches, total_matches
            FROM public.matches
            WHERE tournament_id = p_tournament_id;
            result := completed_matches = total_matches AND total_matches > 0;
            
        WHEN 'standings_finalized' THEN
            -- For now, always return true as standings are automatically calculated
            result := TRUE;
            
        ELSE
            result := FALSE;
    END CASE;

    RETURN result;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.process_tournament_auto_transitions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_tournament_workflow_requirements(UUID, VARCHAR) TO authenticated;

-- Create a scheduled job to run automatic transitions (this would typically be set up in your cron/scheduler)
-- For now, we'll create a function that can be called manually or by external schedulers
COMMENT ON FUNCTION public.process_tournament_auto_transitions() IS 'Processes automatic tournament status transitions. Should be called periodically by a scheduler.';
