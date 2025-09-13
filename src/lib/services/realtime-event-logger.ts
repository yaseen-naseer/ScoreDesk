/**
 * Real-time Event Logger
 * Comprehensive event logging system for real-time operations
 */

import { subscriptionStateManager } from './subscription-state-manager'
import { subscriptionHealthMonitor } from './subscription-health-monitor'
import { subscriptionPerformanceMetrics } from './subscription-performance-metrics'

export interface LogEvent {
  id: string
  timestamp: Date
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical'
  category: 'subscription' | 'connection' | 'performance' | 'error' | 'sync' | 'conflict' | 'system'
  source: string
  message: string
  data?: any
  subscriptionId?: string
  userId?: string
  organizationId?: string
  matchId?: string
  tournamentId?: string
  sessionId?: string
  correlationId?: string
  metadata?: {
    userAgent?: string
    ipAddress?: string
    requestId?: string
    duration?: number
    retryCount?: number
    errorCode?: string
    stackTrace?: string
  }
}

export interface LogFilter {
  level?: LogEvent['level'][]
  category?: LogEvent['category'][]
  source?: string[]
  subscriptionId?: string
  userId?: string
  organizationId?: string
  matchId?: string
  tournamentId?: string
  startTime?: Date
  endTime?: Date
  search?: string
}

export interface LogStats {
  totalEvents: number
  eventsByLevel: Record<string, number>
  eventsByCategory: Record<string, number>
  eventsBySource: Record<string, number>
  errorRate: number
  averageEventsPerMinute: number
  lastEventTime?: Date
  oldestEventTime?: Date
}

export interface LogExport {
  events: LogEvent[]
  stats: LogStats
  filters: LogFilter
  exportedAt: Date
  timeRange: {
    start: Date
    end: Date
  }
}

export type LogEventCallback = (event: LogEvent) => void
export type LogStatsCallback = (stats: LogStats) => void

export class RealtimeEventLogger {
  private events: LogEvent[] = []
  private callbacks: Set<LogEventCallback> = new Set()
  private statsCallbacks: Set<LogStatsCallback> = new Set()
  private maxEvents = 10000
  private retentionDays = 7
  private statsTimer?: NodeJS.Timeout
  
  constructor() {
    this.startStatsCollection()
    this.initializeEventSources()
  }

  /**
   * Log an event
   */
  log(
    level: LogEvent['level'],
    category: LogEvent['category'],
    source: string,
    message: string,
    data?: any,
    metadata?: LogEvent['metadata']
  ): string {
    const event: LogEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      level,
      category,
      source,
      message,
      data,
      metadata
    }

    this.events.push(event)

    // Keep events within limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents)
    }

    // Clean up old events
    this.cleanupOldEvents()

    // Notify callbacks
    this.notifyCallbacks(event)

    return event.id
  }

  /**
   * Log subscription event
   */
  logSubscription(
    level: LogEvent['level'],
    subscriptionId: string,
    message: string,
    data?: any
  ): string {
    return this.log(
      level,
      'subscription',
      'subscription-manager',
      message,
      data,
      { subscriptionId }
    )
  }

  /**
   * Log connection event
   */
  logConnection(
    level: LogEvent['level'],
    message: string,
    data?: any,
    metadata?: LogEvent['metadata']
  ): string {
    return this.log(
      level,
      'connection',
      'connection-manager',
      message,
      data,
      metadata
    )
  }

  /**
   * Log performance event
   */
  logPerformance(
    level: LogEvent['level'],
    source: string,
    message: string,
    data?: any,
    metadata?: LogEvent['metadata']
  ): string {
    return this.log(
      level,
      'performance',
      source,
      message,
      data,
      metadata
    )
  }

  /**
   * Log error event
   */
  logError(
    level: 'error' | 'critical',
    source: string,
    message: string,
    error?: Error,
    data?: any,
    metadata?: LogEvent['metadata']
  ): string {
    const errorData = {
      ...data,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    }

    return this.log(
      level,
      'error',
      source,
      message,
      errorData,
      {
        ...metadata,
        errorCode: error?.name,
        stackTrace: error?.stack
      }
    )
  }

  /**
   * Log sync event
   */
  logSync(
    level: LogEvent['level'],
    message: string,
    data?: any,
    metadata?: LogEvent['metadata']
  ): string {
    return this.log(
      level,
      'sync',
      'sync-manager',
      message,
      data,
      metadata
    )
  }

  /**
   * Log conflict event
   */
  logConflict(
    level: LogEvent['level'],
    message: string,
    data?: any,
    metadata?: LogEvent['metadata']
  ): string {
    return this.log(
      level,
      'conflict',
      'conflict-resolver',
      message,
      data,
      metadata
    )
  }

  /**
   * Log system event
   */
  logSystem(
    level: LogEvent['level'],
    source: string,
    message: string,
    data?: any,
    metadata?: LogEvent['metadata']
  ): string {
    return this.log(
      level,
      'system',
      source,
      message,
      data,
      metadata
    )
  }

  /**
   * Get events with filtering
   */
  getEvents(filter?: LogFilter, limit?: number): LogEvent[] {
    let filteredEvents = [...this.events]

    if (filter) {
      // Filter by level
      if (filter.level && filter.level.length > 0) {
        filteredEvents = filteredEvents.filter(event => filter.level!.includes(event.level))
      }

      // Filter by category
      if (filter.category && filter.category.length > 0) {
        filteredEvents = filteredEvents.filter(event => filter.category!.includes(event.category))
      }

      // Filter by source
      if (filter.source && filter.source.length > 0) {
        filteredEvents = filteredEvents.filter(event => filter.source!.includes(event.source))
      }

      // Filter by subscription ID
      if (filter.subscriptionId) {
        filteredEvents = filteredEvents.filter(event => event.subscriptionId === filter.subscriptionId)
      }

      // Filter by user ID
      if (filter.userId) {
        filteredEvents = filteredEvents.filter(event => event.userId === filter.userId)
      }

      // Filter by organization ID
      if (filter.organizationId) {
        filteredEvents = filteredEvents.filter(event => event.organizationId === filter.organizationId)
      }

      // Filter by match ID
      if (filter.matchId) {
        filteredEvents = filteredEvents.filter(event => event.matchId === filter.matchId)
      }

      // Filter by tournament ID
      if (filter.tournamentId) {
        filteredEvents = filteredEvents.filter(event => event.tournamentId === filter.tournamentId)
      }

      // Filter by time range
      if (filter.startTime) {
        filteredEvents = filteredEvents.filter(event => event.timestamp >= filter.startTime!)
      }

      if (filter.endTime) {
        filteredEvents = filteredEvents.filter(event => event.timestamp <= filter.endTime!)
      }

      // Filter by search term
      if (filter.search) {
        const searchLower = filter.search.toLowerCase()
        filteredEvents = filteredEvents.filter(event => 
          event.message.toLowerCase().includes(searchLower) ||
          event.source.toLowerCase().includes(searchLower) ||
          (event.data && JSON.stringify(event.data).toLowerCase().includes(searchLower))
        )
      }
    }

    // Sort by timestamp (newest first)
    filteredEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    return limit ? filteredEvents.slice(0, limit) : filteredEvents
  }

  /**
   * Get log statistics
   */
  getStats(): LogStats {
    const now = Date.now()
    const oneMinuteAgo = new Date(now - 60 * 1000)
    
    const recentEvents = this.events.filter(event => event.timestamp >= oneMinuteAgo)
    const eventsByLevel = this.events.reduce((acc, event) => {
      acc[event.level] = (acc[event.level] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const eventsByCategory = this.events.reduce((acc, event) => {
      acc[event.category] = (acc[event.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const eventsBySource = this.events.reduce((acc, event) => {
      acc[event.source] = (acc[event.source] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const errorEvents = this.events.filter(event => 
      event.level === 'error' || event.level === 'critical'
    )
    const errorRate = this.events.length > 0 
      ? (errorEvents.length / this.events.length) * 100 
      : 0

    return {
      totalEvents: this.events.length,
      eventsByLevel,
      eventsByCategory,
      eventsBySource,
      errorRate,
      averageEventsPerMinute: recentEvents.length,
      lastEventTime: this.events.length > 0 ? this.events[this.events.length - 1].timestamp : undefined,
      oldestEventTime: this.events.length > 0 ? this.events[0].timestamp : undefined
    }
  }

  /**
   * Export logs
   */
  exportLogs(filter?: LogFilter): LogExport {
    const events = this.getEvents(filter)
    const stats = this.getStats()
    
    return {
      events,
      stats,
      filters: filter || {},
      exportedAt: new Date(),
      timeRange: {
        start: events.length > 0 ? events[events.length - 1].timestamp : new Date(),
        end: events.length > 0 ? events[0].timestamp : new Date()
      }
    }
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.events = []
  }

  /**
   * Set retention policy
   */
  setRetention(days: number): void {
    this.retentionDays = days
  }

  /**
   * Set max events limit
   */
  setMaxEvents(max: number): void {
    this.maxEvents = max
    if (this.events.length > max) {
      this.events = this.events.slice(-max)
    }
  }

  /**
   * Register event callback
   */
  onEvent(callback: LogEventCallback): () => void {
    this.callbacks.add(callback)
    return () => this.callbacks.delete(callback)
  }

  /**
   * Register stats callback
   */
  onStats(callback: LogStatsCallback): () => void {
    this.statsCallbacks.add(callback)
    return () => this.statsCallbacks.delete(callback)
  }

  /**
   * Initialize event sources
   */
  private initializeEventSources(): void {
    // Subscribe to subscription events
    subscriptionStateManager.onEvent((event) => {
      this.logSubscription(
        event.type === 'error' ? 'error' : 'info',
        event.subscriptionId,
        `Subscription ${event.type}`,
        event.data
      )
    })

    // Subscribe to health monitor events
    subscriptionHealthMonitor.onHealthCheck((check) => {
      this.logSystem(
        check.status === 'critical' ? 'error' : 
        check.status === 'warning' ? 'warn' : 'info',
        'health-monitor',
        `Health check: ${check.name} - ${check.message}`,
        check
      )
    })

    // Subscribe to performance metrics
    subscriptionPerformanceMetrics.onMetric((metric) => {
      this.logPerformance(
        'debug',
        'performance-metrics',
        `Performance metric: ${metric.name}`,
        metric
      )
    })
  }

  /**
   * Start stats collection
   */
  private startStatsCollection(): void {
    this.statsTimer = setInterval(() => {
      const stats = this.getStats()
      this.notifyStatsCallbacks(stats)
    }, 30000) // Every 30 seconds
  }

  /**
   * Stop stats collection
   */
  private stopStatsCollection(): void {
    if (this.statsTimer) {
      clearInterval(this.statsTimer)
      this.statsTimer = undefined
    }
  }

  /**
   * Clean up old events
   */
  private cleanupOldEvents(): void {
    const cutoff = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000)
    this.events = this.events.filter(event => event.timestamp > cutoff)
  }

  /**
   * Notify event callbacks
   */
  private notifyCallbacks(event: LogEvent): void {
    this.callbacks.forEach(callback => {
      try {
        callback(event)
      } catch (error) {
        console.error('Error in log event callback:', error)
      }
    })
  }

  /**
   * Notify stats callbacks
   */
  private notifyStatsCallbacks(stats: LogStats): void {
    this.statsCallbacks.forEach(callback => {
      try {
        callback(stats)
      } catch (error) {
        console.error('Error in log stats callback:', error)
      }
    })
  }

  /**
   * Generate event ID
   */
  private generateEventId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Stop the logger
   */
  stop(): void {
    this.stopStatsCollection()
    this.callbacks.clear()
    this.statsCallbacks.clear()
  }
}

// Export singleton instance
export const realtimeEventLogger = new RealtimeEventLogger()
