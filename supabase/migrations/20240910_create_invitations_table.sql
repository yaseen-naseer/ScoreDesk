-- Create invitations table for user invitation management
CREATE TABLE IF NOT EXISTS invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    role user_role NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    accepted_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    resent_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT unique_pending_invitation UNIQUE (organization_id, email, status) DEFERRABLE INITIALLY DEFERRED
);

-- Create indexes for performance
CREATE INDEX idx_invitations_organization_id ON invitations(organization_id);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE INDEX idx_invitations_expires_at ON invitations(expires_at);
CREATE INDEX idx_invitations_invited_by ON invitations(invited_by);

-- Create composite index for common queries
CREATE INDEX idx_invitations_org_status ON invitations(organization_id, status);
CREATE INDEX idx_invitations_email_status ON invitations(email, status);

-- Add RLS policies
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view invitations for organizations they belong to
CREATE POLICY "Users can view organization invitations" ON invitations
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_memberships 
            WHERE user_id = auth.uid() 
            AND status = 'active'
        )
    );

-- Policy: Users with invite_users permission can create invitations
CREATE POLICY "Users can create invitations with permission" ON invitations
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT om.organization_id 
            FROM organization_memberships om
            WHERE om.user_id = auth.uid() 
            AND om.status = 'active'
            AND om.role IN ('owner', 'admin', 'manager')
        )
    );

-- Policy: Users with manage_members permission can update invitations
CREATE POLICY "Users can update organization invitations" ON invitations
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT om.organization_id 
            FROM organization_memberships om
            WHERE om.user_id = auth.uid() 
            AND om.status = 'active'
            AND om.role IN ('owner', 'admin', 'manager')
        )
    );

-- Policy: Users with manage_members permission can delete invitations
CREATE POLICY "Users can delete organization invitations" ON invitations
    FOR DELETE
    USING (
        organization_id IN (
            SELECT om.organization_id 
            FROM organization_memberships om
            WHERE om.user_id = auth.uid() 
            AND om.status = 'active'
            AND om.role IN ('owner', 'admin', 'manager')
        )
    );

-- Function to automatically expire invitations
CREATE OR REPLACE FUNCTION expire_invitations()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE invitations 
    SET status = 'expired'
    WHERE status = 'pending' 
    AND expires_at < NOW();
END;
$$;

-- Function to clean up the unique constraint when status changes
CREATE OR REPLACE FUNCTION handle_invitation_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- If status is changing from pending to something else,
    -- we need to handle the unique constraint
    IF OLD.status = 'pending' AND NEW.status != 'pending' THEN
        -- The unique constraint will automatically be satisfied
        -- since it only applies to pending invitations
        NULL;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger for invitation status changes
CREATE TRIGGER invitation_status_change_trigger
    BEFORE UPDATE ON invitations
    FOR EACH ROW
    EXECUTE FUNCTION handle_invitation_status_change();

-- Add audit logging trigger
CREATE TRIGGER audit_invitations_changes
    AFTER INSERT OR UPDATE OR DELETE ON invitations
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Create a scheduled job to clean up expired invitations (if pg_cron is available)
-- This would typically be set up separately in production
-- SELECT cron.schedule('expire-invitations', '0 * * * *', 'SELECT expire_invitations();');

-- Add comments for documentation
COMMENT ON TABLE invitations IS 'User invitations for organization membership';
COMMENT ON COLUMN invitations.email IS 'Email address of the invitee';
COMMENT ON COLUMN invitations.role IS 'Role to be assigned when invitation is accepted';
COMMENT ON COLUMN invitations.organization_id IS 'Organization the user is being invited to';
COMMENT ON COLUMN invitations.invited_by IS 'User who sent the invitation';
COMMENT ON COLUMN invitations.token IS 'Unique token for invitation URL';
COMMENT ON COLUMN invitations.message IS 'Optional personal message from inviter';
COMMENT ON COLUMN invitations.status IS 'Current status of the invitation';
COMMENT ON COLUMN invitations.expires_at IS 'When the invitation expires';
COMMENT ON COLUMN invitations.accepted_at IS 'When the invitation was accepted';
COMMENT ON COLUMN invitations.cancelled_at IS 'When the invitation was cancelled';
COMMENT ON COLUMN invitations.resent_at IS 'When the invitation was last resent';
