export type UserRole = 
  | 'owner'
  | 'admin'
  | 'manager'
  | 'referee'
  | 'stats_operator'
  | 'viewer'

export type Permission = 
  | 'organizations:create'
  | 'organizations:read'
  | 'organizations:update'
  | 'organizations:delete'
  | 'organizations:manage_members'
  | 'tournaments:create'
  | 'tournaments:read'
  | 'tournaments:update'
  | 'tournaments:delete'
  | 'tournaments:manage'
  | 'teams:create'
  | 'teams:read'
  | 'teams:update'
  | 'teams:delete'
  | 'teams:manage_players'
  | 'matches:create'
  | 'matches:read'
  | 'matches:update'
  | 'matches:delete'
  | 'matches:control'
  | 'matches:manage_stats'
  | 'matches:referee'
  | 'players:create'
  | 'players:read'
  | 'players:update'
  | 'players:delete'
  | 'stats:read'
  | 'stats:create'
  | 'stats:update'
  | 'reports:read'
  | 'reports:generate'

export interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  avatarUrl?: string
  createdAt: string
  updatedAt: string
}

export interface OrganizationMembership {
  id: string
  userId: string
  organizationId: string
  role: UserRole
  isActive: boolean
  joinedAt: string
  invitedBy?: string
}

// Role permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    'organizations:create',
    'organizations:read',
    'organizations:update',
    'organizations:delete',
    'organizations:manage_members',
    'tournaments:create',
    'tournaments:read',
    'tournaments:update',
    'tournaments:delete',
    'tournaments:manage',
    'teams:create',
    'teams:read',
    'teams:update',
    'teams:delete',
    'teams:manage_players',
    'matches:create',
    'matches:read',
    'matches:update',
    'matches:delete',
    'matches:control',
    'matches:manage_stats',
    'matches:referee',
    'players:create',
    'players:read',
    'players:update',
    'players:delete',
    'stats:read',
    'stats:create',
    'stats:update',
    'reports:read',
    'reports:generate',
  ],
  admin: [
    'organizations:read',
    'organizations:update',
    'organizations:manage_members',
    'tournaments:create',
    'tournaments:read',
    'tournaments:update',
    'tournaments:delete',
    'tournaments:manage',
    'teams:create',
    'teams:read',
    'teams:update',
    'teams:delete',
    'teams:manage_players',
    'matches:create',
    'matches:read',
    'matches:update',
    'matches:delete',
    'matches:control',
    'matches:manage_stats',
    'matches:referee',
    'players:create',
    'players:read',
    'players:update',
    'players:delete',
    'stats:read',
    'stats:create',
    'stats:update',
    'reports:read',
    'reports:generate',
  ],
  manager: [
    'organizations:read',
    'tournaments:create',
    'tournaments:read',
    'tournaments:update',
    'tournaments:manage',
    'teams:create',
    'teams:read',
    'teams:update',
    'teams:manage_players',
    'matches:create',
    'matches:read',
    'matches:update',
    'players:create',
    'players:read',
    'players:update',
    'stats:read',
    'reports:read',
    'reports:generate',
  ],
  referee: [
    'organizations:read',
    'tournaments:read',
    'teams:read',
    'matches:read',
    'matches:control',
    'matches:referee',
    'players:read',
    'stats:read',
    'stats:create',
    'stats:update',
  ],
  stats_operator: [
    'organizations:read',
    'tournaments:read',
    'teams:read',
    'matches:read',
    'matches:manage_stats',
    'players:read',
    'stats:read',
    'stats:create',
    'stats:update',
  ],
  viewer: [
    'organizations:read',
    'tournaments:read',
    'teams:read',
    'matches:read',
    'players:read',
    'stats:read',
    'reports:read',
  ],
}
