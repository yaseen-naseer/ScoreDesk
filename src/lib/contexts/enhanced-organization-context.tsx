'use client'

/**
 * Enhanced Organization Context Provider
 * Provides comprehensive data isolation and organization management
 */

import * as React from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionManager } from '@/lib/auth/permission-matrix'
import { Database } from '@/lib/supabase/types'

type Organization = Database['public']['Tables']['organizations']['Row']
type OrganizationMembership = Database['public']['Tables']['organization_memberships']['Row']
type UserProfile = Database['public']['Tables']['user_profiles']['Row']

interface OrganizationStats {
  totalMembers: number
  totalTeams: number
  totalPlayers: number
  totalMatches: number
  activeTournaments: number
  liveMatches: number
  recentActivity: number
  memberGrowth: number
  matchesThisMonth: number
  upcomingMatches: number
}

interface OrganizationPreferences {
  timezone: string
  dateFormat: string
  language: string
  currency: string
  notifications: {
    email: boolean
    sms: boolean
    push: boolean
  }
  features: {
    enableAdvancedStats: boolean
    enableLiveScoring: boolean
    enableBroadcasting: boolean
    enableMobileApp: boolean
  }
}

interface OrganizationMember {
  id: string
  userId: string
  email: string
  fullName: string
  role: Database['public']['Enums']['user_role']
  status: 'active' | 'inactive' | 'pending'
  joinedAt: string
  lastActiveAt?: string
  avatarUrl?: string
  permissions: string[]
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

interface OrganizationCache {
  stats: CacheEntry<OrganizationStats> | null
  members: CacheEntry<OrganizationMember[]> | null
  preferences: CacheEntry<OrganizationPreferences> | null
}

interface EnhancedOrganizationContextType {
  // Current organization state
  currentOrganization: Organization | null
  currentMembership: OrganizationMembership | null
  organizationStats: OrganizationStats | null
  organizationPreferences: OrganizationPreferences | null
  organizationMembers: OrganizationMember[]
  
  // User's organizations
  userOrganizations: Array<Organization & { membership: OrganizationMembership }>
  
  // Loading states
  isLoading: boolean
  isLoadingStats: boolean
  isLoadingMembers: boolean
  isLoadingPreferences: boolean
  isLoadingOrganizations: boolean
  isSwitching: boolean
  
  // Error states
  error: string | null
  statsError: string | null
  membersError: string | null
  
  // Cache management
  cacheStatus: {
    stats: 'fresh' | 'stale' | 'expired' | 'empty'
    members: 'fresh' | 'stale' | 'expired' | 'empty'
    preferences: 'fresh' | 'stale' | 'expired' | 'empty'
  }
  
  // Actions
  switchOrganization: (organizationId: string) => Promise<void>
  refreshOrganization: () => Promise<void>
  refreshStats: (force?: boolean) => Promise<void>
  refreshMembers: (force?: boolean) => Promise<void>
  refreshPreferences: (force?: boolean) => Promise<void>
  refreshUserOrganizations: () => Promise<void>
  clearCache: () => void
  
  // Organization management
  createOrganization: (data: any) => Promise<Organization>
  updateOrganization: (updates: any) => Promise<void>
  updatePreferences: (preferences: Partial<OrganizationPreferences>) => Promise<void>
  uploadLogo: (file: File) => Promise<string>
  deleteOrganization: () => Promise<void>
  
  // Member management
  inviteMember: (email: string, role: Database['public']['Enums']['user_role'], message?: string) => Promise<void>
  updateMemberRole: (memberId: string, role: Database['public']['Enums']['user_role']) => Promise<void>
  removeMember: (memberId: string) => Promise<void>
  
  // Permission checking with new system
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  hasAllPermissions: (permissions: string[]) => boolean
  canAssignRole: (targetRole: Database['public']['Enums']['user_role']) => boolean
  
  // Data isolation helpers
  getIsolatedData: <T>(key: string) => T | null
  setIsolatedData: <T>(key: string, data: T) => void
  clearIsolatedData: (key?: string) => void
  
  // Real-time subscriptions
  subscribeToOrganization: () => () => void
  subscribeToMembers: () => () => void
  subscribeToStats: () => () => void
}

const EnhancedOrganizationContext = React.createContext<EnhancedOrganizationContextType | undefined>(undefined)

export function useEnhancedOrganization(): EnhancedOrganizationContextType {
  const context = React.useContext(EnhancedOrganizationContext)
  if (context === undefined) {
    throw new Error('useEnhancedOrganization must be used within an EnhancedOrganizationProvider')
  }
  return context
}

interface EnhancedOrganizationProviderProps {
  children: React.ReactNode
  cacheConfig?: {
    statsTTL?: number
    membersTTL?: number
    preferencesTTL?: number
  }
}

export function EnhancedOrganizationProvider({ 
  children, 
  cacheConfig = {
    statsTTL: 5 * 60 * 1000, // 5 minutes
    membersTTL: 2 * 60 * 1000, // 2 minutes
    preferencesTTL: 10 * 60 * 1000 // 10 minutes
  }
}: EnhancedOrganizationProviderProps) {
  const { user, profile } = useAuth()
  const supabase = createClientComponentClient<Database>()

  // Core state
  const [currentOrganization, setCurrentOrganization] = React.useState<Organization | null>(null)
  const [currentMembership, setCurrentMembership] = React.useState<OrganizationMembership | null>(null)
  const [organizationStats, setOrganizationStats] = React.useState<OrganizationStats | null>(null)
  const [organizationPreferences, setOrganizationPreferences] = React.useState<OrganizationPreferences | null>(null)
  const [organizationMembers, setOrganizationMembers] = React.useState<OrganizationMember[]>([])
  const [userOrganizations, setUserOrganizations] = React.useState<Array<Organization & { membership: OrganizationMembership }>>([])
  
  // Loading states
  const [isLoading, setIsLoading] = React.useState(true)
  const [isLoadingStats, setIsLoadingStats] = React.useState(false)
  const [isLoadingMembers, setIsLoadingMembers] = React.useState(false)
  const [isLoadingPreferences, setIsLoadingPreferences] = React.useState(false)
  const [isLoadingOrganizations, setIsLoadingOrganizations] = React.useState(false)
  const [isSwitching, setIsSwitching] = React.useState(false)
  
  // Error states
  const [error, setError] = React.useState<string | null>(null)
  const [statsError, setStatsError] = React.useState<string | null>(null)
  const [membersError, setMembersError] = React.useState<string | null>(null)
  
  // Cache management
  const [cache, setCache] = React.useState<OrganizationCache>({
    stats: null,
    members: null,
    preferences: null
  })
  
  // Data isolation storage (organization-scoped)
  const [isolatedData, setIsolatedDataState] = React.useState<Record<string, any>>({})

  // Cache utilities
  const isCacheValid = <T,>(entry: CacheEntry<T> | null): boolean => {
    if (!entry) return false
    return Date.now() - entry.timestamp < entry.ttl
  }

  const getCacheStatus = (entry: CacheEntry<any> | null, ttl: number): 'fresh' | 'stale' | 'expired' | 'empty' => {
    if (!entry) return 'empty'
    const age = Date.now() - entry.timestamp
    if (age < ttl * 0.5) return 'fresh'
    if (age < ttl) return 'stale'
    return 'expired'
  }

  const setCacheEntry = <T,>(key: keyof OrganizationCache, data: T, ttl: number) => {
    setCache(prev => ({
      ...prev,
      [key]: {
        data,
        timestamp: Date.now(),
        ttl
      }
    }))
  }

  // Current user role from membership
  const userRole = currentMembership?.role

  // Permission checking with enhanced system
  const hasPermission = React.useCallback((permission: string): boolean => {
    if (!userRole) return false
    return PermissionManager.hasPermission(userRole, permission)
  }, [userRole])

  const hasAnyPermission = React.useCallback((permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(permission))
  }, [hasPermission])

  const hasAllPermissions = React.useCallback((permissions: string[]): boolean => {
    return permissions.every(permission => hasPermission(permission))
  }, [hasPermission])

  const canAssignRole = React.useCallback((targetRole: Database['public']['Enums']['user_role']): boolean => {
    if (!userRole) return false
    return PermissionManager.canAssignRole(userRole, targetRole)
  }, [userRole])

  // Data isolation helpers
  const getIsolatedData = React.useCallback(<T,>(key: string): T | null => {
    if (!currentOrganization) return null
    const orgKey = `${currentOrganization.id}:${key}`
    return isolatedData[orgKey] || null
  }, [currentOrganization, isolatedData])

  const setIsolatedData = React.useCallback(<T,>(key: string, data: T) => {
    if (!currentOrganization) return
    const orgKey = `${currentOrganization.id}:${key}`
    setIsolatedDataState(prev => ({
      ...prev,
      [orgKey]: data
    }))
  }, [currentOrganization])

  const clearIsolatedData = React.useCallback((key?: string) => {
    if (!currentOrganization) return
    
    if (key) {
      const orgKey = `${currentOrganization.id}:${key}`
      setIsolatedDataState(prev => {
        const newData = { ...prev }
        delete newData[orgKey]
        return newData
      })
    } else {
      // Clear all data for current organization
      const prefix = `${currentOrganization.id}:`
      setIsolatedDataState(prev => {
        const newData = { ...prev }
        Object.keys(newData).forEach(key => {
          if (key.startsWith(prefix)) {
            delete newData[key]
          }
        })
        return newData
      })
    }
  }, [currentOrganization])

  // Load current organization when profile changes
  React.useEffect(() => {
    const loadOrganization = async () => {
      if (!profile?.current_organization_id) {
        setCurrentOrganization(null)
        setCurrentMembership(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // Load organization details
        const { data: organization, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profile.current_organization_id)
          .single()

        if (orgError) throw orgError

        // Load user's membership
        const { data: membership, error: membershipError } = await supabase
          .from('organization_memberships')
          .select('*')
          .eq('organization_id', profile.current_organization_id)
          .eq('user_id', user?.id)
          .eq('status', 'active')
          .single()

        if (membershipError) throw membershipError

        setCurrentOrganization(organization)
        setCurrentMembership(membership)

        // Load cached data if available
        loadCachedData()
      } catch (err) {
        console.error('Error loading organization:', err)
        setError('Failed to load organization')
        setCurrentOrganization(null)
        setCurrentMembership(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadOrganization()
  }, [profile?.current_organization_id, user?.id, supabase])

  // Load cached data when organization changes
  const loadCachedData = React.useCallback(() => {
    if (!currentOrganization) return

    // Load stats from cache if valid
    if (cache.stats && isCacheValid(cache.stats)) {
      setOrganizationStats(cache.stats.data)
    }

    // Load members from cache if valid
    if (cache.members && isCacheValid(cache.members)) {
      setOrganizationMembers(cache.members.data)
    }

    // Load preferences from cache if valid
    if (cache.preferences && isCacheValid(cache.preferences)) {
      setOrganizationPreferences(cache.preferences.data)
    }
  }, [currentOrganization, cache])

  // Load user organizations
  const loadUserOrganizations = React.useCallback(async () => {
    if (!user) return

    setIsLoadingOrganizations(true)
    try {
      const { data, error } = await supabase
        .from('organization_memberships')
        .select(`
          *,
          organization:organizations(*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')

      if (error) throw error

      const organizations = data?.map(membership => ({
        ...(membership.organization as Organization),
        membership: membership as OrganizationMembership
      })) || []

      setUserOrganizations(organizations)
    } catch (err) {
      console.error('Error loading user organizations:', err)
    } finally {
      setIsLoadingOrganizations(false)
    }
  }, [user, supabase])

  // Load organization stats
  const loadStats = React.useCallback(async (force = false) => {
    if (!currentOrganization) return
    if (!force && cache.stats && isCacheValid(cache.stats)) return

    setIsLoadingStats(true)
    setStatsError(null)

    try {
      // This would typically involve multiple queries to get comprehensive stats
      // For now, we'll create mock data that would be calculated from actual queries
      const stats: OrganizationStats = {
        totalMembers: 0,
        totalTeams: 0,
        totalPlayers: 0,
        totalMatches: 0,
        activeTournaments: 0,
        liveMatches: 0,
        recentActivity: 0,
        memberGrowth: 0,
        matchesThisMonth: 0,
        upcomingMatches: 0
      }

      // Get member count
      const { count: memberCount } = await supabase
        .from('organization_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganization.id)
        .eq('status', 'active')

      stats.totalMembers = memberCount || 0

      // Cache and set stats
      setCacheEntry('stats', stats, cacheConfig.statsTTL!)
      setOrganizationStats(stats)
    } catch (err) {
      console.error('Error loading stats:', err)
      setStatsError('Failed to load organization statistics')
    } finally {
      setIsLoadingStats(false)
    }
  }, [currentOrganization, cache.stats, cacheConfig.statsTTL, supabase])

  // Load organization members
  const loadMembers = React.useCallback(async (force = false) => {
    if (!currentOrganization) return
    if (!force && cache.members && isCacheValid(cache.members)) return

    setIsLoadingMembers(true)
    setMembersError(null)

    try {
      const { data, error } = await supabase
        .from('organization_memberships')
        .select(`
          *,
          user_profiles!inner(
            id,
            email,
            full_name,
            avatar_url,
            last_active_at
          )
        `)
        .eq('organization_id', currentOrganization.id)
        .eq('status', 'active')

      if (error) throw error

      const members: OrganizationMember[] = data?.map(membership => {
        const profile = membership.user_profiles as any
        return {
          id: membership.id,
          userId: membership.user_id,
          email: profile.email,
          fullName: profile.full_name,
          role: membership.role,
          status: membership.status as any,
          joinedAt: membership.joined_at,
          lastActiveAt: profile.last_active_at,
          avatarUrl: profile.avatar_url,
          permissions: PermissionManager.getRolePermissions(membership.role)
        }
      }) || []

      setCacheEntry('members', members, cacheConfig.membersTTL!)
      setOrganizationMembers(members)
    } catch (err) {
      console.error('Error loading members:', err)
      setMembersError('Failed to load organization members')
    } finally {
      setIsLoadingMembers(false)
    }
  }, [currentOrganization, cache.members, cacheConfig.membersTTL, supabase])

  // Load organization preferences
  const loadPreferences = React.useCallback(async (force = false) => {
    if (!currentOrganization) return
    if (!force && cache.preferences && isCacheValid(cache.preferences)) return

    setIsLoadingPreferences(true)

    try {
      // Mock preferences - would typically be stored in organization settings
      const preferences: OrganizationPreferences = {
        timezone: currentOrganization.timezone || 'UTC',
        dateFormat: 'MM/dd/yyyy',
        language: 'en',
        currency: 'USD',
        notifications: {
          email: true,
          sms: false,
          push: true
        },
        features: {
          enableAdvancedStats: true,
          enableLiveScoring: true,
          enableBroadcasting: false,
          enableMobileApp: true
        }
      }

      setCacheEntry('preferences', preferences, cacheConfig.preferencesTTL!)
      setOrganizationPreferences(preferences)
    } catch (err) {
      console.error('Error loading preferences:', err)
    } finally {
      setIsLoadingPreferences(false)
    }
  }, [currentOrganization, cache.preferences, cacheConfig.preferencesTTL])

  // Load all data when organization changes
  React.useEffect(() => {
    if (currentOrganization) {
      loadUserOrganizations()
      loadStats()
      loadMembers()
      loadPreferences()
    }
  }, [currentOrganization, loadUserOrganizations, loadStats, loadMembers, loadPreferences])

  // Actions
  const switchOrganization = React.useCallback(async (organizationId: string) => {
    setIsSwitching(true)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ current_organization_id: organizationId })
        .eq('id', user?.id)

      if (error) throw error

      // Clear cache when switching organizations
      setCache({ stats: null, members: null, preferences: null })
      clearIsolatedData()
    } catch (err) {
      console.error('Error switching organization:', err)
      throw err
    } finally {
      setIsSwitching(false)
    }
  }, [user?.id, supabase, clearIsolatedData])

  const refreshOrganization = React.useCallback(async () => {
    if (currentOrganization) {
      setIsLoading(true)
      await Promise.all([
        loadStats(true),
        loadMembers(true),
        loadPreferences(true)
      ])
      setIsLoading(false)
    }
  }, [currentOrganization, loadStats, loadMembers, loadPreferences])

  const clearCache = React.useCallback(() => {
    setCache({ stats: null, members: null, preferences: null })
  }, [])

  // Cache status
  const cacheStatus = React.useMemo(() => ({
    stats: getCacheStatus(cache.stats, cacheConfig.statsTTL!),
    members: getCacheStatus(cache.members, cacheConfig.membersTTL!),
    preferences: getCacheStatus(cache.preferences, cacheConfig.preferencesTTL!)
  }), [cache, cacheConfig])

  // Placeholder implementations for other actions
  const createOrganization = React.useCallback(async (data: any): Promise<Organization> => {
    // Implementation would go here
    throw new Error('Not implemented')
  }, [])

  const updateOrganization = React.useCallback(async (updates: any) => {
    // Implementation would go here
    throw new Error('Not implemented')
  }, [])

  const updatePreferences = React.useCallback(async (preferences: Partial<OrganizationPreferences>) => {
    // Implementation would go here
    throw new Error('Not implemented')
  }, [])

  const uploadLogo = React.useCallback(async (file: File): Promise<string> => {
    // Implementation would go here
    throw new Error('Not implemented')
  }, [])

  const deleteOrganization = React.useCallback(async () => {
    // Implementation would go here
    throw new Error('Not implemented')
  }, [])

  const inviteMember = React.useCallback(async (email: string, role: Database['public']['Enums']['user_role'], message?: string) => {
    // Implementation would go here
    throw new Error('Not implemented')
  }, [])

  const updateMemberRole = React.useCallback(async (memberId: string, role: Database['public']['Enums']['user_role']) => {
    // Implementation would go here
    throw new Error('Not implemented')
  }, [])

  const removeMember = React.useCallback(async (memberId: string) => {
    // Implementation would go here
    throw new Error('Not implemented')
  }, [])

  // Real-time subscription placeholders
  const subscribeToOrganization = React.useCallback(() => {
    // Implementation would go here
    return () => {}
  }, [])

  const subscribeToMembers = React.useCallback(() => {
    // Implementation would go here
    return () => {}
  }, [])

  const subscribeToStats = React.useCallback(() => {
    // Implementation would go here
    return () => {}
  }, [])

  const value: EnhancedOrganizationContextType = {
    // State
    currentOrganization,
    currentMembership,
    organizationStats,
    organizationPreferences,
    organizationMembers,
    userOrganizations,
    
    // Loading states
    isLoading,
    isLoadingStats,
    isLoadingMembers,
    isLoadingPreferences,
    isLoadingOrganizations,
    isSwitching,
    
    // Error states
    error,
    statsError,
    membersError,
    
    // Cache status
    cacheStatus,
    
    // Actions
    switchOrganization,
    refreshOrganization,
    refreshStats: loadStats,
    refreshMembers: loadMembers,
    refreshPreferences: loadPreferences,
    refreshUserOrganizations: loadUserOrganizations,
    clearCache,
    
    // Organization management
    createOrganization,
    updateOrganization,
    updatePreferences,
    uploadLogo,
    deleteOrganization,
    
    // Member management
    inviteMember,
    updateMemberRole,
    removeMember,
    
    // Permissions
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAssignRole,
    
    // Data isolation
    getIsolatedData,
    setIsolatedData,
    clearIsolatedData,
    
    // Real-time subscriptions
    subscribeToOrganization,
    subscribeToMembers,
    subscribeToStats
  }

  return (
    <EnhancedOrganizationContext.Provider value={value}>
      {children}
    </EnhancedOrganizationContext.Provider>
  )
}

export default EnhancedOrganizationProvider
