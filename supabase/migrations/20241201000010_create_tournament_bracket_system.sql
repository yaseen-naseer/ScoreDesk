-- Create tournament brackets table
CREATE TABLE IF NOT EXISTS public.tournament_brackets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    bracket_type VARCHAR(20) NOT NULL CHECK (bracket_type IN ('single_elimination', 'double_elimination', 'round_robin', 'group_stage')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'active', 'completed', 'cancelled')) DEFAULT 'pending',
    total_teams INTEGER NOT NULL,
    total_rounds INTEGER NOT NULL,
    current_round INTEGER NOT NULL DEFAULT 0,
    seeding_method VARCHAR(20) NOT NULL CHECK (seeding_method IN ('manual', 'random', 'ranked', 'balanced')) DEFAULT 'balanced',
    third_place_match BOOLEAN NOT NULL DEFAULT FALSE,
    consolation_bracket BOOLEAN NOT NULL DEFAULT FALSE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create bracket nodes table for bracket structure
CREATE TABLE IF NOT EXISTS public.bracket_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bracket_id UUID NOT NULL REFERENCES public.tournament_brackets(id) ON DELETE CASCADE,
    match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
    round INTEGER NOT NULL,
    position INTEGER NOT NULL,
    parent_id UUID REFERENCES public.bracket_nodes(id) ON DELETE CASCADE,
    left_child_id UUID REFERENCES public.bracket_nodes(id) ON DELETE CASCADE,
    right_child_id UUID REFERENCES public.bracket_nodes(id) ON DELETE CASCADE,
    home_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    away_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    winner_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    loser_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    score JSONB DEFAULT '{}',
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'scheduled', 'live', 'completed', 'postponed', 'cancelled')) DEFAULT 'pending',
    scheduled_date TIMESTAMPTZ,
    venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
    is_bye BOOLEAN NOT NULL DEFAULT FALSE,
    seed_position INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bracket_id, round, position)
);

-- Create bracket matches table for detailed match information
CREATE TABLE IF NOT EXISTS public.bracket_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bracket_id UUID NOT NULL REFERENCES public.tournament_brackets(id) ON DELETE CASCADE,
    node_id UUID NOT NULL REFERENCES public.bracket_nodes(id) ON DELETE CASCADE,
    match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
    round INTEGER NOT NULL,
    position INTEGER NOT NULL,
    home_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    away_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    winner_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    score JSONB DEFAULT '{}',
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'scheduled', 'live', 'completed', 'postponed', 'cancelled')) DEFAULT 'pending',
    scheduled_date TIMESTAMPTZ,
    venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
    referee_id UUID REFERENCES public.referees(id) ON DELETE SET NULL,
    assistant_referee_1_id UUID REFERENCES public.referees(id) ON DELETE SET NULL,
    assistant_referee_2_id UUID REFERENCES public.referees(id) ON DELETE SET NULL,
    fourth_official_id UUID REFERENCES public.referees(id) ON DELETE SET NULL,
    match_duration_minutes INTEGER DEFAULT 90,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bracket_id, round, position)
);

-- Create bracket seeding table
CREATE TABLE IF NOT EXISTS public.bracket_seeding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bracket_id UUID NOT NULL REFERENCES public.tournament_brackets(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    seed_number INTEGER NOT NULL,
    group_id UUID REFERENCES public.tournament_groups(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bracket_id, team_id),
    UNIQUE(bracket_id, seed_number)
);

-- Create tournament groups table for group stage tournaments
CREATE TABLE IF NOT EXISTS public.tournament_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    bracket_id UUID REFERENCES public.tournament_brackets(id) ON DELETE CASCADE,
    group_name VARCHAR(50) NOT NULL,
    group_letter CHAR(1),
    max_teams INTEGER NOT NULL DEFAULT 4,
    current_teams INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'active', 'completed')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tournament_id, group_name),
    UNIQUE(tournament_id, group_letter)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_tournament_brackets_tournament_id ON public.tournament_brackets(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_brackets_status ON public.tournament_brackets(status);
CREATE INDEX IF NOT EXISTS idx_tournament_brackets_bracket_type ON public.tournament_brackets(bracket_type);

CREATE INDEX IF NOT EXISTS idx_bracket_nodes_bracket_id ON public.bracket_nodes(bracket_id);
CREATE INDEX IF NOT EXISTS idx_bracket_nodes_round ON public.bracket_nodes(round);
CREATE INDEX IF NOT EXISTS idx_bracket_nodes_parent_id ON public.bracket_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_bracket_nodes_home_team_id ON public.bracket_nodes(home_team_id);
CREATE INDEX IF NOT EXISTS idx_bracket_nodes_away_team_id ON public.bracket_nodes(away_team_id);

CREATE INDEX IF NOT EXISTS idx_bracket_matches_bracket_id ON public.bracket_matches(bracket_id);
CREATE INDEX IF NOT EXISTS idx_bracket_matches_round ON public.bracket_matches(round);
CREATE INDEX IF NOT EXISTS idx_bracket_matches_node_id ON public.bracket_matches(node_id);
CREATE INDEX IF NOT EXISTS idx_bracket_matches_home_team_id ON public.bracket_matches(home_team_id);
CREATE INDEX IF NOT EXISTS idx_bracket_matches_away_team_id ON public.bracket_matches(away_team_id);
CREATE INDEX IF NOT EXISTS idx_bracket_matches_status ON public.bracket_matches(status);

CREATE INDEX IF NOT EXISTS idx_bracket_seeding_bracket_id ON public.bracket_seeding(bracket_id);
CREATE INDEX IF NOT EXISTS idx_bracket_seeding_team_id ON public.bracket_seeding(team_id);
CREATE INDEX IF NOT EXISTS idx_bracket_seeding_seed_number ON public.bracket_seeding(seed_number);

CREATE INDEX IF NOT EXISTS idx_tournament_groups_tournament_id ON public.tournament_groups(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_groups_bracket_id ON public.tournament_groups(bracket_id);

-- Enable RLS
ALTER TABLE public.tournament_brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bracket_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bracket_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bracket_seeding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_groups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tournament brackets
CREATE POLICY "Users can view brackets for their organization tournaments" ON public.tournament_brackets
    FOR SELECT USING (
        tournament_id IN (
            SELECT t.id FROM public.tournaments t
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
        )
    );

CREATE POLICY "Users can manage brackets for their organization tournaments" ON public.tournament_brackets
    FOR ALL USING (
        tournament_id IN (
            SELECT t.id FROM public.tournaments t
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
            AND om.role IN ('owner', 'admin', 'manager')
        )
    );

-- Create RLS policies for bracket nodes
CREATE POLICY "Users can view bracket nodes for their organization tournaments" ON public.bracket_nodes
    FOR SELECT USING (
        bracket_id IN (
            SELECT tb.id FROM public.tournament_brackets tb
            JOIN public.tournaments t ON tb.tournament_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
        )
    );

CREATE POLICY "Users can manage bracket nodes for their organization tournaments" ON public.bracket_nodes
    FOR ALL USING (
        bracket_id IN (
            SELECT tb.id FROM public.tournament_brackets tb
            JOIN public.tournaments t ON tb.tournament_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
            AND om.role IN ('owner', 'admin', 'manager')
        )
    );

-- Create RLS policies for bracket matches
CREATE POLICY "Users can view bracket matches for their organization tournaments" ON public.bracket_matches
    FOR SELECT USING (
        bracket_id IN (
            SELECT tb.id FROM public.tournament_brackets tb
            JOIN public.tournaments t ON tb.tournament_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
        )
    );

CREATE POLICY "Users can manage bracket matches for their organization tournaments" ON public.bracket_matches
    FOR ALL USING (
        bracket_id IN (
            SELECT tb.id FROM public.tournament_brackets tb
            JOIN public.tournaments t ON tb.tournament_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
            AND om.role IN ('owner', 'admin', 'manager')
        )
    );

-- Create RLS policies for bracket seeding
CREATE POLICY "Users can view bracket seeding for their organization tournaments" ON public.bracket_seeding
    FOR SELECT USING (
        bracket_id IN (
            SELECT tb.id FROM public.tournament_brackets tb
            JOIN public.tournaments t ON tb.tournament_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
        )
    );

CREATE POLICY "Users can manage bracket seeding for their organization tournaments" ON public.bracket_seeding
    FOR ALL USING (
        bracket_id IN (
            SELECT tb.id FROM public.tournament_brackets tb
            JOIN public.tournaments t ON tb.tournament_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
            AND om.role IN ('owner', 'admin', 'manager')
        )
    );

-- Create RLS policies for tournament groups
CREATE POLICY "Users can view tournament groups for their organization tournaments" ON public.tournament_groups
    FOR SELECT USING (
        tournament_id IN (
            SELECT t.id FROM public.tournaments t
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
        )
    );

CREATE POLICY "Users can manage tournament groups for their organization tournaments" ON public.tournament_groups
    FOR ALL USING (
        tournament_id IN (
            SELECT t.id FROM public.tournaments t
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
            AND om.role IN ('owner', 'admin', 'manager')
        )
    );

-- Create function to automatically advance winners
CREATE OR REPLACE FUNCTION public.advance_bracket_winner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_round_node RECORD;
    winner_team_id UUID;
BEGIN
    -- Only proceed if match is completed and has a winner
    IF NEW.status = 'completed' AND NEW.winner_id IS NOT NULL THEN
        winner_team_id := NEW.winner_id;
        
        -- Find the next round node for this match
        SELECT bn.* INTO next_round_node
        FROM public.bracket_nodes bn
        JOIN public.bracket_nodes current_node ON bn.parent_id = current_node.id
        JOIN public.bracket_matches bm ON current_node.match_id = bm.id
        WHERE bm.id = NEW.id
        LIMIT 1;
        
        -- Update the next round node with the winner
        IF next_round_node.id IS NOT NULL THEN
            -- Determine if winner goes to home or away slot
            -- This logic would depend on bracket structure
            UPDATE public.bracket_nodes
            SET 
                home_team_id = CASE 
                    WHEN next_round_node.position % 2 = 1 THEN winner_team_id
                    ELSE home_team_id
                END,
                away_team_id = CASE 
                    WHEN next_round_node.position % 2 = 0 THEN winner_team_id
                    ELSE away_team_id
                END,
                updated_at = NOW()
            WHERE id = next_round_node.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger to automatically advance winners
CREATE TRIGGER trigger_advance_bracket_winner
    AFTER UPDATE ON public.bracket_matches
    FOR EACH ROW
    EXECUTE FUNCTION public.advance_bracket_winner();

-- Create function to update bracket status
CREATE OR REPLACE FUNCTION public.update_bracket_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    bracket_record RECORD;
    current_round_matches INTEGER;
    completed_round_matches INTEGER;
    next_round_exists BOOLEAN;
BEGIN
    -- Get bracket information
    SELECT tb.* INTO bracket_record
    FROM public.tournament_brackets tb
    JOIN public.bracket_matches bm ON tb.id = bm.bracket_id
    WHERE bm.id = NEW.id;

    IF bracket_record.id IS NOT NULL THEN
        -- Count matches in current round
        SELECT COUNT(*) INTO current_round_matches
        FROM public.bracket_matches
        WHERE bracket_id = bracket_record.id 
        AND round = bracket_record.current_round;

        -- Count completed matches in current round
        SELECT COUNT(*) INTO completed_round_matches
        FROM public.bracket_matches
        WHERE bracket_id = bracket_record.id 
        AND round = bracket_record.current_round
        AND status = 'completed';

        -- Check if current round is complete
        IF current_round_matches > 0 AND completed_round_matches >= current_round_matches THEN
            -- Check if next round exists
            SELECT EXISTS(
                SELECT 1 FROM public.bracket_matches 
                WHERE bracket_id = bracket_record.id 
                AND round = bracket_record.current_round + 1
            ) INTO next_round_exists;

            -- Update bracket status
            IF next_round_exists THEN
                -- Move to next round
                UPDATE public.tournament_brackets
                SET 
                    current_round = bracket_record.current_round + 1,
                    status = CASE 
                        WHEN bracket_record.current_round + 1 >= bracket_record.total_rounds 
                        THEN 'completed'
                        ELSE 'active'
                    END,
                    updated_at = NOW()
                WHERE id = bracket_record.id;
            ELSE
                -- Tournament complete
                UPDATE public.tournament_brackets
                SET 
                    status = 'completed',
                    updated_at = NOW()
                WHERE id = bracket_record.id;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger to update bracket status
CREATE TRIGGER trigger_update_bracket_status
    AFTER UPDATE ON public.bracket_matches
    FOR EACH ROW
    EXECUTE FUNCTION public.update_bracket_status();

-- Create function to generate bracket structure
CREATE OR REPLACE FUNCTION public.generate_bracket_structure(
    p_tournament_id UUID,
    p_bracket_type VARCHAR(20),
    p_total_teams INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
    total_rounds INTEGER;
    bracket_id UUID;
BEGIN
    -- Calculate total rounds based on bracket type
    CASE p_bracket_type
        WHEN 'single_elimination' THEN
            total_rounds := CEIL(LOG(2, p_total_teams));
        WHEN 'double_elimination' THEN
            total_rounds := CEIL(LOG(2, p_total_teams)) * 2 - 1;
        WHEN 'round_robin' THEN
            total_rounds := p_total_teams - 1;
        ELSE
            total_rounds := CEIL(LOG(2, p_total_teams));
    END CASE;

    -- Create bracket record
    INSERT INTO public.tournament_brackets (
        tournament_id, bracket_type, total_teams, total_rounds
    ) VALUES (
        p_tournament_id, p_bracket_type, p_total_teams, total_rounds
    ) RETURNING id INTO bracket_id;

    result := json_build_object(
        'bracket_id', bracket_id,
        'total_rounds', total_rounds,
        'message', 'Bracket structure generated successfully'
    );

    RETURN result;
END;
$$;

-- Create function to get bracket visualization data
CREATE OR REPLACE FUNCTION public.get_bracket_visualization(p_bracket_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
    bracket_info RECORD;
    nodes JSON;
    matches JSON;
BEGIN
    -- Get bracket information
    SELECT * INTO bracket_info
    FROM public.tournament_brackets
    WHERE id = p_bracket_id;

    -- Get bracket nodes
    SELECT json_agg(
        json_build_object(
            'id', id,
            'round', round,
            'position', position,
            'parent_id', parent_id,
            'home_team_id', home_team_id,
            'away_team_id', away_team_id,
            'winner_id', winner_id,
            'status', status,
            'is_bye', is_bye,
            'seed_position', seed_position
        )
    ) INTO nodes
    FROM public.bracket_nodes
    WHERE bracket_id = p_bracket_id
    ORDER BY round, position;

    -- Get bracket matches
    SELECT json_agg(
        json_build_object(
            'id', id,
            'round', round,
            'position', position,
            'home_team_id', home_team_id,
            'away_team_id', away_team_id,
            'winner_id', winner_id,
            'score', score,
            'status', status,
            'scheduled_date', scheduled_date
        )
    ) INTO matches
    FROM public.bracket_matches
    WHERE bracket_id = p_bracket_id
    ORDER BY round, position;

    result := json_build_object(
        'bracket', json_build_object(
            'id', bracket_info.id,
            'tournament_id', bracket_info.tournament_id,
            'bracket_type', bracket_info.bracket_type,
            'status', bracket_info.status,
            'total_teams', bracket_info.total_teams,
            'total_rounds', bracket_info.total_rounds,
            'current_round', bracket_info.current_round
        ),
        'nodes', COALESCE(nodes, '[]'::json),
        'matches', COALESCE(matches, '[]'::json)
    );

    RETURN result;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.generate_bracket_structure(UUID, VARCHAR, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bracket_visualization(UUID) TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.generate_bracket_structure(UUID, VARCHAR, INTEGER) IS 'Generates a tournament bracket structure with nodes and matches';
COMMENT ON FUNCTION public.get_bracket_visualization(UUID) IS 'Returns bracket visualization data including nodes and matches';
