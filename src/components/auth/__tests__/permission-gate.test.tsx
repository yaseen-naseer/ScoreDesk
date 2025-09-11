import React from 'react'
import { screen } from '@testing-library/react'
import { renderWithAuth, renderWithoutAuth } from '@/tests/utils/test-utils'
import PermissionGate, { OwnerOnly, AdminOrOwner, CanManageTeams } from '../permission-gate'

describe('PermissionGate', () => {
  it('should render children when user has required permissions', () => {
    renderWithAuth(
      <PermissionGate permissions={['organizations:read']}>
        <div>Content for users with read permission</div>
      </PermissionGate>,
      'viewer'
    )

    expect(screen.getByText('Content for users with read permission')).toBeInTheDocument()
  })

  it('should not render children when user lacks required permissions', () => {
    renderWithAuth(
      <PermissionGate permissions={['organizations:create']}>
        <div>Content for users with create permission</div>
      </PermissionGate>,
      'viewer' // viewer doesn't have create permission
    )

    expect(screen.queryByText('Content for users with create permission')).not.toBeInTheDocument()
  })

  it('should render fallback when user lacks permissions', () => {
    renderWithAuth(
      <PermissionGate 
        permissions={['organizations:create']}
        fallback={<div>Access Denied Fallback</div>}
      >
        <div>Content for users with create permission</div>
      </PermissionGate>,
      'viewer'
    )

    expect(screen.getByText('Access Denied Fallback')).toBeInTheDocument()
    expect(screen.queryByText('Content for users with create permission')).not.toBeInTheDocument()
  })

  it('should handle requireAny flag correctly', () => {
    renderWithAuth(
      <PermissionGate 
        permissions={['organizations:create', 'organizations:read']}
        requireAny={true}
      >
        <div>Content for users with any permission</div>
      </PermissionGate>,
      'viewer' // viewer has read but not create
    )

    expect(screen.getByText('Content for users with any permission')).toBeInTheDocument()
  })

  it('should handle role-based access', () => {
    renderWithAuth(
      <PermissionGate role="owner">
        <div>Owner Only Content</div>
      </PermissionGate>,
      'owner'
    )

    expect(screen.getByText('Owner Only Content')).toBeInTheDocument()
  })

  it('should not render when role does not match', () => {
    renderWithAuth(
      <PermissionGate role="owner">
        <div>Owner Only Content</div>
      </PermissionGate>,
      'admin'
    )

    expect(screen.queryByText('Owner Only Content')).not.toBeInTheDocument()
  })

  it('should handle inverse logic', () => {
    renderWithAuth(
      <PermissionGate 
        permissions={['organizations:create']}
        inverse={true}
      >
        <div>Content for users WITHOUT create permission</div>
      </PermissionGate>,
      'viewer' // viewer doesn't have create permission
    )

    expect(screen.getByText('Content for users WITHOUT create permission')).toBeInTheDocument()
  })

  it('should not render children when not authenticated', () => {
    renderWithoutAuth(
      <PermissionGate permissions={['organizations:read']}>
        <div>Authenticated Content</div>
      </PermissionGate>
    )

    expect(screen.queryByText('Authenticated Content')).not.toBeInTheDocument()
  })
})

describe('OwnerOnly', () => {
  it('should render children for owner role', () => {
    renderWithAuth(
      <OwnerOnly>
        <div>Owner Content</div>
      </OwnerOnly>,
      'owner'
    )

    expect(screen.getByText('Owner Content')).toBeInTheDocument()
  })

  it('should not render children for non-owner roles', () => {
    renderWithAuth(
      <OwnerOnly>
        <div>Owner Content</div>
      </OwnerOnly>,
      'admin'
    )

    expect(screen.queryByText('Owner Content')).not.toBeInTheDocument()
  })

  it('should render fallback for non-owner roles', () => {
    renderWithAuth(
      <OwnerOnly fallback={<div>Not Owner</div>}>
        <div>Owner Content</div>
      </OwnerOnly>,
      'admin'
    )

    expect(screen.getByText('Not Owner')).toBeInTheDocument()
    expect(screen.queryByText('Owner Content')).not.toBeInTheDocument()
  })
})

describe('AdminOrOwner', () => {
  it('should render children for admin role', () => {
    renderWithAuth(
      <AdminOrOwner>
        <div>Admin/Owner Content</div>
      </AdminOrOwner>,
      'admin'
    )

    expect(screen.getByText('Admin/Owner Content')).toBeInTheDocument()
  })

  it('should render children for owner role', () => {
    renderWithAuth(
      <AdminOrOwner>
        <div>Admin/Owner Content</div>
      </AdminOrOwner>,
      'owner'
    )

    expect(screen.getByText('Admin/Owner Content')).toBeInTheDocument()
  })

  it('should not render children for other roles', () => {
    renderWithAuth(
      <AdminOrOwner>
        <div>Admin/Owner Content</div>
      </AdminOrOwner>,
      'viewer'
    )

    expect(screen.queryByText('Admin/Owner Content')).not.toBeInTheDocument()
  })
})

describe('CanManageTeams', () => {
  it('should render children for roles with team management permissions', () => {
    renderWithAuth(
      <CanManageTeams>
        <div>Team Management Content</div>
      </CanManageTeams>,
      'manager'
    )

    expect(screen.getByText('Team Management Content')).toBeInTheDocument()
  })

  it('should not render children for roles without team management permissions', () => {
    renderWithAuth(
      <CanManageTeams>
        <div>Team Management Content</div>
      </CanManageTeams>,
      'viewer'
    )

    expect(screen.queryByText('Team Management Content')).not.toBeInTheDocument()
  })
})
