'use client'

import { useAuth } from '@/lib/auth/auth-context'
import type { Permission, UserRole } from '@/lib/auth/types'

interface PermissionGateProps {
  children: React.ReactNode
  permissions?: Permission[]
  role?: UserRole
  requireAny?: boolean // if true, requires ANY of the permissions, if false requires ALL
  fallback?: React.ReactNode
  inverse?: boolean // if true, shows children when user DOESN'T have permission
}

/**
 * Component that conditionally renders children based on user permissions
 */
export default function PermissionGate({
  children,
  permissions = [],
  role,
  requireAny = false,
  fallback = null,
  inverse = false,
}: PermissionGateProps) {
  const { currentRole, hasPermission, hasAnyPermission, hasAllPermissions } = useAuth()

  // Check role match
  if (role && currentRole !== role) {
    return inverse ? <>{children}</> : <>{fallback}</>
  }

  // Check permissions
  if (permissions.length > 0 && currentRole) {
    const hasRequiredPermissions = requireAny
      ? hasAnyPermission(permissions)
      : hasAllPermissions(permissions)

    if (inverse) {
      return hasRequiredPermissions ? <>{fallback}</> : <>{children}</>
    } else {
      return hasRequiredPermissions ? <>{children}</> : <>{fallback}</>
    }
  }

  // If no specific permissions or role required, show children (unless inverse)
  return inverse ? <>{fallback}</> : <>{children}</>
}

// Convenience components for common use cases
export function OwnerOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate role="owner" fallback={fallback}>
      {children}
    </PermissionGate>
  )
}

export function AdminOrOwner({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate 
      permissions={['organizations:manage_members']} 
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  )
}

export function CanManageTeams({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate 
      permissions={['teams:create', 'teams:update', 'teams:delete']} 
      requireAny={true}
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  )
}

export function CanControlMatches({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate 
      permissions={['matches:control', 'matches:referee']} 
      requireAny={true}
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  )
}

export function CanManageStats({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate 
      permissions={['matches:manage_stats', 'stats:create', 'stats:update']} 
      requireAny={true}
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  )
}
