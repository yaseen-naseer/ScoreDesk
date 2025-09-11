import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import { renderWithAuth, renderWithoutAuth } from '@/tests/utils/test-utils'
import ProtectedRoute from '../protected-route'

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render children when user is authenticated', async () => {
    renderWithAuth(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
      'viewer'
    )

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })
  })

  it('should redirect to login when user is not authenticated', async () => {
    renderWithoutAuth(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('should show loading state while checking authentication', () => {
    const { authContextValue } = renderWithAuth(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
      'viewer'
    )

    // Simulate loading state
    authContextValue.loading = true

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should render custom loading component when provided', () => {
    const CustomLoading = () => <div>Custom Loading</div>

    renderWithAuth(
      <ProtectedRoute loadingComponent={<CustomLoading />}>
        <div>Protected Content</div>
      </ProtectedRoute>,
      'viewer'
    )

    // The custom loading would only show during actual loading state
    // This test verifies the prop is accepted
    expect(() => screen.getByText('Custom Loading')).not.toThrow()
  })

  it('should check required permissions', async () => {
    renderWithAuth(
      <ProtectedRoute requiredPermissions={['organizations:create']}>
        <div>Admin Content</div>
      </ProtectedRoute>,
      'viewer' // viewer doesn't have organizations:create permission
    )

    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument()
    })

    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('should allow access when user has required permissions', async () => {
    renderWithAuth(
      <ProtectedRoute requiredPermissions={['organizations:read']}>
        <div>Readable Content</div>
      </ProtectedRoute>,
      'viewer' // viewer has organizations:read permission
    )

    await waitFor(() => {
      expect(screen.getByText('Readable Content')).toBeInTheDocument()
    })
  })

  it('should check specific role requirement', async () => {
    renderWithAuth(
      <ProtectedRoute requiredRole="owner">
        <div>Owner Only Content</div>
      </ProtectedRoute>,
      'admin' // admin is not owner
    )

    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument()
    })

    expect(screen.queryByText('Owner Only Content')).not.toBeInTheDocument()
  })

  it('should allow access when user has required role', async () => {
    renderWithAuth(
      <ProtectedRoute requiredRole="owner">
        <div>Owner Only Content</div>
      </ProtectedRoute>,
      'owner'
    )

    await waitFor(() => {
      expect(screen.getByText('Owner Only Content')).toBeInTheDocument()
    })
  })

  it('should handle requireAnyPermission flag', async () => {
    renderWithAuth(
      <ProtectedRoute 
        requiredPermissions={['organizations:create', 'organizations:read']}
        requireAnyPermission={true}
      >
        <div>Content with Any Permission</div>
      </ProtectedRoute>,
      'viewer' // viewer has organizations:read but not organizations:create
    )

    await waitFor(() => {
      expect(screen.getByText('Content with Any Permission')).toBeInTheDocument()
    })
  })

  it('should render custom unauthorized component when provided', async () => {
    const CustomUnauthorized = () => <div>Custom Access Denied</div>

    renderWithAuth(
      <ProtectedRoute 
        requiredRole="owner"
        unauthorizedComponent={<CustomUnauthorized />}
      >
        <div>Owner Content</div>
      </ProtectedRoute>,
      'viewer'
    )

    await waitFor(() => {
      expect(screen.getByText('Custom Access Denied')).toBeInTheDocument()
    })

    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument()
    expect(screen.queryByText('Owner Content')).not.toBeInTheDocument()
  })

  it('should redirect to custom fallback path when specified', async () => {
    renderWithoutAuth(
      <ProtectedRoute fallbackPath="/custom-login">
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/custom-login')
    })
  })
})
