import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissions,
  canAccessResource,
  isRoleHigher,
  isRoleEqualOrHigher,
  getHighestRole,
  ROLE_HIERARCHY,
} from '../permissions'
import type { UserRole, Permission } from '../types'

describe('Permission System', () => {
  describe('hasPermission', () => {
    it('should return true when role has the permission', () => {
      expect(hasPermission('owner', 'organizations:create')).toBe(true)
      expect(hasPermission('admin', 'organizations:read')).toBe(true)
      expect(hasPermission('viewer', 'stats:read')).toBe(true)
    })

    it('should return false when role does not have the permission', () => {
      expect(hasPermission('viewer', 'organizations:create')).toBe(false)
      expect(hasPermission('referee', 'teams:delete')).toBe(false)
      expect(hasPermission('stats_operator', 'organizations:manage_members')).toBe(false)
    })
  })

  describe('hasAnyPermission', () => {
    it('should return true when role has at least one permission', () => {
      const permissions: Permission[] = ['organizations:create', 'organizations:read']
      expect(hasAnyPermission('admin', permissions)).toBe(true) // has read but not create
      expect(hasAnyPermission('viewer', permissions)).toBe(true) // has read
    })

    it('should return false when role has none of the permissions', () => {
      const permissions: Permission[] = ['organizations:create', 'organizations:delete']
      expect(hasAnyPermission('viewer', permissions)).toBe(false)
      expect(hasAnyPermission('referee', permissions)).toBe(false)
    })
  })

  describe('hasAllPermissions', () => {
    it('should return true when role has all permissions', () => {
      const permissions: Permission[] = ['tournaments:read', 'teams:read']
      expect(hasAllPermissions('owner', permissions)).toBe(true)
      expect(hasAllPermissions('admin', permissions)).toBe(true)
    })

    it('should return false when role is missing any permission', () => {
      const permissions: Permission[] = ['organizations:create', 'organizations:read']
      expect(hasAllPermissions('admin', permissions)).toBe(false) // missing create
      expect(hasAllPermissions('viewer', permissions)).toBe(false) // missing create
    })
  })

  describe('getRolePermissions', () => {
    it('should return correct permissions for each role', () => {
      const ownerPermissions = getRolePermissions('owner')
      const viewerPermissions = getRolePermissions('viewer')

      expect(ownerPermissions).toContain('organizations:create')
      expect(ownerPermissions).toContain('organizations:delete')
      expect(ownerPermissions.length).toBeGreaterThan(viewerPermissions.length)

      expect(viewerPermissions).toContain('organizations:read')
      expect(viewerPermissions).not.toContain('organizations:create')
    })
  })

  describe('canAccessResource', () => {
    it('should return true when role can perform action on resource', () => {
      expect(canAccessResource('owner', 'organizations', 'create')).toBe(true)
      expect(canAccessResource('admin', 'teams', 'read')).toBe(true)
      expect(canAccessResource('viewer', 'stats', 'read')).toBe(true)
    })

    it('should return false when role cannot perform action on resource', () => {
      expect(canAccessResource('viewer', 'organizations', 'create')).toBe(false)
      expect(canAccessResource('referee', 'teams', 'delete')).toBe(false)
      expect(canAccessResource('stats_operator', 'organizations', 'manage')).toBe(false)
    })
  })

  describe('Role Hierarchy', () => {
    it('should have correct hierarchy values', () => {
      expect(ROLE_HIERARCHY.owner).toBeGreaterThan(ROLE_HIERARCHY.admin)
      expect(ROLE_HIERARCHY.admin).toBeGreaterThan(ROLE_HIERARCHY.manager)
      expect(ROLE_HIERARCHY.manager).toBeGreaterThan(ROLE_HIERARCHY.referee)
      expect(ROLE_HIERARCHY.referee).toBeGreaterThan(ROLE_HIERARCHY.stats_operator)
      expect(ROLE_HIERARCHY.stats_operator).toBeGreaterThan(ROLE_HIERARCHY.viewer)
    })

    describe('isRoleHigher', () => {
      it('should return true when first role is higher than second', () => {
        expect(isRoleHigher('owner', 'admin')).toBe(true)
        expect(isRoleHigher('admin', 'viewer')).toBe(true)
        expect(isRoleHigher('manager', 'referee')).toBe(true)
      })

      it('should return false when first role is not higher than second', () => {
        expect(isRoleHigher('admin', 'owner')).toBe(false)
        expect(isRoleHigher('viewer', 'admin')).toBe(false)
        expect(isRoleHigher('referee', 'manager')).toBe(false)
      })

      it('should return false when roles are equal', () => {
        expect(isRoleHigher('admin', 'admin')).toBe(false)
        expect(isRoleHigher('viewer', 'viewer')).toBe(false)
      })
    })

    describe('isRoleEqualOrHigher', () => {
      it('should return true when first role is higher than second', () => {
        expect(isRoleEqualOrHigher('owner', 'admin')).toBe(true)
        expect(isRoleEqualOrHigher('admin', 'viewer')).toBe(true)
      })

      it('should return true when roles are equal', () => {
        expect(isRoleEqualOrHigher('admin', 'admin')).toBe(true)
        expect(isRoleEqualOrHigher('viewer', 'viewer')).toBe(true)
      })

      it('should return false when first role is lower than second', () => {
        expect(isRoleEqualOrHigher('admin', 'owner')).toBe(false)
        expect(isRoleEqualOrHigher('viewer', 'admin')).toBe(false)
      })
    })

    describe('getHighestRole', () => {
      it('should return the highest role from a list', () => {
        const roles: UserRole[] = ['viewer', 'admin', 'manager']
        expect(getHighestRole(roles)).toBe('admin')

        const rolesWithOwner: UserRole[] = ['viewer', 'owner', 'referee']
        expect(getHighestRole(rolesWithOwner)).toBe('owner')
      })

      it('should return the only role when list has one item', () => {
        expect(getHighestRole(['viewer'])).toBe('viewer')
        expect(getHighestRole(['owner'])).toBe('owner')
      })
    })
  })

  describe('Role-specific permissions', () => {
    it('should ensure owner has all permissions', () => {
      const ownerPermissions = getRolePermissions('owner')
      const allRoles: UserRole[] = ['owner', 'admin', 'manager', 'referee', 'stats_operator', 'viewer']
      
      // Collect all unique permissions from all roles
      const allPermissions = new Set<Permission>()
      allRoles.forEach(role => {
        getRolePermissions(role).forEach(permission => {
          allPermissions.add(permission)
        })
      })

      // Owner should have all permissions
      allPermissions.forEach(permission => {
        expect(ownerPermissions).toContain(permission)
      })
    })

    it('should ensure viewer has minimal permissions', () => {
      const viewerPermissions = getRolePermissions('viewer')
      
      // Viewer should only have read permissions
      viewerPermissions.forEach(permission => {
        expect(permission.includes('read')).toBe(true)
      })
    })

    it('should ensure referee has match control permissions', () => {
      expect(hasPermission('referee', 'matches:control')).toBe(true)
      expect(hasPermission('referee', 'matches:referee')).toBe(true)
      expect(hasPermission('referee', 'stats:create')).toBe(true)
    })

    it('should ensure stats operator has stats management permissions', () => {
      expect(hasPermission('stats_operator', 'matches:manage_stats')).toBe(true)
      expect(hasPermission('stats_operator', 'stats:create')).toBe(true)
      expect(hasPermission('stats_operator', 'stats:update')).toBe(true)
    })

    it('should ensure manager can manage teams and tournaments', () => {
      expect(hasPermission('manager', 'teams:create')).toBe(true)
      expect(hasPermission('manager', 'teams:update')).toBe(true)
      expect(hasPermission('manager', 'tournaments:create')).toBe(true)
      expect(hasPermission('manager', 'tournaments:manage')).toBe(true)
    })
  })
})
