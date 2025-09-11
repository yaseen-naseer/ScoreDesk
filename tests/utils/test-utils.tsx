import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { AuthProvider } from '@/lib/auth/auth-context'
import SupabaseProvider from '@/components/providers/supabase-provider'
import type { UserRole } from '@/lib/auth/types'

// Mock user data for testing
const mockUsers = {
  owner: {
    id: 'user-owner',
    email: 'owner@test.com',
    firstName: 'Test',
    lastName: 'Owner',
    fullName: 'Test Owner',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  admin: {
    id: 'user-admin',
    email: 'admin@test.com',
    firstName: 'Test',
    lastName: 'Admin',
    fullName: 'Test Admin',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  manager: {
    id: 'user-manager',
    email: 'manager@test.com',
    firstName: 'Test',
    lastName: 'Manager',
    fullName: 'Test Manager',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  referee: {
    id: 'user-referee',
    email: 'referee@test.com',
    firstName: 'Test',
    lastName: 'Referee',
    fullName: 'Test Referee',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  stats_operator: {
    id: 'user-stats',
    email: 'stats@test.com',
    firstName: 'Test',
    lastName: 'Stats',
    fullName: 'Test Stats',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  viewer: {
    id: 'user-viewer',
    email: 'viewer@test.com',
    firstName: 'Test',
    lastName: 'Viewer',
    fullName: 'Test Viewer',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  userRole?: UserRole
  authenticated?: boolean
  currentOrganization?: string
}

// Mock auth context value factory
function createMockAuthContext(options: CustomRenderOptions = {}) {
  const {
    userRole = 'viewer',
    authenticated = false,
    currentOrganization = 'org-1',
  } = options

  const user = authenticated ? mockUsers[userRole] : null
  const currentRole = authenticated ? userRole : null

  return {
    user,
    currentOrganization: authenticated ? currentOrganization : null,
    currentRole,
    memberships: authenticated ? [{
      id: 'membership-1',
      userId: user?.id || '',
      organizationId: currentOrganization,
      role: userRole,
      isActive: true,
      joinedAt: '2024-01-01T00:00:00Z',
    }] : [],
    loading: false,
    hasPermission: jest.fn((permission) => {
      // Mock permission logic based on role
      const permissions = {
        owner: ['organizations:create', 'organizations:read', 'organizations:update', 'organizations:delete', 'organizations:manage_members'],
        admin: ['organizations:read', 'organizations:update', 'organizations:manage_members'],
        manager: ['organizations:read', 'tournaments:create', 'teams:create'],
        referee: ['matches:control', 'matches:referee'],
        stats_operator: ['matches:manage_stats', 'stats:create'],
        viewer: ['organizations:read', 'teams:read', 'stats:read'],
      }
      return authenticated && permissions[userRole]?.includes(permission)
    }),
    hasAnyPermission: jest.fn((permissions) => {
      return authenticated && permissions.some(p => 
        mockUsers[userRole] && ['organizations:read'].includes(p)
      )
    }),
    hasAllPermissions: jest.fn((permissions) => {
      return authenticated && permissions.every(p => 
        mockUsers[userRole] && ['organizations:read'].includes(p)
      )
    }),
    setCurrentOrganization: jest.fn(),
    getCurrentMembership: jest.fn(() => authenticated ? {
      id: 'membership-1',
      userId: user?.id || '',
      organizationId: currentOrganization,
      role: userRole,
      isActive: true,
      joinedAt: '2024-01-01T00:00:00Z',
    } : null),
    signOut: jest.fn(),
    refreshUser: jest.fn(),
  }
}

// Mock providers wrapper
function MockProviders({ 
  children, 
  authContextValue 
}: { 
  children: React.ReactNode
  authContextValue: any
}) {
  // Mock AuthProvider with custom context value
  const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
    const AuthContext = React.createContext(authContextValue)
    return <AuthContext.Provider value={authContextValue}>{children}</AuthContext.Provider>
  }

  return (
    <SupabaseProvider>
      <MockAuthProvider>
        {children}
      </MockAuthProvider>
    </SupabaseProvider>
  )
}

// Custom render function
function customRender(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) {
  const authContextValue = createMockAuthContext(options)
  
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <MockProviders authContextValue={authContextValue}>
      {children}
    </MockProviders>
  )

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    authContextValue,
  }
}

// Render with specific user role
export function renderWithAuth(
  ui: React.ReactElement,
  userRole: UserRole,
  options: Omit<CustomRenderOptions, 'userRole' | 'authenticated'> = {}
) {
  return customRender(ui, {
    ...options,
    userRole,
    authenticated: true,
  })
}

// Render without authentication
export function renderWithoutAuth(
  ui: React.ReactElement,
  options: Omit<CustomRenderOptions, 'authenticated'> = {}
) {
  return customRender(ui, {
    ...options,
    authenticated: false,
  })
}

// Re-export everything from React Testing Library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'

// Override the default render with our custom render
export { customRender as render }
