/**
 * Real-time Error Tracking and Reporting
 * Comprehensive error tracking, analysis, and reporting system
 */

import { realtimeEventLogger } from './realtime-event-logger'
import { subscriptionStateManager } from './subscription-state-manager'
import { subscriptionHealthMonitor } from './subscription-health-monitor'

export interface ErrorReport {
  id: string
  timestamp: Date
  level: 'error' | 'critical'
  category: 'subscription' | 'connection' | 'performance' | 'sync' | 'conflict' | 'system' | 'user'
  source: string
  message: string
  stackTrace?: string
  errorCode?: string
  userId?: string
  organizationId?: string
  subscriptionId?: string
  matchId?: string
  tournamentId?: string
  sessionId?: string
  userAgent?: string
  url?: string
  metadata?: {
    retryCount?: number
    duration?: number
    resourceUsage?: any
    context?: any
    tags?: string[]
    severity?: 'low' | 'medium' | 'high' | 'critical'
    impact?: 'low' | 'medium' | 'high' | 'critical'
    frequency?: number
    firstOccurrence?: Date
    lastOccurrence?: Date
  }
}

export interface ErrorPattern {
  id: string
  signature: string
  message: string
  stackPattern: string
  category: ErrorReport['category']
  frequency: number
  firstSeen: Date
  lastSeen: Date
  affectedUsers: Set<string>
  affectedSubscriptions: Set<string>
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'active' | 'investigating' | 'resolved' | 'ignored'
  assignedTo?: string
  resolution?: string
  tags: string[]
}

export interface ErrorStats {
  totalErrors: number
  criticalErrors: number
  errorsByCategory: Record<string, number>
  errorsBySource: Record<string, number>
  errorsBySeverity: Record<string, number>
  errorRate: number
  averageErrorsPerHour: number
  uniqueErrorPatterns: number
  resolvedErrors: number
  activeErrorPatterns: number
  lastErrorTime?: Date
  oldestUnresolvedError?: Date
}

export interface ErrorAlert {
  id: string
  type: 'error_spike' | 'critical_error' | 'new_error_pattern' | 'error_rate_threshold'
  severity: 'warning' | 'critical'
  message: string
  errorReport?: ErrorReport
  errorPattern?: ErrorPattern
  timestamp: Date
  resolved: boolean
  resolvedAt?: Date
  resolvedBy?: string
  metadata?: any
}

export interface ErrorTrend {
  timestamp: Date
  errorCount: number
  criticalCount: number
  uniquePatterns: number
  resolutionRate: number
}

export type ErrorCallback = (error: ErrorReport) => void
export type PatternCallback = (pattern: ErrorPattern) => void
export type AlertCallback = (alert: ErrorAlert) => void

export class RealtimeErrorTracker {
  private errors: ErrorReport[] = []
  private patterns: Map<string, ErrorPattern> = new Map()
  private alerts: ErrorAlert[] = []
  private trends: ErrorTrend[] = []
  
  private callbacks: Set<ErrorCallback> = new Set()
  private patternCallbacks: Set<PatternCallback> = new Set()
  private alertCallbacks: Set<AlertCallback> = new Set()
  
  private maxErrors = 5000
  private maxTrends = 1000
  private alertThresholds = {
    errorSpike: 10, // errors per minute
    criticalErrorRate: 5, // critical errors per hour
    errorRateThreshold: 20, // percentage
    newPatternThreshold: 3 // occurrences before alert
  }
  
  private trendTimer?: NodeJS.Timeout
  private alertTimer?: NodeJS.Timeout

  constructor() {
    this.initializeErrorTracking()
    this.startTrendCollection()
    this.startAlertMonitoring()
  }

  /**
   * Track an error
   */
  trackError(
    error: Error,
    context: {
      level?: 'error' | 'critical'
      category?: ErrorReport['category']
      source?: string
      userId?: string
      organizationId?: string
      subscriptionId?: string
      matchId?: string
      tournamentId?: string
      sessionId?: string
      metadata?: any
    } = {}
  ): string {
    const errorReport: ErrorReport = {
      id: this.generateErrorId(),
      timestamp: new Date(),
      level: context.level || 'error',
      category: context.category || 'system',
      source: context.source || 'unknown',
      message: error.message,
      stackTrace: error.stack,
      errorCode: error.name,
      userId: context.userId,
      organizationId: context.organizationId,
      subscriptionId: context.subscriptionId,
      matchId: context.matchId,
      tournamentId: context.tournamentId,
      sessionId: context.sessionId,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      metadata: {
        ...context.metadata,
        severity: this.calculateSeverity(error, context),
        impact: this.calculateImpact(error, context),
        firstOccurrence: new Date(),
        lastOccurrence: new Date()
      }
    }

    this.errors.push(errorReport)

    // Keep errors within limit
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors)
    }

    // Analyze error pattern
    this.analyzeErrorPattern(errorReport)

    // Check for alerts
    this.checkForAlerts(errorReport)

    // Log the error
    realtimeEventLogger.logError(
      errorReport.level,
      errorReport.source,
      errorReport.message,
      error,
      context.metadata,
      {
        errorCode: errorReport.errorCode,
        stackTrace: errorReport.stackTrace
      }
    )

    // Notify callbacks
    this.notifyErrorCallbacks(errorReport)

    return errorReport.id
  }

  /**
   * Track subscription error
   */
  trackSubscriptionError(
    subscriptionId: string,
    error: Error,
    context: {
      level?: 'error' | 'critical'
      metadata?: any
    } = {}
  ): string {
    return this.trackError(error, {
      level: context.level || 'error',
      category: 'subscription',
      source: 'subscription-manager',
      subscriptionId,
      metadata: context.metadata
    })
  }

  /**
   * Track connection error
   */
  trackConnectionError(
    error: Error,
    context: {
      level?: 'error' | 'critical'
      metadata?: any
    } = {}
  ): string {
    return this.trackError(error, {
      level: context.level || 'error',
      category: 'connection',
      source: 'connection-manager',
      metadata: context.metadata
    })
  }

  /**
   * Track performance error
   */
  trackPerformanceError(
    source: string,
    error: Error,
    context: {
      level?: 'error' | 'critical'
      metadata?: any
    } = {}
  ): string {
    return this.trackError(error, {
      level: context.level || 'error',
      category: 'performance',
      source,
      metadata: context.metadata
    })
  }

  /**
   * Track sync error
   */
  trackSyncError(
    error: Error,
    context: {
      level?: 'error' | 'critical'
      metadata?: any
    } = {}
  ): string {
    return this.trackError(error, {
      level: context.level || 'error',
      category: 'sync',
      source: 'sync-manager',
      metadata: context.metadata
    })
  }

  /**
   * Track conflict error
   */
  trackConflictError(
    error: Error,
    context: {
      level?: 'error' | 'critical'
      metadata?: any
    } = {}
  ): string {
    return this.trackError(error, {
      level: context.level || 'error',
      category: 'conflict',
      source: 'conflict-resolver',
      metadata: context.metadata
    })
  }

  /**
   * Get error statistics
   */
  getStats(): ErrorStats {
    const now = Date.now()
    const oneHourAgo = new Date(now - 60 * 60 * 1000)
    
    const recentErrors = this.errors.filter(error => error.timestamp >= oneHourAgo)
    const criticalErrors = this.errors.filter(error => error.level === 'critical')
    
    const errorsByCategory = this.errors.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const errorsBySource = this.errors.reduce((acc, error) => {
      acc[error.source] = (acc[error.source] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const errorsBySeverity = this.errors.reduce((acc, error) => {
      const severity = error.metadata?.severity || 'medium'
      acc[severity] = (acc[severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const resolvedErrors = this.patterns.size > 0 
      ? Array.from(this.patterns.values()).filter(pattern => pattern.status === 'resolved').length
      : 0

    const activePatterns = this.patterns.size > 0
      ? Array.from(this.patterns.values()).filter(pattern => pattern.status === 'active').length
      : 0

    return {
      totalErrors: this.errors.length,
      criticalErrors: criticalErrors.length,
      errorsByCategory,
      errorsBySource,
      errorsBySeverity,
      errorRate: this.calculateErrorRate(),
      averageErrorsPerHour: recentErrors.length,
      uniqueErrorPatterns: this.patterns.size,
      resolvedErrors,
      activeErrorPatterns: activePatterns,
      lastErrorTime: this.errors.length > 0 ? this.errors[this.errors.length - 1].timestamp : undefined,
      oldestUnresolvedError: this.getOldestUnresolvedError()
    }
  }

  /**
   * Get error patterns
   */
  getErrorPatterns(status?: ErrorPattern['status']): ErrorPattern[] {
    const patterns = Array.from(this.patterns.values())
    return status ? patterns.filter(pattern => pattern.status === status) : patterns
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): ErrorAlert[] {
    return this.alerts.filter(alert => !alert.resolved)
  }

  /**
   * Get all alerts
   */
  getAllAlerts(limit?: number): ErrorAlert[] {
    const sortedAlerts = [...this.alerts].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    return limit ? sortedAlerts.slice(0, limit) : sortedAlerts
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string, resolvedBy: string, resolution?: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert && !alert.resolved) {
      alert.resolved = true
      alert.resolvedAt = new Date()
      alert.resolvedBy = resolvedBy
      if (resolution) {
        alert.metadata = { ...alert.metadata, resolution }
      }
      return true
    }
    return false
  }

  /**
   * Update error pattern status
   */
  updatePatternStatus(patternId: string, status: ErrorPattern['status'], assignedTo?: string): boolean {
    const pattern = this.patterns.get(patternId)
    if (pattern) {
      pattern.status = status
      if (assignedTo) {
        pattern.assignedTo = assignedTo
      }
      this.notifyPatternCallbacks(pattern)
      return true
    }
    return false
  }

  /**
   * Add pattern resolution
   */
  addPatternResolution(patternId: string, resolution: string): boolean {
    const pattern = this.patterns.get(patternId)
    if (pattern) {
      pattern.resolution = resolution
      pattern.status = 'resolved'
      this.notifyPatternCallbacks(pattern)
      return true
    }
    return false
  }

  /**
   * Get error trends
   */
  getErrorTrends(limit?: number): ErrorTrend[] {
    const sortedTrends = [...this.trends].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    return limit ? sortedTrends.slice(0, limit) : sortedTrends
  }

  /**
   * Export error data
   */
  exportErrorData(): {
    errors: ErrorReport[]
    patterns: ErrorPattern[]
    alerts: ErrorAlert[]
    stats: ErrorStats
    trends: ErrorTrend[]
  } {
    return {
      errors: [...this.errors],
      patterns: Array.from(this.patterns.values()),
      alerts: [...this.alerts],
      stats: this.getStats(),
      trends: [...this.trends]
    }
  }

  /**
   * Initialize error tracking
   */
  private initializeErrorTracking(): void {
    // Global error handler
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.trackError(event.error, {
          level: 'error',
          category: 'system',
          source: 'global-error-handler',
          metadata: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          }
        })
      })

      window.addEventListener('unhandledrejection', (event) => {
        this.trackError(new Error(event.reason), {
          level: 'error',
          category: 'system',
          source: 'unhandled-rejection',
          metadata: {
            promise: event.promise
          }
        })
      })
    }
  }

  /**
   * Analyze error pattern
   */
  private analyzeErrorPattern(error: ErrorReport): void {
    const signature = this.generateErrorSignature(error)
    const existingPattern = this.patterns.get(signature)

    if (existingPattern) {
      // Update existing pattern
      existingPattern.frequency++
      existingPattern.lastSeen = error.timestamp
      if (error.userId) existingPattern.affectedUsers.add(error.userId)
      if (error.subscriptionId) existingPattern.affectedSubscriptions.add(error.subscriptionId)
      
      // Update metadata
      existingPattern.metadata = {
        ...existingPattern.metadata,
        lastOccurrence: error.timestamp
      }

      this.patterns.set(signature, existingPattern)
    } else {
      // Create new pattern
      const pattern: ErrorPattern = {
        id: this.generatePatternId(),
        signature,
        message: error.message,
        stackPattern: this.generateStackPattern(error.stackTrace),
        category: error.category,
        frequency: 1,
        firstSeen: error.timestamp,
        lastSeen: error.timestamp,
        affectedUsers: new Set(error.userId ? [error.userId] : []),
        affectedSubscriptions: new Set(error.subscriptionId ? [error.subscriptionId] : []),
        severity: error.metadata?.severity || 'medium',
        status: 'active',
        tags: this.generateTags(error)
      }

      this.patterns.set(signature, pattern)
      this.notifyPatternCallbacks(pattern)

      // Check if this is a new pattern alert
      if (pattern.frequency >= this.alertThresholds.newPatternThreshold) {
        this.createAlert('new_error_pattern', 'warning', 'New error pattern detected', { pattern })
      }
    }
  }

  /**
   * Check for alerts
   */
  private checkForAlerts(error: ErrorReport): void {
    // Critical error alert
    if (error.level === 'critical') {
      this.createAlert('critical_error', 'critical', 'Critical error occurred', { error })
    }

    // Check for error spikes
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000)
    const recentErrors = this.errors.filter(e => e.timestamp >= oneMinuteAgo)
    
    if (recentErrors.length >= this.alertThresholds.errorSpike) {
      this.createAlert('error_spike', 'warning', 'Error spike detected', { 
        count: recentErrors.length,
        threshold: this.alertThresholds.errorSpike
      })
    }
  }

  /**
   * Create alert
   */
  private createAlert(
    type: ErrorAlert['type'],
    severity: ErrorAlert['severity'],
    message: string,
    metadata?: any
  ): void {
    const alert: ErrorAlert = {
      id: this.generateAlertId(),
      type,
      severity,
      message,
      timestamp: new Date(),
      resolved: false,
      metadata
    }

    this.alerts.push(alert)
    this.notifyAlertCallbacks(alert)
  }

  /**
   * Start trend collection
   */
  private startTrendCollection(): void {
    this.trendTimer = setInterval(() => {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      
      const recentErrors = this.errors.filter(error => error.timestamp >= oneHourAgo)
      const criticalErrors = recentErrors.filter(error => error.level === 'critical')
      
      const trend: ErrorTrend = {
        timestamp: now,
        errorCount: recentErrors.length,
        criticalCount: criticalErrors.length,
        uniquePatterns: this.patterns.size,
        resolutionRate: this.calculateResolutionRate()
      }

      this.trends.push(trend)

      // Keep trends within limit
      if (this.trends.length > this.maxTrends) {
        this.trends = this.trends.slice(-this.maxTrends)
      }
    }, 60 * 60 * 1000) // Every hour
  }

  /**
   * Start alert monitoring
   */
  private startAlertMonitoring(): void {
    this.alertTimer = setInterval(() => {
      const stats = this.getStats()
      
      // Check error rate threshold
      if (stats.errorRate >= this.alertThresholds.errorRateThreshold) {
        this.createAlert('error_rate_threshold', 'warning', 'Error rate threshold exceeded', {
          rate: stats.errorRate,
          threshold: this.alertThresholds.errorRateThreshold
        })
      }
    }, 5 * 60 * 1000) // Every 5 minutes
  }

  /**
   * Calculate error rate
   */
  private calculateErrorRate(): number {
    const now = Date.now()
    const oneHourAgo = new Date(now - 60 * 60 * 1000)
    
    const recentErrors = this.errors.filter(error => error.timestamp >= oneHourAgo)
    const totalEvents = realtimeEventLogger.getEvents({ startTime: oneHourAgo }).length
    
    return totalEvents > 0 ? (recentErrors.length / totalEvents) * 100 : 0
  }

  /**
   * Calculate resolution rate
   */
  private calculateResolutionRate(): number {
    const totalPatterns = this.patterns.size
    const resolvedPatterns = Array.from(this.patterns.values()).filter(p => p.status === 'resolved').length
    
    return totalPatterns > 0 ? (resolvedPatterns / totalPatterns) * 100 : 0
  }

  /**
   * Calculate severity
   */
  private calculateSeverity(error: Error, context: any): 'low' | 'medium' | 'high' | 'critical' {
    if (context.level === 'critical') return 'critical'
    if (error.name.includes('Network') || error.name.includes('Connection')) return 'high'
    if (error.name.includes('Validation') || error.name.includes('Permission')) return 'medium'
    return 'low'
  }

  /**
   * Calculate impact
   */
  private calculateImpact(error: Error, context: any): 'low' | 'medium' | 'high' | 'critical' {
    if (context.level === 'critical') return 'critical'
    if (context.category === 'subscription' || context.category === 'connection') return 'high'
    if (context.category === 'sync' || context.category === 'conflict') return 'medium'
    return 'low'
  }

  /**
   * Generate error signature
   */
  private generateErrorSignature(error: ErrorReport): string {
    return `${error.errorCode}:${error.message}:${error.source}`
  }

  /**
   * Generate stack pattern
   */
  private generateStackPattern(stack?: string): string {
    if (!stack) return ''
    return stack.split('\n').slice(0, 3).join('\n')
  }

  /**
   * Generate tags
   */
  private generateTags(error: ErrorReport): string[] {
    const tags = [error.category, error.source]
    if (error.errorCode) tags.push(error.errorCode)
    if (error.metadata?.severity) tags.push(error.metadata.severity)
    return tags
  }

  /**
   * Get oldest unresolved error
   */
  private getOldestUnresolvedError(): Date | undefined {
    const unresolvedPatterns = Array.from(this.patterns.values()).filter(p => p.status !== 'resolved')
    if (unresolvedPatterns.length === 0) return undefined
    
    return unresolvedPatterns.reduce((oldest, pattern) => 
      pattern.firstSeen < oldest ? pattern.firstSeen : oldest
    , unresolvedPatterns[0].firstSeen)
  }

  /**
   * Generate error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate pattern ID
   */
  private generatePatternId(): string {
    return `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Notify error callbacks
   */
  private notifyErrorCallbacks(error: ErrorReport): void {
    this.callbacks.forEach(callback => {
      try {
        callback(error)
      } catch (err) {
        console.error('Error in error callback:', err)
      }
    })
  }

  /**
   * Notify pattern callbacks
   */
  private notifyPatternCallbacks(pattern: ErrorPattern): void {
    this.patternCallbacks.forEach(callback => {
      try {
        callback(pattern)
      } catch (err) {
        console.error('Error in pattern callback:', err)
      }
    })
  }

  /**
   * Notify alert callbacks
   */
  private notifyAlertCallbacks(alert: ErrorAlert): void {
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert)
      } catch (err) {
        console.error('Error in alert callback:', err)
      }
    })
  }

  /**
   * Register error callback
   */
  onError(callback: ErrorCallback): () => void {
    this.callbacks.add(callback)
    return () => this.callbacks.delete(callback)
  }

  /**
   * Register pattern callback
   */
  onPattern(callback: PatternCallback): () => void {
    this.patternCallbacks.add(callback)
    return () => this.patternCallbacks.delete(callback)
  }

  /**
   * Register alert callback
   */
  onAlert(callback: AlertCallback): () => void {
    this.alertCallbacks.add(callback)
    return () => this.alertCallbacks.delete(callback)
  }

  /**
   * Clear all data
   */
  clearData(): void {
    this.errors = []
    this.patterns.clear()
    this.alerts = []
    this.trends = []
  }

  /**
   * Stop the tracker
   */
  stop(): void {
    if (this.trendTimer) {
      clearInterval(this.trendTimer)
      this.trendTimer = undefined
    }
    
    if (this.alertTimer) {
      clearInterval(this.alertTimer)
      this.alertTimer = undefined
    }
    
    this.callbacks.clear()
    this.patternCallbacks.clear()
    this.alertCallbacks.clear()
  }
}

// Export singleton instance
export const realtimeErrorTracker = new RealtimeErrorTracker()
