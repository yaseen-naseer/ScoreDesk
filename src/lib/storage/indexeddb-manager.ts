/**
 * IndexedDB Manager for offline data storage
 * Provides comprehensive offline data storage with versioning and migration support
 */

export interface StoredItem<T = any> {
  id: string
  data: T
  timestamp: number
  version: number
  type: string
  metadata?: Record<string, any>
}

export interface StorageStats {
  totalItems: number
  totalSize: number
  oldestItem: Date | null
  newestItem: Date | null
  itemsByType: Record<string, number>
  storageQuota: number
  storageUsage: number
}

export interface StorageEvent {
  type: 'create' | 'update' | 'delete' | 'clear'
  itemType: string
  itemId: string
  timestamp: Date
  data?: any
}

export type StorageEventCallback = (event: StorageEvent) => void

export class IndexedDBManager {
  private dbName = 'ScoreDeskOffline'
  private dbVersion = 1
  private db: IDBDatabase | null = null
  private eventCallbacks: Set<StorageEventCallback> = new Set()
  private isInitialized = false

  // Store names
  private readonly STORES = {
    MATCHES: 'matches',
    MATCH_EVENTS: 'match_events',
    MATCH_STATISTICS: 'match_statistics',
    PLAYER_STATISTICS: 'player_statistics',
    TEAMS: 'teams',
    PLAYERS: 'players',
    TOURNAMENTS: 'tournaments',
    ORGANIZATIONS: 'organizations',
    SYNC_QUEUE: 'sync_queue',
    CACHE: 'cache'
  } as const

  constructor() {
    // Only initialize in browser environment
    if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined') {
      this.initialize()
    }
  }

  /**
   * Initialize IndexedDB
   */
  private async initialize(): Promise<void> {
    // Only initialize in browser environment
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
      return Promise.resolve()
    }
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'))
      }

      request.onsuccess = () => {
        this.db = request.result
        this.isInitialized = true
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        this.createStores(db)
      }
    })
  }

  /**
   * Create database stores
   */
  private createStores(db: IDBDatabase): void {
    // Create stores for each data type
    Object.values(this.STORES).forEach(storeName => {
      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, { keyPath: 'id' })
        
        // Create indexes for common queries
        store.createIndex('timestamp', 'timestamp', { unique: false })
        store.createIndex('type', 'type', { unique: false })
        store.createIndex('version', 'version', { unique: false })
        
        // Create composite indexes for efficient queries
        if (storeName === this.STORES.SYNC_QUEUE) {
          store.createIndex('status_timestamp', ['status', 'timestamp'], { unique: false })
          store.createIndex('operation_type', ['operation', 'type'], { unique: false })
        }
      }
    })
  }

  /**
   * Wait for initialization
   */
  private async waitForInit(): Promise<void> {
    if (this.isInitialized) return

    return new Promise((resolve) => {
      const checkInit = () => {
        if (this.isInitialized) {
          resolve()
        } else {
          setTimeout(checkInit, 10)
        }
      }
      checkInit()
    })
  }

  /**
   * Store data in IndexedDB
   */
  async store<T>(storeName: string, item: Omit<StoredItem<T>, 'timestamp' | 'version'>): Promise<void> {
    await this.waitForInit()
    
    if (!this.db) throw new Error('Database not initialized')

    const storedItem: StoredItem<T> = {
      ...item,
      timestamp: Date.now(),
      version: 1
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put(storedItem)

      request.onsuccess = () => {
        this.notifyEvent({
          type: 'create',
          itemType: item.type,
          itemId: item.id,
          timestamp: new Date(),
          data: storedItem
        })
        resolve()
      }

      request.onerror = () => {
        reject(new Error(`Failed to store item: ${request.error?.message}`))
      }
    })
  }

  /**
   * Retrieve data from IndexedDB
   */
  async retrieve<T>(storeName: string, id: string): Promise<StoredItem<T> | null> {
    await this.waitForInit()
    
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(id)

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = () => {
        reject(new Error(`Failed to retrieve item: ${request.error?.message}`))
      }
    })
  }

  /**
   * Retrieve all items from a store
   */
  async retrieveAll<T>(storeName: string): Promise<StoredItem<T>[]> {
    await this.waitForInit()
    
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onsuccess = () => {
        resolve(request.result || [])
      }

      request.onerror = () => {
        reject(new Error(`Failed to retrieve all items: ${request.error?.message}`))
      }
    })
  }

  /**
   * Update existing data in IndexedDB
   */
  async update<T>(storeName: string, id: string, updates: Partial<StoredItem<T>>): Promise<void> {
    await this.waitForInit()
    
    if (!this.db) throw new Error('Database not initialized')

    // First, get the existing item
    const existingItem = await this.retrieve<T>(storeName, id)
    if (!existingItem) {
      throw new Error(`Item with id ${id} not found`)
    }

    const updatedItem: StoredItem<T> = {
      ...existingItem,
      ...updates,
      version: existingItem.version + 1,
      timestamp: Date.now()
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put(updatedItem)

      request.onsuccess = () => {
        this.notifyEvent({
          type: 'update',
          itemType: updatedItem.type,
          itemId: updatedItem.id,
          timestamp: new Date(),
          data: updatedItem
        })
        resolve()
      }

      request.onerror = () => {
        reject(new Error(`Failed to update item: ${request.error?.message}`))
      }
    })
  }

  /**
   * Delete data from IndexedDB
   */
  async delete(storeName: string, id: string): Promise<void> {
    await this.waitForInit()
    
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(id)

      request.onsuccess = () => {
        this.notifyEvent({
          type: 'delete',
          itemType: 'unknown', // We don't know the type after deletion
          itemId: id,
          timestamp: new Date()
        })
        resolve()
      }

      request.onerror = () => {
        reject(new Error(`Failed to delete item: ${request.error?.message}`))
      }
    })
  }

  /**
   * Clear all data from a store
   */
  async clearStore(storeName: string): Promise<void> {
    await this.waitForInit()
    
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.clear()

      request.onsuccess = () => {
        this.notifyEvent({
          type: 'clear',
          itemType: storeName,
          itemId: 'all',
          timestamp: new Date()
        })
        resolve()
      }

      request.onerror = () => {
        reject(new Error(`Failed to clear store: ${request.error?.message}`))
      }
    })
  }

  /**
   * Query items by index
   */
  async queryByIndex<T>(
    storeName: string, 
    indexName: string, 
    value: any
  ): Promise<StoredItem<T>[]> {
    await this.waitForInit()
    
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const index = store.index(indexName)
      const request = index.getAll(value)

      request.onsuccess = () => {
        resolve(request.result || [])
      }

      request.onerror = () => {
        reject(new Error(`Failed to query by index: ${request.error?.message}`))
      }
    })
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<StorageStats> {
    await this.waitForInit()
    
    if (!this.db) throw new Error('Database not initialized')

    const stats: StorageStats = {
      totalItems: 0,
      totalSize: 0,
      oldestItem: null,
      newestItem: null,
      itemsByType: {},
      storageQuota: 0,
      storageUsage: 0
    }

    // Get quota information
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      stats.storageQuota = estimate.quota || 0
      stats.storageUsage = estimate.usage || 0
    }

    // Count items in each store
    for (const storeName of Object.values(this.STORES)) {
      const items = await this.retrieveAll(storeName)
      stats.totalItems += items.length

      // Calculate size and dates
      for (const item of items) {
        stats.totalSize += JSON.stringify(item).length
        
        const itemDate = new Date(item.timestamp)
        if (!stats.oldestItem || itemDate < stats.oldestItem) {
          stats.oldestItem = itemDate
        }
        if (!stats.newestItem || itemDate > stats.newestItem) {
          stats.newestItem = itemDate
        }

        // Count by type
        stats.itemsByType[item.type] = (stats.itemsByType[item.type] || 0) + 1
      }
    }

    return stats
  }

  /**
   * Subscribe to storage events
   */
  onEvent(callback: StorageEventCallback): () => void {
    this.eventCallbacks.add(callback)
    
    return () => {
      this.eventCallbacks.delete(callback)
    }
  }

  /**
   * Notify event callbacks
   */
  private notifyEvent(event: StorageEvent): void {
    this.eventCallbacks.forEach(callback => {
      try {
        callback(event)
      } catch (error) {
        console.error('Error in storage event callback:', error)
      }
    })
  }

  /**
   * Get store names
   */
  getStores() {
    return { ...this.STORES }
  }

  /**
   * Check if database is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.db !== null
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      this.isInitialized = false
    }
  }

  /**
   * Delete entire database
   */
  async deleteDatabase(): Promise<void> {
    this.close()
    
    return new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(this.dbName)
      
      deleteRequest.onsuccess = () => {
        resolve()
      }
      
      deleteRequest.onerror = () => {
        reject(new Error('Failed to delete database'))
      }
    })
  }
}

// Export singleton instance
export const indexedDBManager = new IndexedDBManager()
