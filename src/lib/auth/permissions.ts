import { ROLE_PERMISSIONS, type Permission, type UserRole } from './types'
import { PermissionManager } from './permission-matrix'

/**
 * Check if a user role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

/**
 * Check if a user role has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission))
}

/**
 * Check if a user role has all of the specified permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission))
}

/**
 * Get all permissions for a specific role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role]
}

/**
 * Check if a role can access a specific resource
 */
export function canAccessResource(
  role: UserRole,
  resource: string,
  action: 'create' | 'read' | 'update' | 'delete' | 'manage'
): boolean {
  const permission = `${resource}:${action}` as Permission
  return hasPermission(role, permission)
}

/**
 * Role hierarchy for determining if one role is higher than another
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 100,
  admin: 80,
  manager: 60,
  referee: 40,
  stats_operator: 30,
  viewer: 10,
}

/**
 * Check if one role is higher than another in the hierarchy
 */
export function isRoleHigher(role1: UserRole, role2: UserRole): boolean {
  return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2]
}

/**
 * Check if one role is equal or higher than another
 */
export function isRoleEqualOrHigher(role1: UserRole, role2: UserRole): boolean {
  return ROLE_HIERARCHY[role1] >= ROLE_HIERARCHY[role2]
}

/**
 * Get the highest role from a list of roles
 */
export function getHighestRole(roles: UserRole[]): UserRole {
  return roles.reduce((highest, current) => 
    isRoleHigher(current, highest) ? current : highest
  )
}

// Enhanced permission system integration
/**
 * Check if a role has a modern permission from the permission matrix
 */
export function hasModernPermission(role: UserRole, permission: string): boolean {
  return PermissionManager.hasPermission(role, permission)
}

/**
 * Check if a role can assign another role
 */
export function canAssignRole(currentRole: UserRole, targetRole: UserRole): boolean {
  return PermissionManager.canAssignRole(currentRole, targetRole)
}

/**
 * Compare two roles and get permission differences
 */
export function compareRoles(fromRole: UserRole, toRole: UserRole) {
  return PermissionManager.compareRoles(fromRole, toRole)
}

/**
 * Get all modern permissions for a role
 */
export function getModernRolePermissions(role: UserRole): string[] {
  return PermissionManager.getRolePermissions(role)
}

// Re-export the permission matrix for advanced usage
export { 
  PermissionManager, 
  PERMISSIONS as MODERN_PERMISSIONS, 
  ROLE_PERMISSIONS as MODERN_ROLE_PERMISSIONS 
} from './permission-matrix'
