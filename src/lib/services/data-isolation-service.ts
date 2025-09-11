/**
 * Data Isolation Service
 * Manages organization-scoped data isolation and caching
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'

export interface DataIsolationConfig {
  organizationId: string
  cachePrefix: string
  ttl: number
}

export interface IsolatedQuery<T = any> {
  tableName: string
  select?: string
  filters?: Record<string, any>
  orderBy?: { column: string; ascending: boolean }[]
  limit?: number
  offset?: number
  transform?: (data: any[]) => T[]
}

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  organizationId: string
}

export class DataIsolationService {
  private supabase = createClientComponentClient<Database>()
  private cache = new Map<string, CacheEntry<any>>()
  private subscriptions = new Map<string, any>()

  constructor(private config: DataIsolationConfig) {}

  /**
   * Create organization-scoped cache key
   */
  private getCacheKey(key: string): string {
    return `${this.config.cachePrefix}:${this.config.organizationId}:${key}`
  }

  /**
   * Check if cache entry is valid
   */
  private isCacheValid<T>(entry: CacheEntry<T>): boolean {
    return (
      entry.organizationId === this.config.organizationId &&
      Date.now() - entry.timestamp < entry.ttl
    )
  }

  /**
   * Get data from cache
   */
  getCached<T>(key: string): T | null {
    const cacheKey = this.getCacheKey(key)
    const entry = this.cache.get(cacheKey)
    
    if (entry && this.isCacheValid(entry)) {
      return entry.data
    }
    
    // Remove expired entry
    if (entry) {
      this.cache.delete(cacheKey)
    }
    
    return null
  }

  /**
   * Set data in cache
   */
  setCached<T>(key: string, data: T, ttl?: number): void {
    const cacheKey = this.getCacheKey(key)
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.ttl,
      organizationId: this.config.organizationId
    }
    
    this.cache.set(cacheKey, entry)
  }

  /**
   * Remove data from cache
   */
  removeCached(key: string): void {
    const cacheKey = this.getCacheKey(key)
    this.cache.delete(cacheKey)
  }

  /**
   * Clear all cache for current organization
   */
  clearOrganizationCache(): void {
    const prefix = `${this.config.cachePrefix}:${this.config.organizationId}:`
    
    for (const [key] of this.cache) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Execute organization-scoped query with caching
   */
  async queryIsolated<T = any>(
    cacheKey: string,
    query: IsolatedQuery<T>,
    options: {
      useCache?: boolean
      forceFresh?: boolean
      cacheTTL?: number
    } = {}
  ): Promise<T[]> {
    const { useCache = true, forceFresh = false, cacheTTL } = options

    // Check cache first
    if (useCache && !forceFresh) {
      const cached = this.getCached<T[]>(cacheKey)
      if (cached) {
        return cached
      }
    }

    // Build Supabase query
    let supabaseQuery = this.supabase
      .from(query.tableName as any)
      .select(query.select || '*')

    // Add organization filter
    supabaseQuery = supabaseQuery.eq('organization_id', this.config.organizationId)

    // Add additional filters
    if (query.filters) {
      Object.entries(query.filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          supabaseQuery = supabaseQuery.in(key, value)
        } else if (value !== null && value !== undefined) {
          supabaseQuery = supabaseQuery.eq(key, value)
        }
      })
    }

    // Add ordering
    if (query.orderBy) {
      query.orderBy.forEach(({ column, ascending }) => {
        supabaseQuery = supabaseQuery.order(column, { ascending })
      })
    }

    // Add pagination
    if (query.limit) {
      supabaseQuery = supabaseQuery.limit(query.limit)
    }
    if (query.offset) {
      supabaseQuery = supabaseQuery.range(query.offset, query.offset + (query.limit || 1000) - 1)
    }

    // Execute query
    const { data, error } = await supabaseQuery

    if (error) {
      throw new Error(`Query failed: ${error.message}`)
    }

    // Transform data if needed
    const result = query.transform ? query.transform(data || []) : (data || [])

    // Cache result
    if (useCache) {
      this.setCached(cacheKey, result, cacheTTL)
    }

    return result
  }

  /**
   * Execute organization-scoped mutation
   */
  async mutateIsolated(
    tableName: string,
    operation: 'insert' | 'update' | 'upsert' | 'delete',
    data: any,
    filters?: Record<string, any>
  ): Promise<any> {
    let query = this.supabase.from(tableName as any)

    switch (operation) {
      case 'insert':
        // Ensure organization_id is set for inserts
        const insertData = Array.isArray(data) 
          ? data.map(item => ({ ...item, organization_id: this.config.organizationId }))
          : { ...data, organization_id: this.config.organizationId }
        
        const { data: insertResult, error: insertError } = await query.insert(insertData).select()
        if (insertError) throw insertError
        return insertResult

      case 'update':
        query = query.eq('organization_id', this.config.organizationId)
        
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value)
          })
        }
        
        const { data: updateResult, error: updateError } = await query.update(data).select()
        if (updateError) throw updateError
        return updateResult

      case 'upsert':
        // Ensure organization_id is set for upserts
        const upsertData = Array.isArray(data)
          ? data.map(item => ({ ...item, organization_id: this.config.organizationId }))
          : { ...data, organization_id: this.config.organizationId }
        
        const { data: upsertResult, error: upsertError } = await query.upsert(upsertData).select()
        if (upsertError) throw upsertError
        return upsertResult

      case 'delete':
        query = query.eq('organization_id', this.config.organizationId)
        
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value)
          })
        }
        
        const { data: deleteResult, error: deleteError } = await query.delete().select()
        if (deleteError) throw deleteError
        return deleteResult

      default:
        throw new Error(`Unsupported operation: ${operation}`)
    }
  }

  /**
   * Subscribe to organization-scoped real-time updates
   */
  subscribeToTable(
    tableName: string,
    callback: (payload: any) => void,
    filters?: Record<string, any>
  ): () => void {
    const subscriptionKey = `${tableName}:${JSON.stringify(filters || {})}`
    
    // Remove existing subscription if any
    this.unsubscribeFromTable(subscriptionKey)

    // Create new subscription
    let channel = this.supabase
      .channel(`${this.config.organizationId}:${subscriptionKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: `organization_id=eq.${this.config.organizationId}`
        },
        (payload) => {
          // Additional filtering if needed
          if (filters) {
            const record = payload.new || payload.old
            const matchesFilters = Object.entries(filters).every(([key, value]) => {
              return record && record[key] === value
            })
            
            if (!matchesFilters) return
          }
          
          callback(payload)
        }
      )
      .subscribe()

    this.subscriptions.set(subscriptionKey, channel)

    // Return unsubscribe function
    return () => this.unsubscribeFromTable(subscriptionKey)
  }

  /**
   * Unsubscribe from table updates
   */
  unsubscribeFromTable(subscriptionKey: string): void {
    const channel = this.subscriptions.get(subscriptionKey)
    if (channel) {
      this.supabase.removeChannel(channel)
      this.subscriptions.delete(subscriptionKey)
    }
  }

  /**
   * Unsubscribe from all real-time updates
   */
  unsubscribeAll(): void {
    for (const [key] of this.subscriptions) {
      this.unsubscribeFromTable(key)
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number
    organizationEntries: number
    memoryUsage: number
    oldestEntry: number | null
    newestEntry: number | null
  } {
    const now = Date.now()
    const prefix = `${this.config.cachePrefix}:${this.config.organizationId}:`
    
    let organizationEntries = 0
    let memoryUsage = 0
    let oldestEntry: number | null = null
    let newestEntry: number | null = null

    for (const [key, entry] of this.cache) {
      if (key.startsWith(prefix)) {
        organizationEntries++
        memoryUsage += JSON.stringify(entry.data).length
        
        if (oldestEntry === null || entry.timestamp < oldestEntry) {
          oldestEntry = entry.timestamp
        }
        if (newestEntry === null || entry.timestamp > newestEntry) {
          newestEntry = entry.timestamp
        }
      }
    }

    return {
      totalEntries: this.cache.size,
      organizationEntries,
      memoryUsage,
      oldestEntry,
      newestEntry
    }
  }

  /**
   * Clean up expired cache entries
   */
  cleanupExpiredCache(): number {
    const now = Date.now()
    let cleanedCount = 0

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp >= entry.ttl) {
        this.cache.delete(key)
        cleanedCount++
      }
    }

    return cleanedCount
  }

  /**
   * Destroy service and clean up resources
   */
  destroy(): void {
    this.unsubscribeAll()
    this.clearOrganizationCache()
  }
}

export default DataIsolationService
