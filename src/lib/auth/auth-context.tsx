'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useSupabase } from '@/components/providers/supabase-provider'
import { hasPermission, hasAnyPermission, hasAllPermissions } from './permissions'
import type { UserProfile, OrganizationMembership, UserRole, Permission } from './types'

interface AuthContextType {
  user: UserProfile | null
  currentOrganization: string | null
  currentRole: UserRole | null
  memberships: OrganizationMembership[]
  loading: boolean
  
  // Permission check functions
  hasPermission: (permission: Permission) => boolean
  hasAnyPermission: (permissions: Permission[]) => boolean
  hasAllPermissions: (permissions: Permission[]) => boolean
  
  // Organization management
  setCurrentOrganization: (organizationId: string) => void
  getCurrentMembership: () => OrganizationMembership | null
  
  // Auth actions
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { supabase, user: supabaseUser, loading: supabaseLoading } = useSupabase()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [currentOrganization, setCurrentOrganization] = useState<string | null>(null)
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null)
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([])
  const [loading, setLoading] = useState(true)

  // Load user profile and memberships with session management
  useEffect(() => {
    async function loadUserData() {
      if (!supabaseUser) {
        setUser(null)
        setMemberships([])
        setCurrentOrganization(null)
        setCurrentRole(null)
        setLoading(false)
        return
      }

      try {
        // Load user profile
        const userProfile: UserProfile = {
          id: supabaseUser.id,
          email: supabaseUser.email!,
          firstName: supabaseUser.user_metadata?.first_name || '',
          lastName: supabaseUser.user_metadata?.last_name || '',
          fullName: supabaseUser.user_metadata?.full_name || supabaseUser.email!,
          avatarUrl: supabaseUser.user_metadata?.avatar_url,
          createdAt: supabaseUser.created_at,
          updatedAt: supabaseUser.updated_at || supabaseUser.created_at,
        }
        setUser(userProfile)

        // Load organization memberships from database
        const { data: membershipsData, error: membershipsError } = await supabase
          .from('organization_memberships')
          .select(`
            id,
            organization_id,
            role,
            is_active,
            joined_at,
            organizations (
              id,
              name,
              slug,
              logo_url
            )
          `)
          .eq('user_id', supabaseUser.id)
          .eq('is_active', true)

        if (membershipsError) {
          console.error('Error loading organization memberships:', membershipsError)
          setMemberships([])
        } else {
          const memberships: OrganizationMembership[] = (membershipsData || []).map(m => ({
            id: m.id,
            userId: supabaseUser.id,
            organizationId: m.organization_id,
            role: m.role as UserRole,
            isActive: m.is_active,
            joinedAt: m.joined_at,
          }))
          setMemberships(memberships)
        }

        // Try to restore current organization from session
        const { sessionManager } = await import('@/lib/auth/session-manager')
        const storedOrgId = sessionManager.getCurrentOrganization()
        
        if (storedOrgId && memberships.length > 0) {
          const membership = memberships.find(m => m.organizationId === storedOrgId && m.isActive)
          if (membership) {
            setCurrentOrganization(storedOrgId)
            setCurrentRole(membership.role)
          }
        } else if (memberships.length > 0) {
          // Set current organization to the first one (if any)
          const firstMembership = memberships[0]
          setCurrentOrganization(firstMembership.organizationId)
          setCurrentRole(firstMembership.role)
          sessionManager.saveCurrentOrganization(firstMembership.organizationId)
        }

        // Save session data
        sessionManager.saveSession({
          user: supabaseUser,
          lastActivity: Date.now(),
        })
      } catch (error) {
        console.error('Error loading user data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (!supabaseLoading) {
      loadUserData()
    }
  }, [supabaseUser, supabaseLoading, supabase])

  // Permission check functions
  const checkPermission = (permission: Permission): boolean => {
    if (!currentRole) return false
    return hasPermission(currentRole, permission)
  }

  const checkAnyPermission = (permissions: Permission[]): boolean => {
    if (!currentRole) return false
    return hasAnyPermission(currentRole, permissions)
  }

  const checkAllPermissions = (permissions: Permission[]): boolean => {
    if (!currentRole) return false
    return hasAllPermissions(currentRole, permissions)
  }

  // Organization management
  const handleSetCurrentOrganization = (organizationId: string) => {
    const membership = memberships.find(m => m.organizationId === organizationId && m.isActive)
    if (membership) {
      setCurrentOrganization(organizationId)
      setCurrentRole(membership.role)
      
      // Store in localStorage for persistence
      localStorage.setItem('scoredesk:currentOrganization', organizationId)
    }
  }

  const getCurrentMembership = (): OrganizationMembership | null => {
    if (!currentOrganization) return null
    return memberships.find(m => m.organizationId === currentOrganization && m.isActive) || null
  }

  // Auth actions
  const signOut = async () => {
    const { sessionManager } = await import('@/lib/auth/session-manager')
    sessionManager.clearSession()
    await supabase.auth.signOut()
    setUser(null)
    setMemberships([])
    setCurrentOrganization(null)
    setCurrentRole(null)
  }

  const refreshUser = async () => {
    // This will trigger the useEffect to reload user data
    await supabase.auth.getUser()
  }

  // Load stored current organization on mount
  useEffect(() => {
    const storedOrgId = localStorage.getItem('scoredesk:currentOrganization')
    if (storedOrgId && memberships.length > 0) {
      const membership = memberships.find(m => m.organizationId === storedOrgId && m.isActive)
      if (membership) {
        setCurrentOrganization(storedOrgId)
        setCurrentRole(membership.role)
      }
    }
  }, [memberships])

  const value: AuthContextType = {
    user,
    currentOrganization,
    currentRole,
    memberships,
    loading: loading || supabaseLoading,
    
    hasPermission: checkPermission,
    hasAnyPermission: checkAnyPermission,
    hasAllPermissions: checkAllPermissions,
    
    setCurrentOrganization: handleSetCurrentOrganization,
    getCurrentMembership,
    
    signOut,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
