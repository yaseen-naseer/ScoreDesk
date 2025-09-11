'use client'

import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

export interface SessionData {
  user: User
  session: Session
  organizationId?: string
  lastActivity: number
  preferences: UserPreferences
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  notifications: {
    email: boolean
    push: boolean
    matchUpdates: boolean
    teamUpdates: boolean
  }
}

class SessionManager {
  private static instance: SessionManager
  private storageKey = 'scoredesk:session'
  private preferencesKey = 'scoredesk:preferences'
  private organizationKey = 'scoredesk:currentOrganization'
  private activityKey = 'scoredesk:lastActivity'

  private constructor() {}

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }

  /**
   * Save session data to localStorage
   */
  saveSession(sessionData: Partial<SessionData>): void {
    try {
      const existing = this.getStoredSession()
      const updated = { ...existing, ...sessionData, lastActivity: Date.now() }
      localStorage.setItem(this.storageKey, JSON.stringify(updated))
      this.updateActivity()
    } catch (error) {
      console.error('Failed to save session:', error)
    }
  }

  /**
   * Get session data from localStorage
   */
  getStoredSession(): Partial<SessionData> | null {
    try {
      const data = localStorage.getItem(this.storageKey)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('Failed to get stored session:', error)
      return null
    }
  }

  /**
   * Clear session data
   */
  clearSession(): void {
    try {
      localStorage.removeItem(this.storageKey)
      localStorage.removeItem(this.organizationKey)
      localStorage.removeItem(this.activityKey)
    } catch (error) {
      console.error('Failed to clear session:', error)
    }
  }

  /**
   * Save user preferences
   */
  savePreferences(preferences: Partial<UserPreferences>): void {
    try {
      const existing = this.getPreferences()
      const updated = { ...existing, ...preferences }
      localStorage.setItem(this.preferencesKey, JSON.stringify(updated))
    } catch (error) {
      console.error('Failed to save preferences:', error)
    }
  }

  /**
   * Get user preferences
   */
  getPreferences(): UserPreferences {
    try {
      const data = localStorage.getItem(this.preferencesKey)
      const stored = data ? JSON.parse(data) : {}
      
      // Return defaults merged with stored preferences
      return {
        theme: 'system',
        language: 'en',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        notifications: {
          email: true,
          push: true,
          matchUpdates: true,
          teamUpdates: true,
        },
        ...stored,
      }
    } catch (error) {
      console.error('Failed to get preferences:', error)
      return {
        theme: 'system',
        language: 'en',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        notifications: {
          email: true,
          push: true,
          matchUpdates: true,
          teamUpdates: true,
        },
      }
    }
  }

  /**
   * Save current organization
   */
  saveCurrentOrganization(organizationId: string): void {
    try {
      localStorage.setItem(this.organizationKey, organizationId)
      this.updateActivity()
    } catch (error) {
      console.error('Failed to save current organization:', error)
    }
  }

  /**
   * Get current organization
   */
  getCurrentOrganization(): string | null {
    try {
      return localStorage.getItem(this.organizationKey)
    } catch (error) {
      console.error('Failed to get current organization:', error)
      return null
    }
  }

  /**
   * Update last activity timestamp
   */
  updateActivity(): void {
    try {
      localStorage.setItem(this.activityKey, Date.now().toString())
    } catch (error) {
      console.error('Failed to update activity:', error)
    }
  }

  /**
   * Get last activity timestamp
   */
  getLastActivity(): number {
    try {
      const activity = localStorage.getItem(this.activityKey)
      return activity ? parseInt(activity, 10) : Date.now()
    } catch (error) {
      console.error('Failed to get last activity:', error)
      return Date.now()
    }
  }

  /**
   * Check if session is expired (inactive for more than specified time)
   */
  isSessionExpired(maxInactiveMinutes = 120): boolean {
    const lastActivity = this.getLastActivity()
    const maxInactiveMs = maxInactiveMinutes * 60 * 1000
    return Date.now() - lastActivity > maxInactiveMs
  }

  /**
   * Restore session from Supabase and localStorage
   */
  async restoreSession(): Promise<{
    user: User | null
    session: Session | null
    organizationId: string | null
    preferences: UserPreferences
  }> {
    const supabase = createClient()
    
    try {
      // Get current session from Supabase
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Failed to restore Supabase session:', error)
        this.clearSession()
        return {
          user: null,
          session: null,
          organizationId: null,
          preferences: this.getPreferences(),
        }
      }

      // If no session, clear local data
      if (!session) {
        this.clearSession()
        return {
          user: null,
          session: null,
          organizationId: null,
          preferences: this.getPreferences(),
        }
      }

      // Check if local session is expired
      if (this.isSessionExpired()) {
        console.warn('Local session expired, clearing data')
        this.clearSession()
        await supabase.auth.signOut()
        return {
          user: null,
          session: null,
          organizationId: null,
          preferences: this.getPreferences(),
        }
      }

      // Restore local data
      const organizationId = this.getCurrentOrganization()
      const preferences = this.getPreferences()

      // Update activity
      this.updateActivity()

      return {
        user: session.user,
        session,
        organizationId,
        preferences,
      }
    } catch (error) {
      console.error('Failed to restore session:', error)
      this.clearSession()
      return {
        user: null,
        session: null,
        organizationId: null,
        preferences: this.getPreferences(),
      }
    }
  }

  /**
   * Set up activity tracking
   */
  setupActivityTracking(): () => void {
    const updateActivity = () => this.updateActivity()
    
    // Track various user activities
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true })
    })

    // Also track when window gains focus
    window.addEventListener('focus', updateActivity)

    // Return cleanup function
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity)
      })
      window.removeEventListener('focus', updateActivity)
    }
  }

  /**
   * Set up automatic session refresh
   */
  setupSessionRefresh(intervalMinutes = 30): () => void {
    const supabase = createClient()
    
    const refreshSession = async () => {
      try {
        const { error } = await supabase.auth.refreshSession()
        if (error) {
          console.error('Failed to refresh session:', error)
        } else {
          this.updateActivity()
        }
      } catch (error) {
        console.error('Failed to refresh session:', error)
      }
    }

    // Refresh session periodically
    const intervalId = setInterval(refreshSession, intervalMinutes * 60 * 1000)

    // Return cleanup function
    return () => {
      clearInterval(intervalId)
    }
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance()
