/**
 * Match Session Service
 * Comprehensive service for managing multi-user match collaboration sessions
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'
import { EventEmitter } from 'events'

export interface MatchSession {
  id: string
  match_id: string
  session_name: string
  is_active: boolean
  created_by: string
  created_at: string
  expires_at?: string
}

export interface SessionParticipant {
  id: string
  session_id: string
  user_id: string
  role: Database['public']['Enums']['user_role']
  permissions: Record<string, any>
  is_active: boolean
  joined_at: string
  last_activity?: string
}

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

export interface SessionActivity {
  id: string
  session_id: string
  user_id: string
  action: string
  details: Record<string, any>
  timestamp: string
  metadata?: Record<string, any>
}

export interface SessionPermissions {
  canStartSession: boolean
  canInviteUsers: boolean
  canModifySession: boolean
  canEndSession: boolean
  canViewParticipants: boolean
  canKickUsers: boolean
  canAssignRoles: boolean
  canViewActivity: boolean
}

export interface SessionStats {
  totalSessions: number
  activeSessions: number
  totalParticipants: number
  averageSessionDuration: number
  mostActiveUser: string
  sessionActivityCount: number
}

export interface SessionFilters {
  matchId?: string
  isActive?: boolean
  createdBy?: string
  dateFrom?: Date
  dateTo?: Date
  role?: Database['public']['Enums']['user_role']
}

class MatchSessionService extends EventEmitter {
  private supabase = createClientComponentClient<Database>()
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000 // 24 hours
  private readonly INVITATION_TIMEOUT = 7 * 24 * 60 * 60 * 1000 // 7 days
  private readonly ACTIVITY_TIMEOUT = 5 * 60 * 1000 // 5 minutes

  /**
   * Create a new match session
   */
  async createSession(
    matchId: string,
    sessionName: string,
    createdBy: string,
    expiresAt?: Date
  ): Promise<{ success: boolean; session?: MatchSession; error?: string }> {
    try {
      // Validate user permissions
      const hasPermission = await this.checkSessionPermission(createdBy, 'createSession')
      if (!hasPermission) {
        return { success: false, error: 'Insufficient permissions to create session' }
      }

      // Check if user is already in an active session for this match
      const existingSession = await this.getActiveSessionForMatch(matchId, createdBy)
      if (existingSession) {
        return { success: false, error: 'User already has an active session for this match' }
      }

      const sessionData = {
        match_id: matchId,
        session_name: sessionName,
        created_by: createdBy,
        expires_at: expiresAt?.toISOString(),
        is_active: true
      }

      const { data: session, error } = await this.supabase
        .from('match_sessions')
        .insert(sessionData)
        .select()
        .single()

      if (error) {
        console.error('Error creating session:', error)
        return { success: false, error: error.message }
      }

      // Auto-join creator to session
      await this.joinSession(session.id, createdBy, 'referee', {})

      // Emit session created event
      this.emit('sessionCreated', session)

      return { success: true, session }
    } catch (error) {
      console.error('Error in createSession:', error)
      return { success: false, error: 'Failed to create session' }
    }
  }

  /**
   * Join an existing session
   */
  async joinSession(
    sessionId: string,
    userId: string,
    role: Database['public']['Enums']['user_role'],
    permissions: Record<string, any> = {}
  ): Promise<{ success: boolean; participant?: SessionParticipant; error?: string }> {
    try {
      // Check if session exists and is active
      const session = await this.getSession(sessionId)
      if (!session || !session.is_active) {
        return { success: false, error: 'Session not found or inactive' }
      }

      // Check if user is already in session
      const existingParticipant = await this.getParticipant(sessionId, userId)
      if (existingParticipant) {
        return { success: false, error: 'User already in session' }
      }

      // Check session capacity (max 20 participants)
      const participantCount = await this.getParticipantCount(sessionId)
      if (participantCount >= 20) {
        return { success: false, error: 'Session at maximum capacity' }
      }

      const participantData = {
        session_id: sessionId,
        user_id: userId,
        role,
        permissions,
        is_active: true,
        last_activity: new Date().toISOString()
      }

      const { data: participant, error } = await this.supabase
        .from('match_session_participants')
        .insert(participantData)
        .select()
        .single()

      if (error) {
        console.error('Error joining session:', error)
        return { success: false, error: error.message }
      }

      // Record activity
      await this.recordActivity(sessionId, userId, 'joined_session', { role })

      // Emit participant joined event
      this.emit('participantJoined', participant)

      return { success: true, participant }
    } catch (error) {
      console.error('Error in joinSession:', error)
      return { success: false, error: 'Failed to join session' }
    }
  }

  /**
   * Leave a session
   */
  async leaveSession(
    sessionId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('match_session_participants')
        .update({ 
          is_active: false,
          last_activity: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .eq('user_id', userId)

      if (error) {
        console.error('Error leaving session:', error)
        return { success: false, error: error.message }
      }

      // Record activity
      await this.recordActivity(sessionId, userId, 'left_session', {})

      // Check if session should be ended (no active participants)
      const activeParticipants = await this.getActiveParticipants(sessionId)
      if (activeParticipants.length === 0) {
        await this.endSession(sessionId, userId)
      }

      // Emit participant left event
      this.emit('participantLeft', { sessionId, userId })

      return { success: true }
    } catch (error) {
      console.error('Error in leaveSession:', error)
      return { success: false, error: 'Failed to leave session' }
    }
  }

  /**
   * End a session
   */
  async endSession(
    sessionId: string,
    endedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check permissions
      const hasPermission = await this.checkSessionPermission(endedBy, 'endSession')
      if (!hasPermission) {
        return { success: false, error: 'Insufficient permissions to end session' }
      }

      const { error } = await this.supabase
        .from('match_sessions')
        .update({ 
          is_active: false,
          expires_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      if (error) {
        console.error('Error ending session:', error)
        return { success: false, error: error.message }
      }

      // Deactivate all participants
      await this.supabase
        .from('match_session_participants')
        .update({ is_active: false })
        .eq('session_id', sessionId)

      // Record activity
      await this.recordActivity(sessionId, endedBy, 'ended_session', {})

      // Emit session ended event
      this.emit('sessionEnded', { sessionId, endedBy })

      return { success: true }
    } catch (error) {
      console.error('Error in endSession:', error)
      return { success: false, error: 'Failed to end session' }
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<MatchSession | null> {
    try {
      const { data, error } = await this.supabase
        .from('match_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (error) {
        console.error('Error getting session:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in getSession:', error)
      return null
    }
  }

  /**
   * Get sessions with filters
   */
  async getSessions(filters: SessionFilters = {}): Promise<MatchSession[]> {
    try {
      let query = this.supabase
        .from('match_sessions')
        .select('*')
        .order('created_at', { ascending: false })

      if (filters.matchId) {
        query = query.eq('match_id', filters.matchId)
      }
      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive)
      }
      if (filters.createdBy) {
        query = query.eq('created_by', filters.createdBy)
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom.toISOString())
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo.toISOString())
      }

      const { data, error } = await query

      if (error) {
        console.error('Error getting sessions:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getSessions:', error)
      return []
    }
  }

  /**
   * Get active participants for a session
   */
  async getActiveParticipants(sessionId: string): Promise<SessionParticipant[]> {
    try {
      const { data, error } = await this.supabase
        .from('match_session_participants')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .order('joined_at', { ascending: true })

      if (error) {
        console.error('Error getting active participants:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getActiveParticipants:', error)
      return []
    }
  }

  /**
   * Get participant by session and user ID
   */
  async getParticipant(
    sessionId: string,
    userId: string
  ): Promise<SessionParticipant | null> {
    try {
      const { data, error } = await this.supabase
        .from('match_session_participants')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('Error getting participant:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in getParticipant:', error)
      return null
    }
  }

  /**
   * Update participant permissions
   */
  async updateParticipantPermissions(
    sessionId: string,
    userId: string,
    permissions: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('match_session_participants')
        .update({ 
          permissions,
          last_activity: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .eq('user_id', userId)

      if (error) {
        console.error('Error updating permissions:', error)
        return { success: false, error: error.message }
      }

      // Record activity
      await this.recordActivity(sessionId, userId, 'updated_permissions', { permissions })

      return { success: true }
    } catch (error) {
      console.error('Error in updateParticipantPermissions:', error)
      return { success: false, error: 'Failed to update permissions' }
    }
  }

  /**
   * Update participant activity
   */
  async updateActivity(
    sessionId: string,
    userId: string,
    action: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    try {
      // Update last activity timestamp
      await this.supabase
        .from('match_session_participants')
        .update({ last_activity: new Date().toISOString() })
        .eq('session_id', sessionId)
        .eq('user_id', userId)

      // Record detailed activity
      await this.recordActivity(sessionId, userId, action, details)
    } catch (error) {
      console.error('Error updating activity:', error)
    }
  }

  /**
   * Record session activity
   */
  private async recordActivity(
    sessionId: string,
    userId: string,
    action: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      const activityData = {
        session_id: sessionId,
        user_id: userId,
        action,
        details,
        timestamp: new Date().toISOString()
      }

      await this.supabase
        .from('session_activities')
        .insert(activityData)
    } catch (error) {
      console.error('Error recording activity:', error)
    }
  }

  /**
   * Get session activities
   */
  async getSessionActivities(
    sessionId: string,
    limit: number = 100
  ): Promise<SessionActivity[]> {
    try {
      const { data, error } = await this.supabase
        .from('session_activities')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error getting session activities:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getSessionActivities:', error)
      return []
    }
  }

  /**
   * Get active session for a match and user
   */
  async getActiveSessionForMatch(
    matchId: string,
    userId: string
  ): Promise<MatchSession | null> {
    try {
      const { data, error } = await this.supabase
        .from('match_sessions')
        .select(`
          *,
          match_session_participants!inner(user_id)
        `)
        .eq('match_id', matchId)
        .eq('is_active', true)
        .eq('match_session_participants.user_id', userId)
        .single()

      if (error) {
        return null
      }

      return data
    } catch (error) {
      console.error('Error getting active session:', error)
      return null
    }
  }

  /**
   * Get participant count for a session
   */
  async getParticipantCount(sessionId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('match_session_participants')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .eq('is_active', true)

      if (error) {
        console.error('Error getting participant count:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Error in getParticipantCount:', error)
      return 0
    }
  }

  /**
   * Check session permissions
   */
  async checkSessionPermission(
    userId: string,
    action: string
  ): Promise<boolean> {
    try {
      // Get user role from user_profiles
      const { data: profile, error } = await this.supabase
        .from('user_profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (error || !profile) {
        return false
      }

      const permissions = this.getRolePermissions(profile.role)
      return permissions[action as keyof SessionPermissions] || false
    } catch (error) {
      console.error('Error checking session permission:', error)
      return false
    }
  }

  /**
   * Get role-based permissions
   */
  private getRolePermissions(role: string): SessionPermissions {
    const basePermissions: SessionPermissions = {
      canStartSession: false,
      canInviteUsers: false,
      canModifySession: false,
      canEndSession: false,
      canViewParticipants: true,
      canKickUsers: false,
      canAssignRoles: false,
      canViewActivity: true
    }

    switch (role) {
      case 'referee':
        return {
          ...basePermissions,
          canStartSession: true,
          canInviteUsers: true,
          canModifySession: true,
          canEndSession: true,
          canKickUsers: true,
          canAssignRoles: true
        }
      case 'assistant_referee':
        return {
          ...basePermissions,
          canStartSession: true,
          canInviteUsers: true,
          canModifySession: true,
          canKickUsers: true
        }
      case 'fourth_official':
        return {
          ...basePermissions,
          canStartSession: true,
          canInviteUsers: true
        }
      default:
        return basePermissions
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<SessionStats> {
    try {
      // Get total sessions
      const { count: totalSessions } = await this.supabase
        .from('match_sessions')
        .select('*', { count: 'exact', head: true })

      // Get active sessions
      const { count: activeSessions } = await this.supabase
        .from('match_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      // Get total participants
      const { count: totalParticipants } = await this.supabase
        .from('match_session_participants')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      // Get session activity count
      const { count: sessionActivityCount } = await this.supabase
        .from('session_activities')
        .select('*', { count: 'exact', head: true })

      return {
        totalSessions: totalSessions || 0,
        activeSessions: activeSessions || 0,
        totalParticipants: totalParticipants || 0,
        averageSessionDuration: 0, // TODO: Calculate from session data
        mostActiveUser: '', // TODO: Calculate from activity data
        sessionActivityCount: sessionActivityCount || 0
      }
    } catch (error) {
      console.error('Error getting session stats:', error)
      return {
        totalSessions: 0,
        activeSessions: 0,
        totalParticipants: 0,
        averageSessionDuration: 0,
        mostActiveUser: '',
        sessionActivityCount: 0
      }
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const now = new Date().toISOString()

      // End expired sessions
      await this.supabase
        .from('match_sessions')
        .update({ is_active: false })
        .lt('expires_at', now)
        .eq('is_active', true)

      // Deactivate participants in expired sessions
      await this.supabase
        .from('match_session_participants')
        .update({ is_active: false })
        .in('session_id', 
          await this.supabase
            .from('match_sessions')
            .select('id')
            .lt('expires_at', now)
            .eq('is_active', false)
            .then(({ data }) => data?.map(s => s.id) || [])
        )

      console.log('Expired sessions cleaned up')
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error)
    }
  }
}

// Export singleton instance
export const matchSessionService = new MatchSessionService()

// Export types
export type {
  MatchSession,
  SessionParticipant,
  SessionInvitation,
  SessionActivity,
  SessionPermissions,
  SessionStats,
  SessionFilters
}
