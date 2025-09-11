/**
 * Session Management Service
 * Handles organization switching, session persistence, and state management
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'

export interface SessionData {
  organizationId: string
  userId: string
  role: Database['public']['Enums']['user_role']
  sessionStart: string
  lastActivity: string
  preferences: Record<string, any>
  cacheVersion: string
}

export interface OrganizationSession {
  organizationId: string
  lastAccessed: string
  sessionData: SessionData
  isActive: boolean
}

export interface SessionStats {
  totalSessions: number
  activeSessions: number
  organizationSwitches: number
  sessionDuration: number
  lastActivity: string
}

class SessionManagementService {
  private supabase = createClientComponentClient<Database>()
  private storageKey = 'scoredesk_session'
  private sessionTimeout = 30 * 60 * 1000 // 30 minutes
  private maxSessions = 10 // Maximum stored sessions per user

  /**
   * Get current session data from localStorage
   */
  getCurrentSession(): SessionData | null {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return null
      }
      
      const stored = localStorage.getItem(this.storageKey)
      if (!stored) return null

      const session: SessionData = JSON.parse(stored)
      
      // Check if session is expired
      const lastActivity = new Date(session.lastActivity)
      const now = new Date()
      
      if (now.getTime() - lastActivity.getTime() > this.sessionTimeout) {
        this.clearCurrentSession()
        return null
      }

      return session
    } catch (error) {
      console.error('Error reading session:', error)
      return null
    }
  }

  /**
   * Save current session data
   */
  saveCurrentSession(sessionData: SessionData): void {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return
      }
      
      // Update last activity
      sessionData.lastActivity = new Date().toISOString()
      
      localStorage.setItem(this.storageKey, JSON.stringify(sessionData))
      
      // Also save to organization sessions history
      this.saveToSessionHistory(sessionData)
    } catch (error) {
      console.error('Error saving session:', error)
    }
  }

  /**
   * Clear current session
   */
  clearCurrentSession(): void {
    try {
      localStorage.removeItem(this.storageKey)
    } catch (error) {
      console.error('Error clearing session:', error)
    }
  }

  /**
   * Create new session for organization switch
   */
  async createOrganizationSession(
    organizationId: string, 
    userId: string, 
    role: Database['public']['Enums']['user_role']
  ): Promise<SessionData> {
    const sessionData: SessionData = {
      organizationId,
      userId,
      role,
      sessionStart: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      preferences: {},
      cacheVersion: this.generateCacheVersion()
    }

    // Update user's current organization in database
    await this.updateUserCurrentOrganization(userId, organizationId)
    
    // Save session
    this.saveCurrentSession(sessionData)
    
    // Track organization switch
    this.trackOrganizationSwitch(userId, organizationId)
    
    return sessionData
  }

  /**
   * Switch to different organization
   */
  async switchOrganization(
    organizationId: string, 
    userId: string, 
    role: Database['public']['Enums']['user_role']
  ): Promise<SessionData> {
    // Save current session to history before switching
    const currentSession = this.getCurrentSession()
    if (currentSession) {
      this.saveToSessionHistory(currentSession)
    }

    // Clear cache when switching organizations
    this.clearOrganizationCache(currentSession?.organizationId)
    
    // Create new session
    return this.createOrganizationSession(organizationId, userId, role)
  }

  /**
   * Update session activity
   */
  updateActivity(): void {
    const session = this.getCurrentSession()
    if (session) {
      session.lastActivity = new Date().toISOString()
      this.saveCurrentSession(session)
    }
  }

  /**
   * Update session preferences
   */
  updateSessionPreferences(preferences: Record<string, any>): void {
    const session = this.getCurrentSession()
    if (session) {
      session.preferences = { ...session.preferences, ...preferences }
      this.saveCurrentSession(session)
    }
  }

  /**
   * Get session history for user
   */
  getSessionHistory(): OrganizationSession[] {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return []
      }
      
      const historyKey = `${this.storageKey}_history`
      const stored = localStorage.getItem(historyKey)
      if (!stored) return []

      const history: OrganizationSession[] = JSON.parse(stored)
      
      // Sort by last accessed, most recent first
      return history.sort((a, b) => 
        new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime()
      )
    } catch (error) {
      console.error('Error reading session history:', error)
      return []
    }
  }

  /**
   * Save session to history
   */
  private saveToSessionHistory(sessionData: SessionData): void {
    try {
      const historyKey = `${this.storageKey}_history`
      const history = this.getSessionHistory()
      
      // Remove existing session for this organization
      const filteredHistory = history.filter(
        session => session.organizationId !== sessionData.organizationId
      )
      
      // Add current session
      const organizationSession: OrganizationSession = {
        organizationId: sessionData.organizationId,
        lastAccessed: sessionData.lastActivity,
        sessionData,
        isActive: true
      }
      
      filteredHistory.unshift(organizationSession)
      
      // Limit to max sessions
      const limitedHistory = filteredHistory.slice(0, this.maxSessions)
      
      localStorage.setItem(historyKey, JSON.stringify(limitedHistory))
    } catch (error) {
      console.error('Error saving session history:', error)
    }
  }

  /**
   * Clear session history
   */
  clearSessionHistory(): void {
    try {
      const historyKey = `${this.storageKey}_history`
      localStorage.removeItem(historyKey)
    } catch (error) {
      console.error('Error clearing session history:', error)
    }
  }

  /**
   * Get session statistics
   */
  getSessionStats(): SessionStats {
    const currentSession = this.getCurrentSession()
    const history = this.getSessionHistory()
    
    const now = new Date()
    const sessionStart = currentSession ? new Date(currentSession.sessionStart) : now
    const sessionDuration = now.getTime() - sessionStart.getTime()
    
    return {
      totalSessions: history.length,
      activeSessions: history.filter(s => s.isActive).length,
      organizationSwitches: this.getOrganizationSwitchCount(),
      sessionDuration,
      lastActivity: currentSession?.lastActivity || new Date().toISOString()
    }
  }

  /**
   * Check if session is valid and active
   */
  isSessionValid(): boolean {
    const session = this.getCurrentSession()
    if (!session) return false
    
    const lastActivity = new Date(session.lastActivity)
    const now = new Date()
    
    return now.getTime() - lastActivity.getTime() < this.sessionTimeout
  }

  /**
   * Extend session timeout
   */
  extendSession(): void {
    const session = this.getCurrentSession()
    if (session) {
      session.lastActivity = new Date().toISOString()
      this.saveCurrentSession(session)
    }
  }

  /**
   * Handle session timeout
   */
  handleSessionTimeout(): void {
    console.log('Session timeout detected, clearing session')
    this.clearCurrentSession()
    
    // Optionally redirect to login or show timeout modal
    // This would be handled by the component using this service
  }

  /**
   * Clean up expired sessions from history
   */
  cleanupExpiredSessions(): number {
    const history = this.getSessionHistory()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30) // Remove sessions older than 30 days
    
    const validSessions = history.filter(session => 
      new Date(session.lastAccessed) > cutoff
    )
    
    const removedCount = history.length - validSessions.length
    
    if (removedCount > 0) {
      const historyKey = `${this.storageKey}_history`
      localStorage.setItem(historyKey, JSON.stringify(validSessions))
    }
    
    return removedCount
  }

  /**
   * Update user's current organization in database
   */
  private async updateUserCurrentOrganization(userId: string, organizationId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('user_profiles')
        .update({ 
          current_organization_id: organizationId,
          last_active_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) {
        console.error('Error updating user current organization:', error)
        throw error
      }
    } catch (error) {
      console.error('Failed to update current organization:', error)
      throw error
    }
  }

  /**
   * Track organization switch for analytics
   */
  private trackOrganizationSwitch(userId: string, organizationId: string): void {
    try {
      const switchKey = `${this.storageKey}_switches`
      const switches = JSON.parse(localStorage.getItem(switchKey) || '[]')
      
      switches.push({
        userId,
        organizationId,
        timestamp: new Date().toISOString()
      })
      
      // Keep only last 100 switches
      const limitedSwitches = switches.slice(-100)
      localStorage.setItem(switchKey, JSON.stringify(limitedSwitches))
    } catch (error) {
      console.error('Error tracking organization switch:', error)
    }
  }

  /**
   * Get organization switch count
   */
  private getOrganizationSwitchCount(): number {
    try {
      const switchKey = `${this.storageKey}_switches`
      const switches = JSON.parse(localStorage.getItem(switchKey) || '[]')
      return switches.length
    } catch (error) {
      return 0
    }
  }

  /**
   * Clear organization-specific cache
   */
  private clearOrganizationCache(organizationId?: string): void {
    if (!organizationId) return
    
    try {
      // Clear organization-specific localStorage keys
      const keysToRemove: string[] = []
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.includes(organizationId)) {
          keysToRemove.push(key)
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key))
      
      console.log(`Cleared ${keysToRemove.length} cached items for organization ${organizationId}`)
    } catch (error) {
      console.error('Error clearing organization cache:', error)
    }
  }

  /**
   * Generate cache version for cache invalidation
   */
  private generateCacheVersion(): string {
    return `v${Date.now()}`
  }

  /**
   * Get recently accessed organizations
   */
  getRecentOrganizations(limit = 5): OrganizationSession[] {
    return this.getSessionHistory().slice(0, limit)
  }

  /**
   * Check if organization was recently accessed
   */
  wasRecentlyAccessed(organizationId: string, hours = 24): boolean {
    const history = this.getSessionHistory()
    const cutoff = new Date()
    cutoff.setHours(cutoff.getHours() - hours)
    
    return history.some(session => 
      session.organizationId === organizationId && 
      new Date(session.lastAccessed) > cutoff
    )
  }

  /**
   * Export session data for debugging
   */
  exportSessionData(): {
    currentSession: SessionData | null
    sessionHistory: OrganizationSession[]
    sessionStats: SessionStats
  } {
    return {
      currentSession: this.getCurrentSession(),
      sessionHistory: this.getSessionHistory(),
      sessionStats: this.getSessionStats()
    }
  }
}

export const sessionManager = new SessionManagementService()
export default SessionManagementService
