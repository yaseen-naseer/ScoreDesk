'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { sessionManager } from '@/lib/auth/session-manager'
import type { UserPreferences } from '@/lib/auth/session-manager'

/**
 * Hook to handle session persistence and automatic activity tracking
 */
export function useSessionPersistence() {
  const { user, currentOrganization } = useAuth()
  const cleanupRef = useRef<(() => void)[]>([])

  useEffect(() => {
    // Set up activity tracking
    const cleanupActivity = sessionManager.setupActivityTracking()
    cleanupRef.current.push(cleanupActivity)

    // Set up session refresh
    const cleanupRefresh = sessionManager.setupSessionRefresh(30) // Refresh every 30 minutes
    cleanupRef.current.push(cleanupRefresh)

    // Cleanup on unmount
    return () => {
      cleanupRef.current.forEach(cleanup => cleanup())
      cleanupRef.current = []
    }
  }, [])

  // Save session data when user or organization changes
  useEffect(() => {
    if (user) {
      sessionManager.saveSession({
        user,
        lastActivity: Date.now(),
      })
    }
  }, [user])

  useEffect(() => {
    if (currentOrganization) {
      sessionManager.saveCurrentOrganization(currentOrganization)
    }
  }, [currentOrganization])

  return {
    savePreferences: (preferences: Partial<UserPreferences>) => {
      sessionManager.savePreferences(preferences)
    },
    getPreferences: () => sessionManager.getPreferences(),
    clearSession: () => sessionManager.clearSession(),
    isSessionExpired: () => sessionManager.isSessionExpired(),
    getLastActivity: () => sessionManager.getLastActivity(),
  }
}
