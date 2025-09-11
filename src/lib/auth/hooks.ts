'use client'

import { useAuth } from './auth-context'
import type { Permission, UserRole } from './types'

/**
 * Hook to check if user has specific permission
 */
export function usePermission(permission: Permission): boolean {
  const { hasPermission } = useAuth()
  return hasPermission(permission)
}

/**
 * Hook to check if user has any of the specified permissions
 */
export function useAnyPermission(permissions: Permission[]): boolean {
  const { hasAnyPermission } = useAuth()
  return hasAnyPermission(permissions)
}

/**
 * Hook to check if user has all of the specified permissions
 */
export function useAllPermissions(permissions: Permission[]): boolean {
  const { hasAllPermissions } = useAuth()
  return hasAllPermissions(permissions)
}

/**
 * Hook to check if user has specific role
 */
export function useRole(role: UserRole): boolean {
  const { currentRole } = useAuth()
  return currentRole === role
}

/**
 * Hook to check if user has any of the specified roles
 */
export function useAnyRole(roles: UserRole[]): boolean {
  const { currentRole } = useAuth()
  return currentRole ? roles.includes(currentRole) : false
}

/**
 * Hook for common role checks
 */
export function useRoleChecks() {
  const { currentRole } = useAuth()
  
  return {
    isOwner: currentRole === 'owner',
    isAdmin: currentRole === 'admin',
    isManager: currentRole === 'manager',
    isReferee: currentRole === 'referee',
    isStatsOperator: currentRole === 'stats_operator',
    isViewer: currentRole === 'viewer',
    isOwnerOrAdmin: currentRole === 'owner' || currentRole === 'admin',
    isManagerOrAbove: ['owner', 'admin', 'manager'].includes(currentRole || ''),
    canManageOrganization: ['owner', 'admin'].includes(currentRole || ''),
    canManageMatches: ['owner', 'admin', 'manager'].includes(currentRole || ''),
    canControlMatches: ['owner', 'admin', 'manager', 'referee'].includes(currentRole || ''),
    canManageStats: ['owner', 'admin', 'manager', 'referee', 'stats_operator'].includes(currentRole || ''),
  }
}

/**
 * Hook for organization-related permission checks
 */
export function useOrganizationPermissions() {
  const { hasPermission } = useAuth()
  
  return {
    canCreateOrganization: hasPermission('organizations:create'),
    canUpdateOrganization: hasPermission('organizations:update'),
    canDeleteOrganization: hasPermission('organizations:delete'),
    canManageMembers: hasPermission('organizations:manage_members'),
  }
}

/**
 * Hook for team-related permission checks
 */
export function useTeamPermissions() {
  const { hasPermission } = useAuth()
  
  return {
    canCreateTeam: hasPermission('teams:create'),
    canUpdateTeam: hasPermission('teams:update'),
    canDeleteTeam: hasPermission('teams:delete'),
    canManagePlayers: hasPermission('teams:manage_players'),
  }
}

/**
 * Hook for match-related permission checks
 */
export function useMatchPermissions() {
  const { hasPermission } = useAuth()
  
  return {
    canCreateMatch: hasPermission('matches:create'),
    canUpdateMatch: hasPermission('matches:update'),
    canDeleteMatch: hasPermission('matches:delete'),
    canControlMatch: hasPermission('matches:control'),
    canRefereeMatch: hasPermission('matches:referee'),
    canManageStats: hasPermission('matches:manage_stats'),
  }
}

/**
 * Hook for tournament-related permission checks
 */
export function useTournamentPermissions() {
  const { hasPermission } = useAuth()
  
  return {
    canCreateTournament: hasPermission('tournaments:create'),
    canUpdateTournament: hasPermission('tournaments:update'),
    canDeleteTournament: hasPermission('tournaments:delete'),
    canManageTournament: hasPermission('tournaments:manage'),
  }
}
