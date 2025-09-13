/**
 * Subscription Cleanup and Memory Manager
 * Handles automatic cleanup, memory management, and resource optimization for subscriptions
 */

import { subscriptionStateManager, SubscriptionState } from './subscription-state-manager'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface CleanupPolicy {
  maxInactiveTime: number // ms
  maxMemoryUsage: number // bytes
  maxSubscriptionCount: number
  cleanupInterval: number // ms
  enableAutoCleanup: boolean
  preserveCritical: boolean
  preserveActive: boolean
}

export interface MemoryStats {
  totalMemoryUsage: number
  subscriptionMemory: number
  channelMemory: number
  eventMemory: number
  peakMemoryUsage: number
  memoryLeaks: number
  lastGarbageCollection: Date
}

export interface CleanupResult {
  subscriptionsRemoved: number
  memoryFreed: number
  channelsClosed: number
  eventsCleared: number
  duration: number
  timestamp: Date
}

export interface ResourceUsage {
  subscriptionId: string
  memoryUsage: number
  channelActive: boolean
  lastActivity: Date
  priority: SubscriptionState['priority']
  status: SubscriptionState['status']
}

export class SubscriptionCleanupManager {
  private cleanupTimer?: NodeJS.Timeout
  private memoryMonitorTimer?: NodeJS.Timeout
  private channels: Map<string, RealtimeChannel> = new Map()
  private memoryStats: MemoryStats = {
    totalMemoryUsage: 0,
    subscriptionMemory: 0,
    channelMemory: 0,
    eventMemory: 0,
    peakMemoryUsage: 0,
    memoryLeaks: 0,
    lastGarbageCollection: new Date()
  }
  
  private cleanupHistory: CleanupResult[] = []
  private resourceUsage: Map<string, ResourceUsage> = new Map()
  
  private policy: CleanupPolicy = {
    maxInactiveTime: 30 * 60 * 1000, // 30 minutes
    maxMemoryUsage: 50 * 1024 * 1024, // 50MB
    maxSubscriptionCount: 100,
    cleanupInterval: 60 * 1000, // 1 minute
    enableAutoCleanup: true,
    preserveCritical: true,
    preserveActive: true
  }

  constructor() {
    this.startCleanupTimer()
    this.startMemoryMonitoring()
  }

  /**
   * Register a channel for cleanup tracking
   */
  registerChannel(subscriptionId: string, channel: RealtimeChannel): void {
    this.channels.set(subscriptionId, channel)
    this.updateResourceUsage(subscriptionId)
  }

  /**
   * Unregister a channel
   */
  unregisterChannel(subscriptionId: string): void {
    this.channels.delete(subscriptionId)
    this.resourceUsage.delete(subscriptionId)
  }

  /**
   * Update cleanup policy
   */
  updatePolicy(newPolicy: Partial<CleanupPolicy>): void {
    this.policy = { ...this.policy, ...newPolicy }
    
    // Restart timer if interval changed
    if (newPolicy.cleanupInterval) {
      this.stopCleanupTimer()
      this.startCleanupTimer()
    }
  }

  /**
   * Get current cleanup policy
   */
  getPolicy(): CleanupPolicy {
    return { ...this.policy }
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): MemoryStats {
    return { ...this.memoryStats }
  }

  /**
   * Get resource usage for all subscriptions
   */
  getResourceUsage(): ResourceUsage[] {
    return Array.from(this.resourceUsage.values())
  }

  /**
   * Get cleanup history
   */
  getCleanupHistory(limit?: number): CleanupResult[] {
    const history = [...this.cleanupHistory].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    return limit ? history.slice(0, limit) : history
  }

  /**
   * Perform manual cleanup
   */
  async performCleanup(options?: {
    force?: boolean
    dryRun?: boolean
    maxAge?: number
  }): Promise<CleanupResult> {
    const startTime = Date.now()
    const subscriptions = subscriptionStateManager.getAllSubscriptions()
    let subscriptionsRemoved = 0
    let memoryFreed = 0
    let channelsClosed = 0
    let eventsCleared = 0

    // Determine which subscriptions to clean up
    const subscriptionsToClean = this.identifySubscriptionsForCleanup(subscriptions, options)

    if (options?.dryRun) {
      console.log(`Dry run: Would clean up ${subscriptionsToClean.length} subscriptions`)
      return {
        subscriptionsRemoved: subscriptionsToClean.length,
        memoryFreed: 0,
        channelsClosed: 0,
        eventsCleared: 0,
        duration: Date.now() - startTime,
        timestamp: new Date()
      }
    }

    // Clean up subscriptions
    for (const subscription of subscriptionsToClean) {
      const memoryBefore = this.estimateMemoryUsage(subscription)
      
      // Close channel if exists
      const channel = this.channels.get(subscription.id)
      if (channel) {
        try {
          await channel.unsubscribe()
          channelsClosed++
        } catch (error) {
          console.error(`Error unsubscribing channel ${subscription.id}:`, error)
        }
        this.channels.delete(subscription.id)
      }

      // Remove subscription
      subscriptionStateManager.removeSubscription(subscription.id)
      this.resourceUsage.delete(subscription.id)
      subscriptionsRemoved++
      memoryFreed += memoryBefore
    }

    // Clean up old events
    const maxEvents = 500
    const currentEvents = subscriptionStateManager.getEvents()
    if (currentEvents.length > maxEvents) {
      const eventsToRemove = currentEvents.length - maxEvents
      // Note: Event cleanup would need to be implemented in subscriptionStateManager
      eventsCleared = eventsToRemove
    }

    const result: CleanupResult = {
      subscriptionsRemoved,
      memoryFreed,
      channelsClosed,
      eventsCleared,
      duration: Date.now() - startTime,
      timestamp: new Date()
    }

    this.cleanupHistory.push(result)
    
    // Keep only last 50 cleanup results
    if (this.cleanupHistory.length > 50) {
      this.cleanupHistory = this.cleanupHistory.slice(-50)
    }

    this.updateMemoryStats()
    return result
  }

  /**
   * Force garbage collection
   */
  forceGarbageCollection(): void {
    if (typeof global !== 'undefined' && global.gc) {
      global.gc()
    }
    this.memoryStats.lastGarbageCollection = new Date()
    this.updateMemoryStats()
  }

  /**
   * Get subscriptions that are candidates for cleanup
   */
  identifySubscriptionsForCleanup(
    subscriptions: SubscriptionState[],
    options?: { force?: boolean; maxAge?: number }
  ): SubscriptionState[] {
    const now = Date.now()
    const maxAge = options?.maxAge || this.policy.maxInactiveTime

    return subscriptions.filter(subscription => {
      // Skip if cleanup is disabled and not forced
      if (!this.policy.enableAutoCleanup && !options?.force) {
        return false
      }

      // Preserve critical subscriptions unless forced
      if (this.policy.preserveCritical && subscription.priority === 'critical' && !options?.force) {
        return false
      }

      // Preserve active subscriptions unless forced
      if (this.policy.preserveActive && subscription.status === 'subscribed' && !options?.force) {
        return false
      }

      // Check if subscription is inactive
      const lastActivity = subscription.lastActivity || subscription.updatedAt
      const inactiveTime = now - lastActivity.getTime()
      
      if (inactiveTime > maxAge) {
        return true
      }

      // Check if subscription is in error state for too long
      if (subscription.status === 'error' && inactiveTime > (maxAge / 2)) {
        return true
      }

      return false
    })
  }

  /**
   * Estimate memory usage for a subscription
   */
  private estimateMemoryUsage(subscription: SubscriptionState): number {
    // Rough estimation based on subscription data
    let memory = 1024 // Base subscription object
    
    // Add memory for metadata
    if (subscription.metadata) {
      memory += JSON.stringify(subscription.metadata).length * 2
    }
    
    // Add memory for performance data
    if (subscription.performance) {
      memory += JSON.stringify(subscription.performance).length * 2
    }
    
    // Add memory for channel (estimated)
    memory += 2048 // Estimated channel memory
    
    return memory
  }

  /**
   * Update resource usage for a subscription
   */
  private updateResourceUsage(subscriptionId: string): void {
    const subscription = subscriptionStateManager.getSubscriptionState(subscriptionId)
    if (!subscription) return

    const memoryUsage = this.estimateMemoryUsage(subscription)
    const channel = this.channels.get(subscriptionId)
    
    this.resourceUsage.set(subscriptionId, {
      subscriptionId,
      memoryUsage,
      channelActive: !!channel && channel.state === 'SUBSCRIBED',
      lastActivity: subscription.lastActivity || subscription.updatedAt,
      priority: subscription.priority,
      status: subscription.status
    })
  }

  /**
   * Update memory statistics
   */
  private updateMemoryStats(): void {
    const subscriptions = subscriptionStateManager.getAllSubscriptions()
    const resourceUsage = Array.from(this.resourceUsage.values())
    
    this.memoryStats.subscriptionMemory = subscriptions.reduce(
      (sum, sub) => sum + this.estimateMemoryUsage(sub), 0
    )
    
    this.memoryStats.channelMemory = this.channels.size * 2048 // Estimated
    this.memoryStats.eventMemory = subscriptionStateManager.getEvents().length * 512 // Estimated
    
    this.memoryStats.totalMemoryUsage = 
      this.memoryStats.subscriptionMemory + 
      this.memoryStats.channelMemory + 
      this.memoryStats.eventMemory
    
    if (this.memoryStats.totalMemoryUsage > this.memoryStats.peakMemoryUsage) {
      this.memoryStats.peakMemoryUsage = this.memoryStats.totalMemoryUsage
    }
    
    // Detect potential memory leaks
    const recentCleanups = this.cleanupHistory.slice(-5)
    if (recentCleanups.length >= 5) {
      const avgMemoryFreed = recentCleanups.reduce((sum, r) => sum + r.memoryFreed, 0) / 5
      const avgSubscriptionsRemoved = recentCleanups.reduce((sum, r) => sum + r.subscriptionsRemoved, 0) / 5
      
      // If we're consistently cleaning up but memory usage is still high, potential leak
      if (avgMemoryFreed > 0 && avgSubscriptionsRemoved > 0 && 
          this.memoryStats.totalMemoryUsage > this.policy.maxMemoryUsage) {
        this.memoryStats.memoryLeaks++
      }
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    
    this.cleanupTimer = setInterval(async () => {
      if (this.policy.enableAutoCleanup) {
        await this.performCleanup()
      }
    }, this.policy.cleanupInterval)
  }

  /**
   * Stop cleanup timer
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    this.memoryMonitorTimer = setInterval(() => {
      this.updateMemoryStats()
      
      // Trigger cleanup if memory usage is too high
      if (this.memoryStats.totalMemoryUsage > this.policy.maxMemoryUsage) {
        this.performCleanup()
      }
    }, 30000) // Check every 30 seconds
  }

  /**
   * Stop memory monitoring
   */
  private stopMemoryMonitoring(): void {
    if (this.memoryMonitorTimer) {
      clearInterval(this.memoryMonitorTimer)
      this.memoryMonitorTimer = undefined
    }
  }

  /**
   * Get cleanup recommendations
   */
  getCleanupRecommendations(): {
    shouldCleanup: boolean
    reason: string
    estimatedMemoryFreed: number
    subscriptionsToClean: number
  } {
    const subscriptions = subscriptionStateManager.getAllSubscriptions()
    const subscriptionsToClean = this.identifySubscriptionsForCleanup(subscriptions)
    const estimatedMemoryFreed = subscriptionsToClean.reduce(
      (sum, sub) => sum + this.estimateMemoryUsage(sub), 0
    )

    let shouldCleanup = false
    let reason = ''

    if (this.memoryStats.totalMemoryUsage > this.policy.maxMemoryUsage) {
      shouldCleanup = true
      reason = 'Memory usage exceeds limit'
    } else if (subscriptions.length > this.policy.maxSubscriptionCount) {
      shouldCleanup = true
      reason = 'Subscription count exceeds limit'
    } else if (subscriptionsToClean.length > 10) {
      shouldCleanup = true
      reason = 'Too many inactive subscriptions'
    } else if (this.memoryStats.memoryLeaks > 5) {
      shouldCleanup = true
      reason = 'Potential memory leaks detected'
    }

    return {
      shouldCleanup,
      reason,
      estimatedMemoryFreed,
      subscriptionsToClean: subscriptionsToClean.length
    }
  }

  /**
   * Cleanup all resources
   */
  async cleanupAll(): Promise<CleanupResult> {
    this.stopCleanupTimer()
    this.stopMemoryMonitoring()
    
    // Close all channels
    for (const [id, channel] of this.channels) {
      try {
        await channel.unsubscribe()
      } catch (error) {
        console.error(`Error unsubscribing channel ${id}:`, error)
      }
    }
    
    this.channels.clear()
    this.resourceUsage.clear()
    
    return this.performCleanup({ force: true })
  }

  /**
   * Stop the cleanup manager
   */
  stop(): void {
    this.stopCleanupTimer()
    this.stopMemoryMonitoring()
  }
}

// Export singleton instance
export const subscriptionCleanupManager = new SubscriptionCleanupManager()
