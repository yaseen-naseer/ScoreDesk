/**
 * Subscription Optimizer
 * Provides optimization features including deduplication, batching, and performance improvements
 */

import { subscriptionStateManager, SubscriptionState } from './subscription-state-manager'
import { subscriptionLifecycleHooks } from './subscription-lifecycle-hooks'

export interface OptimizationConfig {
  enableDeduplication: boolean
  enableBatching: boolean
  enableCompression: boolean
  enableCaching: boolean
  maxBatchSize: number
  batchTimeout: number // ms
  cacheSize: number
  cacheTTL: number // ms
  deduplicationWindow: number // ms
}

export interface SubscriptionGroup {
  id: string
  subscriptions: string[]
  sharedChannel: boolean
  batchEnabled: boolean
  createdAt: Date
  metadata?: {
    description?: string
    priority?: 'low' | 'normal' | 'high' | 'critical'
    tags?: string[]
  }
}

export interface BatchOperation {
  id: string
  operations: Array<{
    type: 'subscribe' | 'unsubscribe' | 'update'
    subscriptionId: string
    data: any
  }>
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: Date
  processedAt?: Date
  error?: string
}

export interface CacheEntry {
  key: string
  data: any
  timestamp: Date
  ttl: number
  hits: number
}

export interface OptimizationMetrics {
  totalSubscriptions: number
  optimizedSubscriptions: number
  deduplicatedSubscriptions: number
  batchedOperations: number
  cacheHits: number
  cacheMisses: number
  memorySaved: number
  bandwidthSaved: number
  averageOptimizationTime: number
  lastOptimization?: Date
}

export interface DeduplicationResult {
  originalCount: number
  optimizedCount: number
  duplicatesRemoved: number
  subscriptions: Array<{
    id: string
    channelName: string
    duplicates: string[]
  }>
}

export class SubscriptionOptimizer {
  private config: OptimizationConfig = {
    enableDeduplication: true,
    enableBatching: true,
    enableCompression: false,
    enableCaching: true,
    maxBatchSize: 10,
    batchTimeout: 1000,
    cacheSize: 1000,
    cacheTTL: 300000, // 5 minutes
    deduplicationWindow: 5000 // 5 seconds
  }

  private subscriptionGroups: Map<string, SubscriptionGroup> = new Map()
  private batchQueue: BatchOperation[] = []
  private cache: Map<string, CacheEntry> = new Map()
  private deduplicationMap: Map<string, string[]> = new Map()
  private metrics: OptimizationMetrics = {
    totalSubscriptions: 0,
    optimizedSubscriptions: 0,
    deduplicatedSubscriptions: 0,
    batchedOperations: 0,
    cacheHits: 0,
    cacheMisses: 0,
    memorySaved: 0,
    bandwidthSaved: 0,
    averageOptimizationTime: 0,
  }

  private batchTimer?: NodeJS.Timeout
  private optimizationTimer?: NodeJS.Timeout

  constructor() {
    this.startOptimizationTimer()
    this.initializeDefaultGroups()
  }

  /**
   * Update optimization configuration
   */
  updateConfig(newConfig: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Restart batch timer if timeout changed
    if (newConfig.batchTimeout) {
      this.stopBatchTimer()
      this.startBatchTimer()
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): OptimizationConfig {
    return { ...this.config }
  }

  /**
   * Get optimization metrics
   */
  getMetrics(): OptimizationMetrics {
    return { ...this.metrics }
  }

  /**
   * Optimize subscription for deduplication
   */
  optimizeSubscription(subscriptionId: string): boolean {
    const subscription = subscriptionStateManager.getSubscriptionState(subscriptionId)
    if (!subscription) return false

    const startTime = Date.now()

    try {
      // Check for duplicates
      if (this.config.enableDeduplication) {
        const duplicates = this.findDuplicates(subscription)
        if (duplicates.length > 0) {
          this.mergeDuplicateSubscriptions(subscriptionId, duplicates)
          this.metrics.deduplicatedSubscriptions++
        }
      }

      // Add to optimization groups
      this.addToOptimizationGroup(subscriptionId)

      // Update cache if enabled
      if (this.config.enableCaching) {
        this.updateCache(subscriptionId, subscription)
      }

      this.metrics.optimizedSubscriptions++
      this.updateOptimizationTime(Date.now() - startTime)
      
      return true
    } catch (error) {
      console.error(`Failed to optimize subscription ${subscriptionId}:`, error)
      return false
    }
  }

  /**
   * Find duplicate subscriptions
   */
  findDuplicates(subscription: SubscriptionState): string[] {
    const duplicates: string[] = []
    const subscriptions = subscriptionStateManager.getAllSubscriptions()

    for (const other of subscriptions) {
      if (other.id === subscription.id) continue

      // Check if subscriptions are duplicates
      if (this.areSubscriptionsDuplicates(subscription, other)) {
        duplicates.push(other.id)
      }
    }

    return duplicates
  }

  /**
   * Check if two subscriptions are duplicates
   */
  areSubscriptionsDuplicates(sub1: SubscriptionState, sub2: SubscriptionState): boolean {
    // Same channel name
    if (sub1.channelName !== sub2.channelName) return false

    // Same table name
    if (sub1.tableName !== sub2.tableName) return false

    // Same filter (deep comparison)
    if (JSON.stringify(sub1.filter) !== JSON.stringify(sub2.filter)) return false

    // Same user (if specified)
    if (sub1.metadata?.userId !== sub2.metadata?.userId) return false

    // Created within deduplication window
    const timeDiff = Math.abs(sub1.createdAt.getTime() - sub2.createdAt.getTime())
    if (timeDiff > this.config.deduplicationWindow) return false

    return true
  }

  /**
   * Merge duplicate subscriptions
   */
  private mergeDuplicateSubscriptions(keepId: string, duplicateIds: string[]): void {
    const keepSubscription = subscriptionStateManager.getSubscriptionState(keepId)
    if (!keepSubscription) return

    // Update deduplication map
    this.deduplicationMap.set(keepId, duplicateIds)

    // Merge metadata
    const mergedMetadata = { ...keepSubscription.metadata }
    for (const duplicateId of duplicateIds) {
      const duplicate = subscriptionStateManager.getSubscriptionState(duplicateId)
      if (duplicate?.metadata) {
        // Merge tags
        if (duplicate.metadata.tags) {
          mergedMetadata.tags = [
            ...(mergedMetadata.tags || []),
            ...duplicate.metadata.tags
          ].filter((tag, index, arr) => arr.indexOf(tag) === index)
        }
      }

      // Remove duplicate subscription
      subscriptionStateManager.removeSubscription(duplicateId)
    }

    // Update kept subscription
    subscriptionStateManager.updateSubscriptionState(keepId, {
      metadata: mergedMetadata
    })

    this.metrics.memorySaved += duplicateIds.length * 1024 // Estimate
  }

  /**
   * Add subscription to optimization group
   */
  private addToOptimizationGroup(subscriptionId: string): void {
    const subscription = subscriptionStateManager.getSubscriptionState(subscriptionId)
    if (!subscription) return

    // Find appropriate group
    let groupId = this.findOptimalGroup(subscription)
    
    if (!groupId) {
      // Create new group
      groupId = this.createOptimizationGroup([subscriptionId], subscription)
    } else {
      // Add to existing group
      this.addSubscriptionToGroup(groupId, subscriptionId)
    }
  }

  /**
   * Find optimal group for subscription
   */
  private findOptimalGroup(subscription: SubscriptionState): string | null {
    for (const [groupId, group] of this.subscriptionGroups) {
      if (this.canGroupSubscriptions(subscription, group)) {
        return groupId
      }
    }
    return null
  }

  /**
   * Check if subscription can be grouped
   */
  private canGroupSubscriptions(subscription: SubscriptionState, group: SubscriptionGroup): boolean {
    // Check if group is full
    if (group.subscriptions.length >= this.config.maxBatchSize) return false

    // Check if subscription matches group criteria
    const firstSubscription = subscriptionStateManager.getSubscriptionState(group.subscriptions[0])
    if (!firstSubscription) return false

    // Same table and similar filters
    if (subscription.tableName !== firstSubscription.tableName) return false

    // Similar priority
    if (subscription.priority !== firstSubscription.priority) return false

    return true
  }

  /**
   * Create optimization group
   */
  private createOptimizationGroup(subscriptionIds: string[], reference: SubscriptionState): string {
    const groupId = this.generateGroupId()
    
    const group: SubscriptionGroup = {
      id: groupId,
      subscriptions: subscriptionIds,
      sharedChannel: true,
      batchEnabled: this.config.enableBatching,
      createdAt: new Date(),
      metadata: {
        description: `Auto-generated group for ${reference.tableName}`,
        priority: reference.priority,
        tags: ['auto-generated']
      }
    }

    this.subscriptionGroups.set(groupId, group)
    return groupId
  }

  /**
   * Add subscription to group
   */
  private addSubscriptionToGroup(groupId: string, subscriptionId: string): void {
    const group = this.subscriptionGroups.get(groupId)
    if (group && !group.subscriptions.includes(subscriptionId)) {
      group.subscriptions.push(subscriptionId)
    }
  }

  /**
   * Batch operations for optimization
   */
  batchOperations(operations: Array<{
    type: 'subscribe' | 'unsubscribe' | 'update'
    subscriptionId: string
    data: any
  }>): string {
    const batchId = this.generateBatchId()
    
    const batch: BatchOperation = {
      id: batchId,
      operations,
      status: 'pending',
      createdAt: new Date()
    }

    this.batchQueue.push(batch)
    
    // Process batch if queue is full or timer triggers
    if (this.batchQueue.length >= this.config.maxBatchSize) {
      this.processBatchQueue()
    } else {
      this.startBatchTimer()
    }

    return batchId
  }

  /**
   * Process batch queue
   */
  private async processBatchQueue(): Promise<void> {
    if (this.batchQueue.length === 0) return

    const batches = [...this.batchQueue]
    this.batchQueue = []

    for (const batch of batches) {
      await this.processBatch(batch)
    }

    this.metrics.batchedOperations += batches.length
  }

  /**
   * Process individual batch
   */
  private async processBatch(batch: BatchOperation): Promise<void> {
    batch.status = 'processing'
    const startTime = Date.now()

    try {
      // Group operations by type
      const operationsByType = batch.operations.reduce((acc, op) => {
        if (!acc[op.type]) acc[op.type] = []
        acc[op.type].push(op)
        return acc
      }, {} as Record<string, typeof batch.operations>)

      // Execute operations by type
      for (const [type, operations] of Object.entries(operationsByType)) {
        await this.executeBatchOperations(type as any, operations)
      }

      batch.status = 'completed'
      batch.processedAt = new Date()
      
    } catch (error) {
      batch.status = 'failed'
      batch.error = error instanceof Error ? error.message : 'Unknown error'
    }

    this.updateOptimizationTime(Date.now() - startTime)
  }

  /**
   * Execute batch operations
   */
  private async executeBatchOperations(
    type: 'subscribe' | 'unsubscribe' | 'update',
    operations: Array<{ subscriptionId: string; data: any }>
  ): Promise<void> {
    // Execute lifecycle hooks
    for (const operation of operations) {
      const context = {
        subscriptionId: operation.subscriptionId,
        channelName: '',
        data: operation.data
      }

      await subscriptionLifecycleHooks.executeHooks(
        { type: `before_${type}` as any },
        context
      )
    }

    // Execute operations (implementation depends on specific operation)
    // This would integrate with the actual subscription management

    // Execute after hooks
    for (const operation of operations) {
      const context = {
        subscriptionId: operation.subscriptionId,
        channelName: '',
        data: operation.data
      }

      await subscriptionLifecycleHooks.executeHooks(
        { type: `after_${type}` as any },
        context
      )
    }
  }

  /**
   * Update cache
   */
  private updateCache(subscriptionId: string, subscription: SubscriptionState): void {
    const key = this.generateCacheKey(subscription)
    const entry: CacheEntry = {
      key,
      data: subscription,
      timestamp: new Date(),
      ttl: this.config.cacheTTL,
      hits: 0
    }

    // Remove oldest entries if cache is full
    if (this.cache.size >= this.config.cacheSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }

    this.cache.set(key, entry)
  }

  /**
   * Get from cache
   */
  getFromCache(subscription: SubscriptionState): SubscriptionState | null {
    const key = this.generateCacheKey(subscription)
    const entry = this.cache.get(key)

    if (!entry) {
      this.metrics.cacheMisses++
      return null
    }

    // Check if entry is expired
    if (Date.now() - entry.timestamp.getTime() > entry.ttl) {
      this.cache.delete(key)
      this.metrics.cacheMisses++
      return null
    }

    entry.hits++
    this.metrics.cacheHits++
    return entry.data
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(subscription: SubscriptionState): string {
    const keyData = {
      channelName: subscription.channelName,
      tableName: subscription.tableName,
      filter: subscription.filter,
      userId: subscription.metadata?.userId
    }
    
    return `cache_${JSON.stringify(keyData)}`
  }

  /**
   * Perform deduplication analysis
   */
  analyzeDeduplication(): DeduplicationResult {
    const subscriptions = subscriptionStateManager.getAllSubscriptions()
    const duplicates: Array<{ id: string; channelName: string; duplicates: string[] }> = []
    const processed = new Set<string>()

    for (const subscription of subscriptions) {
      if (processed.has(subscription.id)) continue

      const subscriptionDuplicates = this.findDuplicates(subscription)
      if (subscriptionDuplicates.length > 0) {
        duplicates.push({
          id: subscription.id,
          channelName: subscription.channelName,
          duplicates: subscriptionDuplicates
        })

        // Mark all as processed
        processed.add(subscription.id)
        subscriptionDuplicates.forEach(id => processed.add(id))
      }
    }

    const totalDuplicates = duplicates.reduce((sum, d) => sum + d.duplicates.length, 0)

    return {
      originalCount: subscriptions.length,
      optimizedCount: subscriptions.length - totalDuplicates,
      duplicatesRemoved: totalDuplicates,
      subscriptions: duplicates
    }
  }

  /**
   * Get optimization groups
   */
  getOptimizationGroups(): SubscriptionGroup[] {
    return Array.from(this.subscriptionGroups.values())
  }

  /**
   * Get batch operations
   */
  getBatchOperations(status?: BatchOperation['status']): BatchOperation[] {
    const operations = this.batchQueue
    return status ? operations.filter(op => op.status === status) : operations
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Start batch timer
   */
  private startBatchTimer(): void {
    if (this.batchTimer) return

    this.batchTimer = setTimeout(() => {
      this.processBatchQueue()
      this.batchTimer = undefined
    }, this.config.batchTimeout)
  }

  /**
   * Stop batch timer
   */
  private stopBatchTimer(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = undefined
    }
  }

  /**
   * Start optimization timer
   */
  private startOptimizationTimer(): void {
    this.optimizationTimer = setInterval(() => {
      this.runOptimization()
    }, 60000) // Run every minute
  }

  /**
   * Stop optimization timer
   */
  private stopOptimizationTimer(): void {
    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer)
      this.optimizationTimer = undefined
    }
  }

  /**
   * Run optimization
   */
  private runOptimization(): void {
    const subscriptions = subscriptionStateManager.getAllSubscriptions()
    this.metrics.totalSubscriptions = subscriptions.length

    // Clean up expired cache entries
    this.cleanupCache()

    // Update metrics
    this.metrics.lastOptimization = new Date()
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp.getTime() > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Initialize default groups
   */
  private initializeDefaultGroups(): void {
    // Create default groups for common table types
    const defaultGroups = [
      { name: 'matches', priority: 'high' as const },
      { name: 'players', priority: 'normal' as const },
      { name: 'teams', priority: 'normal' as const },
      { name: 'events', priority: 'critical' as const }
    ]

    defaultGroups.forEach(group => {
      this.createOptimizationGroup([], {
        id: '',
        channelName: '',
        status: 'pending',
        priority: group.priority,
        createdAt: new Date(),
        updatedAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
        tableName: group.name
      } as SubscriptionState)
    })
  }

  /**
   * Update optimization time metrics
   */
  private updateOptimizationTime(time: number): void {
    this.metrics.averageOptimizationTime = 
      (this.metrics.averageOptimizationTime * (this.metrics.optimizedSubscriptions - 1) + time) / 
      this.metrics.optimizedSubscriptions
  }

  /**
   * Generate group ID
   */
  private generateGroupId(): string {
    return `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate batch ID
   */
  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Stop optimizer
   */
  stop(): void {
    this.stopBatchTimer()
    this.stopOptimizationTimer()
    this.processBatchQueue() // Process remaining batches
  }
}

// Export singleton instance
export const subscriptionOptimizer = new SubscriptionOptimizer()
