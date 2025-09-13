/**
 * Session Permissions Service
 * Handles session-based permissions and access control
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'

export interface SessionPermission {
  action: string
  allowed: boolean
  reason?: string
  conditions?: Record<string, any>
}

export interface SessionRolePermissions {
  role: Database['public']['Enums']['user_role']
  permissions: Record<string, SessionPermission>
  inheritsFrom?: Database['public']['Enums']['user_role']
}

export interface PermissionCheck {
  userId: string
  sessionId: string
  action: string
  context?: Record<string, any>
}

export interface PermissionResult {
  allowed: boolean
  reason?: string
  conditions?: Record<string, any>
  alternatives?: string[]
}

export interface SessionAccessControl {
  canViewSession: boolean
  canJoinSession: boolean
  canLeaveSession: boolean
  canInviteUsers: boolean
  canKickUsers: boolean
  canModifySession: boolean
  canEndSession: boolean
  canViewParticipants: boolean
  canAssignRoles: boolean
  canViewActivity: boolean
  canModifyTimer: boolean
  canRecordEvents: boolean
  canApproveEvents: boolean
  canDeleteEvents: boolean
  canExportData: boolean
  canViewStatistics: boolean
  canModifySettings: boolean
}

class SessionPermissionsService {
  private supabase = createClientComponentClient<Database>()
  private permissionCache = new Map<string, SessionAccessControl>()
  private cacheTimeout = 5 * 60 * 1000 // 5 minutes

  /**
   * Check if user has permission for specific action in session
   */
  async checkPermission(
    check: PermissionCheck
  ): Promise<PermissionResult> {
    try {
      const cacheKey = `${check.userId}-${check.sessionId}-${check.action}`
      
      // Get user's role in session
      const participant = await this.getSessionParticipant(check.sessionId, check.userId)
      if (!participant || !participant.is_active) {
        return {
          allowed: false,
          reason: 'User is not an active participant in this session',
          alternatives: ['Request to join session']
        }
      }

      // Get role-based permissions
      const rolePermissions = this.getRolePermissions(participant.role)
      const customPermissions = participant.permissions || {}

      // Check role-based permission
      const rolePermission = rolePermissions.permissions[check.action]
      if (rolePermission) {
        if (!rolePermission.allowed) {
          return {
            allowed: false,
            reason: rolePermission.reason || 'Action not allowed for your role',
            conditions: rolePermission.conditions
          }
        }
      }

      // Check custom permissions (override role permissions)
      const customPermission = customPermissions[check.action]
      if (customPermission !== undefined) {
        return {
          allowed: customPermission === true,
          reason: customPermission ? undefined : 'Action explicitly denied',
          conditions: customPermission ? {} : undefined
        }
      }

      // Check context-specific conditions
      const contextResult = await this.checkContextConditions(
        check,
        participant,
        rolePermissions
      )

      return contextResult
    } catch (error) {
      console.error('Error checking permission:', error)
      return {
        allowed: false,
        reason: 'Error checking permissions'
      }
    }
  }

  /**
   * Get comprehensive session access control for user
   */
  async getSessionAccessControl(
    sessionId: string,
    userId: string
  ): Promise<SessionAccessControl> {
    try {
      const cacheKey = `${userId}-${sessionId}`
      const cached = this.permissionCache.get(cacheKey)
      
      if (cached) {
        return cached
      }

      const participant = await this.getSessionParticipant(sessionId, userId)
      if (!participant || !participant.is_active) {
        return this.getDefaultAccessControl(false)
      }

      const rolePermissions = this.getRolePermissions(participant.role)
      const customPermissions = participant.permissions || {}

      const accessControl: SessionAccessControl = {
        canViewSession: true, // Always true for participants
        canJoinSession: false, // Already in session
        canLeaveSession: true,
        canInviteUsers: this.hasPermission(rolePermissions, customPermissions, 'canInviteUsers'),
        canKickUsers: this.hasPermission(rolePermissions, customPermissions, 'canKickUsers'),
        canModifySession: this.hasPermission(rolePermissions, customPermissions, 'canModifySession'),
        canEndSession: this.hasPermission(rolePermissions, customPermissions, 'canEndSession'),
        canViewParticipants: this.hasPermission(rolePermissions, customPermissions, 'canViewParticipants'),
        canAssignRoles: this.hasPermission(rolePermissions, customPermissions, 'canAssignRoles'),
        canViewActivity: this.hasPermission(rolePermissions, customPermissions, 'canViewActivity'),
        canModifyTimer: this.hasPermission(rolePermissions, customPermissions, 'canModifyTimer'),
        canRecordEvents: this.hasPermission(rolePermissions, customPermissions, 'canRecordEvents'),
        canApproveEvents: this.hasPermission(rolePermissions, customPermissions, 'canApproveEvents'),
        canDeleteEvents: this.hasPermission(rolePermissions, customPermissions, 'canDeleteEvents'),
        canExportData: this.hasPermission(rolePermissions, customPermissions, 'canExportData'),
        canViewStatistics: this.hasPermission(rolePermissions, customPermissions, 'canViewStatistics'),
        canModifySettings: this.hasPermission(rolePermissions, customPermissions, 'canModifySettings')
      }

      // Cache the result
      this.permissionCache.set(cacheKey, accessControl)
      setTimeout(() => this.permissionCache.delete(cacheKey), this.cacheTimeout)

      return accessControl
    } catch (error) {
      console.error('Error getting session access control:', error)
      return this.getDefaultAccessControl(false)
    }
  }

  /**
   * Get session participant
   */
  private async getSessionParticipant(
    sessionId: string,
    userId: string
  ): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from('match_session_participants')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .single()

      if (error) {
        return null
      }

      return data
    } catch (error) {
      console.error('Error getting session participant:', error)
      return null
    }
  }

  /**
   * Get role-based permissions
   */
  private getRolePermissions(role: string): SessionRolePermissions {
    const permissions: Record<string, SessionPermission> = {
      canViewSession: { action: 'canViewSession', allowed: true },
      canJoinSession: { action: 'canJoinSession', allowed: true },
      canLeaveSession: { action: 'canLeaveSession', allowed: true },
      canInviteUsers: { action: 'canInviteUsers', allowed: false },
      canKickUsers: { action: 'canKickUsers', allowed: false },
      canModifySession: { action: 'canModifySession', allowed: false },
      canEndSession: { action: 'canEndSession', allowed: false },
      canViewParticipants: { action: 'canViewParticipants', allowed: true },
      canAssignRoles: { action: 'canAssignRoles', allowed: false },
      canViewActivity: { action: 'canViewActivity', allowed: true },
      canModifyTimer: { action: 'canModifyTimer', allowed: false },
      canRecordEvents: { action: 'canRecordEvents', allowed: false },
      canApproveEvents: { action: 'canApproveEvents', allowed: false },
      canDeleteEvents: { action: 'canDeleteEvents', allowed: false },
      canExportData: { action: 'canExportData', allowed: false },
      canViewStatistics: { action: 'canViewStatistics', allowed: false },
      canModifySettings: { action: 'canModifySettings', allowed: false }
    }

    switch (role) {
      case 'referee':
        return {
          role: 'referee',
          permissions: {
            ...permissions,
            canInviteUsers: { action: 'canInviteUsers', allowed: true },
            canKickUsers: { action: 'canKickUsers', allowed: true },
            canModifySession: { action: 'canModifySession', allowed: true },
            canEndSession: { action: 'canEndSession', allowed: true },
            canAssignRoles: { action: 'canAssignRoles', allowed: true },
            canModifyTimer: { action: 'canModifyTimer', allowed: true },
            canRecordEvents: { action: 'canRecordEvents', allowed: true },
            canApproveEvents: { action: 'canApproveEvents', allowed: true },
            canDeleteEvents: { action: 'canDeleteEvents', allowed: true },
            canExportData: { action: 'canExportData', allowed: true },
            canViewStatistics: { action: 'canViewStatistics', allowed: true },
            canModifySettings: { action: 'canModifySettings', allowed: true }
          }
        }

      case 'manager':
        return {
          role: 'manager',
          permissions: {
            ...permissions,
            canInviteUsers: { action: 'canInviteUsers', allowed: true },
            canKickUsers: { action: 'canKickUsers', allowed: true },
            canModifySession: { action: 'canModifySession', allowed: true },
            canAssignRoles: { action: 'canAssignRoles', allowed: true },
            canRecordEvents: { action: 'canRecordEvents', allowed: true },
            canApproveEvents: { action: 'canApproveEvents', allowed: true },
            canExportData: { action: 'canExportData', allowed: true },
            canViewStatistics: { action: 'canViewStatistics', allowed: true },
            canModifySettings: { action: 'canModifySettings', allowed: true }
          }
        }

      case 'stats_operator':
        return {
          role: 'stats_operator',
          permissions: {
            ...permissions,
            canRecordEvents: { action: 'canRecordEvents', allowed: true },
            canViewStatistics: { action: 'canViewStatistics', allowed: true },
            canExportData: { action: 'canExportData', allowed: true }
          }
        }

      case 'viewer':
        return {
          role: 'viewer',
          permissions: {
            ...permissions,
            canJoinSession: { action: 'canJoinSession', allowed: false, reason: 'Viewers cannot join sessions' }
          }
        }

      default:
        return {
          role: 'viewer',
          permissions: {
            ...permissions,
            canJoinSession: { action: 'canJoinSession', allowed: false, reason: 'Unknown role' }
          }
        }
    }
  }

  /**
   * Check if user has specific permission
   */
  private hasPermission(
    rolePermissions: SessionRolePermissions,
    customPermissions: Record<string, any>,
    permission: string
  ): boolean {
    // Check custom permissions first (override role permissions)
    if (customPermissions[permission] !== undefined) {
      return customPermissions[permission] === true
    }

    // Check role permissions
    const rolePermission = rolePermissions.permissions[permission]
    return rolePermission ? rolePermission.allowed : false
  }

  /**
   * Check context-specific conditions
   */
  private async checkContextConditions(
    check: PermissionCheck,
    participant: any,
    rolePermissions: SessionRolePermissions
  ): Promise<PermissionResult> {
    try {
      const { action, context } = check

      switch (action) {
        case 'canKickUsers':
          if (context?.targetUserId === participant.user_id) {
            return {
              allowed: false,
              reason: 'Cannot kick yourself'
            }
          }
          break

        case 'canAssignRoles':
          if (context?.targetUserId === participant.user_id) {
            return {
              allowed: false,
              reason: 'Cannot change your own role'
            }
          }
          break

        case 'canModifyTimer':
          // Check if timer is locked by another user
          if (context?.timerLockedBy && context.timerLockedBy !== participant.user_id) {
            return {
              allowed: false,
              reason: 'Timer is locked by another user',
              conditions: { lockedBy: context.timerLockedBy }
            }
          }
          break

        case 'canRecordEvents':
          // Check if match is in progress
          if (context?.matchStatus && !['in_progress', 'paused'].includes(context.matchStatus)) {
            return {
              allowed: false,
              reason: 'Can only record events during active matches'
            }
          }
          break

        case 'canApproveEvents':
          // Check if user is not the event creator
          if (context?.eventCreatorId === participant.user_id) {
            return {
              allowed: false,
              reason: 'Cannot approve your own events'
            }
          }
          break

        case 'canDeleteEvents':
          // Check event age and creator
          if (context?.eventAge && context.eventAge > 24 * 60 * 60 * 1000) { // 24 hours
            return {
              allowed: false,
              reason: 'Cannot delete events older than 24 hours'
            }
          }
          break
      }

      // Default to role permission if no context restrictions
      const rolePermission = rolePermissions.permissions[action]
      return {
        allowed: rolePermission ? rolePermission.allowed : false,
        reason: rolePermission ? rolePermission.reason : undefined,
        conditions: rolePermission ? rolePermission.conditions : undefined
      }
    } catch (error) {
      console.error('Error checking context conditions:', error)
      return {
        allowed: false,
        reason: 'Error checking context conditions'
      }
    }
  }

  /**
   * Get default access control
   */
  private getDefaultAccessControl(isParticipant: boolean): SessionAccessControl {
    return {
      canViewSession: isParticipant,
      canJoinSession: !isParticipant,
      canLeaveSession: isParticipant,
      canInviteUsers: false,
      canKickUsers: false,
      canModifySession: false,
      canEndSession: false,
      canViewParticipants: isParticipant,
      canAssignRoles: false,
      canViewActivity: isParticipant,
      canModifyTimer: false,
      canRecordEvents: false,
      canApproveEvents: false,
      canDeleteEvents: false,
      canExportData: false,
      canViewStatistics: false,
      canModifySettings: false
    }
  }

  /**
   * Update participant permissions
   */
  async updateParticipantPermissions(
    sessionId: string,
    targetUserId: string,
    permissions: Record<string, any>,
    updatedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if updater has permission to assign roles
      const permissionCheck = await this.checkPermission({
        userId: updatedBy,
        sessionId,
        action: 'canAssignRoles',
        context: { targetUserId }
      })

      if (!permissionCheck.allowed) {
        return { success: false, error: permissionCheck.reason }
      }

      // Update permissions
      const { error } = await this.supabase
        .from('match_session_participants')
        .update({ 
          permissions,
          last_activity: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .eq('user_id', targetUserId)

      if (error) {
        console.error('Error updating permissions:', error)
        return { success: false, error: error.message }
      }

      // Clear cache for this user
      this.permissionCache.delete(`${targetUserId}-${sessionId}`)

      return { success: true }
    } catch (error) {
      console.error('Error in updateParticipantPermissions:', error)
      return { success: false, error: 'Failed to update permissions' }
    }
  }

  /**
   * Get permission matrix for all roles
   */
  getPermissionMatrix(): Record<string, SessionAccessControl> {
    const roles: Database['public']['Enums']['user_role'][] = [
      'referee',
      'manager',
      'stats_operator',
      'viewer'
    ]

    const matrix: Record<string, SessionAccessControl> = {}

    roles.forEach(role => {
      const rolePermissions = this.getRolePermissions(role)
      matrix[role] = {
        canViewSession: true,
        canJoinSession: role !== 'viewer',
        canLeaveSession: true,
        canInviteUsers: rolePermissions.permissions.canInviteUsers.allowed,
        canKickUsers: rolePermissions.permissions.canKickUsers.allowed,
        canModifySession: rolePermissions.permissions.canModifySession.allowed,
        canEndSession: rolePermissions.permissions.canEndSession.allowed,
        canViewParticipants: true,
        canAssignRoles: rolePermissions.permissions.canAssignRoles.allowed,
        canViewActivity: true,
        canModifyTimer: rolePermissions.permissions.canModifyTimer.allowed,
        canRecordEvents: rolePermissions.permissions.canRecordEvents.allowed,
        canApproveEvents: rolePermissions.permissions.canApproveEvents.allowed,
        canDeleteEvents: rolePermissions.permissions.canDeleteEvents.allowed,
        canExportData: rolePermissions.permissions.canExportData.allowed,
        canViewStatistics: rolePermissions.permissions.canViewStatistics.allowed,
        canModifySettings: rolePermissions.permissions.canModifySettings.allowed
      }
    })

    return matrix
  }

  /**
   * Clear permission cache
   */
  clearCache(userId?: string, sessionId?: string): void {
    if (userId && sessionId) {
      this.permissionCache.delete(`${userId}-${sessionId}`)
    } else {
      this.permissionCache.clear()
    }
  }
}

// Export singleton instance
export const sessionPermissionsService = new SessionPermissionsService()

// Export types
export type {
  SessionPermission,
  SessionRolePermissions,
  PermissionCheck,
  PermissionResult,
  SessionAccessControl
}
