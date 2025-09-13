-- Create team sheets table
CREATE TABLE IF NOT EXISTS public.team_sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'final')) DEFAULT 'draft',
    formation VARCHAR(10) NOT NULL CHECK (formation IN ('4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '3-4-3', '5-3-2', '4-5-1', '3-4-2-1', '4-1-4-1', '3-3-3-1')),
    submitted_by UUID REFERENCES auth.users(id),
    submitted_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    rejected_reason TEXT,
    deadline TIMESTAMPTZ NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(match_id, team_id)
);

-- Create team sheet players table
CREATE TABLE IF NOT EXISTS public.team_sheet_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_sheet_id UUID NOT NULL REFERENCES public.team_sheets(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    player_name VARCHAR(255) NOT NULL,
    jersey_number INTEGER NOT NULL CHECK (jersey_number >= 1 AND jersey_number <= 99),
    position VARCHAR(10) NOT NULL CHECK (position IN ('GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'SUB')),
    is_starter BOOLEAN NOT NULL DEFAULT FALSE,
    is_captain BOOLEAN NOT NULL DEFAULT FALSE,
    is_vice_captain BOOLEAN NOT NULL DEFAULT FALSE,
    substitution_order INTEGER CHECK (substitution_order >= 1 AND substitution_order <= 12),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_sheet_id, player_id),
    UNIQUE(team_sheet_id, jersey_number)
);

-- Create team sheet actions table for audit trail
CREATE TABLE IF NOT EXISTS public.team_sheet_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_sheet_id UUID NOT NULL REFERENCES public.team_sheets(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'submitted', 'approved', 'rejected', 'finalized', 'updated')),
    performed_by UUID NOT NULL REFERENCES auth.users(id),
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT
);

-- Create player suspensions table
CREATE TABLE IF NOT EXISTS public.player_suspensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    suspension_start TIMESTAMPTZ NOT NULL,
    suspension_end TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL,
    matches_suspended INTEGER NOT NULL DEFAULT 1,
    issued_by UUID NOT NULL REFERENCES auth.users(id),
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create player injuries table
CREATE TABLE IF NOT EXISTS public.player_injuries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    injury_type VARCHAR(100) NOT NULL,
    injury_date TIMESTAMPTZ NOT NULL,
    estimated_recovery_date TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    reported_by UUID REFERENCES auth.users(id),
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_team_sheets_match_id ON public.team_sheets(match_id);
CREATE INDEX IF NOT EXISTS idx_team_sheets_team_id ON public.team_sheets(team_id);
CREATE INDEX IF NOT EXISTS idx_team_sheets_status ON public.team_sheets(status);
CREATE INDEX IF NOT EXISTS idx_team_sheets_deadline ON public.team_sheets(deadline);

CREATE INDEX IF NOT EXISTS idx_team_sheet_players_team_sheet_id ON public.team_sheet_players(team_sheet_id);
CREATE INDEX IF NOT EXISTS idx_team_sheet_players_player_id ON public.team_sheet_players(player_id);
CREATE INDEX IF NOT EXISTS idx_team_sheet_players_position ON public.team_sheet_players(position);
CREATE INDEX IF NOT EXISTS idx_team_sheet_players_is_starter ON public.team_sheet_players(is_starter);

CREATE INDEX IF NOT EXISTS idx_team_sheet_actions_team_sheet_id ON public.team_sheet_actions(team_sheet_id);
CREATE INDEX IF NOT EXISTS idx_team_sheet_actions_performed_at ON public.team_sheet_actions(performed_at);

CREATE INDEX IF NOT EXISTS idx_player_suspensions_player_id ON public.player_suspensions(player_id);
CREATE INDEX IF NOT EXISTS idx_player_suspensions_tournament_id ON public.player_suspensions(tournament_id);
CREATE INDEX IF NOT EXISTS idx_player_suspensions_dates ON public.player_suspensions(suspension_start, suspension_end);

CREATE INDEX IF NOT EXISTS idx_player_injuries_player_id ON public.player_injuries(player_id);
CREATE INDEX IF NOT EXISTS idx_player_injuries_is_active ON public.player_injuries(is_active);

-- Enable RLS
ALTER TABLE public.team_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_sheet_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_sheet_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_suspensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_injuries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for team sheets
CREATE POLICY "Users can view team sheets for their organization matches" ON public.team_sheets
    FOR SELECT USING (
        match_id IN (
            SELECT m.id FROM public.matches m
            JOIN public.tournaments t ON m.tournament_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
        )
        OR team_id IN (
            SELECT tm.id FROM public.teams tm
            JOIN public.organization_memberships om ON tm.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
        )
    );

CREATE POLICY "Users can create team sheets for their organization teams" ON public.team_sheets
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT tm.id FROM public.teams tm
            JOIN public.organization_memberships om ON tm.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
        )
        AND submitted_by = auth.uid()
    );

CREATE POLICY "Users can update team sheets for their organization teams" ON public.team_sheets
    FOR UPDATE USING (
        team_id IN (
            SELECT tm.id FROM public.teams tm
            JOIN public.organization_memberships om ON tm.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
        )
        OR match_id IN (
            SELECT m.id FROM public.matches m
            JOIN public.tournaments t ON m.tournament_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
            AND om.role IN ('owner', 'admin', 'manager', 'referee')
        )
    );

-- Create RLS policies for team sheet players
CREATE POLICY "Users can view team sheet players for their organization matches" ON public.team_sheet_players
    FOR SELECT USING (
        team_sheet_id IN (
            SELECT ts.id FROM public.team_sheets ts
            WHERE ts.match_id IN (
                SELECT m.id FROM public.matches m
                JOIN public.tournaments t ON m.tournament_id = t.id
                JOIN public.organization_memberships om ON t.organization_id = om.organization_id
                WHERE om.user_id = auth.uid() AND om.is_active = true
            )
        )
    );

CREATE POLICY "Users can manage team sheet players for their organization teams" ON public.team_sheet_players
    FOR ALL USING (
        team_sheet_id IN (
            SELECT ts.id FROM public.team_sheets ts
            WHERE ts.team_id IN (
                SELECT tm.id FROM public.teams tm
                JOIN public.organization_memberships om ON tm.organization_id = om.organization_id
                WHERE om.user_id = auth.uid() AND om.is_active = true
            )
        )
    );

-- Create RLS policies for team sheet actions
CREATE POLICY "Users can view team sheet actions for their organization matches" ON public.team_sheet_actions
    FOR SELECT USING (
        team_sheet_id IN (
            SELECT ts.id FROM public.team_sheets ts
            WHERE ts.match_id IN (
                SELECT m.id FROM public.matches m
                JOIN public.tournaments t ON m.tournament_id = t.id
                JOIN public.organization_memberships om ON t.organization_id = om.organization_id
                WHERE om.user_id = auth.uid() AND om.is_active = true
            )
        )
    );

CREATE POLICY "Users can create team sheet actions for their organization matches" ON public.team_sheet_actions
    FOR INSERT WITH CHECK (
        team_sheet_id IN (
            SELECT ts.id FROM public.team_sheets ts
            WHERE ts.match_id IN (
                SELECT m.id FROM public.matches m
                JOIN public.tournaments t ON m.tournament_id = t.id
                JOIN public.organization_memberships om ON t.organization_id = om.organization_id
                WHERE om.user_id = auth.uid() AND om.is_active = true
            )
        )
        AND performed_by = auth.uid()
    );

-- Create RLS policies for player suspensions
CREATE POLICY "Users can view player suspensions for their organization tournaments" ON public.player_suspensions
    FOR SELECT USING (
        tournament_id IN (
            SELECT t.id FROM public.tournaments t
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
        )
    );

CREATE POLICY "Users can manage player suspensions for their organization tournaments" ON public.player_suspensions
    FOR ALL USING (
        tournament_id IN (
            SELECT t.id FROM public.tournaments t
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
            AND om.role IN ('owner', 'admin', 'manager', 'referee')
        )
    );

-- Create RLS policies for player injuries
CREATE POLICY "Users can view player injuries for their organization players" ON public.player_injuries
    FOR SELECT USING (
        player_id IN (
            SELECT p.id FROM public.players p
            JOIN public.team_memberships tm ON p.id = tm.player_id
            JOIN public.teams t ON tm.team_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
        )
    );

CREATE POLICY "Users can manage player injuries for their organization players" ON public.player_injuries
    FOR ALL USING (
        player_id IN (
            SELECT p.id FROM public.players p
            JOIN public.team_memberships tm ON p.id = tm.player_id
            JOIN public.teams t ON tm.team_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
        )
    );

-- Create function to automatically set team sheet deadlines
CREATE OR REPLACE FUNCTION public.set_team_sheet_deadlines()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    match_record RECORD;
    tournament_record RECORD;
    deadline_hours INTEGER;
    deadline_timestamp TIMESTAMPTZ;
BEGIN
    -- Find matches without team sheet deadlines set
    FOR match_record IN 
        SELECT m.id, m.scheduled_date, m.tournament_id
        FROM public.matches m
        WHERE m.status = 'scheduled'
        AND NOT EXISTS (
            SELECT 1 FROM public.team_sheets ts 
            WHERE ts.match_id = m.id
        )
    LOOP
        -- Get tournament team sheet deadline settings
        SELECT team_sheet_deadline_hours INTO tournament_record
        FROM public.tournaments
        WHERE id = match_record.tournament_id;

        deadline_hours := COALESCE(tournament_record.team_sheet_deadline_hours, 2); -- Default 2 hours
        deadline_timestamp := match_record.scheduled_date - INTERVAL '1 hour' * deadline_hours;

        -- Create team sheet records for both teams
        INSERT INTO public.team_sheets (match_id, team_id, deadline)
        SELECT match_record.id, m.home_team_id, deadline_timestamp
        FROM public.matches m
        WHERE m.id = match_record.id
        UNION ALL
        SELECT match_record.id, m.away_team_id, deadline_timestamp
        FROM public.matches m
        WHERE m.id = match_record.id;
    END LOOP;
END;
$$;

-- Create function to check team sheet submission status
CREATE OR REPLACE FUNCTION public.get_team_sheet_status(p_match_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
    total_count INTEGER;
    submitted_count INTEGER;
    approved_count INTEGER;
    pending_count INTEGER;
    rejected_count INTEGER;
BEGIN
    -- Count team sheets by status
    SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'submitted') as submitted,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'draft') as pending,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected
    INTO total_count, submitted_count, approved_count, pending_count, rejected_count
    FROM public.team_sheets
    WHERE match_id = p_match_id;

    result := json_build_object(
        'total_team_sheets', total_count,
        'submitted_team_sheets', submitted_count,
        'approved_team_sheets', approved_count,
        'pending_team_sheets', pending_count,
        'rejected_team_sheets', rejected_count,
        'all_submitted', submitted_count = total_count AND total_count > 0,
        'all_approved', approved_count = total_count AND total_count > 0
    );

    RETURN result;
END;
$$;

-- Create function to validate team sheet formation
CREATE OR REPLACE FUNCTION public.validate_team_sheet_formation(
    p_formation VARCHAR(10),
    p_players JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    defenders INTEGER;
    midfielders INTEGER;
    forwards INTEGER;
    starters JSONB;
BEGIN
    -- Extract starting players
    starters := p_players -> 'starters';
    
    -- Count players by position
    defenders := (
        SELECT COUNT(*) FROM jsonb_array_elements(starters) 
        WHERE value ->> 'position' IN ('CB', 'LB', 'RB')
    );
    
    midfielders := (
        SELECT COUNT(*) FROM jsonb_array_elements(starters) 
        WHERE value ->> 'position' IN ('CDM', 'CM', 'CAM', 'LM', 'RM')
    );
    
    forwards := (
        SELECT COUNT(*) FROM jsonb_array_elements(starters) 
        WHERE value ->> 'position' IN ('LW', 'RW', 'ST')
    );

    -- Validate formation patterns
    CASE p_formation
        WHEN '4-4-2' THEN RETURN defenders = 4 AND midfielders = 4 AND forwards = 2;
        WHEN '4-3-3' THEN RETURN defenders = 4 AND midfielders = 3 AND forwards = 3;
        WHEN '3-5-2' THEN RETURN defenders = 3 AND midfielders = 5 AND forwards = 2;
        WHEN '4-2-3-1' THEN RETURN defenders = 4 AND midfielders = 5 AND forwards = 1;
        WHEN '3-4-3' THEN RETURN defenders = 3 AND midfielders = 4 AND forwards = 3;
        WHEN '5-3-2' THEN RETURN defenders = 5 AND midfielders = 3 AND forwards = 2;
        WHEN '4-5-1' THEN RETURN defenders = 4 AND midfielders = 5 AND forwards = 1;
        WHEN '3-4-2-1' THEN RETURN defenders = 3 AND midfielders = 6 AND forwards = 1;
        WHEN '4-1-4-1' THEN RETURN defenders = 4 AND midfielders = 5 AND forwards = 1;
        WHEN '3-3-3-1' THEN RETURN defenders = 3 AND midfielders = 6 AND forwards = 1;
        ELSE RETURN FALSE;
    END CASE;
END;
$$;

-- Create trigger to update team sheet updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_team_sheet_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_team_sheet_timestamp
    BEFORE UPDATE ON public.team_sheets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_team_sheet_timestamp();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.set_team_sheet_deadlines() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_sheet_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_team_sheet_formation(VARCHAR, JSONB) TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.set_team_sheet_deadlines() IS 'Automatically sets team sheet deadlines for scheduled matches. Should be called when matches are created.';
COMMENT ON FUNCTION public.get_team_sheet_status(UUID) IS 'Returns team sheet submission status for a match.';
COMMENT ON FUNCTION public.validate_team_sheet_formation(VARCHAR, JSONB) IS 'Validates team sheet formation against player positions.';
