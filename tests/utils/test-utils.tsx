import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { AuthContext } from '@/lib/auth/auth-context'
import { UserRole, Permission } from '@/lib/auth/types'

interface MockAuthContextValue {
  user: any
  currentOrganization: string | null
  currentRole: UserRole | null
  memberships: any[]
  loading: boolean
  hasPermission: (permission: Permission) => boolean
  hasAnyPermission: (permissions: Permission[]) => boolean
  hasAllPermissions: (permissions: Permission[]) => boolean
  setCurrentOrganization: (organizationId: string) => void
  getCurrentMembership: () => any | null
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

export const mockAuthContext: MockAuthContextValue = {
  user: null,
  currentOrganization: null,
  currentRole: null,
  memberships: [],
  loading: false,
  hasPermission: () => false,
  hasAnyPermission: () => false,
  hasAllPermissions: () => false,
  setCurrentOrganization: () => {},
  getCurrentMembership: () => null,
  signOut: async () => {},
  refreshUser: async () => {},
}

interface AllTheProvidersProps {
  children: React.ReactNode
  authValue?: Partial<MockAuthContextValue>
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({ children, authValue }) => {
  const contextValue = { ...mockAuthContext, ...authValue } as any
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authValue?: Partial<MockAuthContextValue>
}

const customRender = (
  ui: React.ReactElement,
  options?: CustomRenderOptions
) => {
  const { authValue, ...renderOptions } = options || {}
  
  return render(ui, { 
    wrapper: ({ children }) => (
      <AllTheProviders authValue={authValue}>
        {children}
      </AllTheProviders>
    ),
    ...renderOptions 
  })
}

export * from '@testing-library/react'
export { customRender as render }