-- Create match official assignments table
CREATE TABLE IF NOT EXISTS public.match_official_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    referee_id UUID NOT NULL REFERENCES public.referees(id) ON DELETE CASCADE,
    official_role VARCHAR(20) NOT NULL CHECK (official_role IN ('referee', 'assistant_referee_1', 'assistant_referee_2', 'fourth_official', 'var_official')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'assigned', 'confirmed', 'declined', 'replaced')) DEFAULT 'pending',
    priority VARCHAR(10) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    assigned_by UUID NOT NULL REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,
    replacement_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(match_id, official_role)
);

-- Create match official assignment logs table for audit trail
CREATE TABLE IF NOT EXISTS public.match_official_assignment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.match_official_assignments(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('assigned', 'confirmed', 'declined', 'replaced', 'updated', 'cancelled')),
    performed_by UUID NOT NULL REFERENCES auth.users(id),
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    previous_status VARCHAR(20),
    new_status VARCHAR(20)
);

-- Create official availability table
CREATE TABLE IF NOT EXISTS public.official_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referee_id UUID NOT NULL REFERENCES public.referees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    unavailable_reason TEXT,
    available_from TIME,
    available_until TIME,
    max_matches INTEGER DEFAULT 1,
    travel_radius_km INTEGER DEFAULT 50,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(referee_id, date)
);

-- Create official performance tracking table
CREATE TABLE IF NOT EXISTS public.official_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.match_official_assignments(id) ON DELETE CASCADE,
    referee_id UUID NOT NULL REFERENCES public.referees(id) ON DELETE CASCADE,
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    official_role VARCHAR(20) NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    performance_notes TEXT,
    evaluated_by UUID REFERENCES auth.users(id),
    evaluated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_match_official_assignments_match_id ON public.match_official_assignments(match_id);
CREATE INDEX IF NOT EXISTS idx_match_official_assignments_referee_id ON public.match_official_assignments(referee_id);
CREATE INDEX IF NOT EXISTS idx_match_official_assignments_status ON public.match_official_assignments(status);
CREATE INDEX IF NOT EXISTS idx_match_official_assignments_assigned_at ON public.match_official_assignments(assigned_at);
CREATE INDEX IF NOT EXISTS idx_match_official_assignments_official_role ON public.match_official_assignments(official_role);

CREATE INDEX IF NOT EXISTS idx_match_official_assignment_logs_assignment_id ON public.match_official_assignment_logs(assignment_id);
CREATE INDEX IF NOT EXISTS idx_match_official_assignment_logs_performed_at ON public.match_official_assignment_logs(performed_at);
CREATE INDEX IF NOT EXISTS idx_match_official_assignment_logs_action ON public.match_official_assignment_logs(action);

CREATE INDEX IF NOT EXISTS idx_official_availability_referee_id ON public.official_availability(referee_id);
CREATE INDEX IF NOT EXISTS idx_official_availability_date ON public.official_availability(date);
CREATE INDEX IF NOT EXISTS idx_official_availability_is_available ON public.official_availability(is_available);

CREATE INDEX IF NOT EXISTS idx_official_performance_referee_id ON public.official_performance(referee_id);
CREATE INDEX IF NOT EXISTS idx_official_performance_match_id ON public.official_performance(match_id);
CREATE INDEX IF NOT EXISTS idx_official_performance_rating ON public.official_performance(rating);

-- Enable RLS
ALTER TABLE public.match_official_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_official_assignment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.official_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.official_performance ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for match official assignments
CREATE POLICY "Users can view official assignments for their organization matches" ON public.match_official_assignments
    FOR SELECT USING (
        match_id IN (
            SELECT m.id FROM public.matches m
            JOIN public.tournaments t ON m.tournament_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
        )
        OR referee_id IN (
            SELECT r.id FROM public.referees r
            JOIN public.organization_memberships om ON r.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
        )
    );

CREATE POLICY "Users can create official assignments for their organization matches" ON public.match_official_assignments
    FOR INSERT WITH CHECK (
        match_id IN (
            SELECT m.id FROM public.matches m
            JOIN public.tournaments t ON m.tournament_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
            AND om.role IN ('owner', 'admin', 'manager', 'referee_coordinator')
        )
        AND assigned_by = auth.uid()
    );

CREATE POLICY "Users can update official assignments for their organization matches" ON public.match_official_assignments
    FOR UPDATE USING (
        match_id IN (
            SELECT m.id FROM public.matches m
            JOIN public.tournaments t ON m.tournament_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
            AND om.role IN ('owner', 'admin', 'manager', 'referee_coordinator')
        )
        OR referee_id IN (
            SELECT r.id FROM public.referees r
            JOIN public.organization_memberships om ON r.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
        )
    );

-- Create RLS policies for assignment logs
CREATE POLICY "Users can view assignment logs for their organization matches" ON public.match_official_assignment_logs
    FOR SELECT USING (
        assignment_id IN (
            SELECT moa.id FROM public.match_official_assignments moa
            JOIN public.matches m ON moa.match_id = m.id
            JOIN public.tournaments t ON m.tournament_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
        )
    );

CREATE POLICY "Users can create assignment logs for their organization matches" ON public.match_official_assignment_logs
    FOR INSERT WITH CHECK (
        assignment_id IN (
            SELECT moa.id FROM public.match_official_assignments moa
            JOIN public.matches m ON moa.match_id = m.id
            JOIN public.tournaments t ON m.tournament_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
        )
        AND performed_by = auth.uid()
    );

-- Create RLS policies for official availability
CREATE POLICY "Users can view availability for their organization officials" ON public.official_availability
    FOR SELECT USING (
        referee_id IN (
            SELECT r.id FROM public.referees r
            JOIN public.organization_memberships om ON r.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
        )
    );

CREATE POLICY "Users can manage availability for their organization officials" ON public.official_availability
    FOR ALL USING (
        referee_id IN (
            SELECT r.id FROM public.referees r
            JOIN public.organization_memberships om ON r.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
        )
    );

-- Create RLS policies for official performance
CREATE POLICY "Users can view performance for their organization officials" ON public.official_performance
    FOR SELECT USING (
        referee_id IN (
            SELECT r.id FROM public.referees r
            JOIN public.organization_memberships om ON r.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
        )
        OR match_id IN (
            SELECT m.id FROM public.matches m
            JOIN public.tournaments t ON m.tournament_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
        )
    );

CREATE POLICY "Users can manage performance for their organization officials" ON public.official_performance
    FOR ALL USING (
        referee_id IN (
            SELECT r.id FROM public.referees r
            JOIN public.organization_memberships om ON r.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
            AND om.role IN ('owner', 'admin', 'manager', 'referee_coordinator')
        )
    );

-- Create function to automatically check for assignment conflicts
CREATE OR REPLACE FUNCTION public.check_assignment_conflicts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    assignment_record RECORD;
    conflict_count INTEGER;
BEGIN
    -- Check for double bookings (same referee, same date, different matches)
    FOR assignment_record IN 
        SELECT moa1.id, moa1.referee_id, moa1.match_id, m1.scheduled_date
        FROM public.match_official_assignments moa1
        JOIN public.matches m1 ON moa1.match_id = m1.id
        WHERE moa1.status IN ('assigned', 'confirmed')
    LOOP
        SELECT COUNT(*)
        INTO conflict_count
        FROM public.match_official_assignments moa2
        JOIN public.matches m2 ON moa2.match_id = m2.id
        WHERE moa2.referee_id = assignment_record.referee_id
        AND moa2.id != assignment_record.id
        AND moa2.status IN ('assigned', 'confirmed')
        AND DATE(m2.scheduled_date) = DATE(assignment_record.scheduled_date)
        AND (
            ABS(EXTRACT(EPOCH FROM (m2.scheduled_date - assignment_record.scheduled_date))) < 7200 -- Within 2 hours
        );

        IF conflict_count > 0 THEN
            -- Log the conflict
            INSERT INTO public.match_official_assignment_logs (
                assignment_id, action, performed_by, notes, performed_at
            ) VALUES (
                assignment_record.id, 'updated', '00000000-0000-0000-0000-000000000000'::UUID,
                'Conflict detected: Double booking on ' || assignment_record.scheduled_date,
                NOW()
            );
        END IF;
    END LOOP;
END;
$$;

-- Create function to get official workload statistics
CREATE OR REPLACE FUNCTION public.get_official_workload_stats(p_referee_id UUID, p_week_start DATE)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
    week_end DATE;
    month_start DATE;
    month_end DATE;
    matches_this_week INTEGER;
    matches_this_month INTEGER;
    max_weekly INTEGER;
    max_monthly INTEGER;
BEGIN
    week_end := p_week_start + INTERVAL '7 days';
    month_start := DATE_TRUNC('month', p_week_start);
    month_end := month_start + INTERVAL '1 month';

    -- Get referee limits
    SELECT max_matches_per_week, max_matches_per_month
    INTO max_weekly, max_monthly
    FROM public.referees
    WHERE id = p_referee_id;

    -- Count matches this week
    SELECT COUNT(*)
    INTO matches_this_week
    FROM public.match_official_assignments moa
    JOIN public.matches m ON moa.match_id = m.id
    WHERE moa.referee_id = p_referee_id
    AND moa.status IN ('assigned', 'confirmed')
    AND DATE(m.scheduled_date) >= p_week_start
    AND DATE(m.scheduled_date) < week_end;

    -- Count matches this month
    SELECT COUNT(*)
    INTO matches_this_month
    FROM public.match_official_assignments moa
    JOIN public.matches m ON moa.match_id = m.id
    WHERE moa.referee_id = p_referee_id
    AND moa.status IN ('assigned', 'confirmed')
    AND DATE(m.scheduled_date) >= month_start
    AND DATE(m.scheduled_date) < month_end;

    result := json_build_object(
        'matches_this_week', matches_this_week,
        'matches_this_month', matches_this_month,
        'max_matches_per_week', COALESCE(max_weekly, 5),
        'max_matches_per_month', COALESCE(max_monthly, 20),
        'weekly_utilization', ROUND((matches_this_week::DECIMAL / COALESCE(max_weekly, 5)) * 100, 2),
        'monthly_utilization', ROUND((matches_this_month::DECIMAL / COALESCE(max_monthly, 20)) * 100, 2)
    );

    RETURN result;
END;
$$;

-- Create function to get available officials for a match
CREATE OR REPLACE FUNCTION public.get_available_officials_for_match(
    p_match_id UUID,
    p_official_role VARCHAR(20)
)
RETURNS TABLE (
    referee_id UUID,
    referee_name TEXT,
    is_available BOOLEAN,
    availability_reason TEXT,
    workload_stats JSON,
    specialization_match BOOLEAN,
    distance_km INTEGER,
    travel_time_minutes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    match_date TIMESTAMPTZ;
    match_venue_id UUID;
    required_specialization VARCHAR(20);
BEGIN
    -- Get match details
    SELECT m.scheduled_date, m.venue_id
    INTO match_date, match_venue_id
    FROM public.matches m
    WHERE m.id = p_match_id;

    -- Determine required specialization
    required_specialization := CASE p_official_role
        WHEN 'referee' THEN 'referee'
        WHEN 'assistant_referee_1' OR 'assistant_referee_2' THEN 'assistant_referee'
        WHEN 'fourth_official' THEN 'fourth_official'
        WHEN 'var_official' THEN 'var_official'
        ELSE 'referee'
    END;

    -- Return available officials
    RETURN QUERY
    SELECT 
        r.id,
        r.name,
        COALESCE(oa.is_available, true) as is_available,
        oa.unavailable_reason as availability_reason,
        public.get_official_workload_stats(r.id, DATE(match_date)) as workload_stats,
        (r.specialization = required_specialization) as specialization_match,
        COALESCE(oa.travel_radius_km, 0) as distance_km,
        0 as travel_time_minutes -- Would be calculated based on venue location
    FROM public.referees r
    LEFT JOIN public.official_availability oa ON r.id = oa.referee_id 
        AND DATE(match_date) = oa.date
    WHERE r.specialization = required_specialization
    AND r.is_active = true
    AND (oa.is_available IS NULL OR oa.is_available = true)
    ORDER BY r.name;
END;
$$;

-- Create trigger to update assignment updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_assignment_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_assignment_timestamp
    BEFORE UPDATE ON public.match_official_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_assignment_timestamp();

-- Create trigger to log assignment status changes
CREATE OR REPLACE FUNCTION public.log_assignment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.match_official_assignment_logs (
            assignment_id, action, performed_by, notes, previous_status, new_status, performed_at
        ) VALUES (
            NEW.id, 
            CASE NEW.status
                WHEN 'confirmed' THEN 'confirmed'
                WHEN 'declined' THEN 'declined'
                WHEN 'replaced' THEN 'replaced'
                ELSE 'updated'
            END,
            NEW.assigned_by,
            'Status changed from ' || COALESCE(OLD.status, 'NULL') || ' to ' || NEW.status,
            OLD.status,
            NEW.status,
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_assignment_status_change
    AFTER UPDATE ON public.match_official_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.log_assignment_status_change();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.check_assignment_conflicts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_official_workload_stats(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_officials_for_match(UUID, VARCHAR) TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.check_assignment_conflicts() IS 'Checks for assignment conflicts and logs them. Should be called periodically.';
COMMENT ON FUNCTION public.get_official_workload_stats(UUID, DATE) IS 'Returns workload statistics for a referee for a given week.';
COMMENT ON FUNCTION public.get_available_officials_for_match(UUID, VARCHAR) IS 'Returns available officials for a specific match and role.';
