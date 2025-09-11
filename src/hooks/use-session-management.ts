/**
 * Session Management Hook
 * React hook for handling organization session management
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { useOrganization } from '@/lib/contexts/organization-context'
import { sessionManager, type SessionData, type OrganizationSession, type SessionStats } from '@/lib/services/session-management-service'

export interface UseSessionManagementResult {
  // Current session
  currentSession: SessionData | null
  sessionStats: SessionStats
  recentOrganizations: OrganizationSession[]
  
  // Session state
  isSessionValid: boolean
  timeUntilExpiry: number | null
  isNearExpiry: boolean
  
  // Actions
  updateActivity: () => void
  extendSession: () => void
  clearSession: () => void
  exportSessionData: () => any
  
  // Session management
  handleSessionTimeout: () => void
  cleanupExpiredSessions: () => number
}

export interface UseSessionManagementOptions {
  autoUpdateActivity?: boolean
  activityUpdateInterval?: number
  sessionWarningTime?: number
  enableSessionTimeout?: boolean
  onSessionTimeout?: () => void
  onSessionWarning?: (timeLeft: number) => void
}

export function useSessionManagement(options: UseSessionManagementOptions = {}): UseSessionManagementResult {
  const {
    autoUpdateActivity = true,
    activityUpdateInterval = 60000, // 1 minute
    sessionWarningTime = 5 * 60 * 1000, // 5 minutes
    enableSessionTimeout = true,
    onSessionTimeout,
    onSessionWarning
  } = options

  const { user } = useAuth()
  const { currentOrganization, currentMembership } = useOrganization()
  
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null)
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    totalSessions: 0,
    activeSessions: 0,
    organizationSwitches: 0,
    sessionDuration: 0,
    lastActivity: new Date().toISOString()
  })
  const [recentOrganizations, setRecentOrganizations] = useState<OrganizationSession[]>([])
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<number | null>(null)
  const [isNearExpiry, setIsNearExpiry] = useState(false)

  // Refs for intervals
  const activityIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const expiryIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const warningShownRef = useRef(false)

  // Load session data
  const loadSessionData = useCallback(() => {
    const session = sessionManager.getCurrentSession()
    const stats = sessionManager.getSessionStats()
    const recent = sessionManager.getRecentOrganizations()
    
    setCurrentSession(session)
    setSessionStats(stats)
    setRecentOrganizations(recent)
  }, [])

  // Update activity
  const updateActivity = useCallback(() => {
    sessionManager.updateActivity()
    loadSessionData()
  }, [loadSessionData])

  // Extend session
  const extendSession = useCallback(() => {
    sessionManager.extendSession()
    loadSessionData()
    warningShownRef.current = false
  }, [loadSessionData])

  // Clear session
  const clearSession = useCallback(() => {
    sessionManager.clearCurrentSession()
    loadSessionData()
  }, [loadSessionData])

  // Handle session timeout
  const handleSessionTimeout = useCallback(() => {
    sessionManager.handleSessionTimeout()
    loadSessionData()
    onSessionTimeout?.()
  }, [loadSessionData, onSessionTimeout])

  // Cleanup expired sessions
  const cleanupExpiredSessions = useCallback(() => {
    return sessionManager.cleanupExpiredSessions()
  }, [])

  // Export session data
  const exportSessionData = useCallback(() => {
    return sessionManager.exportSessionData()
  }, [])

  // Check if session is valid
  const isSessionValid = sessionManager.isSessionValid()

  // Calculate time until expiry
  useEffect(() => {
    if (!currentSession) {
      setTimeUntilExpiry(null)
      setIsNearExpiry(false)
      return
    }

    const updateExpiry = () => {
      const lastActivity = new Date(currentSession.lastActivity)
      const now = new Date()
      const sessionTimeout = 30 * 60 * 1000 // 30 minutes
      const expiryTime = lastActivity.getTime() + sessionTimeout
      const timeLeft = expiryTime - now.getTime()
      
      setTimeUntilExpiry(Math.max(0, timeLeft))
      
      const nearExpiry = timeLeft <= sessionWarningTime && timeLeft > 0
      setIsNearExpiry(nearExpiry)
      
      // Show warning if near expiry
      if (nearExpiry && !warningShownRef.current && onSessionWarning) {
        warningShownRef.current = true
        onSessionWarning(timeLeft)
      }
      
      // Handle timeout
      if (timeLeft <= 0 && enableSessionTimeout) {
        handleSessionTimeout()
      }
    }

    // Update immediately
    updateExpiry()

    // Set up interval to check expiry
    expiryIntervalRef.current = setInterval(updateExpiry, 1000)

    return () => {
      if (expiryIntervalRef.current) {
        clearInterval(expiryIntervalRef.current)
      }
    }
  }, [currentSession, sessionWarningTime, enableSessionTimeout, onSessionWarning, handleSessionTimeout])

  // Set up automatic activity updates
  useEffect(() => {
    if (!autoUpdateActivity || !currentSession) return

    const updateActivityPeriodically = () => {
      // Only update if user is active (not idle)
      if (document.hasFocus()) {
        updateActivity()
      }
    }

    activityIntervalRef.current = setInterval(updateActivityPeriodically, activityUpdateInterval)

    return () => {
      if (activityIntervalRef.current) {
        clearInterval(activityIntervalRef.current)
      }
    }
  }, [autoUpdateActivity, activityUpdateInterval, currentSession, updateActivity])

  // Create session when organization context is available
  useEffect(() => {
    const createSession = async () => {
      if (user && currentOrganization && currentMembership && !currentSession) {
        try {
          await sessionManager.createOrganizationSession(
            currentOrganization.id,
            user.id,
            currentMembership.role
          )
          loadSessionData()
        } catch (error) {
          console.error('Error creating session:', error)
        }
      }
    }

    createSession()
  }, [user, currentOrganization, currentMembership, currentSession, loadSessionData])

  // Load session data on mount
  useEffect(() => {
    loadSessionData()
  }, [loadSessionData])

  // Activity tracking for user interactions
  useEffect(() => {
    if (!autoUpdateActivity) return

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    let lastActivity = Date.now()
    
    const handleActivity = () => {
      const now = Date.now()
      // Throttle activity updates to avoid excessive calls
      if (now - lastActivity > 60000) { // 1 minute throttle
        lastActivity = now
        updateActivity()
      }
    }

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
    }
  }, [autoUpdateActivity, updateActivity])

  // Page visibility API for activity tracking
  useEffect(() => {
    if (!autoUpdateActivity) return

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateActivity()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [autoUpdateActivity, updateActivity])

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (activityIntervalRef.current) {
        clearInterval(activityIntervalRef.current)
      }
      if (expiryIntervalRef.current) {
        clearInterval(expiryIntervalRef.current)
      }
    }
  }, [])

  return {
    // Current session
    currentSession,
    sessionStats,
    recentOrganizations,
    
    // Session state
    isSessionValid,
    timeUntilExpiry,
    isNearExpiry,
    
    // Actions
    updateActivity,
    extendSession,
    clearSession,
    exportSessionData,
    
    // Session management
    handleSessionTimeout,
    cleanupExpiredSessions
  }
}

// Hook for session timeout warning
export function useSessionTimeout(options: {
  warningTime?: number
  onWarning?: (timeLeft: number) => void
  onTimeout?: () => void
} = {}) {
  const { warningTime = 5 * 60 * 1000, onWarning, onTimeout } = options
  const [showWarning, setShowWarning] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  const { timeUntilExpiry, isNearExpiry, extendSession } = useSessionManagement({
    sessionWarningTime: warningTime,
    onSessionTimeout: onTimeout,
    onSessionWarning: (time) => {
      setTimeLeft(time)
      setShowWarning(true)
      onWarning?.(time)
    }
  })

  const dismissWarning = useCallback(() => {
    setShowWarning(false)
    setTimeLeft(null)
  }, [])

  const extendAndDismiss = useCallback(() => {
    extendSession()
    dismissWarning()
  }, [extendSession, dismissWarning])

  return {
    showWarning,
    timeLeft,
    timeUntilExpiry,
    isNearExpiry,
    dismissWarning,
    extendSession: extendAndDismiss
  }
}

export default useSessionManagement
