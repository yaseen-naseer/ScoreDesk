-- Create notification templates table
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'match_assignment',
        'match_schedule_change',
        'match_cancellation',
        'match_postponement',
        'match_reminder',
        'tournament_update',
        'payment_reminder',
        'availability_request',
        'training_session',
        'meeting_reminder',
        'system_announcement'
    )),
    subject VARCHAR(500) NOT NULL,
    email_body TEXT NOT NULL,
    sms_body TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create referee notification settings table
CREATE TABLE IF NOT EXISTS public.referee_notification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referee_id UUID NOT NULL REFERENCES public.referees(id) ON DELETE CASCADE,
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sms_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    email_address VARCHAR(255),
    phone_number VARCHAR(20),
    preferred_channel VARCHAR(20) NOT NULL DEFAULT 'email' CHECK (preferred_channel IN ('email', 'sms', 'push', 'in_app')),
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    match_assignment_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    schedule_change_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    cancellation_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    reminder_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    tournament_update_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    payment_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    system_announcement_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(referee_id)
);

-- Create referee notifications table
CREATE TABLE IF NOT EXISTS public.referee_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referee_id UUID NOT NULL REFERENCES public.referees(id) ON DELETE CASCADE,
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
        'match_assignment',
        'match_schedule_change',
        'match_cancellation',
        'match_postponement',
        'match_reminder',
        'tournament_update',
        'payment_reminder',
        'availability_request',
        'training_session',
        'meeting_reminder',
        'system_announcement'
    )),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'expired', 'partially_delivered')),
    channels_requested JSONB NOT NULL DEFAULT '[]'::jsonb,
    channels_sent JSONB DEFAULT '[]'::jsonb,
    channels_delivered JSONB DEFAULT '[]'::jsonb,
    channels_failed JSONB DEFAULT '[]'::jsonb,
    template_id UUID REFERENCES public.notification_templates(id) ON DELETE SET NULL,
    subject VARCHAR(500),
    message_body TEXT,
    custom_data JSONB DEFAULT '{}'::jsonb,
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create notification delivery logs table for detailed tracking
CREATE TABLE IF NOT EXISTS public.notification_delivery_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    notification_id UUID NOT NULL REFERENCES public.referee_notifications(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'in_app')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'delivered', 'failed', 'bounced', 'complained')),
    external_id VARCHAR(255), -- ID from external service (email provider, SMS provider, etc.)
    delivery_attempt INTEGER NOT NULL DEFAULT 1,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON public.notification_templates(type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON public.notification_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_referee_notification_settings_referee_id ON public.referee_notification_settings(referee_id);

CREATE INDEX IF NOT EXISTS idx_referee_notifications_referee_id ON public.referee_notifications(referee_id);
CREATE INDEX IF NOT EXISTS idx_referee_notifications_match_id ON public.referee_notifications(match_id);
CREATE INDEX IF NOT EXISTS idx_referee_notifications_tournament_id ON public.referee_notifications(tournament_id);
CREATE INDEX IF NOT EXISTS idx_referee_notifications_type ON public.referee_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_referee_notifications_status ON public.referee_notifications(status);
CREATE INDEX IF NOT EXISTS idx_referee_notifications_priority ON public.referee_notifications(priority);
CREATE INDEX IF NOT EXISTS idx_referee_notifications_created_at ON public.referee_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_referee_notifications_scheduled_for ON public.referee_notifications(scheduled_for);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_logs_notification_id ON public.notification_delivery_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_logs_channel ON public.notification_delivery_logs(channel);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_logs_status ON public.notification_delivery_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_logs_sent_at ON public.notification_delivery_logs(sent_at);

-- Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER set_updated_at_notification_templates
    BEFORE UPDATE ON public.notification_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_referee_notification_settings
    BEFORE UPDATE ON public.referee_notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_referee_notifications
    BEFORE UPDATE ON public.referee_notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referee_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referee_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notification_templates
CREATE POLICY "Users can view notification templates" ON public.notification_templates
    FOR SELECT USING (true);

CREATE POLICY "Users can create notification templates for their organization" ON public.notification_templates
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_memberships om
            WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin', 'manager')
        )
    );

CREATE POLICY "Users can update notification templates for their organization" ON public.notification_templates
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.organization_memberships om
            WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin', 'manager')
        )
    );

-- Create RLS policies for referee_notification_settings
CREATE POLICY "Users can view notification settings for referees in their organization" ON public.referee_notification_settings
    FOR SELECT USING (
        referee_id IN (
            SELECT r.id FROM public.referees r
            JOIN public.organizations o ON r.organization_id = o.id
            JOIN public.organization_memberships om ON o.id = om.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create notification settings for referees in their organization" ON public.referee_notification_settings
    FOR INSERT WITH CHECK (
        referee_id IN (
            SELECT r.id FROM public.referees r
            JOIN public.organizations o ON r.organization_id = o.id
            JOIN public.organization_memberships om ON o.id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin', 'manager')
        )
    );

CREATE POLICY "Users can update notification settings for referees in their organization" ON public.referee_notification_settings
    FOR UPDATE USING (
        referee_id IN (
            SELECT r.id FROM public.referees r
            JOIN public.organizations o ON r.organization_id = o.id
            JOIN public.organization_memberships om ON o.id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin', 'manager')
        )
    );

-- Create RLS policies for referee_notifications
CREATE POLICY "Users can view notifications for referees in their organization" ON public.referee_notifications
    FOR SELECT USING (
        referee_id IN (
            SELECT r.id FROM public.referees r
            JOIN public.organizations o ON r.organization_id = o.id
            JOIN public.organization_memberships om ON o.id = om.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create notifications for referees in their organization" ON public.referee_notifications
    FOR INSERT WITH CHECK (
        referee_id IN (
            SELECT r.id FROM public.referees r
            JOIN public.organizations o ON r.organization_id = o.id
            JOIN public.organization_memberships om ON o.id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin', 'manager')
        )
    );

CREATE POLICY "Users can update notifications for referees in their organization" ON public.referee_notifications
    FOR UPDATE USING (
        referee_id IN (
            SELECT r.id FROM public.referees r
            JOIN public.organizations o ON r.organization_id = o.id
            JOIN public.organization_memberships om ON o.id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin', 'manager')
        )
    );

-- Create RLS policies for notification_delivery_logs
CREATE POLICY "Users can view delivery logs for notifications in their organization" ON public.notification_delivery_logs
    FOR SELECT USING (
        notification_id IN (
            SELECT n.id FROM public.referee_notifications n
            JOIN public.referees r ON n.referee_id = r.id
            JOIN public.organizations o ON r.organization_id = o.id
            JOIN public.organization_memberships om ON o.id = om.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

-- Insert default notification templates
INSERT INTO public.notification_templates (name, type, subject, email_body, sms_body, variables) VALUES
(
    'Match Assignment',
    'match_assignment',
    'Match Assignment: {{tournament_name}} - {{home_team}} vs {{away_team}}',
    'Dear {{referee_name}},\n\nYou have been assigned to referee the following match:\n\nTournament: {{tournament_name}}\nMatch: {{home_team}} vs {{away_team}}\nDate: {{match_date}}\nVenue: {{venue_name}}\n\nPlease confirm your availability and prepare accordingly.\n\nBest regards,\nTournament Management',
    'Match Assignment: {{tournament_name}} - {{home_team}} vs {{away_team}} on {{match_date}} at {{venue_name}}. Please confirm availability.',
    '["referee_name", "tournament_name", "home_team", "away_team", "match_date", "venue_name"]'
),
(
    'Match Schedule Change',
    'match_schedule_change',
    'URGENT: Match Schedule Change - {{tournament_name}}',
    'Dear {{referee_name}},\n\nIMPORTANT: The schedule for your assigned match has changed:\n\nTournament: {{tournament_name}}\nMatch: {{home_team}} vs {{away_team}}\nOriginal Date: {{original_date}}\nNew Date: {{new_date}}\n{{#venue_change}}New Venue: {{new_venue}}{{/venue_change}}\n\nPlease update your schedule accordingly.\n\nBest regards,\nTournament Management',
    'URGENT: Match schedule changed. {{tournament_name}} - {{home_team}} vs {{away_team}}. New time: {{new_date}}.',
    '["referee_name", "tournament_name", "home_team", "away_team", "original_date", "new_date", "venue_change", "new_venue"]'
),
(
    'Match Reminder',
    'match_reminder',
    'Reminder: Upcoming Match - {{tournament_name}}',
    'Dear {{referee_name}},\n\nThis is a reminder for your upcoming match:\n\nTournament: {{tournament_name}}\nMatch: {{home_team}} vs {{away_team}}\nDate: {{match_date}}\nVenue: {{venue_name}}\nTime until match: {{time_until_match}}\n\nPlease arrive at least 30 minutes before kickoff.\n\nBest regards,\nTournament Management',
    'Reminder: {{tournament_name}} - {{home_team}} vs {{away_team}} in {{time_until_match}}. Venue: {{venue_name}}',
    '["referee_name", "tournament_name", "home_team", "away_team", "match_date", "venue_name", "time_until_match"]'
),
(
    'Match Cancellation',
    'match_cancellation',
    'Match Cancelled: {{tournament_name}} - {{home_team}} vs {{away_team}}',
    'Dear {{referee_name}},\n\nUnfortunately, the following match has been cancelled:\n\nTournament: {{tournament_name}}\nMatch: {{home_team}} vs {{away_team}}\nOriginal Date: {{match_date}}\nReason: {{cancellation_reason}}\n\n{{#refund_required}}A refund will be processed automatically.{{/refund_required}}\n\nWe apologize for any inconvenience.\n\nBest regards,\nTournament Management',
    'Match cancelled: {{tournament_name}} - {{home_team}} vs {{away_team}}. Reason: {{cancellation_reason}}',
    '["referee_name", "tournament_name", "home_team", "away_team", "match_date", "cancellation_reason", "refund_required"]'
),
(
    'Tournament Update',
    'tournament_update',
    'Tournament Update: {{tournament_name}}',
    'Dear {{referee_name}},\n\nWe have an important update regarding {{tournament_name}}:\n\n{{update_message}}\n\nPlease review this information and contact us if you have any questions.\n\nBest regards,\nTournament Management',
    'Tournament update: {{tournament_name}} - {{update_message}}',
    '["referee_name", "tournament_name", "update_message"]'
)
ON CONFLICT (name) DO NOTHING;

-- Create function to automatically create notification settings for new referees
CREATE OR REPLACE FUNCTION public.create_referee_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.referee_notification_settings (referee_id)
    VALUES (NEW.id)
    ON CONFLICT (referee_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create notification settings for new referees
CREATE TRIGGER create_referee_notification_settings_trigger
    AFTER INSERT ON public.referees
    FOR EACH ROW
    EXECUTE FUNCTION public.create_referee_notification_settings();

-- Create function to clean up expired notifications
CREATE OR REPLACE FUNCTION public.cleanup_expired_notifications()
RETURNS void AS $$
BEGIN
    UPDATE public.referee_notifications
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending' 
    AND expires_at IS NOT NULL 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to process scheduled notifications
CREATE OR REPLACE FUNCTION public.process_scheduled_notifications()
RETURNS void AS $$
BEGIN
    -- This function would be called by a scheduled job to process notifications
    -- that are scheduled for future delivery
    UPDATE public.referee_notifications
    SET status = 'pending', updated_at = NOW()
    WHERE status = 'scheduled'
    AND scheduled_for IS NOT NULL
    AND scheduled_for <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
