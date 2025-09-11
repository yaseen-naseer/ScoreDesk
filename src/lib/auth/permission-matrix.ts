/**
 * Permission Matrix
 * Comprehensive permission system with granular controls
 */

import type { Database } from '@/lib/supabase/types'

export type Permission = {
  id: string
  name: string
  description: string
  category: PermissionCategory
  level: PermissionLevel
  dependencies?: string[]
}

export type PermissionCategory = 
  | 'organization'
  | 'users'
  | 'tournaments'
  | 'teams'
  | 'players'
  | 'matches'
  | 'statistics'
  | 'reports'
  | 'system'

export type PermissionLevel = 'read' | 'write' | 'admin' | 'owner'

export type RolePermissions = {
  [key in Database['public']['Enums']['user_role']]: string[]
}

// Comprehensive permission definitions
export const PERMISSIONS: Permission[] = [
  // Organization Permissions
  {
    id: 'organization:read',
    name: 'View Organization',
    description: 'View organization details and basic information',
    category: 'organization',
    level: 'read'
  },
  {
    id: 'organization:update',
    name: 'Update Organization',
    description: 'Edit organization profile, settings, and preferences',
    category: 'organization',
    level: 'write',
    dependencies: ['organization:read']
  },
  {
    id: 'organization:delete',
    name: 'Delete Organization',
    description: 'Permanently delete the organization (dangerous)',
    category: 'organization',
    level: 'owner',
    dependencies: ['organization:update']
  },
  {
    id: 'organization:billing',
    name: 'Manage Billing',
    description: 'Access billing information and manage subscriptions',
    category: 'organization',
    level: 'admin',
    dependencies: ['organization:read']
  },

  // User Management Permissions
  {
    id: 'users:read',
    name: 'View Users',
    description: 'View organization members and their roles',
    category: 'users',
    level: 'read'
  },
  {
    id: 'users:invite',
    name: 'Invite Users',
    description: 'Send invitations to new organization members',
    category: 'users',
    level: 'write',
    dependencies: ['users:read']
  },
  {
    id: 'users:manage',
    name: 'Manage Users',
    description: 'Edit user profiles and organization membership',
    category: 'users',
    level: 'admin',
    dependencies: ['users:invite']
  },
  {
    id: 'users:roles',
    name: 'Assign Roles',
    description: 'Change user roles and permissions (limited by own role)',
    category: 'users',
    level: 'admin',
    dependencies: ['users:manage']
  },
  {
    id: 'users:remove',
    name: 'Remove Users',
    description: 'Remove users from the organization',
    category: 'users',
    level: 'admin',
    dependencies: ['users:manage']
  },

  // Tournament Permissions
  {
    id: 'tournaments:read',
    name: 'View Tournaments',
    description: 'View tournament information and standings',
    category: 'tournaments',
    level: 'read'
  },
  {
    id: 'tournaments:create',
    name: 'Create Tournaments',
    description: 'Create new tournaments and competitions',
    category: 'tournaments',
    level: 'write',
    dependencies: ['tournaments:read']
  },
  {
    id: 'tournaments:update',
    name: 'Edit Tournaments',
    description: 'Modify tournament settings, rules, and structure',
    category: 'tournaments',
    level: 'write',
    dependencies: ['tournaments:create']
  },
  {
    id: 'tournaments:delete',
    name: 'Delete Tournaments',
    description: 'Remove tournaments from the system',
    category: 'tournaments',
    level: 'admin',
    dependencies: ['tournaments:update']
  },
  {
    id: 'tournaments:manage_teams',
    name: 'Manage Tournament Teams',
    description: 'Add/remove teams from tournaments',
    category: 'tournaments',
    level: 'write',
    dependencies: ['tournaments:update', 'teams:read']
  },

  // Team Permissions
  {
    id: 'teams:read',
    name: 'View Teams',
    description: 'View team information and rosters',
    category: 'teams',
    level: 'read'
  },
  {
    id: 'teams:create',
    name: 'Create Teams',
    description: 'Register new teams in the organization',
    category: 'teams',
    level: 'write',
    dependencies: ['teams:read']
  },
  {
    id: 'teams:update',
    name: 'Edit Teams',
    description: 'Modify team information, colors, and settings',
    category: 'teams',
    level: 'write',
    dependencies: ['teams:create']
  },
  {
    id: 'teams:delete',
    name: 'Delete Teams',
    description: 'Remove teams from the organization',
    category: 'teams',
    level: 'admin',
    dependencies: ['teams:update']
  },

  // Player Permissions
  {
    id: 'players:read',
    name: 'View Players',
    description: 'View player profiles and statistics',
    category: 'players',
    level: 'read'
  },
  {
    id: 'players:create',
    name: 'Register Players',
    description: 'Add new players to teams',
    category: 'players',
    level: 'write',
    dependencies: ['players:read', 'teams:read']
  },
  {
    id: 'players:update',
    name: 'Edit Players',
    description: 'Modify player information and team assignments',
    category: 'players',
    level: 'write',
    dependencies: ['players:create']
  },
  {
    id: 'players:delete',
    name: 'Remove Players',
    description: 'Remove players from teams and the system',
    category: 'players',
    level: 'admin',
    dependencies: ['players:update']
  },
  {
    id: 'players:medical',
    name: 'Manage Medical Info',
    description: 'Access and edit sensitive medical information',
    category: 'players',
    level: 'admin',
    dependencies: ['players:update']
  },

  // Match Permissions
  {
    id: 'matches:read',
    name: 'View Matches',
    description: 'View match information and results',
    category: 'matches',
    level: 'read'
  },
  {
    id: 'matches:create',
    name: 'Schedule Matches',
    description: 'Create and schedule new matches',
    category: 'matches',
    level: 'write',
    dependencies: ['matches:read', 'teams:read']
  },
  {
    id: 'matches:update',
    name: 'Edit Matches',
    description: 'Modify match details and settings',
    category: 'matches',
    level: 'write',
    dependencies: ['matches:create']
  },
  {
    id: 'matches:officiate',
    name: 'Officiate Matches',
    description: 'Control match timing and officiating functions',
    category: 'matches',
    level: 'write',
    dependencies: ['matches:read']
  },
  {
    id: 'matches:stats',
    name: 'Record Statistics',
    description: 'Input and manage detailed match statistics',
    category: 'matches',
    level: 'write',
    dependencies: ['matches:read']
  },
  {
    id: 'matches:delete',
    name: 'Delete Matches',
    description: 'Remove matches from the system',
    category: 'matches',
    level: 'admin',
    dependencies: ['matches:update']
  },

  // Statistics Permissions
  {
    id: 'statistics:read',
    name: 'View Statistics',
    description: 'Access statistical data and analytics',
    category: 'statistics',
    level: 'read'
  },
  {
    id: 'statistics:advanced',
    name: 'Advanced Analytics',
    description: 'Access detailed analytics and performance metrics',
    category: 'statistics',
    level: 'write',
    dependencies: ['statistics:read']
  },
  {
    id: 'statistics:export',
    name: 'Export Statistics',
    description: 'Export statistical data to external formats',
    category: 'statistics',
    level: 'write',
    dependencies: ['statistics:read']
  },

  // Reports Permissions
  {
    id: 'reports:read',
    name: 'View Reports',
    description: 'Access standard reports and summaries',
    category: 'reports',
    level: 'read'
  },
  {
    id: 'reports:create',
    name: 'Create Reports',
    description: 'Generate custom reports and summaries',
    category: 'reports',
    level: 'write',
    dependencies: ['reports:read']
  },
  {
    id: 'reports:share',
    name: 'Share Reports',
    description: 'Share reports with external parties (broadcasters, etc.)',
    category: 'reports',
    level: 'write',
    dependencies: ['reports:create']
  },

  // System Permissions
  {
    id: 'system:audit',
    name: 'View Audit Logs',
    description: 'Access system audit logs and activity history',
    category: 'system',
    level: 'admin'
  },
  {
    id: 'system:backup',
    name: 'Manage Backups',
    description: 'Create and restore system backups',
    category: 'system',
    level: 'admin'
  },
  {
    id: 'system:settings',
    name: 'System Settings',
    description: 'Modify system-wide settings and configurations',
    category: 'system',
    level: 'owner'
  }
]

// Role-based permission assignments
export const ROLE_PERMISSIONS: RolePermissions = {
  owner: [
    // All permissions
    ...PERMISSIONS.map(p => p.id)
  ],
  
  admin: [
    // Organization (except delete)
    'organization:read',
    'organization:update',
    'organization:billing',
    
    // User management
    'users:read',
    'users:invite',
    'users:manage',
    'users:roles',
    'users:remove',
    
    // Tournament management
    'tournaments:read',
    'tournaments:create',
    'tournaments:update',
    'tournaments:delete',
    'tournaments:manage_teams',
    
    // Team management
    'teams:read',
    'teams:create',
    'teams:update',
    'teams:delete',
    
    // Player management
    'players:read',
    'players:create',
    'players:update',
    'players:delete',
    'players:medical',
    
    // Match management
    'matches:read',
    'matches:create',
    'matches:update',
    'matches:delete',
    'matches:officiate',
    'matches:stats',
    
    // Statistics and reports
    'statistics:read',
    'statistics:advanced',
    'statistics:export',
    'reports:read',
    'reports:create',
    'reports:share',
    
    // System (limited)
    'system:audit',
    'system:backup'
  ],
  
  manager: [
    // Organization (read only)
    'organization:read',
    
    // User management (limited)
    'users:read',
    'users:invite',
    
    // Tournament management
    'tournaments:read',
    'tournaments:create',
    'tournaments:update',
    'tournaments:manage_teams',
    
    // Team management
    'teams:read',
    'teams:create',
    'teams:update',
    
    // Player management
    'players:read',
    'players:create',
    'players:update',
    
    // Match management
    'matches:read',
    'matches:create',
    'matches:update',
    'matches:officiate',
    'matches:stats',
    
    // Statistics and reports
    'statistics:read',
    'statistics:advanced',
    'statistics:export',
    'reports:read',
    'reports:create',
    'reports:share'
  ],
  
  referee: [
    // Organization (read only)
    'organization:read',
    
    // Teams and players (read only)
    'teams:read',
    'players:read',
    
    // Match officiating
    'matches:read',
    'matches:officiate',
    
    // Basic statistics
    'statistics:read',
    'reports:read'
  ],
  
  stats_operator: [
    // Organization (read only)
    'organization:read',
    
    // Teams and players (read only)
    'teams:read',
    'players:read',
    
    // Match statistics
    'matches:read',
    'matches:stats',
    
    // Statistics and reports
    'statistics:read',
    'statistics:advanced',
    'statistics:export',
    'reports:read',
    'reports:create'
  ],
  
  viewer: [
    // Read-only access
    'organization:read',
    'teams:read',
    'players:read',
    'tournaments:read',
    'matches:read',
    'statistics:read',
    'reports:read'
  ]
}

// Permission utility functions
export class PermissionManager {
  /**
   * Check if a role has a specific permission
   */
  static hasPermission(role: Database['public']['Enums']['user_role'], permission: string): boolean {
    return ROLE_PERMISSIONS[role]?.includes(permission) || false
  }

  /**
   * Get all permissions for a role
   */
  static getRolePermissions(role: Database['public']['Enums']['user_role']): string[] {
    return ROLE_PERMISSIONS[role] || []
  }

  /**
   * Get permission details by ID
   */
  static getPermission(permissionId: string): Permission | undefined {
    return PERMISSIONS.find(p => p.id === permissionId)
  }

  /**
   * Get permissions by category
   */
  static getPermissionsByCategory(category: PermissionCategory): Permission[] {
    return PERMISSIONS.filter(p => p.category === category)
  }

  /**
   * Check if role can perform action (with dependency checking)
   */
  static canPerformAction(role: Database['public']['Enums']['user_role'], permissionId: string): boolean {
    const permission = this.getPermission(permissionId)
    if (!permission) return false

    // Check if role has the permission
    if (!this.hasPermission(role, permissionId)) return false

    // Check dependencies
    if (permission.dependencies) {
      return permission.dependencies.every(dep => this.hasPermission(role, dep))
    }

    return true
  }

  /**
   * Get missing dependencies for a permission
   */
  static getMissingDependencies(role: Database['public']['Enums']['user_role'], permissionId: string): string[] {
    const permission = this.getPermission(permissionId)
    if (!permission?.dependencies) return []

    return permission.dependencies.filter(dep => !this.hasPermission(role, dep))
  }

  /**
   * Get all categories
   */
  static getCategories(): PermissionCategory[] {
    return Array.from(new Set(PERMISSIONS.map(p => p.category)))
  }

  /**
   * Compare roles and return permission differences
   */
  static compareRoles(
    fromRole: Database['public']['Enums']['user_role'], 
    toRole: Database['public']['Enums']['user_role']
  ): {
    added: string[]
    removed: string[]
    unchanged: string[]
  } {
    const fromPermissions = this.getRolePermissions(fromRole)
    const toPermissions = this.getRolePermissions(toRole)

    const added = toPermissions.filter(p => !fromPermissions.includes(p))
    const removed = fromPermissions.filter(p => !toPermissions.includes(p))
    const unchanged = fromPermissions.filter(p => toPermissions.includes(p))

    return { added, removed, unchanged }
  }

  /**
   * Check if one role can assign another role
   */
  static canAssignRole(
    currentRole: Database['public']['Enums']['user_role'],
    targetRole: Database['public']['Enums']['user_role']
  ): boolean {
    // Role hierarchy for assignment privileges
    const roleHierarchy: Record<Database['public']['Enums']['user_role'], number> = {
      owner: 5,
      admin: 4,
      manager: 3,
      referee: 2,
      stats_operator: 2,
      viewer: 1
    }

    // Owners can assign any role except owner
    if (currentRole === 'owner') {
      return targetRole !== 'owner'
    }

    // Others can only assign roles with lower or equal hierarchy level
    return roleHierarchy[currentRole] > roleHierarchy[targetRole]
  }
}

export default PermissionManager
