/**
 * Subscription Health Monitor
 * Monitors subscription health, performance, and provides health checks
 */

import { subscriptionStateManager, SubscriptionState } from './subscription-state-manager'
import { subscriptionCleanupManager } from './subscription-cleanup-manager'
import { subscriptionRetryManager } from './subscription-retry-manager'

export interface HealthCheck {
  id: string
  name: string
  status: 'healthy' | 'warning' | 'critical' | 'unknown'
  message: string
  timestamp: Date
  metrics?: any
  recommendations?: string[]
}

export interface HealthMetrics {
  overallHealth: 'healthy' | 'warning' | 'critical'
  subscriptionHealth: number // 0-100
  connectionHealth: number // 0-100
  performanceHealth: number // 0-100
  memoryHealth: number // 0-100
  errorRate: number // percentage
  averageLatency: number // ms
  activeSubscriptions: number
  failedSubscriptions: number
  memoryUsage: number // bytes
  lastUpdated: Date
}

export interface HealthAlert {
  id: string
  type: 'warning' | 'critical' | 'info'
  title: string
  message: string
  subscriptionId?: string
  timestamp: Date
  resolved: boolean
  resolvedAt?: Date
  metadata?: any
}

export interface HealthThresholds {
  maxErrorRate: number // percentage
  maxLatency: number // ms
  maxMemoryUsage: number // bytes
  maxFailedSubscriptions: number
  minActiveSubscriptions: number
  maxInactiveTime: number // ms
}

export type HealthCheckCallback = (check: HealthCheck) => void
export type HealthAlertCallback = (alert: HealthAlert) => void

export class SubscriptionHealthMonitor {
  private healthChecks: Map<string, HealthCheck> = new Map()
  private alerts: HealthAlert[] = []
  private thresholds: HealthThresholds = {
    maxErrorRate: 10, // 10%
    maxLatency: 1000, // 1 second
    maxMemoryUsage: 50 * 1024 * 1024, // 50MB
    maxFailedSubscriptions: 5,
    minActiveSubscriptions: 1,
    maxInactiveTime: 5 * 60 * 1000 // 5 minutes
  }
  
  private checkTimer?: NodeJS.Timeout
  private healthCallbacks: Set<HealthCheckCallback> = new Set()
  private alertCallbacks: Set<HealthAlertCallback> = new Set()
  
  private checkInterval = 30000 // 30 seconds

  constructor() {
    this.startHealthMonitoring()
  }

  /**
   * Update health thresholds
   */
  updateThresholds(newThresholds: Partial<HealthThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds }
  }

  /**
   * Get current thresholds
   */
  getThresholds(): HealthThresholds {
    return { ...this.thresholds }
  }

  /**
   * Get health metrics
   */
  getHealthMetrics(): HealthMetrics {
    const subscriptions = subscriptionStateManager.getAllSubscriptions()
    const activeSubscriptions = subscriptions.filter(s => s.status === 'subscribed')
    const failedSubscriptions = subscriptions.filter(s => s.status === 'error')
    const memoryStats = subscriptionCleanupManager.getMemoryStats()
    const retryStats = subscriptionRetryManager.getRetryStats()

    // Calculate health scores
    const subscriptionHealth = this.calculateSubscriptionHealth(activeSubscriptions, failedSubscriptions)
    const connectionHealth = this.calculateConnectionHealth(subscriptions)
    const performanceHealth = this.calculatePerformanceHealth(subscriptions, retryStats)
    const memoryHealth = this.calculateMemoryHealth(memoryStats)

    // Calculate error rate
    const errorRate = subscriptions.length > 0 
      ? (failedSubscriptions.length / subscriptions.length) * 100 
      : 0

    // Calculate average latency
    const latencies = subscriptions
      .map(s => s.performance?.averageLatency)
      .filter(Boolean) as number[]
    const averageLatency = latencies.length > 0 
      ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length 
      : 0

    // Determine overall health
    const overallHealth = this.determineOverallHealth(
      subscriptionHealth, connectionHealth, performanceHealth, memoryHealth
    )

    return {
      overallHealth,
      subscriptionHealth,
      connectionHealth,
      performanceHealth,
      memoryHealth,
      errorRate,
      averageLatency,
      activeSubscriptions: activeSubscriptions.length,
      failedSubscriptions: failedSubscriptions.length,
      memoryUsage: memoryStats.totalMemoryUsage,
      lastUpdated: new Date()
    }
  }

  /**
   * Get all health checks
   */
  getHealthChecks(): HealthCheck[] {
    return Array.from(this.healthChecks.values())
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): HealthAlert[] {
    return this.alerts.filter(alert => !alert.resolved)
  }

  /**
   * Get all alerts
   */
  getAllAlerts(limit?: number): HealthAlert[] {
    const sortedAlerts = [...this.alerts].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    return limit ? sortedAlerts.slice(0, limit) : sortedAlerts
  }

  /**
   * Run health checks
   */
  async runHealthChecks(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = []

    // Subscription status check
    checks.push(await this.checkSubscriptionStatus())
    
    // Connection health check
    checks.push(await this.checkConnectionHealth())
    
    // Performance check
    checks.push(await this.checkPerformance())
    
    // Memory usage check
    checks.push(await this.checkMemoryUsage())
    
    // Error rate check
    checks.push(await this.checkErrorRate())
    
    // Latency check
    checks.push(await this.checkLatency())
    
    // Retry health check
    checks.push(await this.checkRetryHealth())

    // Store checks
    checks.forEach(check => {
      this.healthChecks.set(check.id, check)
    })

    // Process alerts
    await this.processAlerts(checks)

    // Notify callbacks
    checks.forEach(check => {
      this.notifyHealthCallbacks(check)
    })

    return checks
  }

  /**
   * Check subscription status
   */
  private async checkSubscriptionStatus(): Promise<HealthCheck> {
    const subscriptions = subscriptionStateManager.getAllSubscriptions()
    const activeSubscriptions = subscriptions.filter(s => s.status === 'subscribed')
    const failedSubscriptions = subscriptions.filter(s => s.status === 'error')
    
    let status: HealthCheck['status'] = 'healthy'
    let message = `Active: ${activeSubscriptions.length}, Failed: ${failedSubscriptions.length}`
    const recommendations: string[] = []

    if (activeSubscriptions.length < this.thresholds.minActiveSubscriptions) {
      status = 'critical'
      message = `Too few active subscriptions: ${activeSubscriptions.length}`
      recommendations.push('Check subscription creation and connection status')
    } else if (failedSubscriptions.length > this.thresholds.maxFailedSubscriptions) {
      status = 'warning'
      message = `Too many failed subscriptions: ${failedSubscriptions.length}`
      recommendations.push('Investigate subscription errors and retry mechanisms')
    }

    return {
      id: 'subscription_status',
      name: 'Subscription Status',
      status,
      message,
      timestamp: new Date(),
      metrics: {
        total: subscriptions.length,
        active: activeSubscriptions.length,
        failed: failedSubscriptions.length,
        pending: subscriptions.filter(s => s.status === 'pending').length
      },
      recommendations
    }
  }

  /**
   * Check connection health
   */
  private async checkConnectionHealth(): Promise<HealthCheck> {
    const subscriptions = subscriptionStateManager.getAllSubscriptions()
    const inactiveSubscriptions = subscriptions.filter(s => {
      const lastActivity = s.lastActivity || s.updatedAt
      const inactiveTime = Date.now() - lastActivity.getTime()
      return inactiveTime > this.thresholds.maxInactiveTime
    })

    let status: HealthCheck['status'] = 'healthy'
    let message = `All subscriptions are active`
    const recommendations: string[] = []

    if (inactiveSubscriptions.length > 0) {
      status = 'warning'
      message = `${inactiveSubscriptions.length} subscriptions are inactive`
      recommendations.push('Check connection status and network connectivity')
    }

    return {
      id: 'connection_health',
      name: 'Connection Health',
      status,
      message,
      timestamp: new Date(),
      metrics: {
        inactiveCount: inactiveSubscriptions.length,
        maxInactiveTime: this.thresholds.maxInactiveTime
      },
      recommendations
    }
  }

  /**
   * Check performance
   */
  private async checkPerformance(): Promise<HealthCheck> {
    const retryStats = subscriptionRetryManager.getRetryStats()
    const subscriptions = subscriptionStateManager.getAllSubscriptions()
    
    const avgLatency = subscriptions
      .map(s => s.performance?.averageLatency)
      .filter(Boolean)
      .reduce((sum, l, _, arr) => sum + l / arr.length, 0)

    let status: HealthCheck['status'] = 'healthy'
    let message = `Average latency: ${avgLatency.toFixed(2)}ms`
    const recommendations: string[] = []

    if (avgLatency > this.thresholds.maxLatency) {
      status = 'warning'
      message = `High latency: ${avgLatency.toFixed(2)}ms`
      recommendations.push('Check network conditions and server performance')
    }

    if (retryStats.retrySuccessRate < 50 && retryStats.totalRetries > 5) {
      status = status === 'warning' ? 'critical' : 'warning'
      message += `, Low retry success rate: ${retryStats.retrySuccessRate.toFixed(1)}%`
      recommendations.push('Review retry configuration and error handling')
    }

    return {
      id: 'performance',
      name: 'Performance',
      status,
      message,
      timestamp: new Date(),
      metrics: {
        averageLatency: avgLatency,
        retrySuccessRate: retryStats.retrySuccessRate,
        totalRetries: retryStats.totalRetries
      },
      recommendations
    }
  }

  /**
   * Check memory usage
   */
  private async checkMemoryUsage(): Promise<HealthCheck> {
    const memoryStats = subscriptionCleanupManager.getMemoryStats()
    
    let status: HealthCheck['status'] = 'healthy'
    let message = `Memory usage: ${(memoryStats.totalMemoryUsage / 1024 / 1024).toFixed(2)}MB`
    const recommendations: string[] = []

    if (memoryStats.totalMemoryUsage > this.thresholds.maxMemoryUsage) {
      status = 'warning'
      message = `High memory usage: ${(memoryStats.totalMemoryUsage / 1024 / 1024).toFixed(2)}MB`
      recommendations.push('Consider running cleanup or reducing subscription count')
    }

    if (memoryStats.memoryLeaks > 5) {
      status = 'critical'
      message += `, Potential memory leaks detected: ${memoryStats.memoryLeaks}`
      recommendations.push('Investigate memory leak sources and restart if necessary')
    }

    return {
      id: 'memory_usage',
      name: 'Memory Usage',
      status,
      message,
      timestamp: new Date(),
      metrics: memoryStats,
      recommendations
    }
  }

  /**
   * Check error rate
   */
  private async checkErrorRate(): Promise<HealthCheck> {
    const subscriptions = subscriptionStateManager.getAllSubscriptions()
    const errorRate = subscriptions.length > 0 
      ? (subscriptions.filter(s => s.status === 'error').length / subscriptions.length) * 100 
      : 0

    let status: HealthCheck['status'] = 'healthy'
    let message = `Error rate: ${errorRate.toFixed(2)}%`
    const recommendations: string[] = []

    if (errorRate > this.thresholds.maxErrorRate) {
      status = 'critical'
      message = `High error rate: ${errorRate.toFixed(2)}%`
      recommendations.push('Investigate error patterns and improve error handling')
    }

    return {
      id: 'error_rate',
      name: 'Error Rate',
      status,
      message,
      timestamp: new Date(),
      metrics: {
        errorRate,
        maxErrorRate: this.thresholds.maxErrorRate,
        totalSubscriptions: subscriptions.length,
        errorSubscriptions: subscriptions.filter(s => s.status === 'error').length
      },
      recommendations
    }
  }

  /**
   * Check latency
   */
  private async checkLatency(): Promise<HealthCheck> {
    const subscriptions = subscriptionStateManager.getAllSubscriptions()
    const latencies = subscriptions
      .map(s => s.performance?.averageLatency)
      .filter(Boolean) as number[]

    if (latencies.length === 0) {
      return {
        id: 'latency',
        name: 'Latency',
        status: 'unknown',
        message: 'No latency data available',
        timestamp: new Date()
      }
    }

    const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length
    const maxLatency = Math.max(...latencies)

    let status: HealthCheck['status'] = 'healthy'
    let message = `Average: ${avgLatency.toFixed(2)}ms, Max: ${maxLatency.toFixed(2)}ms`
    const recommendations: string[] = []

    if (maxLatency > this.thresholds.maxLatency) {
      status = 'warning'
      message = `High latency detected: Max ${maxLatency.toFixed(2)}ms`
      recommendations.push('Check network conditions and optimize subscription filters')
    }

    return {
      id: 'latency',
      name: 'Latency',
      status,
      message,
      timestamp: new Date(),
      metrics: {
        averageLatency: avgLatency,
        maxLatency,
        minLatency: Math.min(...latencies),
        subscriptionCount: latencies.length
      },
      recommendations
    }
  }

  /**
   * Check retry health
   */
  private async checkRetryHealth(): Promise<HealthCheck> {
    const retryStats = subscriptionRetryManager.getRetryStats()
    const pendingRetries = subscriptionRetryManager.getPendingRetries()

    let status: HealthCheck['status'] = 'healthy'
    let message = `Retry success rate: ${retryStats.retrySuccessRate.toFixed(1)}%`
    const recommendations: string[] = []

    if (retryStats.retrySuccessRate < 50 && retryStats.totalRetries > 5) {
      status = 'warning'
      message = `Low retry success rate: ${retryStats.retrySuccessRate.toFixed(1)}%`
      recommendations.push('Review retry configuration and error patterns')
    }

    if (pendingRetries.length > 10) {
      status = status === 'warning' ? 'critical' : 'warning'
      message += `, High pending retries: ${pendingRetries.length}`
      recommendations.push('Investigate recurring errors and improve error handling')
    }

    return {
      id: 'retry_health',
      name: 'Retry Health',
      status,
      message,
      timestamp: new Date(),
      metrics: {
        ...retryStats,
        pendingRetries: pendingRetries.length
      },
      recommendations
    }
  }

  /**
   * Process health alerts
   */
  private async processAlerts(checks: HealthCheck[]): Promise<void> {
    for (const check of checks) {
      if (check.status === 'critical' || check.status === 'warning') {
        const existingAlert = this.alerts.find(
          alert => alert.type === (check.status === 'critical' ? 'critical' : 'warning') &&
                   !alert.resolved &&
                   alert.title.includes(check.name)
        )

        if (!existingAlert) {
          const alert: HealthAlert = {
            id: `alert_${check.id}_${Date.now()}`,
            type: check.status === 'critical' ? 'critical' : 'warning',
            title: `${check.name} - ${check.status.toUpperCase()}`,
            message: check.message,
            timestamp: new Date(),
            resolved: false,
            metadata: {
              checkId: check.id,
              recommendations: check.recommendations
            }
          }

          this.alerts.push(alert)
          this.notifyAlertCallbacks(alert)
        }
      }
    }
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert && !alert.resolved) {
      alert.resolved = true
      alert.resolvedAt = new Date()
      return true
    }
    return false
  }

  /**
   * Calculate subscription health score
   */
  private calculateSubscriptionHealth(active: SubscriptionState[], failed: SubscriptionState[]): number {
    const total = active.length + failed.length
    if (total === 0) return 100
    
    const successRate = (active.length / total) * 100
    return Math.max(0, successRate)
  }

  /**
   * Calculate connection health score
   */
  private calculateConnectionHealth(subscriptions: SubscriptionState[]): number {
    if (subscriptions.length === 0) return 100
    
    const activeSubscriptions = subscriptions.filter(s => s.status === 'subscribed')
    const recentActivity = subscriptions.filter(s => {
      const lastActivity = s.lastActivity || s.updatedAt
      const inactiveTime = Date.now() - lastActivity.getTime()
      return inactiveTime < this.thresholds.maxInactiveTime
    })
    
    const activityScore = (recentActivity.length / subscriptions.length) * 100
    const connectionScore = (activeSubscriptions.length / subscriptions.length) * 100
    
    return (activityScore + connectionScore) / 2
  }

  /**
   * Calculate performance health score
   */
  private calculatePerformanceHealth(subscriptions: SubscriptionState[], retryStats: any): number {
    const latencies = subscriptions
      .map(s => s.performance?.averageLatency)
      .filter(Boolean) as number[]
    
    if (latencies.length === 0) return 100
    
    const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length
    const latencyScore = Math.max(0, 100 - (avgLatency / this.thresholds.maxLatency) * 100)
    const retryScore = Math.max(0, retryStats.retrySuccessRate || 100)
    
    return (latencyScore + retryScore) / 2
  }

  /**
   * Calculate memory health score
   */
  private calculateMemoryHealth(memoryStats: any): number {
    const usageRatio = memoryStats.totalMemoryUsage / this.thresholds.maxMemoryUsage
    const baseScore = Math.max(0, 100 - (usageRatio * 100))
    
    // Penalize for memory leaks
    const leakPenalty = Math.min(20, memoryStats.memoryLeaks * 4)
    
    return Math.max(0, baseScore - leakPenalty)
  }

  /**
   * Determine overall health
   */
  private determineOverallHealth(
    subscriptionHealth: number,
    connectionHealth: number,
    performanceHealth: number,
    memoryHealth: number
  ): 'healthy' | 'warning' | 'critical' {
    const avgHealth = (subscriptionHealth + connectionHealth + performanceHealth + memoryHealth) / 4
    
    if (avgHealth < 50) return 'critical'
    if (avgHealth < 80) return 'warning'
    return 'healthy'
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.checkTimer = setInterval(async () => {
      await this.runHealthChecks()
    }, this.checkInterval)
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer)
      this.checkTimer = undefined
    }
    
    this.healthCallbacks.clear()
    this.alertCallbacks.clear()
  }

  /**
   * Register health check callback
   */
  onHealthCheck(callback: HealthCheckCallback): () => void {
    this.healthCallbacks.add(callback)
    return () => this.healthCallbacks.delete(callback)
  }

  /**
   * Register alert callback
   */
  onAlert(callback: HealthAlertCallback): () => void {
    this.alertCallbacks.add(callback)
    return () => this.alertCallbacks.delete(callback)
  }

  /**
   * Notify health check callbacks
   */
  private notifyHealthCallbacks(check: HealthCheck): void {
    this.healthCallbacks.forEach(callback => {
      try {
        callback(check)
      } catch (error) {
        console.error('Error in health check callback:', error)
      }
    })
  }

  /**
   * Notify alert callbacks
   */
  private notifyAlertCallbacks(alert: HealthAlert): void {
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert)
      } catch (error) {
        console.error('Error in alert callback:', error)
      }
    })
  }
}

// Export singleton instance
export const subscriptionHealthMonitor = new SubscriptionHealthMonitor()
