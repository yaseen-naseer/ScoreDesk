/**
 * Invitation Service
 * Handles user invitations, email notifications, and invitation management
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'

export interface CreateInvitationData {
  email: string
  role: Database['public']['Enums']['user_role']
  organizationId: string
  message?: string
  expiresInHours?: number
}

export interface InvitationDetails {
  id: string
  email: string
  role: Database['public']['Enums']['user_role']
  status: 'pending' | 'accepted' | 'expired' | 'cancelled'
  organizationId: string
  organizationName: string
  invitedBy: string
  invitedByName: string
  message?: string
  expiresAt: string
  createdAt: string
  acceptedAt?: string
  token: string
}

export interface InvitationStats {
  total: number
  pending: number
  accepted: number
  expired: number
  cancelled: number
}

class InvitationService {
  private supabase = createClientComponentClient<Database>()

  /**
   * Create a new invitation
   */
  async createInvitation({
    email,
    role,
    organizationId,
    message,
    expiresInHours = 168 // 7 days default
  }: CreateInvitationData): Promise<{ success: boolean; invitation?: any; error?: string }> {
    try {
      // Check if user is already a member
      const { data: existingMember } = await this.supabase
        .from('organization_memberships')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('email', email)
        .single()

      if (existingMember) {
        return {
          success: false,
          error: 'User is already a member of this organization'
        }
      }

      // Check if there's already a pending invitation
      const { data: existingInvitation } = await this.supabase
        .from('invitations')
        .select('id, status')
        .eq('organization_id', organizationId)
        .eq('email', email)
        .eq('status', 'pending')
        .single()

      if (existingInvitation) {
        return {
          success: false,
          error: 'There is already a pending invitation for this email'
        }
      }

      // Generate invitation token
      const token = this.generateInvitationToken()
      
      // Calculate expiration date
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + expiresInHours)

      // Get current user for audit
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        return {
          success: false,
          error: 'You must be logged in to send invitations'
        }
      }

      // Create invitation record
      const { data: invitation, error } = await this.supabase
        .from('invitations')
        .insert({
          email,
          role,
          organization_id: organizationId,
          invited_by: user.id,
          message,
          expires_at: expiresAt.toISOString(),
          token,
          status: 'pending'
        })
        .select(`
          *,
          organization:organizations(name),
          inviter:user_profiles!invitations_invited_by_fkey(full_name, email)
        `)
        .single()

      if (error) {
        console.error('Error creating invitation:', error)
        return {
          success: false,
          error: 'Failed to create invitation'
        }
      }

      // Send email notification
      await this.sendInvitationEmail(invitation)

      return {
        success: true,
        invitation
      }
    } catch (error) {
      console.error('Error in createInvitation:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
    }
  }

  /**
   * Get invitation by token
   */
  async getInvitationByToken(token: string): Promise<InvitationDetails | null> {
    try {
      const { data, error } = await this.supabase
        .from('invitations')
        .select(`
          *,
          organization:organizations(name),
          inviter:user_profiles!invitations_invited_by_fkey(full_name, email)
        `)
        .eq('token', token)
        .single()

      if (error || !data) {
        return null
      }

      return {
        id: data.id,
        email: data.email,
        role: data.role,
        status: data.status as any,
        organizationId: data.organization_id,
        organizationName: (data.organization as any)?.name || 'Unknown Organization',
        invitedBy: data.invited_by,
        invitedByName: (data.inviter as any)?.full_name || 'Unknown',
        message: data.message,
        expiresAt: data.expires_at,
        createdAt: data.created_at,
        acceptedAt: data.accepted_at,
        token: data.token
      }
    } catch (error) {
      console.error('Error getting invitation:', error)
      return null
    }
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const invitation = await this.getInvitationByToken(token)
      
      if (!invitation) {
        return {
          success: false,
          error: 'Invitation not found'
        }
      }

      if (invitation.status !== 'pending') {
        return {
          success: false,
          error: 'This invitation has already been processed'
        }
      }

      if (new Date() > new Date(invitation.expiresAt)) {
        // Mark as expired
        await this.supabase
          .from('invitations')
          .update({ status: 'expired' })
          .eq('token', token)

        return {
          success: false,
          error: 'This invitation has expired'
        }
      }

      // Get current user
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        return {
          success: false,
          error: 'You must be logged in to accept invitations'
        }
      }

      // Check if user email matches invitation
      if (user.email !== invitation.email) {
        return {
          success: false,
          error: 'This invitation was sent to a different email address'
        }
      }

      // Start transaction-like operations
      const { error: membershipError } = await this.supabase
        .from('organization_memberships')
        .insert({
          organization_id: invitation.organizationId,
          user_id: user.id,
          role: invitation.role,
          status: 'active',
          joined_at: new Date().toISOString()
        })

      if (membershipError) {
        console.error('Error creating membership:', membershipError)
        return {
          success: false,
          error: 'Failed to create organization membership'
        }
      }

      // Update invitation status
      const { error: invitationError } = await this.supabase
        .from('invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('token', token)

      if (invitationError) {
        console.error('Error updating invitation:', invitationError)
        // Note: In a real app, you'd want to rollback the membership creation
      }

      return {
        success: true
      }
    } catch (error) {
      console.error('Error accepting invitation:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
    }
  }

  /**
   * Cancel an invitation
   */
  async cancelInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('invitations')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', invitationId)

      if (error) {
        return {
          success: false,
          error: 'Failed to cancel invitation'
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Error cancelling invitation:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
    }
  }

  /**
   * Resend an invitation
   */
  async resendInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get invitation details
      const { data: invitation, error: fetchError } = await this.supabase
        .from('invitations')
        .select(`
          *,
          organization:organizations(name),
          inviter:user_profiles!invitations_invited_by_fkey(full_name, email)
        `)
        .eq('id', invitationId)
        .single()

      if (fetchError || !invitation) {
        return {
          success: false,
          error: 'Invitation not found'
        }
      }

      if (invitation.status !== 'pending') {
        return {
          success: false,
          error: 'Can only resend pending invitations'
        }
      }

      // Extend expiration by 7 days
      const newExpiresAt = new Date()
      newExpiresAt.setDate(newExpiresAt.getDate() + 7)

      // Update expiration
      const { error: updateError } = await this.supabase
        .from('invitations')
        .update({
          expires_at: newExpiresAt.toISOString(),
          resent_at: new Date().toISOString()
        })
        .eq('id', invitationId)

      if (updateError) {
        return {
          success: false,
          error: 'Failed to update invitation'
        }
      }

      // Resend email
      await this.sendInvitationEmail({
        ...invitation,
        expires_at: newExpiresAt.toISOString()
      })

      return { success: true }
    } catch (error) {
      console.error('Error resending invitation:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
    }
  }

  /**
   * Get organization invitations
   */
  async getOrganizationInvitations(organizationId: string): Promise<InvitationDetails[]> {
    try {
      const { data, error } = await this.supabase
        .from('invitations')
        .select(`
          *,
          organization:organizations(name),
          inviter:user_profiles!invitations_invited_by_fkey(full_name, email)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching invitations:', error)
        return []
      }

      return data?.map(invitation => ({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status as any,
        organizationId: invitation.organization_id,
        organizationName: (invitation.organization as any)?.name || 'Unknown Organization',
        invitedBy: invitation.invited_by,
        invitedByName: (invitation.inviter as any)?.full_name || 'Unknown',
        message: invitation.message,
        expiresAt: invitation.expires_at,
        createdAt: invitation.created_at,
        acceptedAt: invitation.accepted_at,
        token: invitation.token
      })) || []
    } catch (error) {
      console.error('Error in getOrganizationInvitations:', error)
      return []
    }
  }

  /**
   * Get invitation statistics
   */
  async getInvitationStats(organizationId: string): Promise<InvitationStats> {
    try {
      const { data, error } = await this.supabase
        .from('invitations')
        .select('status')
        .eq('organization_id', organizationId)

      if (error) {
        console.error('Error fetching invitation stats:', error)
        return { total: 0, pending: 0, accepted: 0, expired: 0, cancelled: 0 }
      }

      const stats = data?.reduce((acc, invitation) => {
        acc.total++
        acc[invitation.status as keyof InvitationStats]++
        return acc
      }, { total: 0, pending: 0, accepted: 0, expired: 0, cancelled: 0 }) || 
      { total: 0, pending: 0, accepted: 0, expired: 0, cancelled: 0 }

      return stats
    } catch (error) {
      console.error('Error in getInvitationStats:', error)
      return { total: 0, pending: 0, accepted: 0, expired: 0, cancelled: 0 }
    }
  }

  /**
   * Clean up expired invitations
   */
  async cleanupExpiredInvitations(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('invitations')
        .update({ status: 'expired' })
        .eq('status', 'pending')
        .lt('expires_at', new Date().toISOString())
        .select('id')

      if (error) {
        console.error('Error cleaning up expired invitations:', error)
        return 0
      }

      return data?.length || 0
    } catch (error) {
      console.error('Error in cleanupExpiredInvitations:', error)
      return 0
    }
  }

  /**
   * Generate a secure invitation token
   */
  private generateInvitationToken(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Send invitation email (placeholder - would integrate with email service)
   */
  private async sendInvitationEmail(invitation: any): Promise<void> {
    // In a real application, this would integrate with an email service like:
    // - SendGrid
    // - Mailgun
    // - AWS SES
    // - Resend
    // - Postmark
    
    const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invitations/${invitation.token}`
    
    console.log('📧 Email would be sent to:', invitation.email)
    console.log('🔗 Invitation URL:', invitationUrl)
    console.log('🏢 Organization:', (invitation.organization as any)?.name)
    console.log('👤 Invited by:', (invitation.inviter as any)?.full_name)
    console.log('🎭 Role:', invitation.role)
    
    // Placeholder email content
    const emailContent = {
      to: invitation.email,
      subject: `You're invited to join ${(invitation.organization as any)?.name} on ScoreDesk`,
      html: `
        <h2>You've been invited to join ${(invitation.organization as any)?.name}</h2>
        <p>Hello!</p>
        <p>${(invitation.inviter as any)?.full_name} has invited you to join their organization on ScoreDesk as a ${invitation.role}.</p>
        ${invitation.message ? `<p><strong>Personal message:</strong> ${invitation.message}</p>` : ''}
        <p>
          <a href="${invitationUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Accept Invitation
          </a>
        </p>
        <p>This invitation will expire on ${new Date(invitation.expires_at).toLocaleDateString()}.</p>
        <p>If you don't have a ScoreDesk account yet, you'll be able to create one when you accept the invitation.</p>
        <hr>
        <p><small>If you believe you received this email in error, you can safely ignore it.</small></p>
      `
    }
    
    // TODO: Integrate with actual email service
    // await emailService.send(emailContent)
  }
}

export const invitationService = new InvitationService()
