-- Create match postponements table
CREATE TABLE IF NOT EXISTS public.match_postponements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    reason VARCHAR(50) NOT NULL CHECK (reason IN (
        'weather_conditions',
        'venue_unavailable',
        'referee_unavailable',
        'team_unavailable',
        'security_concerns',
        'technical_issues',
        'force_majeure',
        'scheduling_conflict',
        'other'
    )),
    reason_description TEXT NOT NULL,
    requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    new_scheduled_date TIMESTAMPTZ,
    new_venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
    alternative_venues JSONB DEFAULT '[]'::jsonb,
    affected_parties JSONB NOT NULL DEFAULT '[]'::jsonb,
    urgency_level VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
    estimated_resolution_time TIMESTAMPTZ,
    additional_notes TEXT,
    workflow_id UUID,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'rescheduled', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create match cancellations table
CREATE TABLE IF NOT EXISTS public.match_cancellations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    reason VARCHAR(50) NOT NULL CHECK (reason IN (
        'weather_conditions',
        'venue_damage',
        'team_withdrawal',
        'referee_unavailable',
        'security_incident',
        'force_majeure',
        'tournament_cancellation',
        'other'
    )),
    reason_description TEXT NOT NULL,
    requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    affected_parties JSONB NOT NULL DEFAULT '[]'::jsonb,
    urgency_level VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
    refund_required BOOLEAN NOT NULL DEFAULT FALSE,
    refund_amount DECIMAL(10,2),
    additional_notes TEXT,
    workflow_id UUID,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create match reschedules table
CREATE TABLE IF NOT EXISTS public.match_reschedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    original_scheduled_date TIMESTAMPTZ NOT NULL,
    new_scheduled_date TIMESTAMPTZ NOT NULL,
    original_venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
    new_venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
    reschedule_reason TEXT NOT NULL,
    approved_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
    affected_parties_notified JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create postponement workflows table
CREATE TABLE IF NOT EXISTS public.postponement_workflows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'rescheduled', 'cancelled')),
    current_step INTEGER NOT NULL DEFAULT 1,
    total_steps INTEGER NOT NULL DEFAULT 3,
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Create cancellation workflows table
CREATE TABLE IF NOT EXISTS public.cancellation_workflows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    current_step INTEGER NOT NULL DEFAULT 1,
    total_steps INTEGER NOT NULL DEFAULT 2,
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Add workflow_id columns to postponement and cancellation tables
ALTER TABLE public.match_postponements ADD COLUMN IF NOT EXISTS workflow_id UUID REFERENCES public.postponement_workflows(id) ON DELETE SET NULL;
ALTER TABLE public.match_cancellations ADD COLUMN IF NOT EXISTS workflow_id UUID REFERENCES public.cancellation_workflows(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_match_postponements_match_id ON public.match_postponements(match_id);
CREATE INDEX IF NOT EXISTS idx_match_postponements_requested_by ON public.match_postponements(requested_by);
CREATE INDEX IF NOT EXISTS idx_match_postponements_status ON public.match_postponements(status);
CREATE INDEX IF NOT EXISTS idx_match_postponements_urgency ON public.match_postponements(urgency_level);

CREATE INDEX IF NOT EXISTS idx_match_cancellations_match_id ON public.match_cancellations(match_id);
CREATE INDEX IF NOT EXISTS idx_match_cancellations_requested_by ON public.match_cancellations(requested_by);
CREATE INDEX IF NOT EXISTS idx_match_cancellations_status ON public.match_cancellations(status);
CREATE INDEX IF NOT EXISTS idx_match_cancellations_urgency ON public.match_cancellations(urgency_level);

CREATE INDEX IF NOT EXISTS idx_match_reschedules_match_id ON public.match_reschedules(match_id);
CREATE INDEX IF NOT EXISTS idx_match_reschedules_approved_by ON public.match_reschedules(approved_by);

CREATE INDEX IF NOT EXISTS idx_postponement_workflows_match_id ON public.postponement_workflows(match_id);
CREATE INDEX IF NOT EXISTS idx_postponement_workflows_status ON public.postponement_workflows(status);

CREATE INDEX IF NOT EXISTS idx_cancellation_workflows_match_id ON public.cancellation_workflows(match_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_workflows_status ON public.cancellation_workflows(status);

-- Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER set_updated_at_match_postponements
    BEFORE UPDATE ON public.match_postponements
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_match_cancellations
    BEFORE UPDATE ON public.match_cancellations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_match_reschedules
    BEFORE UPDATE ON public.match_reschedules
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_postponement_workflows
    BEFORE UPDATE ON public.postponement_workflows
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_cancellation_workflows
    BEFORE UPDATE ON public.cancellation_workflows
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.match_postponements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_cancellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_reschedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.postponement_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancellation_workflows ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for match_postponements
CREATE POLICY "Users can view postponements for their organization matches" ON public.match_postponements
    FOR SELECT USING (
        match_id IN (
            SELECT m.id FROM public.matches m
            JOIN public.tournaments t ON m.tournament_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create postponements for their organization matches" ON public.match_postponements
    FOR INSERT WITH CHECK (
        match_id IN (
            SELECT m.id FROM public.matches m
            JOIN public.tournaments t ON m.tournament_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin', 'manager')
        )
    );

CREATE POLICY "Users can update postponements for their organization matches" ON public.match_postponements
    FOR UPDATE USING (
        match_id IN (
            SELECT m.id FROM public.matches m
            JOIN public.tournaments t ON m.tournament_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin', 'manager')
        )
    );

-- Create RLS policies for match_cancellations
CREATE POLICY "Users can view cancellations for their organization matches" ON public.match_cancellations
    FOR SELECT USING (
        match_id IN (
            SELECT m.id FROM public.matches m
            JOIN public.tournaments t ON m.tournament_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create cancellations for their organization matches" ON public.match_cancellations
    FOR INSERT WITH CHECK (
        match_id IN (
            SELECT m.id FROM public.matches m
            JOIN public.tournaments t ON m.tournament_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin', 'manager')
        )
    );

CREATE POLICY "Users can update cancellations for their organization matches" ON public.match_cancellations
    FOR UPDATE USING (
        match_id IN (
            SELECT m.id FROM public.matches m
            JOIN public.tournaments t ON m.tournament_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin', 'manager')
        )
    );

-- Create RLS policies for match_reschedules
CREATE POLICY "Users can view reschedules for their organization matches" ON public.match_reschedules
    FOR SELECT USING (
        match_id IN (
            SELECT m.id FROM public.matches m
            JOIN public.tournaments t ON m.tournament_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create reschedules for their organization matches" ON public.match_reschedules
    FOR INSERT WITH CHECK (
        match_id IN (
            SELECT m.id FROM public.matches m
            JOIN public.tournaments t ON m.tournament_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin', 'manager')
        )
    );

-- Create RLS policies for postponement_workflows
CREATE POLICY "Users can view postponement workflows for their organization matches" ON public.postponement_workflows
    FOR SELECT USING (
        match_id IN (
            SELECT m.id FROM public.matches m
            JOIN public.tournaments t ON m.tournament_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create postponement workflows for their organization matches" ON public.postponement_workflows
    FOR INSERT WITH CHECK (
        match_id IN (
            SELECT m.id FROM public.matches m
            JOIN public.tournaments t ON m.tournament_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin', 'manager')
        )
    );

CREATE POLICY "Users can update postponement workflows for their organization matches" ON public.postponement_workflows
    FOR UPDATE USING (
        match_id IN (
            SELECT m.id FROM public.matches m
            JOIN public.tournaments t ON m.tournament_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin', 'manager')
        )
    );

-- Create RLS policies for cancellation_workflows
CREATE POLICY "Users can view cancellation workflows for their organization matches" ON public.cancellation_workflows
    FOR SELECT USING (
        match_id IN (
            SELECT m.id FROM public.matches m
            JOIN public.tournaments t ON m.tournament_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create cancellation workflows for their organization matches" ON public.cancellation_workflows
    FOR INSERT WITH CHECK (
        match_id IN (
            SELECT m.id FROM public.matches m
            JOIN public.tournaments t ON m.tournament_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin', 'manager')
        )
    );

CREATE POLICY "Users can update cancellation workflows for their organization matches" ON public.cancellation_workflows
    FOR UPDATE USING (
        match_id IN (
            SELECT m.id FROM public.matches m
            JOIN public.tournaments t ON m.tournament_id = t.id
            JOIN public.organization_memberships om ON t.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin', 'manager')
        )
    );
