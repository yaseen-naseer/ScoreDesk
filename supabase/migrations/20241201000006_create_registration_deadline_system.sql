-- Create registration deadline extensions table
CREATE TABLE IF NOT EXISTS public.registration_deadline_extensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    extended_by UUID NOT NULL REFERENCES auth.users(id),
    original_deadline TIMESTAMPTZ NOT NULL,
    new_deadline TIMESTAMPTZ NOT NULL,
    extension_reason TEXT NOT NULL,
    extension_duration_hours INTEGER NOT NULL DEFAULT 24,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create registration payments table
CREATE TABLE IF NOT EXISTS public.registration_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    fee_type VARCHAR(20) NOT NULL CHECK (fee_type IN ('entry_fee', 'late_fee', 'early_bird_discount', 'team_fee', 'player_fee')),
    payment_status VARCHAR(20) NOT NULL CHECK (payment_status IN ('pending', 'paid', 'refunded', 'cancelled')) DEFAULT 'pending',
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255),
    paid_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    refund_amount NUMERIC(10,2) CHECK (refund_amount >= 0),
    refund_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_registration_deadline_extensions_tournament_id ON public.registration_deadline_extensions(tournament_id);
CREATE INDEX IF NOT EXISTS idx_registration_deadline_extensions_created_at ON public.registration_deadline_extensions(created_at);

CREATE INDEX IF NOT EXISTS idx_registration_payments_tournament_id ON public.registration_payments(tournament_id);
CREATE INDEX IF NOT EXISTS idx_registration_payments_team_id ON public.registration_payments(team_id);
CREATE INDEX IF NOT EXISTS idx_registration_payments_payment_status ON public.registration_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_registration_payments_created_at ON public.registration_payments(created_at);

-- Enable RLS
ALTER TABLE public.registration_deadline_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for deadline extensions
CREATE POLICY "Users can view deadline extensions for their organization tournaments" ON public.registration_deadline_extensions
    FOR SELECT USING (
        tournament_id IN (
            SELECT t.id FROM public.tournaments t
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
        )
    );

CREATE POLICY "Users can create deadline extensions for their organization tournaments" ON public.registration_deadline_extensions
    FOR INSERT WITH CHECK (
        tournament_id IN (
            SELECT t.id FROM public.tournaments t
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
            AND om.role IN ('owner', 'admin', 'manager')
        )
        AND extended_by = auth.uid()
    );

-- Create RLS policies for registration payments
CREATE POLICY "Users can view payments for their organization tournaments" ON public.registration_payments
    FOR SELECT USING (
        tournament_id IN (
            SELECT t.id FROM public.tournaments t
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
        )
        OR team_id IN (
            SELECT tm.id FROM public.teams tm
            JOIN public.organization_memberships om ON tm.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
        )
    );

CREATE POLICY "Users can create payments for their organization tournaments" ON public.registration_payments
    FOR INSERT WITH CHECK (
        tournament_id IN (
            SELECT t.id FROM public.tournaments t
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
        )
        AND team_id IN (
            SELECT tm.id FROM public.teams tm
            JOIN public.organization_memberships om ON tm.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
        )
    );

CREATE POLICY "Users can update payments for their organization tournaments" ON public.registration_payments
    FOR UPDATE USING (
        tournament_id IN (
            SELECT t.id FROM public.tournaments t
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
            AND om.role IN ('owner', 'admin', 'manager')
        )
    );

-- Create function to automatically process deadline expirations
CREATE OR REPLACE FUNCTION public.process_registration_deadline_expirations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    tournament_record RECORD;
    team_count INTEGER;
BEGIN
    -- Find tournaments with expired registration deadlines
    FOR tournament_record IN 
        SELECT t.id, t.name, t.registration_deadline, t.tournament_status
        FROM public.tournaments t
        WHERE t.tournament_status = 'registration'
        AND t.is_active = true
        AND t.registration_deadline IS NOT NULL
        AND NOW() > t.registration_deadline
        AND t.allow_registration = true
    LOOP
        -- Check if tournament has minimum teams registered
        SELECT COUNT(*) INTO team_count
        FROM public.tournament_teams tt
        WHERE tt.tournament_id = tournament_record.id 
        AND tt.registration_status = 'approved';

        -- Auto-close registration if minimum teams are registered
        IF team_count >= 2 THEN
            UPDATE public.tournaments 
            SET 
                tournament_status = 'active',
                allow_registration = false,
                updated_at = NOW()
            WHERE id = tournament_record.id;

            -- Log the automatic transition
            INSERT INTO public.tournament_workflow_logs (
                tournament_id, from_status, to_status, action, 
                performed_by, automatic, notes
            ) VALUES (
                tournament_record.id, 'registration', 'active', 'close_registration',
                '00000000-0000-0000-0000-000000000000'::UUID, true, 
                'Automatic registration closure: deadline expired and minimum teams registered'
            );

            RAISE NOTICE 'Auto-closed registration for tournament % (%)', tournament_record.name, tournament_record.id;
        ELSE
            RAISE NOTICE 'Tournament % deadline expired but insufficient teams registered (%, minimum 2 required)', 
                tournament_record.name, team_count;
        END IF;
    END LOOP;
END;
$$;

-- Create function to calculate registration fees
CREATE OR REPLACE FUNCTION public.calculate_registration_fee(
    p_tournament_id UUID,
    p_base_amount NUMERIC,
    p_fee_type VARCHAR(20)
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    tournament_record RECORD;
    now_timestamp TIMESTAMPTZ := NOW();
    final_amount NUMERIC := p_base_amount;
    early_bird_active BOOLEAN := FALSE;
    late_registration_active BOOLEAN := FALSE;
BEGIN
    -- Get tournament details
    SELECT * INTO tournament_record
    FROM public.tournaments
    WHERE id = p_tournament_id;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Check if early bird discount applies
    IF tournament_record.early_bird_deadline IS NOT NULL 
       AND tournament_record.early_bird_discount IS NOT NULL 
       AND tournament_record.early_bird_discount > 0 
       AND now_timestamp <= tournament_record.early_bird_deadline 
       AND p_fee_type = 'entry_fee' THEN
        early_bird_active := TRUE;
        final_amount := GREATEST(0, final_amount - tournament_record.early_bird_discount);
    END IF;

    -- Check if late registration fee applies
    IF tournament_record.registration_deadline IS NOT NULL 
       AND tournament_record.late_registration_fee IS NOT NULL 
       AND tournament_record.late_registration_fee > 0 
       AND now_timestamp > tournament_record.registration_deadline 
       AND p_fee_type = 'entry_fee' THEN
        late_registration_active := TRUE;
        final_amount := final_amount + tournament_record.late_registration_fee;
    END IF;

    RETURN final_amount;
END;
$$;

-- Create function to check if team can register
CREATE OR REPLACE FUNCTION public.can_team_register(
    p_tournament_id UUID,
    p_team_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    tournament_record RECORD;
    team_count INTEGER;
    max_teams INTEGER;
    existing_registration BOOLEAN := FALSE;
    now_timestamp TIMESTAMPTZ := NOW();
    result JSON;
BEGIN
    -- Get tournament details
    SELECT * INTO tournament_record
    FROM public.tournaments
    WHERE id = p_tournament_id;

    IF NOT FOUND THEN
        result := json_build_object('allowed', false, 'reason', 'Tournament not found');
        RETURN result;
    END IF;

    -- Check if registration is open
    IF tournament_record.tournament_status != 'registration' THEN
        result := json_build_object('allowed', false, 'reason', 'Registration is not open');
        RETURN result;
    END IF;

    -- Check registration deadline
    IF tournament_record.registration_deadline IS NOT NULL 
       AND now_timestamp > tournament_record.registration_deadline THEN
        -- Check if late registration is allowed
        IF tournament_record.allow_registration = false 
           OR (tournament_record.late_registration_deadline IS NOT NULL 
               AND now_timestamp > tournament_record.late_registration_deadline) THEN
            result := json_build_object('allowed', false, 'reason', 'Registration deadline has passed');
            RETURN result;
        END IF;
    END IF;

    -- Check if team is already registered
    SELECT EXISTS(
        SELECT 1 FROM public.tournament_teams tt
        WHERE tt.tournament_id = p_tournament_id 
        AND tt.team_id = p_team_id
    ) INTO existing_registration;

    IF existing_registration THEN
        result := json_build_object('allowed', false, 'reason', 'Team is already registered');
        RETURN result;
    END IF;

    -- Check maximum teams limit
    max_teams := tournament_record.max_teams;
    IF max_teams IS NOT NULL THEN
        SELECT COUNT(*) INTO team_count
        FROM public.tournament_teams tt
        WHERE tt.tournament_id = p_tournament_id 
        AND tt.registration_status = 'approved';

        IF team_count >= max_teams THEN
            result := json_build_object('allowed', false, 'reason', 'Tournament is full');
            RETURN result;
        END IF;
    END IF;

    -- All checks passed
    result := json_build_object('allowed', true);
    RETURN result;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.process_registration_deadline_expirations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_registration_fee(UUID, NUMERIC, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_team_register(UUID, UUID) TO authenticated;

-- Create trigger to update payment updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_registration_payment_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_registration_payment_timestamp
    BEFORE UPDATE ON public.registration_payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_registration_payment_timestamp();

-- Add comments
COMMENT ON FUNCTION public.process_registration_deadline_expirations() IS 'Processes automatic registration deadline expirations. Should be called periodically by a scheduler.';
COMMENT ON FUNCTION public.calculate_registration_fee(UUID, NUMERIC, VARCHAR) IS 'Calculates registration fee with early bird discounts and late fees applied.';
COMMENT ON FUNCTION public.can_team_register(UUID, UUID) IS 'Checks if a team can register for a tournament based on various criteria.';
