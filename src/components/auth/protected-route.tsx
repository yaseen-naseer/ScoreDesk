'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import type { Permission, UserRole } from '@/lib/auth/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermissions?: Permission[]
  requiredRole?: UserRole
  requireAnyPermission?: boolean // if true, user needs ANY of the permissions, if false, user needs ALL
  fallbackPath?: string
  loadingComponent?: React.ReactNode
  unauthorizedComponent?: React.ReactNode
}

export default function ProtectedRoute({
  children,
  requiredPermissions = [],
  requiredRole,
  requireAnyPermission = false,
  fallbackPath = '/login',
  loadingComponent,
  unauthorizedComponent,
}: ProtectedRouteProps) {
  const { user, currentRole, hasPermission, hasAnyPermission, hasAllPermissions, loading } = useAuth()
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (loading) return

    // Check if user is authenticated
    if (!user) {
      router.push(fallbackPath)
      return
    }

    // Check if user has required role
    if (requiredRole && currentRole !== requiredRole) {
      setIsAuthorized(false)
      setIsChecking(false)
      return
    }

    // Check permissions
    if (requiredPermissions.length > 0 && currentRole) {
      const hasRequiredPermissions = requireAnyPermission
        ? hasAnyPermission(requiredPermissions)
        : hasAllPermissions(requiredPermissions)

      if (!hasRequiredPermissions) {
        setIsAuthorized(false)
        setIsChecking(false)
        return
      }
    }

    // If we get here, user is authorized
    setIsAuthorized(true)
    setIsChecking(false)
  }, [
    user,
    currentRole,
    requiredPermissions,
    requiredRole,
    requireAnyPermission,
    hasAnyPermission,
    hasAllPermissions,
    loading,
    router,
    fallbackPath,
  ])

  // Show loading state
  if (loading || isChecking) {
    if (loadingComponent) {
      return <>{loadingComponent}</>
    }

    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Show unauthorized state
  if (!isAuthorized) {
    if (unauthorizedComponent) {
      return <>{unauthorizedComponent}</>
    }

    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            Access Denied
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            You don't have permission to access this page.
          </p>
          <div className="mt-6">
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Higher-order component for easier usage
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, 'children'>
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}
