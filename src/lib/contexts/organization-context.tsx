'use client'

import * as React from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { OrganizationService } from '@/lib/services/organization-service'
import { Database } from '@/lib/supabase/types'

type Organization = Database['public']['Tables']['organizations']['Row']
type OrganizationMembership = Database['public']['Tables']['organization_memberships']['Row']

interface OrganizationStats {
  totalMembers: number
  totalTeams: number
  totalPlayers: number
  totalMatches: number
  activeTournaments: number
  liveMatches: number
}

interface OrganizationContextType {
  // Current organization state
  currentOrganization: Organization | null
  currentMembership: OrganizationMembership | null
  organizationStats: OrganizationStats | null
  
  // User's organizations
  userOrganizations: Array<Organization & { membership: OrganizationMembership }>
  
  // Loading states
  isLoading: boolean
  isLoadingStats: boolean
  isLoadingOrganizations: boolean
  
  // Actions
  switchOrganization: (organizationId: string) => Promise<void>
  refreshOrganization: () => Promise<void>
  refreshStats: () => Promise<void>
  refreshUserOrganizations: () => Promise<void>
  
  // Organization management
  createOrganization: (data: any) => Promise<Organization>
  updateOrganization: (updates: any) => Promise<void>
  uploadLogo: (file: File) => Promise<string>
  
  // Permissions
  canManageOrganization: boolean
  canInviteMembers: boolean
  canManageTeams: boolean
  canManageTournaments: boolean
  canControlMatches: boolean
  canViewStats: boolean
}

const OrganizationContext = React.createContext<OrganizationContextType | undefined>(undefined)

export function useOrganization(): OrganizationContextType {
  const context = React.useContext(OrganizationContext)
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider')
  }
  return context
}

interface OrganizationProviderProps {
  children: React.ReactNode
}

export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const { user, profile } = useAuth()
  const organizationService = new OrganizationService()

  // State
  const [currentOrganization, setCurrentOrganization] = React.useState<Organization | null>(null)
  const [currentMembership, setCurrentMembership] = React.useState<OrganizationMembership | null>(null)
  const [organizationStats, setOrganizationStats] = React.useState<OrganizationStats | null>(null)
  const [userOrganizations, setUserOrganizations] = React.useState<Array<Organization & { membership: OrganizationMembership }>>([])
  
  // Loading states
  const [isLoading, setIsLoading] = React.useState(true)
  const [isLoadingStats, setIsLoadingStats] = React.useState(false)
  const [isLoadingOrganizations, setIsLoadingOrganizations] = React.useState(false)

  // Load current organization when profile changes
  React.useEffect(() => {
    if (profile?.current_organization_id) {
      loadCurrentOrganization(profile.current_organization_id)
    } else {
      setCurrentOrganization(null)
      setCurrentMembership(null)
      setIsLoading(false)
    }
  }, [profile?.current_organization_id])

  // Load user organizations when user changes
  React.useEffect(() => {
    if (user) {
      loadUserOrganizations()
    }
  }, [user])

  // Load organization stats when current organization changes
  React.useEffect(() => {
    if (currentOrganization) {
      loadOrganizationStats(currentOrganization.id)
    }
  }, [currentOrganization])

  const loadCurrentOrganization = async (organizationId: string) => {
    setIsLoading(true)
    try {
      const [organization, members] = await Promise.all([
        organizationService.getOrganization(organizationId),
        organizationService.getOrganizationMembers(organizationId)
      ])

      if (organization) {
        setCurrentOrganization(organization)
        
        // Find current user's membership
        const membership = members.find(m => m.user_id === user?.id)
        setCurrentMembership(membership || null)
      }
    } catch (error) {
      console.error('Error loading current organization:', error)
      setCurrentOrganization(null)
      setCurrentMembership(null)
    } finally {
      setIsLoading(false)
    }
  }

  const loadUserOrganizations = async () => {
    setIsLoadingOrganizations(true)
    try {
      const organizations = await organizationService.getUserOrganizations()
      setUserOrganizations(organizations)
    } catch (error) {
      console.error('Error loading user organizations:', error)
      setUserOrganizations([])
    } finally {
      setIsLoadingOrganizations(false)
    }
  }

  const loadOrganizationStats = async (organizationId: string) => {
    setIsLoadingStats(true)
    try {
      const stats = await organizationService.getOrganizationStats(organizationId)
      setOrganizationStats(stats)
    } catch (error) {
      console.error('Error loading organization stats:', error)
      setOrganizationStats(null)
    } finally {
      setIsLoadingStats(false)
    }
  }

  // Actions
  const switchOrganization = async (organizationId: string) => {
    await organizationService.switchOrganization(organizationId)
    // The profile will update through the auth context, triggering a reload
  }

  const refreshOrganization = async () => {
    if (currentOrganization) {
      await loadCurrentOrganization(currentOrganization.id)
    }
  }

  const refreshStats = async () => {
    if (currentOrganization) {
      await loadOrganizationStats(currentOrganization.id)
    }
  }

  const refreshUserOrganizations = async () => {
    await loadUserOrganizations()
  }

  const createOrganization = async (data: any): Promise<Organization> => {
    const { organization } = await organizationService.createOrganization(data)
    
    // Refresh user organizations and switch to new organization
    await loadUserOrganizations()
    await switchOrganization(organization.id)
    
    return organization
  }

  const updateOrganization = async (updates: any) => {
    if (!currentOrganization) throw new Error('No current organization')
    
    const updatedOrganization = await organizationService.updateOrganization(
      currentOrganization.id, 
      updates
    )
    
    setCurrentOrganization(updatedOrganization)
    await loadUserOrganizations() // Refresh the list
  }

  const uploadLogo = async (file: File): Promise<string> => {
    if (!currentOrganization) throw new Error('No current organization')
    
    const logoUrl = await organizationService.uploadLogo(currentOrganization.id, file)
    
    // Update current organization with new logo URL
    setCurrentOrganization(prev => prev ? { ...prev, logo_url: logoUrl } : null)
    
    return logoUrl
  }

  // Permission calculations
  const userRole = currentMembership?.role || profile?.current_role
  
  const canManageOrganization = userRole === 'owner'
  const canInviteMembers = ['owner', 'admin'].includes(userRole || '')
  const canManageTeams = ['owner', 'admin', 'manager'].includes(userRole || '')
  const canManageTournaments = ['owner', 'admin', 'manager'].includes(userRole || '')
  const canControlMatches = ['owner', 'admin', 'manager', 'referee'].includes(userRole || '')
  const canViewStats = ['owner', 'admin', 'manager', 'stats_operator', 'referee'].includes(userRole || '')

  const value: OrganizationContextType = {
    // State
    currentOrganization,
    currentMembership,
    organizationStats,
    userOrganizations,
    
    // Loading states
    isLoading,
    isLoadingStats,
    isLoadingOrganizations,
    
    // Actions
    switchOrganization,
    refreshOrganization,
    refreshStats,
    refreshUserOrganizations,
    createOrganization,
    updateOrganization,
    uploadLogo,
    
    // Permissions
    canManageOrganization,
    canInviteMembers,
    canManageTeams,
    canManageTournaments,
    canControlMatches,
    canViewStats
  }

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  )
}

// Hook for checking if user has any organizations
export function useHasOrganizations(): boolean {
  const { userOrganizations, isLoadingOrganizations } = useOrganization()
  return !isLoadingOrganizations && userOrganizations.length > 0
}

// Hook for organization-specific permissions
export function useOrganizationPermissions() {
  const {
    canManageOrganization,
    canInviteMembers,
    canManageTeams,
    canManageTournaments,
    canControlMatches,
    canViewStats,
    currentMembership
  } = useOrganization()

  const hasPermission = (permission: string): boolean => {
    switch (permission) {
      case 'organization:manage':
        return canManageOrganization
      case 'members:invite':
        return canInviteMembers
      case 'teams:manage':
        return canManageTeams
      case 'tournaments:manage':
        return canManageTournaments
      case 'matches:control':
        return canControlMatches
      case 'stats:view':
        return canViewStats
      default:
        return false
    }
  }

  const requiresRole = (requiredRole: string): boolean => {
    const roleHierarchy = {
      viewer: 1,
      stats_operator: 2,
      referee: 3,
      manager: 4,
      admin: 5,
      owner: 6
    }

    const userRoleLevel = roleHierarchy[currentMembership?.role as keyof typeof roleHierarchy] || 0
    const requiredRoleLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0

    return userRoleLevel >= requiredRoleLevel
  }

  return {
    hasPermission,
    requiresRole,
    userRole: currentMembership?.role,
    canManageOrganization,
    canInviteMembers,
    canManageTeams,
    canManageTournaments,
    canControlMatches,
    canViewStats
  }
}

// Higher-order component for organization access control
interface WithOrganizationAccessProps {
  requiredRole?: string
  requiredPermission?: string
  fallback?: React.ComponentType
  children: React.ReactNode
}

export function WithOrganizationAccess({
  requiredRole,
  requiredPermission,
  fallback: Fallback = () => <div>Access denied</div>,
  children
}: WithOrganizationAccessProps) {
  const { hasPermission, requiresRole } = useOrganizationPermissions()
  const { currentOrganization, isLoading } = useOrganization()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!currentOrganization) {
    return <Fallback />
  }

  if (requiredRole && !requiresRole(requiredRole)) {
    return <Fallback />
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Fallback />
  }

  return <>{children}</>
}
