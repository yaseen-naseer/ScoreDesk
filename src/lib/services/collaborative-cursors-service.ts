/**
 * Collaborative Cursors Service
 * Real-time cursor tracking and live indicators for collaborative editing
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'
import { EventEmitter } from 'events'

export interface CursorPosition {
  x: number
  y: number
  timestamp: number
  elementId?: string
  elementType?: string
  context?: Record<string, any>
}

export interface UserCursor {
  userId: string
  userName: string
  userColor: string
  position: CursorPosition
  isActive: boolean
  lastSeen: number
  activity: string
  metadata?: Record<string, any>
}

export interface LiveIndicator {
  id: string
  userId: string
  type: 'selection' | 'edit' | 'hover' | 'focus' | 'action'
  elementId: string
  elementType: string
  data: Record<string, any>
  timestamp: number
  duration?: number
}

export interface CursorPresence {
  sessionId: string
  userId: string
  cursors: UserCursor[]
  indicators: LiveIndicator[]
  lastUpdate: number
}

export interface CursorSettings {
  showCursors: boolean
  showSelections: boolean
  showHovers: boolean
  showActions: boolean
  cursorOpacity: number
  cursorSize: number
  animationSpeed: number
  fadeOutDelay: number
}

export interface CursorStats {
  totalCursors: number
  activeCursors: number
  totalIndicators: number
  averageActivity: number
  mostActiveUser: string
  collaborationLevel: number
}

class CollaborativeCursorsService extends EventEmitter {
  private supabase = createClientComponentClient<Database>()
  private cursorChannels = new Map<string, any>()
  private cursorStates = new Map<string, CursorPresence>()
  private userColors = new Map<string, string>()
  private settings: CursorSettings = {
    showCursors: true,
    showSelections: true,
    showHovers: true,
    showActions: true,
    cursorOpacity: 0.8,
    cursorSize: 20,
    animationSpeed: 200,
    fadeOutDelay: 3000
  }

  /**
   * Start cursor tracking for a session
   */
  async startCursorTracking(
    sessionId: string,
    userId: string,
    userName: string
  ): Promise<void> {
    try {
      // Generate user color if not exists
      if (!this.userColors.has(userId)) {
        this.userColors.set(userId, this.generateUserColor(userId))
      }

      // Initialize cursor presence
      const cursorPresence: CursorPresence = {
        sessionId,
        userId,
        cursors: [],
        indicators: [],
        lastUpdate: Date.now()
      }
      this.cursorStates.set(`${sessionId}-${userId}`, cursorPresence)

      // Setup real-time channel for cursor updates
      await this.setupCursorChannel(sessionId, userId, userName)

      console.log(`Started cursor tracking for user ${userId} in session ${sessionId}`)
    } catch (error) {
      console.error('Error starting cursor tracking:', error)
    }
  }

  /**
   * Stop cursor tracking for a session
   */
  async stopCursorTracking(sessionId: string, userId: string): Promise<void> {
    try {
      // Remove cursor state
      this.cursorStates.delete(`${sessionId}-${userId}`)

      // Unsubscribe from channel
      const channelKey = `${sessionId}-${userId}`
      const channel = this.cursorChannels.get(channelKey)
      if (channel) {
        await this.supabase.removeChannel(channel)
        this.cursorChannels.delete(channelKey)
      }

      // Broadcast cursor removal to other users
      await this.broadcastCursorRemoval(sessionId, userId)

      console.log(`Stopped cursor tracking for user ${userId} in session ${sessionId}`)
    } catch (error) {
      console.error('Error stopping cursor tracking:', error)
    }
  }

  /**
   * Update cursor position
   */
  async updateCursorPosition(
    sessionId: string,
    userId: string,
    position: CursorPosition,
    activity: string = 'moving'
  ): Promise<void> {
    try {
      const cursorPresence = this.cursorStates.get(`${sessionId}-${userId}`)
      if (!cursorPresence) {
        return
      }

      // Update cursor
      const userCursor: UserCursor = {
        userId,
        userName: cursorPresence.cursors[0]?.userName || 'Unknown',
        userColor: this.userColors.get(userId) || '#000000',
        position,
        isActive: true,
        lastSeen: Date.now(),
        activity,
        metadata: {
          sessionId,
          timestamp: Date.now()
        }
      }

      // Update or add cursor
      const existingCursorIndex = cursorPresence.cursors.findIndex(c => c.userId === userId)
      if (existingCursorIndex >= 0) {
        cursorPresence.cursors[existingCursorIndex] = userCursor
      } else {
        cursorPresence.cursors.push(userCursor)
      }

      cursorPresence.lastUpdate = Date.now()

      // Broadcast to other users
      await this.broadcastCursorUpdate(sessionId, userId, userCursor)

      // Emit local event
      this.emit('cursorUpdate', {
        sessionId,
        userId,
        cursor: userCursor
      })
    } catch (error) {
      console.error('Error updating cursor position:', error)
    }
  }

  /**
   * Create live indicator
   */
  async createLiveIndicator(
    sessionId: string,
    userId: string,
    indicator: Omit<LiveIndicator, 'id' | 'userId' | 'timestamp'>
  ): Promise<void> {
    try {
      const fullIndicator: LiveIndicator = {
        ...indicator,
        id: `indicator-${userId}-${Date.now()}`,
        userId,
        timestamp: Date.now()
      }

      const cursorPresence = this.cursorStates.get(`${sessionId}-${userId}`)
      if (cursorPresence) {
        cursorPresence.indicators.push(fullIndicator)
        
        // Remove old indicators (keep last 50)
        if (cursorPresence.indicators.length > 50) {
          cursorPresence.indicators = cursorPresence.indicators.slice(-50)
        }
      }

      // Broadcast to other users
      await this.broadcastIndicatorUpdate(sessionId, fullIndicator)

      // Auto-remove indicator after duration
      if (fullIndicator.duration) {
        setTimeout(() => {
          this.removeLiveIndicator(sessionId, fullIndicator.id)
        }, fullIndicator.duration)
      }

      // Emit local event
      this.emit('indicatorCreated', {
        sessionId,
        indicator: fullIndicator
      })
    } catch (error) {
      console.error('Error creating live indicator:', error)
    }
  }

  /**
   * Remove live indicator
   */
  async removeLiveIndicator(sessionId: string, indicatorId: string): Promise<void> {
    try {
      // Find and remove indicator from all cursor states
      for (const [key, presence] of this.cursorStates.entries()) {
        if (presence.sessionId === sessionId) {
          presence.indicators = presence.indicators.filter(i => i.id !== indicatorId)
        }
      }

      // Broadcast removal to other users
      await this.broadcastIndicatorRemoval(sessionId, indicatorId)

      // Emit local event
      this.emit('indicatorRemoved', {
        sessionId,
        indicatorId
      })
    } catch (error) {
      console.error('Error removing live indicator:', error)
    }
  }

  /**
   * Get all cursors for a session
   */
  getSessionCursors(sessionId: string): UserCursor[] {
    const cursors: UserCursor[] = []
    
    for (const [key, presence] of this.cursorStates.entries()) {
      if (presence.sessionId === sessionId) {
        cursors.push(...presence.cursors)
      }
    }

    return cursors
  }

  /**
   * Get all indicators for a session
   */
  getSessionIndicators(sessionId: string): LiveIndicator[] {
    const indicators: LiveIndicator[] = []
    
    for (const [key, presence] of this.cursorStates.entries()) {
      if (presence.sessionId === sessionId) {
        indicators.push(...presence.indicators)
      }
    }

    return indicators
  }

  /**
   * Get cursor statistics
   */
  getCursorStats(sessionId: string): CursorStats {
    const cursors = this.getSessionCursors(sessionId)
    const indicators = this.getSessionIndicators(sessionId)
    
    const activeCursors = cursors.filter(c => 
      Date.now() - c.lastSeen < this.settings.fadeOutDelay
    )

    // Calculate most active user
    const userActivity = new Map<string, number>()
    cursors.forEach(cursor => {
      const count = userActivity.get(cursor.userId) || 0
      userActivity.set(cursor.userId, count + 1)
    })

    const mostActiveUser = Array.from(userActivity.entries())
      .sort(([, a], [, b]) => b - a)[0]?.[0] || ''

    // Calculate collaboration level (0-100)
    const collaborationLevel = Math.min(
      (activeCursors.length / Math.max(cursors.length, 1)) * 100,
      100
    )

    return {
      totalCursors: cursors.length,
      activeCursors: activeCursors.length,
      totalIndicators: indicators.length,
      averageActivity: cursors.length > 0 ? 
        cursors.reduce((sum, c) => sum + 1, 0) / cursors.length : 0,
      mostActiveUser,
      collaborationLevel: Math.round(collaborationLevel)
    }
  }

  /**
   * Update cursor settings
   */
  updateSettings(newSettings: Partial<CursorSettings>): void {
    this.settings = { ...this.settings, ...newSettings }
    this.emit('settingsUpdated', this.settings)
  }

  /**
   * Get current settings
   */
  getSettings(): CursorSettings {
    return { ...this.settings }
  }

  /**
   * Setup real-time cursor channel
   */
  private async setupCursorChannel(
    sessionId: string,
    userId: string,
    userName: string
  ): Promise<void> {
    try {
      const channelKey = `${sessionId}-${userId}`
      const channel = this.supabase.channel(`cursors-${channelKey}`)

      // Listen for cursor updates from other users
      channel
        .on(
          'presence',
          { event: 'sync' },
          (payload) => {
            this.handleCursorSync(payload, sessionId)
          }
        )
        .on(
          'presence',
          { event: 'join' },
          (payload) => {
            this.handleCursorJoin(payload, sessionId)
          }
        )
        .on(
          'presence',
          { event: 'leave' },
          (payload) => {
            this.handleCursorLeave(payload, sessionId)
          }
        )
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Join presence channel
            await channel.track({
              user_id: userId,
              user_name: userName,
              user_color: this.userColors.get(userId),
              online_at: new Date().toISOString(),
              session_id: sessionId
            })

            this.cursorChannels.set(channelKey, channel)
            console.log(`Cursor channel subscribed for session ${sessionId}`)
          }
        })
    } catch (error) {
      console.error('Error setting up cursor channel:', error)
    }
  }

  /**
   * Handle cursor sync
   */
  private handleCursorSync(payload: any, sessionId: string): void {
    try {
      const cursors = payload.presences || {}
      
      Object.entries(cursors).forEach(([key, presence]: [string, any]) => {
        if (presence.user_id && presence.session_id === sessionId) {
          const userCursor: UserCursor = {
            userId: presence.user_id,
            userName: presence.user_name || 'Unknown',
            userColor: presence.user_color || '#000000',
            position: {
              x: presence.x || 0,
              y: presence.y || 0,
              timestamp: Date.now()
            },
            isActive: true,
            lastSeen: Date.now(),
            activity: 'online'
          }

          this.emit('remoteCursorUpdate', {
            sessionId,
            cursor: userCursor
          })
        }
      })
    } catch (error) {
      console.error('Error handling cursor sync:', error)
    }
  }

  /**
   * Handle cursor join
   */
  private handleCursorJoin(payload: any, sessionId: string): void {
    try {
      const presence = payload.newPresences?.[0]
      if (presence && presence.session_id === sessionId) {
        this.emit('userJoined', {
          sessionId,
          userId: presence.user_id,
          userName: presence.user_name
        })
      }
    } catch (error) {
      console.error('Error handling cursor join:', error)
    }
  }

  /**
   * Handle cursor leave
   */
  private handleCursorLeave(payload: any, sessionId: string): void {
    try {
      const presence = payload.leftPresences?.[0]
      if (presence && presence.session_id === sessionId) {
        this.emit('userLeft', {
          sessionId,
          userId: presence.user_id,
          userName: presence.user_name
        })
      }
    } catch (error) {
      console.error('Error handling cursor leave:', error)
    }
  }

  /**
   * Broadcast cursor update
   */
  private async broadcastCursorUpdate(
    sessionId: string,
    userId: string,
    cursor: UserCursor
  ): Promise<void> {
    try {
      const channelKey = `${sessionId}-${userId}`
      const channel = this.cursorChannels.get(channelKey)
      
      if (channel) {
        await channel.track({
          user_id: userId,
          x: cursor.position.x,
          y: cursor.position.y,
          activity: cursor.activity,
          timestamp: Date.now()
        })
      }
    } catch (error) {
      console.error('Error broadcasting cursor update:', error)
    }
  }

  /**
   * Broadcast cursor removal
   */
  private async broadcastCursorRemoval(sessionId: string, userId: string): Promise<void> {
    try {
      // Broadcast to all channels in the session
      for (const [key, channel] of this.cursorChannels.entries()) {
        if (key.startsWith(`${sessionId}-`)) {
          await channel.track({
            user_id: userId,
            status: 'offline',
            timestamp: Date.now()
          })
        }
      }
    } catch (error) {
      console.error('Error broadcasting cursor removal:', error)
    }
  }

  /**
   * Broadcast indicator update
   */
  private async broadcastIndicatorUpdate(
    sessionId: string,
    indicator: LiveIndicator
  ): Promise<void> {
    try {
      // Broadcast to all channels in the session
      for (const [key, channel] of this.cursorChannels.entries()) {
        if (key.startsWith(`${sessionId}-`)) {
          await channel.track({
            indicator_id: indicator.id,
            indicator_type: indicator.type,
            element_id: indicator.elementId,
            element_type: indicator.elementType,
            data: indicator.data,
            timestamp: indicator.timestamp
          })
        }
      }
    } catch (error) {
      console.error('Error broadcasting indicator update:', error)
    }
  }

  /**
   * Broadcast indicator removal
   */
  private async broadcastIndicatorRemoval(
    sessionId: string,
    indicatorId: string
  ): Promise<void> {
    try {
      // Broadcast to all channels in the session
      for (const [key, channel] of this.cursorChannels.entries()) {
        if (key.startsWith(`${sessionId}-`)) {
          await channel.track({
            indicator_id: indicatorId,
            status: 'removed',
            timestamp: Date.now()
          })
        }
      }
    } catch (error) {
      console.error('Error broadcasting indicator removal:', error)
    }
  }

  /**
   * Generate user color
   */
  private generateUserColor(userId: string): string {
    // Generate consistent color based on user ID
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    const hue = Math.abs(hash) % 360
    return `hsl(${hue}, 70%, 60%)`
  }

  /**
   * Clean up inactive cursors
   */
  private cleanupInactiveCursors(): void {
    const now = Date.now()
    const timeout = this.settings.fadeOutDelay

    for (const [key, presence] of this.cursorStates.entries()) {
      presence.cursors = presence.cursors.filter(cursor => 
        now - cursor.lastSeen < timeout
      )
      
      // Remove old indicators
      presence.indicators = presence.indicators.filter(indicator =>
        now - indicator.timestamp < timeout
      )
    }
  }

  /**
   * Start cleanup interval
   */
  startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupInactiveCursors()
    }, 10000) // Clean up every 10 seconds
  }

  /**
   * Stop cleanup interval
   */
  stopCleanupInterval(): void {
    // TODO: Implement interval cleanup
  }
}

// Export singleton instance
export const collaborativeCursorsService = new CollaborativeCursorsService()

// Start cleanup interval
collaborativeCursorsService.startCleanupInterval()

// Export types
export type {
  CursorPosition,
  UserCursor,
  LiveIndicator,
  CursorPresence,
  CursorSettings,
  CursorStats
}
