/**
 * Data Synchronization Queue Service
 * Manages offline data synchronization with retry logic, conflict resolution, and priority handling
 */

import { indexedDBManager } from '@/lib/storage/indexeddb-manager'
import { offlineDetector } from '@/lib/utils/offline-detector'

export interface SyncQueueItem {
  id: string
  operation: 'create' | 'update' | 'delete'
  type: 'match' | 'match_event' | 'match_statistics' | 'player_statistics' | 'team' | 'player' | 'tournament'
  data: any
  timestamp: number
  status: 'pending' | 'syncing' | 'completed' | 'failed' | 'conflicted'
  priority: 'low' | 'normal' | 'high' | 'critical'
  retryCount: number
  maxRetries: number
  lastError?: string
  lastSyncAttempt?: number
  metadata?: {
    userId?: string
    organizationId?: string
    matchId?: string
    tournamentId?: string
    conflictResolution?: 'last_write_wins' | 'user_resolution' | 'merge'
    dependencies?: string[]
  }
}

export interface SyncBatch {
  id: string
  items: SyncQueueItem[]
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: number
  startedAt?: number
  completedAt?: number
  error?: string
}

export interface SyncStats {
  totalItems: number
  pendingItems: number
  syncingItems: number
  completedItems: number
  failedItems: number
  conflictedItems: number
  averageSyncTime: number
  successRate: number
  lastSyncTime?: Date
  itemsByType: Record<string, number>
  itemsByPriority: Record<string, number>
}

export interface SyncConfig {
  batchSize: number
  maxConcurrentBatches: number
  retryDelay: number
  maxRetryDelay: number
  syncInterval: number
  conflictResolutionStrategy: 'last_write_wins' | 'user_resolution' | 'merge'
  enableBatching: boolean
  enablePriority: boolean
}

export type SyncEventCallback = (event: {
  type: 'item_added' | 'item_completed' | 'item_failed' | 'batch_started' | 'batch_completed' | 'batch_failed'
  item?: SyncQueueItem
  batch?: SyncBatch
  stats?: SyncStats
}) => void

export class SyncQueueService {
  private stores = indexedDBManager.getStores()
  private eventCallbacks: Set<SyncEventCallback> = new Set()
  private isProcessing = false
  private processingInterval?: NodeJS.Timeout
  private currentBatch?: SyncBatch

  private config: SyncConfig = {
    batchSize: 10,
    maxConcurrentBatches: 3,
    retryDelay: 1000,
    maxRetryDelay: 30000,
    syncInterval: 5000,
    conflictResolutionStrategy: 'last_write_wins',
    enableBatching: true,
    enablePriority: true
  }

  constructor() {
    this.initializeSyncProcessing()
  }

  /**
   * Initialize sync processing
   */
  private initializeSyncProcessing(): void {
    // Start processing when online
    offlineDetector.onStateChange((offlineState) => {
      if (offlineState.isOnline && !this.isProcessing) {
        this.startProcessing()
      } else if (!offlineState.isOnline && this.isProcessing) {
        this.stopProcessing()
      }
    })
  }

  /**
   * Add item to sync queue
   */
  async addToQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<string> {
    const syncItem: SyncQueueItem = {
      ...item,
      id: this.generateId(),
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
      maxRetries: item.maxRetries || 3
    }

    await indexedDBManager.store(this.stores.SYNC_QUEUE, {
      id: syncItem.id,
      type: 'sync_queue_item',
      data: syncItem
    })

    this.notifyEvent({
      type: 'item_added',
      item: syncItem,
      stats: await this.getStats()
    })

    // Start processing if not already running and online
    if (!this.isProcessing && offlineDetector.getState().isOnline) {
      this.startProcessing()
    }

    return syncItem.id
  }

  /**
   * Add multiple items to sync queue
   */
  async addBatchToQueue(items: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount' | 'status'>[]): Promise<string[]> {
    const syncItems: SyncQueueItem[] = items.map(item => ({
      ...item,
      id: this.generateId(),
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
      maxRetries: item.maxRetries || 3
    }))

    // Store all items
    await Promise.all(syncItems.map(item => 
      indexedDBManager.store(this.stores.SYNC_QUEUE, {
        id: item.id,
        type: 'sync_queue_item',
        data: item
      })
    ))

    this.notifyEvent({
      type: 'item_added',
      item: syncItems[0], // Notify with first item
      stats: await this.getStats()
    })

    // Start processing if not already running and online
    if (!this.isProcessing && offlineDetector.getState().isOnline) {
      this.startProcessing()
    }

    return syncItems.map(item => item.id)
  }

  /**
   * Start sync processing
   */
  async startProcessing(): Promise<void> {
    if (this.isProcessing || !offlineDetector.getState().isOnline) return

    this.isProcessing = true
    this.processingInterval = setInterval(() => {
      this.processSyncQueue()
    }, this.config.syncInterval)

    // Process immediately
    await this.processSyncQueue()
  }

  /**
   * Stop sync processing
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = undefined
    }
    this.isProcessing = false
  }

  /**
   * Process sync queue
   */
  private async processSyncQueue(): Promise<void> {
    if (!offlineDetector.getState().isOnline) {
      this.stopProcessing()
      return
    }

    try {
      const pendingItems = await this.getPendingItems()
      if (pendingItems.length === 0) return

      if (this.config.enableBatching) {
        await this.processBatches(pendingItems)
      } else {
        await this.processItems(pendingItems)
      }
    } catch (error) {
      console.error('Error processing sync queue:', error)
    }
  }

  /**
   * Process items in batches
   */
  private async processBatches(pendingItems: SyncQueueItem[]): Promise<void> {
    // Group items by priority and dependencies
    const batches = this.createBatches(pendingItems)

    for (const batch of batches) {
      if (!offlineDetector.getState().isOnline) break

      await this.processBatch(batch)
    }
  }

  /**
   * Create batches from pending items
   */
  private createBatches(pendingItems: SyncQueueItem[]): SyncBatch[] {
    // Sort by priority and timestamp
    const sortedItems = pendingItems.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 }
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (priorityDiff !== 0) return priorityDiff
      return a.timestamp - b.timestamp
    })

    const batches: SyncBatch[] = []
    let currentBatch: SyncQueueItem[] = []

    for (const item of sortedItems) {
      // Check dependencies
      if (item.metadata?.dependencies) {
        const dependencyIds = item.metadata.dependencies
        const dependencyCompleted = dependencyIds.every(id => 
          pendingItems.find(p => p.id === id)?.status === 'completed'
        )
        
        if (!dependencyCompleted) continue
      }

      currentBatch.push(item)

      if (currentBatch.length >= this.config.batchSize) {
        batches.push({
          id: this.generateId(),
          items: [...currentBatch],
          status: 'pending',
          createdAt: Date.now()
        })
        currentBatch = []
      }
    }

    // Add remaining items
    if (currentBatch.length > 0) {
      batches.push({
        id: this.generateId(),
        items: currentBatch,
        status: 'pending',
        createdAt: Date.now()
      })
    }

    return batches
  }

  /**
   * Process a single batch
   */
  private async processBatch(batch: SyncBatch): Promise<void> {
    batch.status = 'processing'
    batch.startedAt = Date.now()

    this.notifyEvent({
      type: 'batch_started',
      batch,
      stats: await this.getStats()
    })

    try {
      // Process items in parallel within batch
      const results = await Promise.allSettled(
        batch.items.map(item => this.syncItem(item))
      )

      // Update batch status
      const failedItems = results.filter(r => r.status === 'rejected').length
      batch.status = failedItems === 0 ? 'completed' : 'failed'
      batch.completedAt = Date.now()

      if (batch.status === 'failed') {
        batch.error = `Failed to sync ${failedItems} out of ${batch.items.length} items`
      }

      this.notifyEvent({
        type: batch.status === 'completed' ? 'batch_completed' : 'batch_failed',
        batch,
        stats: await this.getStats()
      })
    } catch (error) {
      batch.status = 'failed'
      batch.completedAt = Date.now()
      batch.error = error instanceof Error ? error.message : 'Unknown error'

      this.notifyEvent({
        type: 'batch_failed',
        batch,
        stats: await this.getStats()
      })
    }
  }

  /**
   * Process items individually
   */
  private async processItems(items: SyncQueueItem[]): Promise<void> {
    for (const item of items) {
      if (!offlineDetector.getState().isOnline) break

      await this.syncItem(item)
    }
  }

  /**
   * Sync a single item
   */
  private async syncItem(item: SyncQueueItem): Promise<void> {
    try {
      // Update status to syncing
      await this.updateItemStatus(item.id, 'syncing')

      // Perform sync operation
      await this.performSyncOperation(item)

      // Mark as completed
      await this.updateItemStatus(item.id, 'completed')

      this.notifyEvent({
        type: 'item_completed',
        item,
        stats: await this.getStats()
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Check if we should retry
      if (item.retryCount < item.maxRetries) {
        await this.scheduleRetry(item, errorMessage)
      } else {
        await this.updateItemStatus(item.id, 'failed', errorMessage)
        
        this.notifyEvent({
          type: 'item_failed',
          item,
          stats: await this.getStats()
        })
      }
    }
  }

  /**
   * Perform actual sync operation
   */
  private async performSyncOperation(item: SyncQueueItem): Promise<void> {
    // This would integrate with your actual API endpoints
    // For now, we'll simulate the operation
    
    switch (item.operation) {
      case 'create':
        await this.createRemoteItem(item)
        break
      case 'update':
        await this.updateRemoteItem(item)
        break
      case 'delete':
        await this.deleteRemoteItem(item)
        break
      default:
        throw new Error(`Unknown operation: ${item.operation}`)
    }
  }

  /**
   * Create item on remote server
   */
  private async createRemoteItem(item: SyncQueueItem): Promise<void> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // In real implementation, this would be:
    // const response = await fetch(`/api/${item.type}`, {
    //   method: 'POST',
    //   body: JSON.stringify(item.data)
    // })
    // if (!response.ok) throw new Error(`Failed to create ${item.type}`)
  }

  /**
   * Update item on remote server
   */
  private async updateRemoteItem(item: SyncQueueItem): Promise<void> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // In real implementation, this would be:
    // const response = await fetch(`/api/${item.type}/${item.data.id}`, {
    //   method: 'PUT',
    //   body: JSON.stringify(item.data)
    // })
    // if (!response.ok) throw new Error(`Failed to update ${item.type}`)
  }

  /**
   * Delete item from remote server
   */
  private async deleteRemoteItem(item: SyncQueueItem): Promise<void> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // In real implementation, this would be:
    // const response = await fetch(`/api/${item.type}/${item.data.id}`, {
    //   method: 'DELETE'
    // })
    // if (!response.ok) throw new Error(`Failed to delete ${item.type}`)
  }

  /**
   * Schedule retry for failed item
   */
  private async scheduleRetry(item: SyncQueueItem, error: string): Promise<void> {
    const delay = Math.min(
      this.config.retryDelay * Math.pow(2, item.retryCount),
      this.config.maxRetryDelay
    )

    setTimeout(async () => {
      await this.updateItemStatus(item.id, 'pending', undefined, item.retryCount + 1)
    }, delay)
  }

  /**
   * Update item status
   */
  private async updateItemStatus(
    id: string, 
    status: SyncQueueItem['status'], 
    error?: string,
    retryCount?: number
  ): Promise<void> {
    const item = await indexedDBManager.retrieve<SyncQueueItem>(this.stores.SYNC_QUEUE, id)
    if (!item) return

    const updates: Partial<StoredItem<SyncQueueItem>> = {
      data: {
        ...item.data,
        status,
        lastError: error,
        lastSyncAttempt: Date.now(),
        retryCount: retryCount ?? item.data.retryCount
      }
    }

    await indexedDBManager.update(this.stores.SYNC_QUEUE, id, updates)
  }

  /**
   * Get pending items
   */
  async getPendingItems(): Promise<SyncQueueItem[]> {
    const allItems = await indexedDBManager.retrieveAll<SyncQueueItem>(this.stores.SYNC_QUEUE)
    return allItems
      .map(item => item.data)
      .filter(item => item.status === 'pending')
      .sort((a, b) => a.timestamp - b.timestamp)
  }

  /**
   * Get sync statistics
   */
  async getStats(): Promise<SyncStats> {
    const allItems = await indexedDBManager.retrieveAll<SyncQueueItem>(this.stores.SYNC_QUEUE)
    const items = allItems.map(item => item.data)

    const stats: SyncStats = {
      totalItems: items.length,
      pendingItems: items.filter(i => i.status === 'pending').length,
      syncingItems: items.filter(i => i.status === 'syncing').length,
      completedItems: items.filter(i => i.status === 'completed').length,
      failedItems: items.filter(i => i.status === 'failed').length,
      conflictedItems: items.filter(i => i.status === 'conflicted').length,
      averageSyncTime: 0,
      successRate: 0,
      itemsByType: {},
      itemsByPriority: {}
    }

    // Calculate success rate
    const totalProcessed = stats.completedItems + stats.failedItems
    stats.successRate = totalProcessed > 0 ? (stats.completedItems / totalProcessed) * 100 : 0

    // Calculate average sync time
    const completedItems = items.filter(i => i.status === 'completed' && i.lastSyncAttempt)
    if (completedItems.length > 0) {
      const totalSyncTime = completedItems.reduce((sum, item) => {
        return sum + (item.lastSyncAttempt! - item.timestamp)
      }, 0)
      stats.averageSyncTime = totalSyncTime / completedItems.length
    }

    // Count by type
    items.forEach(item => {
      stats.itemsByType[item.type] = (stats.itemsByType[item.type] || 0) + 1
      stats.itemsByPriority[item.priority] = (stats.itemsByPriority[item.priority] || 0) + 1
    })

    // Get last sync time
    const lastCompleted = items
      .filter(i => i.status === 'completed' && i.lastSyncAttempt)
      .sort((a, b) => b.lastSyncAttempt! - a.lastSyncAttempt!)[0]
    
    if (lastCompleted) {
      stats.lastSyncTime = new Date(lastCompleted.lastSyncAttempt!)
    }

    return stats
  }

  /**
   * Clear completed items
   */
  async clearCompletedItems(): Promise<void> {
    const allItems = await indexedDBManager.retrieveAll<SyncQueueItem>(this.stores.SYNC_QUEUE)
    
    for (const item of allItems) {
      if (item.data.status === 'completed') {
        await indexedDBManager.delete(this.stores.SYNC_QUEUE, item.id)
      }
    }
  }

  /**
   * Retry failed items
   */
  async retryFailedItems(): Promise<void> {
    const allItems = await indexedDBManager.retrieveAll<SyncQueueItem>(this.stores.SYNC_QUEUE)
    
    for (const item of allItems) {
      if (item.data.status === 'failed') {
        await this.updateItemStatus(item.id, 'pending')
      }
    }
  }

  /**
   * Update sync configuration
   */
  updateConfig(newConfig: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Subscribe to sync events
   */
  onEvent(callback: SyncEventCallback): () => void {
    this.eventCallbacks.add(callback)
    return () => this.eventCallbacks.delete(callback)
  }

  /**
   * Notify event callbacks
   */
  private notifyEvent(event: Parameters<SyncEventCallback>[0]): void {
    this.eventCallbacks.forEach(callback => {
      try {
        callback(event)
      } catch (error) {
        console.error('Error in sync event callback:', error)
      }
    })
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Check if processing
   */
  isProcessing(): boolean {
    return this.isProcessing
  }

  /**
   * Get configuration
   */
  getConfig(): SyncConfig {
    return { ...this.config }
  }
}

// Export singleton instance
export const syncQueueService = new SyncQueueService()
