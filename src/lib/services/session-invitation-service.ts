/**
 * Session Invitation Service
 * Handles invitation workflow for match sessions
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'
import { matchSessionService } from './match-session-service'

export interface SessionInvitation {
  id: string
  session_id: string
  invited_user_id: string
  invited_by: string
  role: Database['public']['Enums']['user_role']
  permissions: Record<string, any>
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  expires_at: string
  created_at: string
  message?: string
}

export interface InvitationRequest {
  sessionId: string
  invitedUserId: string
  role: Database['public']['Enums']['user_role']
  permissions?: Record<string, any>
  message?: string
  expiresInDays?: number
}

export interface InvitationResponse {
  invitationId: string
  status: 'accepted' | 'declined'
  message?: string
}

export interface InvitationStats {
  totalSent: number
  totalAccepted: number
  totalDeclined: number
  totalExpired: number
  acceptanceRate: number
}

class SessionInvitationService {
  private supabase = createClientComponentClient<Database>()
  private readonly DEFAULT_EXPIRY_DAYS = 7
  private readonly MAX_MESSAGE_LENGTH = 500

  /**
   * Send invitation to join a match session
   */
  async sendInvitation(
    invitationRequest: InvitationRequest,
    invitedBy: string
  ): Promise<{ success: boolean; invitation?: SessionInvitation; error?: string }> {
    try {
      // Validate invitation request
      const validation = await this.validateInvitationRequest(invitationRequest, invitedBy)
      if (!validation.valid) {
        return { success: false, error: validation.error }
      }

      // Check if user is already in session
      const existingParticipant = await matchSessionService.getParticipant(
        invitationRequest.sessionId,
        invitationRequest.invitedUserId
      )
      if (existingParticipant) {
        return { success: false, error: 'User is already in this session' }
      }

      // Check for existing pending invitation
      const existingInvitation = await this.getPendingInvitation(
        invitationRequest.sessionId,
        invitationRequest.invitedUserId
      )
      if (existingInvitation) {
        return { success: false, error: 'User already has a pending invitation' }
      }

      // Calculate expiry date
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + (invitationRequest.expiresInDays || this.DEFAULT_EXPIRY_DAYS))

      // Create invitation
      const invitationData = {
        session_id: invitationRequest.sessionId,
        invited_user_id: invitationRequest.invitedUserId,
        invited_by: invitedBy,
        role: invitationRequest.role,
        permissions: invitationRequest.permissions || {},
        expires_at: expiresAt.toISOString(),
        message: invitationRequest.message?.substring(0, this.MAX_MESSAGE_LENGTH)
      }

      const { data: invitation, error } = await this.supabase
        .from('session_invitations')
        .insert(invitationData)
        .select()
        .single()

      if (error) {
        console.error('Error creating invitation:', error)
        return { success: false, error: error.message }
      }

      // Record activity
      await matchSessionService.updateActivity(
        invitationRequest.sessionId,
        invitedBy,
        'sent_invitation',
        {
          invitedUserId: invitationRequest.invitedUserId,
          role: invitationRequest.role,
          invitationId: invitation.id
        }
      )

      // TODO: Send notification to invited user
      await this.notifyUser(invitationRequest.invitedUserId, {
        type: 'session_invitation',
        invitationId: invitation.id,
        sessionId: invitationRequest.sessionId,
        inviterName: await this.getUserDisplayName(invitedBy),
        message: invitationRequest.message
      })

      return { success: true, invitation }
    } catch (error) {
      console.error('Error in sendInvitation:', error)
      return { success: false, error: 'Failed to send invitation' }
    }
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(
    invitationId: string,
    userId: string
  ): Promise<{ success: boolean; participant?: any; error?: string }> {
    try {
      // Get invitation
      const invitation = await this.getInvitation(invitationId)
      if (!invitation) {
        return { success: false, error: 'Invitation not found' }
      }

      if (invitation.invited_user_id !== userId) {
        return { success: false, error: 'Unauthorized to accept this invitation' }
      }

      if (invitation.status !== 'pending') {
        return { success: false, error: 'Invitation is no longer pending' }
      }

      if (new Date(invitation.expires_at) < new Date()) {
        // Mark as expired
        await this.updateInvitationStatus(invitationId, 'expired')
        return { success: false, error: 'Invitation has expired' }
      }

      // Join the session
      const joinResult = await matchSessionService.joinSession(
        invitation.session_id,
        userId,
        invitation.role,
        invitation.permissions
      )

      if (!joinResult.success) {
        return { success: false, error: joinResult.error }
      }

      // Update invitation status
      await this.updateInvitationStatus(invitationId, 'accepted')

      // Record activity
      await matchSessionService.updateActivity(
        invitation.session_id,
        userId,
        'accepted_invitation',
        { invitationId, inviterId: invitation.invited_by }
      )

      // TODO: Notify inviter
      await this.notifyUser(invitation.invited_by, {
        type: 'invitation_accepted',
        invitationId,
        sessionId: invitation.session_id,
        acceptedByName: await this.getUserDisplayName(userId)
      })

      return { success: true, participant: joinResult.participant }
    } catch (error) {
      console.error('Error in acceptInvitation:', error)
      return { success: false, error: 'Failed to accept invitation' }
    }
  }

  /**
   * Decline an invitation
   */
  async declineInvitation(
    invitationId: string,
    userId: string,
    message?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get invitation
      const invitation = await this.getInvitation(invitationId)
      if (!invitation) {
        return { success: false, error: 'Invitation not found' }
      }

      if (invitation.invited_user_id !== userId) {
        return { success: false, error: 'Unauthorized to decline this invitation' }
      }

      if (invitation.status !== 'pending') {
        return { success: false, error: 'Invitation is no longer pending' }
      }

      // Update invitation status
      await this.updateInvitationStatus(invitationId, 'declined')

      // Record activity
      await matchSessionService.updateActivity(
        invitation.session_id,
        userId,
        'declined_invitation',
        { invitationId, message }
      )

      // TODO: Notify inviter
      await this.notifyUser(invitation.invited_by, {
        type: 'invitation_declined',
        invitationId,
        sessionId: invitation.session_id,
        declinedByName: await this.getUserDisplayName(userId),
        message
      })

      return { success: true }
    } catch (error) {
      console.error('Error in declineInvitation:', error)
      return { success: false, error: 'Failed to decline invitation' }
    }
  }

  /**
   * Get invitation by ID
   */
  async getInvitation(invitationId: string): Promise<SessionInvitation | null> {
    try {
      const { data, error } = await this.supabase
        .from('session_invitations')
        .select('*')
        .eq('id', invitationId)
        .single()

      if (error) {
        console.error('Error getting invitation:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in getInvitation:', error)
      return null
    }
  }

  /**
   * Get pending invitation for user and session
   */
  async getPendingInvitation(
    sessionId: string,
    userId: string
  ): Promise<SessionInvitation | null> {
    try {
      const { data, error } = await this.supabase
        .from('session_invitations')
        .select('*')
        .eq('session_id', sessionId)
        .eq('invited_user_id', userId)
        .eq('status', 'pending')
        .single()

      if (error) {
        return null
      }

      return data
    } catch (error) {
      console.error('Error in getPendingInvitation:', error)
      return null
    }
  }

  /**
   * Get invitations for a user
   */
  async getUserInvitations(
    userId: string,
    status?: string
  ): Promise<SessionInvitation[]> {
    try {
      let query = this.supabase
        .from('session_invitations')
        .select(`
          *,
          match_sessions!inner(
            id,
            session_name,
            match_id,
            created_by
          )
        `)
        .eq('invited_user_id', userId)
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error getting user invitations:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getUserInvitations:', error)
      return []
    }
  }

  /**
   * Get invitations sent by a user
   */
  async getSentInvitations(
    userId: string,
    status?: string
  ): Promise<SessionInvitation[]> {
    try {
      let query = this.supabase
        .from('session_invitations')
        .select(`
          *,
          match_sessions!inner(
            id,
            session_name,
            match_id
          )
        `)
        .eq('invited_by', userId)
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error getting sent invitations:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getSentInvitations:', error)
      return []
    }
  }

  /**
   * Update invitation status
   */
  private async updateInvitationStatus(
    invitationId: string,
    status: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('session_invitations')
        .update({ status })
        .eq('id', invitationId)
    } catch (error) {
      console.error('Error updating invitation status:', error)
    }
  }

  /**
   * Validate invitation request
   */
  private async validateInvitationRequest(
    request: InvitationRequest,
    invitedBy: string
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // Check if session exists and is active
      const session = await matchSessionService.getSession(request.sessionId)
      if (!session || !session.is_active) {
        return { valid: false, error: 'Session not found or inactive' }
      }

      // Check if inviter is in the session
      const participant = await matchSessionService.getParticipant(request.sessionId, invitedBy)
      if (!participant || !participant.is_active) {
        return { valid: false, error: 'You must be in the session to send invitations' }
      }

      // Check if inviter has permission to invite users
      const hasPermission = await matchSessionService.checkSessionPermission(invitedBy, 'canInviteUsers')
      if (!hasPermission) {
        return { valid: false, error: 'Insufficient permissions to send invitations' }
      }

      // Check if invited user exists
      const { data: userProfile, error } = await this.supabase
        .from('user_profiles')
        .select('id')
        .eq('id', request.invitedUserId)
        .single()

      if (error || !userProfile) {
        return { valid: false, error: 'Invited user not found' }
      }

      // Check session capacity
      const participantCount = await matchSessionService.getParticipantCount(request.sessionId)
      if (participantCount >= 20) {
        return { valid: false, error: 'Session at maximum capacity' }
      }

      return { valid: true }
    } catch (error) {
      console.error('Error validating invitation request:', error)
      return { valid: false, error: 'Validation failed' }
    }
  }

  /**
   * Get user display name
   */
  private async getUserDisplayName(userId: string): Promise<string> {
    try {
      const { data: profile, error } = await this.supabase
        .from('user_profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single()

      if (error || !profile) {
        return 'Unknown User'
      }

      return profile.full_name || profile.email || 'Unknown User'
    } catch (error) {
      console.error('Error getting user display name:', error)
      return 'Unknown User'
    }
  }

  /**
   * Notify user (placeholder for notification system)
   */
  private async notifyUser(userId: string, notification: any): Promise<void> {
    try {
      // TODO: Implement notification system
      console.log('Notification for user:', userId, notification)
    } catch (error) {
      console.error('Error sending notification:', error)
    }
  }

  /**
   * Get invitation statistics
   */
  async getInvitationStats(userId: string): Promise<InvitationStats> {
    try {
      // Get sent invitations
      const { count: totalSent } = await this.supabase
        .from('session_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('invited_by', userId)

      // Get accepted invitations
      const { count: totalAccepted } = await this.supabase
        .from('session_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('invited_by', userId)
        .eq('status', 'accepted')

      // Get declined invitations
      const { count: totalDeclined } = await this.supabase
        .from('session_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('invited_by', userId)
        .eq('status', 'declined')

      // Get expired invitations
      const { count: totalExpired } = await this.supabase
        .from('session_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('invited_by', userId)
        .eq('status', 'expired')

      const total = totalSent || 0
      const accepted = totalAccepted || 0
      const acceptanceRate = total > 0 ? (accepted / total) * 100 : 0

      return {
        totalSent: total,
        totalAccepted: accepted,
        totalDeclined: totalDeclined || 0,
        totalExpired: totalExpired || 0,
        acceptanceRate: Math.round(acceptanceRate * 100) / 100
      }
    } catch (error) {
      console.error('Error getting invitation stats:', error)
      return {
        totalSent: 0,
        totalAccepted: 0,
        totalDeclined: 0,
        totalExpired: 0,
        acceptanceRate: 0
      }
    }
  }

  /**
   * Clean up expired invitations
   */
  async cleanupExpiredInvitations(): Promise<void> {
    try {
      const now = new Date().toISOString()

      await this.supabase
        .from('session_invitations')
        .update({ status: 'expired' })
        .eq('status', 'pending')
        .lt('expires_at', now)

      console.log('Expired invitations cleaned up')
    } catch (error) {
      console.error('Error cleaning up expired invitations:', error)
    }
  }

  /**
   * Cancel an invitation
   */
  async cancelInvitation(
    invitationId: string,
    cancelledBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const invitation = await this.getInvitation(invitationId)
      if (!invitation) {
        return { success: false, error: 'Invitation not found' }
      }

      if (invitation.invited_by !== cancelledBy) {
        return { success: false, error: 'Unauthorized to cancel this invitation' }
      }

      if (invitation.status !== 'pending') {
        return { success: false, error: 'Can only cancel pending invitations' }
      }

      await this.updateInvitationStatus(invitationId, 'declined')

      // Record activity
      await matchSessionService.updateActivity(
        invitation.session_id,
        cancelledBy,
        'cancelled_invitation',
        { invitationId, invitedUserId: invitation.invited_user_id }
      )

      return { success: true }
    } catch (error) {
      console.error('Error in cancelInvitation:', error)
      return { success: false, error: 'Failed to cancel invitation' }
    }
  }
}

// Export singleton instance
export const sessionInvitationService = new SessionInvitationService()

// Export types
export type {
  SessionInvitation,
  InvitationRequest,
  InvitationResponse,
  InvitationStats
}
