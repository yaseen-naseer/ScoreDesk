/**
 * Action Broadcasting Service
 * Real-time action broadcasting for user awareness and collaboration
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'
import { EventEmitter } from 'events'

export interface BroadcastAction {
  id: string
  sessionId: string
  userId: string
  userName: string
  actionType: string
  actionCategory: 'match' | 'timer' | 'event' | 'communication' | 'system' | 'user'
  actionData: Record<string, any>
  targetElement?: string
  priority: 'low' | 'normal' | 'high' | 'critical'
  visibility: 'all' | 'participants' | 'specific'
  targetUsers?: string[]
  timestamp: number
  expiresAt?: number
  metadata?: Record<string, any>
}

export interface ActionSubscription {
  sessionId: string
  userId: string
  categories: string[]
  filters?: {
    actionTypes?: string[]
    priorities?: string[]
    targetUsers?: string[]
  }
  callback: (action: BroadcastAction) => void
}

export interface ActionStats {
  totalActions: number
  actionsByCategory: Record<string, number>
  actionsByPriority: Record<string, number>
  mostActiveUser: string
  averageActionsPerMinute: number
  topActionTypes: Array<{ type: string; count: number }>
}

export interface ActionFilter {
  categories?: string[]
  actionTypes?: string[]
  priorities?: string[]
  users?: string[]
  timeRange?: {
    start: number
    end: number
  }
}

class ActionBroadcastingService extends EventEmitter {
  private supabase = createClientComponentClient<Database>()
  private actionChannels = new Map<string, any>()
  private subscriptions = new Map<string, ActionSubscription>()
  private actionHistory = new Map<string, BroadcastAction[]>()
  private readonly MAX_HISTORY_SIZE = 1000
  private readonly DEFAULT_EXPIRY_TIME = 300000 // 5 minutes

  /**
   * Start action broadcasting for a session
   */
  async startBroadcasting(sessionId: string, userId: string): Promise<void> {
    try {
      // Setup real-time action channel
      await this.setupActionChannel(sessionId, userId)

      // Initialize action history
      this.actionHistory.set(sessionId, [])

      console.log(`Started action broadcasting for user ${userId} in session ${sessionId}`)
    } catch (error) {
      console.error('Error starting action broadcasting:', error)
    }
  }

  /**
   * Stop action broadcasting for a session
   */
  async stopBroadcasting(sessionId: string, userId: string): Promise<void> {
    try {
      // Remove channel
      const channelKey = `${sessionId}-${userId}`
      const channel = this.actionChannels.get(channelKey)
      if (channel) {
        await this.supabase.removeChannel(channel)
        this.actionChannels.delete(channelKey)
      }

      // Clear subscriptions for this user
      for (const [key, subscription] of this.subscriptions.entries()) {
        if (subscription.userId === userId && subscription.sessionId === sessionId) {
          this.subscriptions.delete(key)
        }
      }

      console.log(`Stopped action broadcasting for user ${userId} in session ${sessionId}`)
    } catch (error) {
      console.error('Error stopping action broadcasting:', error)
    }
  }

  /**
   * Broadcast an action
   */
  async broadcastAction(
    sessionId: string,
    userId: string,
    userName: string,
    actionType: string,
    actionCategory: BroadcastAction['actionCategory'],
    actionData: Record<string, any>,
    options: {
      targetElement?: string
      priority?: BroadcastAction['priority']
      visibility?: BroadcastAction['visibility']
      targetUsers?: string[]
      expiresIn?: number
      metadata?: Record<string, any>
    } = {}
  ): Promise<{ success: boolean; action?: BroadcastAction; error?: string }> {
    try {
      const action: BroadcastAction = {
        id: `action-${sessionId}-${userId}-${Date.now()}`,
        sessionId,
        userId,
        userName,
        actionType,
        actionCategory,
        actionData,
        targetElement: options.targetElement,
        priority: options.priority || 'normal',
        visibility: options.visibility || 'all',
        targetUsers: options.targetUsers,
        timestamp: Date.now(),
        expiresAt: options.expiresIn ? Date.now() + options.expiresIn : Date.now() + this.DEFAULT_EXPIRY_TIME,
        metadata: options.metadata
      }

      // Store in history
      const history = this.actionHistory.get(sessionId) || []
      history.push(action)
      
      // Keep history size manageable
      if (history.length > this.MAX_HISTORY_SIZE) {
        history.splice(0, history.length - this.MAX_HISTORY_SIZE)
      }
      this.actionHistory.set(sessionId, history)

      // Broadcast to real-time channel
      await this.broadcastToChannel(sessionId, action)

      // Notify local subscribers
      this.notifySubscribers(sessionId, action)

      // Emit local event
      this.emit('actionBroadcasted', action)

      // Auto-expire action
      if (action.expiresAt) {
        setTimeout(() => {
          this.expireAction(action.id)
        }, action.expiresAt - action.timestamp)
      }

      return { success: true, action }
    } catch (error) {
      console.error('Error broadcasting action:', error)
      return { success: false, error: 'Failed to broadcast action' }
    }
  }

  /**
   * Subscribe to actions
   */
  subscribeToActions(
    sessionId: string,
    userId: string,
    categories: string[],
    callback: (action: BroadcastAction) => void,
    filters?: ActionSubscription['filters']
  ): string {
    const subscriptionId = `sub-${sessionId}-${userId}-${Date.now()}`
    
    const subscription: ActionSubscription = {
      sessionId,
      userId,
      categories,
      filters,
      callback
    }

    this.subscriptions.set(subscriptionId, subscription)

    return subscriptionId
  }

  /**
   * Unsubscribe from actions
   */
  unsubscribeFromActions(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId)
  }

  /**
   * Get action history for a session
   */
  getActionHistory(
    sessionId: string,
    filter?: ActionFilter
  ): BroadcastAction[] {
    const history = this.actionHistory.get(sessionId) || []
    
    if (!filter) {
      return history
    }

    return history.filter(action => {
      // Filter by categories
      if (filter.categories && !filter.categories.includes(action.actionCategory)) {
        return false
      }

      // Filter by action types
      if (filter.actionTypes && !filter.actionTypes.includes(action.actionType)) {
        return false
      }

      // Filter by priorities
      if (filter.priorities && !filter.priorities.includes(action.priority)) {
        return false
      }

      // Filter by users
      if (filter.users && !filter.users.includes(action.userId)) {
        return false
      }

      // Filter by time range
      if (filter.timeRange) {
        if (action.timestamp < filter.timeRange.start || action.timestamp > filter.timeRange.end) {
          return false
        }
      }

      // Check if action has expired
      if (action.expiresAt && action.expiresAt < Date.now()) {
        return false
      }

      return true
    })
  }

  /**
   * Get action statistics
   */
  getActionStats(sessionId: string): ActionStats {
    const history = this.actionHistory.get(sessionId) || []
    const now = Date.now()
    const oneHourAgo = now - (60 * 60 * 1000)
    
    // Filter to last hour
    const recentActions = history.filter(action => action.timestamp > oneHourAgo)

    // Calculate stats
    const actionsByCategory: Record<string, number> = {}
    const actionsByPriority: Record<string, number> = {}
    const actionsByType: Record<string, number> = {}
    const actionsByUser: Record<string, number> = {}

    recentActions.forEach(action => {
      // By category
      actionsByCategory[action.actionCategory] = (actionsByCategory[action.actionCategory] || 0) + 1
      
      // By priority
      actionsByPriority[action.priority] = (actionsByPriority[action.priority] || 0) + 1
      
      // By type
      actionsByType[action.actionType] = (actionsByType[action.actionType] || 0) + 1
      
      // By user
      actionsByUser[action.userId] = (actionsByUser[action.userId] || 0) + 1
    })

    // Find most active user
    const mostActiveUser = Object.entries(actionsByUser)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || ''

    // Calculate top action types
    const topActionTypes = Object.entries(actionsByType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }))

    return {
      totalActions: history.length,
      actionsByCategory,
      actionsByPriority,
      mostActiveUser,
      averageActionsPerMinute: Math.round((recentActions.length / 60) * 100) / 100,
      topActionTypes
    }
  }

  /**
   * Setup real-time action channel
   */
  private async setupActionChannel(sessionId: string, userId: string): Promise<void> {
    try {
      const channelKey = `${sessionId}-${userId}`
      const channel = this.supabase.channel(`actions-${channelKey}`)

      // Listen for action broadcasts
      channel
        .on(
          'broadcast',
          { event: 'action' },
          (payload) => {
            this.handleActionBroadcast(payload, sessionId)
          }
        )
        .on(
          'presence',
          { event: 'sync' },
          (payload) => {
            this.handlePresenceSync(payload, sessionId)
          }
        )
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Join presence channel
            await channel.track({
              user_id: userId,
              online_at: new Date().toISOString(),
              session_id: sessionId
            })

            this.actionChannels.set(channelKey, channel)
            console.log(`Action channel subscribed for session ${sessionId}`)
          }
        })
    } catch (error) {
      console.error('Error setting up action channel:', error)
    }
  }

  /**
   * Handle action broadcast
   */
  private handleActionBroadcast(payload: any, sessionId: string): void {
    try {
      const action: BroadcastAction = payload.payload
      
      if (action.sessionId === sessionId) {
        // Store in history
        const history = this.actionHistory.get(sessionId) || []
        history.push(action)
        
        if (history.length > this.MAX_HISTORY_SIZE) {
          history.splice(0, history.length - this.MAX_HISTORY_SIZE)
        }
        this.actionHistory.set(sessionId, history)

        // Notify subscribers
        this.notifySubscribers(sessionId, action)

        // Emit event
        this.emit('remoteActionReceived', action)
      }
    } catch (error) {
      console.error('Error handling action broadcast:', error)
    }
  }

  /**
   * Handle presence sync
   */
  private handlePresenceSync(payload: any, sessionId: string): void {
    try {
      const presences = payload.presences || {}
      
      Object.entries(presences).forEach(([key, presence]: [string, any]) => {
        if (presence.user_id && presence.session_id === sessionId) {
          this.emit('userPresenceUpdate', {
            sessionId,
            userId: presence.user_id,
            isOnline: true,
            lastSeen: presence.online_at
          })
        }
      })
    } catch (error) {
      console.error('Error handling presence sync:', error)
    }
  }

  /**
   * Broadcast to channel
   */
  private async broadcastToChannel(sessionId: string, action: BroadcastAction): Promise<void> {
    try {
      // Broadcast to all channels in the session
      for (const [key, channel] of this.actionChannels.entries()) {
        if (key.startsWith(`${sessionId}-`)) {
          await channel.send({
            type: 'broadcast',
            event: 'action',
            payload: action
          })
        }
      }
    } catch (error) {
      console.error('Error broadcasting to channel:', error)
    }
  }

  /**
   * Notify subscribers
   */
  private notifySubscribers(sessionId: string, action: BroadcastAction): void {
    try {
      for (const [subscriptionId, subscription] of this.subscriptions.entries()) {
        if (subscription.sessionId !== sessionId) {
          continue
        }

        // Check category filter
        if (!subscription.categories.includes(action.actionCategory)) {
          continue
        }

        // Check action type filter
        if (subscription.filters?.actionTypes && 
            !subscription.filters.actionTypes.includes(action.actionType)) {
          continue
        }

        // Check priority filter
        if (subscription.filters?.priorities && 
            !subscription.filters.priorities.includes(action.priority)) {
          continue
        }

        // Check target users filter
        if (subscription.filters?.targetUsers && 
            !subscription.filters.targetUsers.includes(action.userId)) {
          continue
        }

        // Check visibility
        if (action.visibility === 'specific' && 
            action.targetUsers && 
            !action.targetUsers.includes(subscription.userId)) {
          continue
        }

        // Notify subscriber
        try {
          subscription.callback(action)
        } catch (error) {
          console.error('Error in subscription callback:', error)
        }
      }
    } catch (error) {
      console.error('Error notifying subscribers:', error)
    }
  }

  /**
   * Expire action
   */
  private expireAction(actionId: string): void {
    try {
      // Remove from all histories
      for (const [sessionId, history] of this.actionHistory.entries()) {
        const index = history.findIndex(action => action.id === actionId)
        if (index >= 0) {
          history.splice(index, 1)
          this.actionHistory.set(sessionId, history)
        }
      }

      this.emit('actionExpired', { actionId })
    } catch (error) {
      console.error('Error expiring action:', error)
    }
  }

  /**
   * Clean up expired actions
   */
  private cleanupExpiredActions(): void {
    try {
      const now = Date.now()
      
      for (const [sessionId, history] of this.actionHistory.entries()) {
        const validActions = history.filter(action => 
          !action.expiresAt || action.expiresAt > now
        )
        this.actionHistory.set(sessionId, validActions)
      }
    } catch (error) {
      console.error('Error cleaning up expired actions:', error)
    }
  }

  /**
   * Get predefined action types
   */
  getPredefinedActionTypes(): Record<string, string[]> {
    return {
      match: [
        'match_started',
        'match_paused',
        'match_resumed',
        'match_ended',
        'match_settings_changed'
      ],
      timer: [
        'timer_started',
        'timer_paused',
        'timer_resumed',
        'timer_stopped',
        'timer_reset',
        'stoppage_time_added',
        'extra_time_added'
      ],
      event: [
        'goal_scored',
        'card_given',
        'substitution_made',
        'penalty_awarded',
        'event_edited',
        'event_deleted',
        'event_approved'
      ],
      communication: [
        'message_sent',
        'message_received',
        'thread_created',
        'user_joined',
        'user_left'
      ],
      system: [
        'session_created',
        'session_ended',
        'permission_changed',
        'settings_updated',
        'error_occurred'
      ],
      user: [
        'user_online',
        'user_offline',
        'user_typing',
        'user_stopped_typing',
        'cursor_moved',
        'selection_changed'
      ]
    }
  }

  /**
   * Get action priorities
   */
  getActionPriorities(): Array<{ value: string; label: string; color: string }> {
    return [
      { value: 'low', label: 'Low', color: '#6b7280' },
      { value: 'normal', label: 'Normal', color: '#3b82f6' },
      { value: 'high', label: 'High', color: '#f59e0b' },
      { value: 'critical', label: 'Critical', color: '#ef4444' }
    ]
  }
}

// Export singleton instance
export const actionBroadcastingService = new ActionBroadcastingService()

// Start cleanup interval
setInterval(() => {
  actionBroadcastingService['cleanupExpiredActions']()
}, 60000) // Clean up every minute

// Export types
export type {
  BroadcastAction,
  ActionSubscription,
  ActionStats,
  ActionFilter
}
