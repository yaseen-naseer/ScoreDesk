/**
 * Subscription State Manager
 * Comprehensive state management for real-time subscriptions with lifecycle tracking
 */

import type { RealtimeChannel } from '@supabase/supabase-js'

export interface SubscriptionState {
  id: string
  channelName: string
  tableName?: string
  filter?: any
  status: 'pending' | 'subscribing' | 'subscribed' | 'unsubscribing' | 'unsubscribed' | 'error'
  priority: 'low' | 'normal' | 'high' | 'critical'
  createdAt: Date
  updatedAt: Date
  lastActivity?: Date
  error?: string
  retryCount: number
  maxRetries: number
  metadata?: {
    userId?: string
    organizationId?: string
    sessionId?: string
    source?: string
    tags?: string[]
    dependencies?: string[]
    estimatedLifespan?: number
  }
  performance?: {
    subscribeTime?: number
    unsubscribeTime?: number
    messageCount: number
    errorCount: number
    lastMessageTime?: Date
    averageLatency?: number
    bandwidth?: number
  }
}

export interface SubscriptionGroup {
  id: string
  name: string
  subscriptions: string[]
  status: 'active' | 'paused' | 'stopped'
  createdAt: Date
  updatedAt: Date
  metadata?: {
    description?: string
    autoStart?: boolean
    dependencies?: string[]
  }
}

export interface SubscriptionMetrics {
  totalSubscriptions: number
  activeSubscriptions: number
  errorSubscriptions: number
  pendingSubscriptions: number
  totalMessages: number
  totalErrors: number
  averageLatency: number
  bandwidthUsage: number
  memoryUsage: number
  lastUpdated: Date
}

export interface SubscriptionEvent {
  type: 'created' | 'subscribed' | 'unsubscribed' | 'error' | 'retry' | 'performance_update' | 'grouped'
  subscriptionId: string
  timestamp: Date
  data?: any
  error?: string
}

export type SubscriptionStateCallback = (state: SubscriptionState) => void
export type SubscriptionEventCallback = (event: SubscriptionEvent) => void
export type SubscriptionMetricsCallback = (metrics: SubscriptionMetrics) => void

export class SubscriptionStateManager {
  private subscriptions: Map<string, SubscriptionState> = new Map()
  private groups: Map<string, SubscriptionGroup> = new Map()
  private events: SubscriptionEvent[] = []
  private channels: Map<string, RealtimeChannel> = new Map()
  
  // Callbacks
  private stateCallbacks: Set<SubscriptionStateCallback> = new Set()
  private eventCallbacks: Set<SubscriptionEventCallback> = new Set()
  private metricsCallbacks: Set<SubscriptionMetricsCallback> = new Set()
  
  // Configuration
  private maxEvents = 1000
  private metricsUpdateInterval = 5000
  private metricsTimer?: NodeJS.Timeout
  
  constructor() {
    this.startMetricsCollection()
  }

  /**
   * Create a new subscription state
   */
  createSubscription(
    channelName: string,
    options?: {
      tableName?: string
      filter?: any
      priority?: SubscriptionState['priority']
      maxRetries?: number
      metadata?: SubscriptionState['metadata']
    }
  ): string {
    const id = this.generateSubscriptionId(channelName)
    const now = new Date()
    
    const state: SubscriptionState = {
      id,
      channelName,
      tableName: options?.tableName,
      filter: options?.filter,
      status: 'pending',
      priority: options?.priority || 'normal',
      createdAt: now,
      updatedAt: now,
      retryCount: 0,
      maxRetries: options?.maxRetries || 3,
      metadata: options?.metadata,
      performance: {
        messageCount: 0,
        errorCount: 0
      }
    }

    this.subscriptions.set(id, state)
    this.emitEvent('created', id, { state })
    this.notifyStateCallbacks(state)
    
    return id
  }

  /**
   * Update subscription state
   */
  updateSubscriptionState(
    id: string,
    updates: Partial<SubscriptionState>,
    emitEvent: boolean = true
  ): boolean {
    const state = this.subscriptions.get(id)
    if (!state) return false

    const updatedState = {
      ...state,
      ...updates,
      updatedAt: new Date(),
      lastActivity: new Date()
    }

    this.subscriptions.set(id, updatedState)
    
    if (emitEvent) {
      this.emitEvent('performance_update', id, { updates })
    }
    
    this.notifyStateCallbacks(updatedState)
    return true
  }

  /**
   * Set subscription status
   */
  setSubscriptionStatus(id: string, status: SubscriptionState['status'], error?: string): boolean {
    const updates: Partial<SubscriptionState> = { status }
    if (error) {
      updates.error = error
      updates.retryCount = (this.subscriptions.get(id)?.retryCount || 0) + 1
    }
    
    const success = this.updateSubscriptionState(id, updates)
    if (success) {
      this.emitEvent(status === 'error' ? 'error' : 'performance_update', id, { status, error })
    }
    
    return success
  }

  /**
   * Record subscription activity
   */
  recordActivity(id: string, type: 'message' | 'error', data?: any): void {
    const state = this.subscriptions.get(id)
    if (!state) return

    const updates: Partial<SubscriptionState> = {
      lastActivity: new Date()
    }

    if (type === 'message') {
      updates.performance = {
        ...state.performance!,
        messageCount: state.performance!.messageCount + 1,
        lastMessageTime: new Date()
      }
    } else if (type === 'error') {
      updates.performance = {
        ...state.performance!,
        errorCount: state.performance!.errorCount + 1
      }
    }

    this.updateSubscriptionState(id, updates, false)
  }

  /**
   * Record subscription performance metrics
   */
  recordPerformance(id: string, metrics: {
    subscribeTime?: number
    unsubscribeTime?: number
    latency?: number
    bandwidth?: number
  }): void {
    const state = this.subscriptions.get(id)
    if (!state) return

    const performance = { ...state.performance }
    
    if (metrics.subscribeTime) performance.subscribeTime = metrics.subscribeTime
    if (metrics.unsubscribeTime) performance.unsubscribeTime = metrics.unsubscribeTime
    if (metrics.bandwidth) performance.bandwidth = metrics.bandwidth
    
    if (metrics.latency) {
      performance.averageLatency = performance.averageLatency 
        ? (performance.averageLatency + metrics.latency) / 2
        : metrics.latency
    }

    this.updateSubscriptionState(id, { performance })
  }

  /**
   * Get subscription state
   */
  getSubscriptionState(id: string): SubscriptionState | undefined {
    return this.subscriptions.get(id)
  }

  /**
   * Get all subscriptions
   */
  getAllSubscriptions(): SubscriptionState[] {
    return Array.from(this.subscriptions.values())
  }

  /**
   * Get subscriptions by status
   */
  getSubscriptionsByStatus(status: SubscriptionState['status']): SubscriptionState[] {
    return Array.from(this.subscriptions.values()).filter(s => s.status === status)
  }

  /**
   * Get subscriptions by priority
   */
  getSubscriptionsByPriority(priority: SubscriptionState['priority']): SubscriptionState[] {
    return Array.from(this.subscriptions.values()).filter(s => s.priority === priority)
  }

  /**
   * Get subscriptions by table
   */
  getSubscriptionsByTable(tableName: string): SubscriptionState[] {
    return Array.from(this.subscriptions.values()).filter(s => s.tableName === tableName)
  }

  /**
   * Get subscriptions by user
   */
  getSubscriptionsByUser(userId: string): SubscriptionState[] {
    return Array.from(this.subscriptions.values()).filter(
      s => s.metadata?.userId === userId
    )
  }

  /**
   * Remove subscription
   */
  removeSubscription(id: string): boolean {
    const state = this.subscriptions.get(id)
    if (!state) return false

    this.subscriptions.delete(id)
    this.channels.delete(id)
    
    // Remove from groups
    this.groups.forEach(group => {
      group.subscriptions = group.subscriptions.filter(sid => sid !== id)
    })

    this.emitEvent('unsubscribed', id, { state })
    return true
  }

  /**
   * Create subscription group
   */
  createGroup(
    name: string,
    subscriptionIds: string[],
    options?: {
      description?: string
      autoStart?: boolean
      dependencies?: string[]
    }
  ): string {
    const id = this.generateGroupId(name)
    const now = new Date()
    
    const group: SubscriptionGroup = {
      id,
      name,
      subscriptions: subscriptionIds,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      metadata: options
    }

    this.groups.set(id, group)
    this.emitEvent('grouped', subscriptionIds[0] || '', { group })
    
    return id
  }

  /**
   * Update group status
   */
  updateGroupStatus(id: string, status: SubscriptionGroup['status']): boolean {
    const group = this.groups.get(id)
    if (!group) return false

    group.status = status
    group.updatedAt = new Date()
    this.groups.set(id, group)
    
    return true
  }

  /**
   * Get group subscriptions
   */
  getGroupSubscriptions(groupId: string): SubscriptionState[] {
    const group = this.groups.get(groupId)
    if (!group) return []

    return group.subscriptions
      .map(id => this.subscriptions.get(id))
      .filter(Boolean) as SubscriptionState[]
  }

  /**
   * Pause group subscriptions
   */
  pauseGroup(groupId: string): boolean {
    return this.updateGroupStatus(groupId, 'paused')
  }

  /**
   * Resume group subscriptions
   */
  resumeGroup(groupId: string): boolean {
    return this.updateGroupStatus(groupId, 'active')
  }

  /**
   * Get subscription metrics
   */
  getMetrics(): SubscriptionMetrics {
    const subscriptions = Array.from(this.subscriptions.values())
    const activeSubscriptions = subscriptions.filter(s => s.status === 'subscribed')
    const errorSubscriptions = subscriptions.filter(s => s.status === 'error')
    const pendingSubscriptions = subscriptions.filter(s => s.status === 'pending')

    const totalMessages = subscriptions.reduce((sum, s) => sum + (s.performance?.messageCount || 0), 0)
    const totalErrors = subscriptions.reduce((sum, s) => sum + (s.performance?.errorCount || 0), 0)
    
    const latencies = subscriptions
      .map(s => s.performance?.averageLatency)
      .filter(Boolean) as number[]
    const averageLatency = latencies.length > 0 
      ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length 
      : 0

    const bandwidthUsage = subscriptions.reduce((sum, s) => sum + (s.performance?.bandwidth || 0), 0)
    
    // Estimate memory usage (rough calculation)
    const memoryUsage = subscriptions.length * 1024 // 1KB per subscription estimate

    return {
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: activeSubscriptions.length,
      errorSubscriptions: errorSubscriptions.length,
      pendingSubscriptions: pendingSubscriptions.length,
      totalMessages,
      totalErrors,
      averageLatency,
      bandwidthUsage,
      memoryUsage,
      lastUpdated: new Date()
    }
  }

  /**
   * Get subscription events
   */
  getEvents(limit?: number): SubscriptionEvent[] {
    const events = [...this.events].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    return limit ? events.slice(0, limit) : events
  }

  /**
   * Get events for subscription
   */
  getSubscriptionEvents(subscriptionId: string, limit?: number): SubscriptionEvent[] {
    const events = this.events
      .filter(e => e.subscriptionId === subscriptionId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    
    return limit ? events.slice(0, limit) : events
  }

  /**
   * Clean up old subscriptions
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): number {
    const cutoff = new Date(Date.now() - maxAge)
    let removed = 0

    for (const [id, state] of this.subscriptions) {
      if (state.updatedAt < cutoff && state.status === 'unsubscribed') {
        this.removeSubscription(id)
        removed++
      }
    }

    // Clean up old events
    this.events = this.events.filter(e => e.timestamp > cutoff)
    
    return removed
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: SubscriptionStateCallback): () => void {
    this.stateCallbacks.add(callback)
    return () => this.stateCallbacks.delete(callback)
  }

  /**
   * Subscribe to events
   */
  onEvent(callback: SubscriptionEventCallback): () => void {
    this.eventCallbacks.add(callback)
    return () => this.eventCallbacks.delete(callback)
  }

  /**
   * Subscribe to metrics updates
   */
  onMetricsUpdate(callback: SubscriptionMetricsCallback): () => void {
    this.metricsCallbacks.add(callback)
    return () => this.metricsCallbacks.delete(callback)
  }

  /**
   * Export subscription data
   */
  exportData(): {
    subscriptions: SubscriptionState[]
    groups: SubscriptionGroup[]
    events: SubscriptionEvent[]
    metrics: SubscriptionMetrics
  } {
    return {
      subscriptions: Array.from(this.subscriptions.values()),
      groups: Array.from(this.groups.values()),
      events: [...this.events],
      metrics: this.getMetrics()
    }
  }

  /**
   * Import subscription data
   */
  importData(data: {
    subscriptions?: SubscriptionState[]
    groups?: SubscriptionGroup[]
    events?: SubscriptionEvent[]
  }): void {
    if (data.subscriptions) {
      data.subscriptions.forEach(state => {
        this.subscriptions.set(state.id, state)
      })
    }
    
    if (data.groups) {
      data.groups.forEach(group => {
        this.groups.set(group.id, group)
      })
    }
    
    if (data.events) {
      this.events = [...this.events, ...data.events]
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        .slice(-this.maxEvents)
    }
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(() => {
      const metrics = this.getMetrics()
      this.notifyMetricsCallbacks(metrics)
    }, this.metricsUpdateInterval)
  }

  /**
   * Stop metrics collection
   */
  stop(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer)
      this.metricsTimer = undefined
    }
    
    this.stateCallbacks.clear()
    this.eventCallbacks.clear()
    this.metricsCallbacks.clear()
  }

  /**
   * Emit event
   */
  private emitEvent(type: SubscriptionEvent['type'], subscriptionId: string, data?: any): void {
    const event: SubscriptionEvent = {
      type,
      subscriptionId,
      timestamp: new Date(),
      data
    }

    this.events.push(event)
    
    // Keep events within limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents)
    }

    this.notifyEventCallbacks(event)
  }

  /**
   * Notify state callbacks
   */
  private notifyStateCallbacks(state: SubscriptionState): void {
    this.stateCallbacks.forEach(callback => {
      try {
        callback(state)
      } catch (error) {
        console.error('Error in subscription state callback:', error)
      }
    })
  }

  /**
   * Notify event callbacks
   */
  private notifyEventCallbacks(event: SubscriptionEvent): void {
    this.eventCallbacks.forEach(callback => {
      try {
        callback(event)
      } catch (error) {
        console.error('Error in subscription event callback:', error)
      }
    })
  }

  /**
   * Notify metrics callbacks
   */
  private notifyMetricsCallbacks(metrics: SubscriptionMetrics): void {
    this.metricsCallbacks.forEach(callback => {
      try {
        callback(metrics)
      } catch (error) {
        console.error('Error in subscription metrics callback:', error)
      }
    })
  }

  /**
   * Generate subscription ID
   */
  private generateSubscriptionId(channelName: string): string {
    return `sub_${channelName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate group ID
   */
  private generateGroupId(name: string): string {
    return `group_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`
  }
}

// Export singleton instance
export const subscriptionStateManager = new SubscriptionStateManager()
