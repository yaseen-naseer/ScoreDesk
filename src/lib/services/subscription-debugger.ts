/**
 * Subscription Debugger
 * Comprehensive debugging tools for subscription lifecycle management
 */

import { subscriptionStateManager, SubscriptionState } from './subscription-state-manager'
import { subscriptionCleanupManager } from './subscription-cleanup-manager'
import { subscriptionRetryManager } from './subscription-retry-manager'
import { subscriptionHealthMonitor } from './subscription-health-monitor'
import { subscriptionOptimizer } from './subscription-optimizer'
import { subscriptionLifecycleHooks } from './subscription-lifecycle-hooks'

export interface DebugSession {
  id: string
  name: string
  startTime: Date
  endTime?: Date
  active: boolean
  subscriptions: string[]
  breakpoints: DebugBreakpoint[]
  logs: DebugLog[]
  metrics: DebugMetrics
}

export interface DebugBreakpoint {
  id: string
  type: 'subscription' | 'event' | 'performance' | 'error'
  condition: string
  enabled: boolean
  hitCount: number
  lastHit?: Date
}

export interface DebugLog {
  id: string
  timestamp: Date
  level: 'debug' | 'info' | 'warn' | 'error'
  category: string
  message: string
  data?: any
  subscriptionId?: string
}

export interface DebugMetrics {
  totalSubscriptions: number
  activeSubscriptions: number
  errorSubscriptions: number
  memoryUsage: number
  performanceScore: number
  errorRate: number
  averageLatency: number
  lastUpdated: Date
}

export interface DebugFilter {
  level?: DebugLog['level'][]
  category?: string[]
  subscriptionId?: string
  startTime?: Date
  endTime?: Date
  search?: string
}

export interface DebugReport {
  sessionId: string
  generatedAt: Date
  summary: {
    totalEvents: number
    errorCount: number
    performanceIssues: number
    recommendations: string[]
  }
  subscriptions: Array<{
    id: string
    status: string
    issues: string[]
    performance: any
  }>
  timeline: Array<{
    timestamp: Date
    event: string
    data: any
  }>
  metrics: DebugMetrics
}

export type DebugCallback = (log: DebugLog) => void
export type BreakpointCallback = (breakpoint: DebugBreakpoint, context: any) => void

export class SubscriptionDebugger {
  private sessions: Map<string, DebugSession> = new Map()
  private currentSession: DebugSession | null = null
  private logs: DebugLog[] = []
  private callbacks: Set<DebugCallback> = new Set()
  private breakpointCallbacks: Set<BreakpointCallback> = new Set()
  
  private logTimer?: NodeJS.Timeout
  private metricsTimer?: NodeJS.Timeout

  constructor() {
    this.startLogging()
    this.startMetricsCollection()
  }

  /**
   * Start debug session
   */
  startSession(name: string, subscriptionIds?: string[]): string {
    const sessionId = this.generateSessionId()
    
    const session: DebugSession = {
      id: sessionId,
      name,
      startTime: new Date(),
      active: true,
      subscriptions: subscriptionIds || [],
      breakpoints: [],
      logs: [],
      metrics: this.getInitialMetrics()
    }

    this.sessions.set(sessionId, session)
    this.currentSession = session
    
    this.log('info', 'session', `Debug session started: ${name}`, { sessionId, subscriptionIds })
    
    return sessionId
  }

  /**
   * End debug session
   */
  endSession(sessionId: string): DebugReport | null {
    const session = this.sessions.get(sessionId)
    if (!session) return null

    session.endTime = new Date()
    session.active = false
    
    if (this.currentSession?.id === sessionId) {
      this.currentSession = null
    }

    this.log('info', 'session', `Debug session ended: ${session.name}`, { sessionId })
    
    return this.generateReport(sessionId)
  }

  /**
   * Get current session
   */
  getCurrentSession(): DebugSession | null {
    return this.currentSession
  }

  /**
   * Get all sessions
   */
  getAllSessions(): DebugSession[] {
    return Array.from(this.sessions.values())
  }

  /**
   * Add breakpoint
   */
  addBreakpoint(
    type: DebugBreakpoint['type'],
    condition: string,
    sessionId?: string
  ): string {
    const session = sessionId ? this.sessions.get(sessionId) : this.currentSession
    if (!session) throw new Error('No active debug session')

    const breakpoint: DebugBreakpoint = {
      id: this.generateBreakpointId(),
      type,
      condition,
      enabled: true,
      hitCount: 0
    }

    session.breakpoints.push(breakpoint)
    
    this.log('info', 'breakpoint', `Breakpoint added: ${condition}`, { 
      breakpointId: breakpoint.id, 
      type, 
      sessionId: session.id 
    })
    
    return breakpoint.id
  }

  /**
   * Remove breakpoint
   */
  removeBreakpoint(breakpointId: string, sessionId?: string): boolean {
    const session = sessionId ? this.sessions.get(sessionId) : this.currentSession
    if (!session) return false

    const index = session.breakpoints.findIndex(bp => bp.id === breakpointId)
    if (index === -1) return false

    session.breakpoints.splice(index, 1)
    
    this.log('info', 'breakpoint', `Breakpoint removed: ${breakpointId}`, { 
      breakpointId, 
      sessionId: session.id 
    })
    
    return true
  }

  /**
   * Enable/disable breakpoint
   */
  setBreakpointEnabled(breakpointId: string, enabled: boolean, sessionId?: string): boolean {
    const session = sessionId ? this.sessions.get(sessionId) : this.currentSession
    if (!session) return false

    const breakpoint = session.breakpoints.find(bp => bp.id === breakpointId)
    if (!breakpoint) return false

    breakpoint.enabled = enabled
    
    this.log('info', 'breakpoint', `Breakpoint ${enabled ? 'enabled' : 'disabled'}: ${breakpointId}`, { 
      breakpointId, 
      enabled, 
      sessionId: session.id 
    })
    
    return true
  }

  /**
   * Check breakpoint condition
   */
  checkBreakpoint(breakpoint: DebugBreakpoint, context: any): boolean {
    if (!breakpoint.enabled) return false

    try {
      // Simple condition evaluation (in production, use a proper expression parser)
      const result = this.evaluateCondition(breakpoint.condition, context)
      
      if (result) {
        breakpoint.hitCount++
        breakpoint.lastHit = new Date()
        
        this.log('debug', 'breakpoint', `Breakpoint hit: ${breakpoint.condition}`, {
          breakpointId: breakpoint.id,
          hitCount: breakpoint.hitCount,
          context
        })

        // Notify breakpoint callbacks
        this.breakpointCallbacks.forEach(callback => {
          try {
            callback(breakpoint, context)
          } catch (error) {
            console.error('Error in breakpoint callback:', error)
          }
        })
      }
      
      return result
    } catch (error) {
      this.log('error', 'breakpoint', `Breakpoint evaluation error: ${error}`, {
        breakpointId: breakpoint.id,
        condition: breakpoint.condition,
        error
      })
      return false
    }
  }

  /**
   * Get debug logs
   */
  getLogs(filter?: DebugFilter, limit?: number): DebugLog[] {
    let filteredLogs = [...this.logs]

    if (filter) {
      if (filter.level && filter.level.length > 0) {
        filteredLogs = filteredLogs.filter(log => filter.level!.includes(log.level))
      }
      
      if (filter.category && filter.category.length > 0) {
        filteredLogs = filteredLogs.filter(log => filter.category!.includes(log.category))
      }
      
      if (filter.subscriptionId) {
        filteredLogs = filteredLogs.filter(log => log.subscriptionId === filter.subscriptionId)
      }
      
      if (filter.startTime) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.startTime!)
      }
      
      if (filter.endTime) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filter.endTime!)
      }
      
      if (filter.search) {
        const searchLower = filter.search.toLowerCase()
        filteredLogs = filteredLogs.filter(log => 
          log.message.toLowerCase().includes(searchLower) ||
          log.category.toLowerCase().includes(searchLower)
        )
      }
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    
    return limit ? filteredLogs.slice(0, limit) : filteredLogs
  }

  /**
   * Get debug metrics
   */
  getMetrics(): DebugMetrics {
    const subscriptions = subscriptionStateManager.getAllSubscriptions()
    const memoryStats = subscriptionCleanupManager.getMemoryStats()
    const healthMetrics = subscriptionHealthMonitor.getHealthMetrics()
    
    const activeSubscriptions = subscriptions.filter(s => s.status === 'subscribed').length
    const errorSubscriptions = subscriptions.filter(s => s.status === 'error').length
    
    const latencies = subscriptions
      .map(s => s.performance?.averageLatency)
      .filter(Boolean) as number[]
    const averageLatency = latencies.length > 0 
      ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length 
      : 0

    const errorRate = subscriptions.length > 0 
      ? (errorSubscriptions / subscriptions.length) * 100 
      : 0

    return {
      totalSubscriptions: subscriptions.length,
      activeSubscriptions,
      errorSubscriptions,
      memoryUsage: memoryStats.totalMemoryUsage,
      performanceScore: healthMetrics.performanceHealth,
      errorRate,
      averageLatency,
      lastUpdated: new Date()
    }
  }

  /**
   * Generate debug report
   */
  generateReport(sessionId: string): DebugReport | null {
    const session = this.sessions.get(sessionId)
    if (!session) return null

    const subscriptions = subscriptionStateManager.getAllSubscriptions()
    const sessionSubscriptions = session.subscriptions.length > 0 
      ? subscriptions.filter(s => session.subscriptions.includes(s.id))
      : subscriptions

    const errorCount = session.logs.filter(log => log.level === 'error').length
    const performanceIssues = session.logs.filter(log => 
      log.category === 'performance' && log.level === 'warn'
    ).length

    const recommendations: string[] = []
    
    // Generate recommendations based on logs and metrics
    if (errorCount > 10) {
      recommendations.push('High error count detected - investigate error patterns')
    }
    
    if (performanceIssues > 5) {
      recommendations.push('Performance issues detected - optimize subscription filters')
    }
    
    if (session.metrics.errorRate > 20) {
      recommendations.push('High error rate - review retry configuration')
    }

    const subscriptionReports = sessionSubscriptions.map(subscription => {
      const issues: string[] = []
      
      if (subscription.status === 'error') {
        issues.push(`Subscription in error state: ${subscription.error}`)
      }
      
      if (subscription.retryCount > 3) {
        issues.push(`High retry count: ${subscription.retryCount}`)
      }
      
      const lastActivity = subscription.lastActivity || subscription.updatedAt
      const inactiveTime = Date.now() - lastActivity.getTime()
      if (inactiveTime > 300000) { // 5 minutes
        issues.push(`Inactive for ${Math.round(inactiveTime / 1000)}s`)
      }

      return {
        id: subscription.id,
        status: subscription.status,
        issues,
        performance: subscription.performance
      }
    })

    const timeline = session.logs
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .map(log => ({
        timestamp: log.timestamp,
        event: `${log.level.toUpperCase()}: ${log.category}`,
        data: {
          message: log.message,
          subscriptionId: log.subscriptionId,
          ...log.data
        }
      }))

    return {
      sessionId,
      generatedAt: new Date(),
      summary: {
        totalEvents: session.logs.length,
        errorCount,
        performanceIssues,
        recommendations
      },
      subscriptions: subscriptionReports,
      timeline,
      metrics: session.metrics
    }
  }

  /**
   * Log debug message
   */
  log(
    level: DebugLog['level'],
    category: string,
    message: string,
    data?: any,
    subscriptionId?: string
  ): void {
    const log: DebugLog = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      subscriptionId
    }

    this.logs.push(log)
    
    // Keep logs within current session
    if (this.currentSession) {
      this.currentSession.logs.push(log)
    }

    // Keep only last 10000 logs
    if (this.logs.length > 10000) {
      this.logs = this.logs.slice(-10000)
    }

    // Notify callbacks
    this.callbacks.forEach(callback => {
      try {
        callback(log)
      } catch (error) {
        console.error('Error in debug callback:', error)
      }
    })

    // Check breakpoints
    if (this.currentSession) {
      this.currentSession.breakpoints.forEach(breakpoint => {
        if (breakpoint.type === 'subscription' || 
            (breakpoint.type === 'event' && category === 'event') ||
            (breakpoint.type === 'error' && level === 'error') ||
            (breakpoint.type === 'performance' && category === 'performance')) {
          this.checkBreakpoint(breakpoint, { log, subscriptionId })
        }
      })
    }
  }

  /**
   * Start logging
   */
  private startLogging(): void {
    this.logTimer = setInterval(() => {
      // Log periodic metrics
      const metrics = this.getMetrics()
      this.log('debug', 'metrics', 'Periodic metrics update', metrics)
    }, 30000) // Every 30 seconds
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(() => {
      const metrics = this.getMetrics()
      
      if (this.currentSession) {
        this.currentSession.metrics = metrics
      }
    }, 10000) // Every 10 seconds
  }

  /**
   * Evaluate breakpoint condition
   */
  private evaluateCondition(condition: string, context: any): boolean {
    // Simple condition evaluation (in production, use a proper expression parser)
    try {
      // Replace variables in condition with context values
      let evaluatedCondition = condition
      
      // Replace common variables
      evaluatedCondition = evaluatedCondition.replace(/\$subscriptionId/g, context.subscriptionId || '')
      evaluatedCondition = evaluatedCondition.replace(/\$level/g, context.log?.level || '')
      evaluatedCondition = evaluatedCondition.replace(/\$category/g, context.log?.category || '')
      evaluatedCondition = evaluatedCondition.replace(/\$message/g, context.log?.message || '')
      
      // Evaluate simple expressions
      if (evaluatedCondition.includes('===')) {
        const [left, right] = evaluatedCondition.split('===')
        return left.trim() === right.trim()
      }
      
      if (evaluatedCondition.includes('!==')) {
        const [left, right] = evaluatedCondition.split('!==')
        return left.trim() !== right.trim()
      }
      
      if (evaluatedCondition.includes('>')) {
        const [left, right] = evaluatedCondition.split('>')
        return Number(left.trim()) > Number(right.trim())
      }
      
      if (evaluatedCondition.includes('<')) {
        const [left, right] = evaluatedCondition.split('<')
        return Number(left.trim()) < Number(right.trim())
      }
      
      // Simple boolean evaluation
      if (evaluatedCondition.toLowerCase() === 'true') return true
      if (evaluatedCondition.toLowerCase() === 'false') return false
      
      return false
    } catch (error) {
      console.error('Error evaluating condition:', error)
      return false
    }
  }

  /**
   * Get initial metrics
   */
  private getInitialMetrics(): DebugMetrics {
    return {
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      errorSubscriptions: 0,
      memoryUsage: 0,
      performanceScore: 100,
      errorRate: 0,
      averageLatency: 0,
      lastUpdated: new Date()
    }
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `debug_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate breakpoint ID
   */
  private generateBreakpointId(): string {
    return `breakpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate log ID
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Register debug callback
   */
  onLog(callback: DebugCallback): () => void {
    this.callbacks.add(callback)
    return () => this.callbacks.delete(callback)
  }

  /**
   * Register breakpoint callback
   */
  onBreakpoint(callback: BreakpointCallback): () => void {
    this.breakpointCallbacks.add(callback)
    return () => this.breakpointCallbacks.delete(callback)
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = []
    if (this.currentSession) {
      this.currentSession.logs = []
    }
  }

  /**
   * Export debug data
   */
  exportDebugData(sessionId?: string): {
    sessions: DebugSession[]
    logs: DebugLog[]
    metrics: DebugMetrics
  } {
    const sessions = sessionId 
      ? [this.sessions.get(sessionId)].filter(Boolean) as DebugSession[]
      : Array.from(this.sessions.values())
    
    return {
      sessions,
      logs: [...this.logs],
      metrics: this.getMetrics()
    }
  }

  /**
   * Stop debugger
   */
  stop(): void {
    if (this.logTimer) {
      clearInterval(this.logTimer)
      this.logTimer = undefined
    }
    
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer)
      this.metricsTimer = undefined
    }
    
    this.callbacks.clear()
    this.breakpointCallbacks.clear()
  }
}

// Export singleton instance
export const subscriptionDebugger = new SubscriptionDebugger()
