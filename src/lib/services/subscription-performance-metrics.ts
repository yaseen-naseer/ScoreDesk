/**
 * Subscription Performance Metrics
 * Detailed performance tracking and metrics collection for subscriptions
 */

import { subscriptionStateManager, SubscriptionState } from './subscription-state-manager'
import { subscriptionHealthMonitor } from './subscription-health-monitor'

export interface PerformanceMetric {
  id: string
  name: string
  value: number
  unit: string
  timestamp: Date
  subscriptionId?: string
  metadata?: {
    category?: string
    tags?: string[]
    threshold?: number
    severity?: 'low' | 'medium' | 'high' | 'critical'
  }
}

export interface PerformanceSnapshot {
  timestamp: Date
  subscriptionId: string
  metrics: {
    latency: {
      average: number
      min: number
      max: number
      p95: number
      p99: number
    }
    throughput: {
      messagesPerSecond: number
      bytesPerSecond: number
      peakMessagesPerSecond: number
    }
    reliability: {
      successRate: number
      errorRate: number
      retryRate: number
      uptime: number
    }
    resource: {
      memoryUsage: number
      cpuUsage: number
      bandwidthUsage: number
      connectionCount: number
    }
  }
}

export interface PerformanceAlert {
  id: string
  subscriptionId: string
  metricName: string
  threshold: number
  actualValue: number
  severity: 'warning' | 'critical'
  timestamp: Date
  message: string
  resolved: boolean
  resolvedAt?: Date
}

export interface PerformanceReport {
  subscriptionId: string
  timeRange: {
    start: Date
    end: Date
  }
  summary: {
    averageLatency: number
    totalMessages: number
    errorRate: number
    uptime: number
    performanceScore: number
  }
  trends: {
    latencyTrend: 'improving' | 'degrading' | 'stable'
    throughputTrend: 'increasing' | 'decreasing' | 'stable'
    reliabilityTrend: 'improving' | 'degrading' | 'stable'
  }
  alerts: PerformanceAlert[]
  recommendations: string[]
}

export interface PerformanceThresholds {
  latency: {
    warning: number // ms
    critical: number // ms
  }
  throughput: {
    warning: number // messages/sec
    critical: number // messages/sec
  }
  errorRate: {
    warning: number // percentage
    critical: number // percentage
  }
  memoryUsage: {
    warning: number // bytes
    critical: number // bytes
  }
}

export type PerformanceCallback = (metric: PerformanceMetric) => void
export type AlertCallback = (alert: PerformanceAlert) => void

export class SubscriptionPerformanceMetrics {
  private metrics: PerformanceMetric[] = []
  private snapshots: PerformanceSnapshot[] = []
  private alerts: PerformanceAlert[] = []
  private thresholds: PerformanceThresholds = {
    latency: {
      warning: 500,
      critical: 1000
    },
    throughput: {
      warning: 10,
      critical: 5
    },
    errorRate: {
      warning: 5,
      critical: 10
    },
    memoryUsage: {
      warning: 25 * 1024 * 1024, // 25MB
      critical: 50 * 1024 * 1024  // 50MB
    }
  }

  private callbacks: Set<PerformanceCallback> = new Set()
  private alertCallbacks: Set<AlertCallback> = new Set()
  private collectionTimer?: NodeJS.Timeout

  constructor() {
    this.startMetricsCollection()
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds }
  }

  /**
   * Get current thresholds
   */
  getThresholds(): PerformanceThresholds {
    return { ...this.thresholds }
  }

  /**
   * Record performance metric
   */
  recordMetric(
    name: string,
    value: number,
    unit: string,
    subscriptionId?: string,
    metadata?: PerformanceMetric['metadata']
  ): void {
    const metric: PerformanceMetric = {
      id: this.generateMetricId(),
      name,
      value,
      unit,
      timestamp: new Date(),
      subscriptionId,
      metadata
    }

    this.metrics.push(metric)

    // Check thresholds and generate alerts
    this.checkThresholds(metric)

    // Notify callbacks
    this.notifyCallbacks(metric)

    // Keep metrics within limit
    if (this.metrics.length > 10000) {
      this.metrics = this.metrics.slice(-10000)
    }
  }

  /**
   * Record performance snapshot
   */
  recordSnapshot(subscriptionId: string): void {
    const subscription = subscriptionStateManager.getSubscriptionState(subscriptionId)
    if (!subscription || !subscription.performance) return

    const now = Date.now()
    const createdTime = subscription.createdAt.getTime()
    const uptime = subscription.status === 'subscribed' 
      ? ((now - createdTime) / (now - createdTime)) * 100
      : ((subscription.lastActivity?.getTime() || subscription.updatedAt.getTime()) - createdTime) / (now - createdTime) * 100

    const snapshot: PerformanceSnapshot = {
      timestamp: new Date(),
      subscriptionId,
      metrics: {
        latency: {
          average: subscription.performance.averageLatency || 0,
          min: subscription.performance.averageLatency || 0,
          max: subscription.performance.averageLatency || 0,
          p95: subscription.performance.averageLatency || 0,
          p99: subscription.performance.averageLatency || 0
        },
        throughput: {
          messagesPerSecond: this.calculateMessagesPerSecond(subscription),
          bytesPerSecond: this.calculateBytesPerSecond(subscription),
          peakMessagesPerSecond: this.calculatePeakMessagesPerSecond(subscription)
        },
        reliability: {
          successRate: this.calculateSuccessRate(subscription),
          errorRate: this.calculateErrorRate(subscription),
          retryRate: this.calculateRetryRate(subscription),
          uptime
        },
        resource: {
          memoryUsage: this.estimateMemoryUsage(subscription),
          cpuUsage: 0, // Would need system metrics
          bandwidthUsage: subscription.performance.bandwidth || 0,
          connectionCount: 1
        }
      }
    }

    this.snapshots.push(snapshot)

    // Keep snapshots within limit
    if (this.snapshots.length > 1000) {
      this.snapshots = this.snapshots.slice(-1000)
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(filter?: {
    subscriptionId?: string
    name?: string
    startTime?: Date
    endTime?: Date
    limit?: number
  }): PerformanceMetric[] {
    let filteredMetrics = [...this.metrics]

    if (filter) {
      if (filter.subscriptionId) {
        filteredMetrics = filteredMetrics.filter(m => m.subscriptionId === filter.subscriptionId)
      }
      
      if (filter.name) {
        filteredMetrics = filteredMetrics.filter(m => m.name === filter.name)
      }
      
      if (filter.startTime) {
        filteredMetrics = filteredMetrics.filter(m => m.timestamp >= filter.startTime!)
      }
      
      if (filter.endTime) {
        filteredMetrics = filteredMetrics.filter(m => m.timestamp <= filter.endTime!)
      }
    }

    // Sort by timestamp (newest first)
    filteredMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    
    return filter?.limit ? filteredMetrics.slice(0, filter.limit) : filteredMetrics
  }

  /**
   * Get performance snapshots
   */
  getSnapshots(filter?: {
    subscriptionId?: string
    startTime?: Date
    endTime?: Date
    limit?: number
  }): PerformanceSnapshot[] {
    let filteredSnapshots = [...this.snapshots]

    if (filter) {
      if (filter.subscriptionId) {
        filteredSnapshots = filteredSnapshots.filter(s => s.subscriptionId === filter.subscriptionId)
      }
      
      if (filter.startTime) {
        filteredSnapshots = filteredSnapshots.filter(s => s.timestamp >= filter.startTime!)
      }
      
      if (filter.endTime) {
        filteredSnapshots = filteredSnapshots.filter(s => s.timestamp <= filter.endTime!)
      }
    }

    // Sort by timestamp (newest first)
    filteredSnapshots.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    
    return filter?.limit ? filteredSnapshots.slice(0, filter.limit) : filteredSnapshots
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved)
  }

  /**
   * Get all alerts
   */
  getAllAlerts(limit?: number): PerformanceAlert[] {
    const sortedAlerts = [...this.alerts].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    return limit ? sortedAlerts.slice(0, limit) : sortedAlerts
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
   * Generate performance report
   */
  generateReport(
    subscriptionId: string,
    timeRange: { start: Date; end: Date }
  ): PerformanceReport | null {
    const subscription = subscriptionStateManager.getSubscriptionState(subscriptionId)
    if (!subscription) return null

    const snapshots = this.getSnapshots({
      subscriptionId,
      startTime: timeRange.start,
      endTime: timeRange.end
    })

    if (snapshots.length === 0) return null

    const metrics = snapshots.reduce((acc, snapshot) => {
      acc.latency.push(snapshot.metrics.latency.average)
      acc.throughput.push(snapshot.metrics.throughput.messagesPerSecond)
      acc.reliability.push(snapshot.metrics.reliability.successRate)
      return acc
    }, {
      latency: [] as number[],
      throughput: [] as number[],
      reliability: [] as number[]
    })

    const averageLatency = metrics.latency.reduce((sum, l) => sum + l, 0) / metrics.latency.length
    const totalMessages = subscription.performance?.messageCount || 0
    const errorRate = this.calculateErrorRate(subscription)
    const uptime = metrics.reliability.reduce((sum, r) => sum + r, 0) / metrics.reliability.length
    const performanceScore = this.calculatePerformanceScore(averageLatency, errorRate, uptime)

    const trends = {
      latencyTrend: this.calculateTrend(metrics.latency),
      throughputTrend: this.calculateTrend(metrics.throughput),
      reliabilityTrend: this.calculateTrend(metrics.reliability)
    }

    const alerts = this.alerts.filter(alert => 
      alert.subscriptionId === subscriptionId && 
      alert.timestamp >= timeRange.start && 
      alert.timestamp <= timeRange.end
    )

    const recommendations = this.generateRecommendations(subscription, snapshots)

    return {
      subscriptionId,
      timeRange,
      summary: {
        averageLatency,
        totalMessages,
        errorRate,
        uptime,
        performanceScore
      },
      trends,
      alerts,
      recommendations
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStatistics(subscriptionId?: string): {
    totalMetrics: number
    totalSnapshots: number
    activeAlerts: number
    averageLatency: number
    totalMessages: number
    errorRate: number
  } {
    const subscriptions = subscriptionId 
      ? [subscriptionStateManager.getSubscriptionState(subscriptionId)].filter(Boolean) as SubscriptionState[]
      : subscriptionStateManager.getAllSubscriptions()

    const relevantMetrics = subscriptionId 
      ? this.metrics.filter(m => m.subscriptionId === subscriptionId)
      : this.metrics

    const relevantSnapshots = subscriptionId 
      ? this.snapshots.filter(s => s.subscriptionId === subscriptionId)
      : this.snapshots

    const activeAlerts = this.alerts.filter(alert => 
      !alert.resolved && (subscriptionId ? alert.subscriptionId === subscriptionId : true)
    )

    const latencies = relevantMetrics
      .filter(m => m.name === 'latency')
      .map(m => m.value)

    const averageLatency = latencies.length > 0 
      ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length 
      : 0

    const totalMessages = subscriptions.reduce(
      (sum, s) => sum + (s.performance?.messageCount || 0), 0
    )

    const errorRate = subscriptions.length > 0 
      ? subscriptions.reduce((sum, s) => sum + (s.performance?.errorCount || 0), 0) / 
        subscriptions.reduce((sum, s) => sum + (s.performance?.messageCount || 0), 1) * 100
      : 0

    return {
      totalMetrics: relevantMetrics.length,
      totalSnapshots: relevantSnapshots.length,
      activeAlerts: activeAlerts.length,
      averageLatency,
      totalMessages,
      errorRate
    }
  }

  /**
   * Check thresholds and generate alerts
   */
  private checkThresholds(metric: PerformanceMetric): void {
    const threshold = this.getThresholdForMetric(metric.name)
    if (!threshold) return

    let severity: 'warning' | 'critical' = 'warning'
    let thresholdValue = threshold.warning

    if (metric.value >= threshold.critical) {
      severity = 'critical'
      thresholdValue = threshold.critical
    } else if (metric.value < threshold.warning) {
      return // No alert needed
    }

    // Check if alert already exists
    const existingAlert = this.alerts.find(alert => 
      alert.subscriptionId === metric.subscriptionId &&
      alert.metricName === metric.name &&
      !alert.resolved &&
      alert.severity === severity
    )

    if (!existingAlert) {
      const alert: PerformanceAlert = {
        id: this.generateAlertId(),
        subscriptionId: metric.subscriptionId || '',
        metricName: metric.name,
        threshold: thresholdValue,
        actualValue: metric.value,
        severity,
        timestamp: new Date(),
        message: `${metric.name} exceeded ${severity} threshold: ${metric.value}${metric.unit} (threshold: ${thresholdValue}${metric.unit})`,
        resolved: false
      }

      this.alerts.push(alert)
      this.notifyAlertCallbacks(alert)
    }
  }

  /**
   * Get threshold for metric
   */
  private getThresholdForMetric(metricName: string): { warning: number; critical: number } | null {
    switch (metricName.toLowerCase()) {
      case 'latency':
        return this.thresholds.latency
      case 'throughput':
        return this.thresholds.throughput
      case 'error_rate':
        return this.thresholds.errorRate
      case 'memory_usage':
        return this.thresholds.memoryUsage
      default:
        return null
    }
  }

  /**
   * Calculate messages per second
   */
  private calculateMessagesPerSecond(subscription: SubscriptionState): number {
    if (!subscription.performance) return 0
    
    const uptimeMs = Date.now() - subscription.createdAt.getTime()
    const uptimeSeconds = uptimeMs / 1000
    
    return uptimeSeconds > 0 ? subscription.performance.messageCount / uptimeSeconds : 0
  }

  /**
   * Calculate bytes per second
   */
  private calculateBytesPerSecond(subscription: SubscriptionState): number {
    // Simplified calculation - would need actual byte tracking
    return this.calculateMessagesPerSecond(subscription) * 1024 // Assume 1KB per message
  }

  /**
   * Calculate peak messages per second
   */
  private calculatePeakMessagesPerSecond(subscription: SubscriptionState): number {
    // Simplified calculation - would need time-series data
    return this.calculateMessagesPerSecond(subscription) * 1.5
  }

  /**
   * Calculate success rate
   */
  private calculateSuccessRate(subscription: SubscriptionState): number {
    if (!subscription.performance) return 100
    
    const total = subscription.performance.messageCount + subscription.performance.errorCount
    return total > 0 ? (subscription.performance.messageCount / total) * 100 : 100
  }

  /**
   * Calculate error rate
   */
  private calculateErrorRate(subscription: SubscriptionState): number {
    if (!subscription.performance) return 0
    
    const total = subscription.performance.messageCount + subscription.performance.errorCount
    return total > 0 ? (subscription.performance.errorCount / total) * 100 : 0
  }

  /**
   * Calculate retry rate
   */
  private calculateRetryRate(subscription: SubscriptionState): number {
    if (!subscription.performance) return 0
    
    const total = subscription.performance.messageCount + subscription.performance.errorCount
    return total > 0 ? (subscription.retryCount / total) * 100 : 0
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(subscription: SubscriptionState): number {
    // Rough estimation
    let memory = 1024 // Base subscription object
    
    if (subscription.metadata) {
      memory += JSON.stringify(subscription.metadata).length * 2
    }
    
    if (subscription.performance) {
      memory += JSON.stringify(subscription.performance).length * 2
    }
    
    return memory
  }

  /**
   * Calculate performance score
   */
  private calculatePerformanceScore(latency: number, errorRate: number, uptime: number): number {
    let score = 100

    // Penalize for latency
    if (latency > 1000) {
      score -= Math.min(30, (latency - 1000) / 100)
    }

    // Penalize for errors
    score -= errorRate * 2

    // Penalize for downtime
    score -= (100 - uptime) * 0.5

    return Math.max(0, Math.round(score))
  }

  /**
   * Calculate trend direction
   */
  private calculateTrend(values: number[]): 'improving' | 'degrading' | 'stable' {
    if (values.length < 2) return 'stable'

    const first = values[0]
    const last = values[values.length - 1]
    const change = last - first
    const threshold = Math.abs(first) * 0.1 // 10% threshold

    if (change > threshold) return 'improving'
    if (change < -threshold) return 'degrading'
    return 'stable'
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(subscription: SubscriptionState, snapshots: PerformanceSnapshot[]): string[] {
    const recommendations: string[] = []

    if (snapshots.length === 0) return recommendations

    const latestSnapshot = snapshots[snapshots.length - 1]
    const metrics = latestSnapshot.metrics

    if (metrics.latency.average > this.thresholds.latency.warning) {
      recommendations.push('Consider optimizing subscription filters to reduce latency')
    }

    if (metrics.reliability.errorRate > this.thresholds.errorRate.warning) {
      recommendations.push('Review error handling and retry logic')
    }

    if (metrics.throughput.messagesPerSecond < this.thresholds.throughput.warning) {
      recommendations.push('Check if subscription filters are too restrictive')
    }

    if (metrics.resource.memoryUsage > this.thresholds.memoryUsage.warning) {
      recommendations.push('Consider reducing subscription data or implementing cleanup')
    }

    if (subscription.retryCount > 3) {
      recommendations.push('High retry count detected - investigate connection issues')
    }

    return recommendations
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.collectionTimer = setInterval(() => {
      // Collect metrics for all subscriptions
      const subscriptions = subscriptionStateManager.getAllSubscriptions()
      
      subscriptions.forEach(subscription => {
        this.recordSnapshot(subscription.id)
        
        // Record individual metrics
        if (subscription.performance) {
          this.recordMetric('latency', subscription.performance.averageLatency || 0, 'ms', subscription.id)
          this.recordMetric('message_count', subscription.performance.messageCount, 'messages', subscription.id)
          this.recordMetric('error_count', subscription.performance.errorCount, 'errors', subscription.id)
        }
      })
    }, 30000) // Every 30 seconds
  }

  /**
   * Stop metrics collection
   */
  private stopMetricsCollection(): void {
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer)
      this.collectionTimer = undefined
    }
  }

  /**
   * Generate metric ID
   */
  private generateMetricId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Notify performance callbacks
   */
  private notifyCallbacks(metric: PerformanceMetric): void {
    this.callbacks.forEach(callback => {
      try {
        callback(metric)
      } catch (error) {
        console.error('Error in performance callback:', error)
      }
    })
  }

  /**
   * Notify alert callbacks
   */
  private notifyAlertCallbacks(alert: PerformanceAlert): void {
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert)
      } catch (error) {
        console.error('Error in alert callback:', error)
      }
    })
  }

  /**
   * Register performance callback
   */
  onMetric(callback: PerformanceCallback): () => void {
    this.callbacks.add(callback)
    return () => this.callbacks.delete(callback)
  }

  /**
   * Register alert callback
   */
  onAlert(callback: AlertCallback): () => void {
    this.alertCallbacks.add(callback)
    return () => this.alertCallbacks.delete(callback)
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics = []
    this.snapshots = []
    this.alerts = []
  }

  /**
   * Stop performance metrics
   */
  stop(): void {
    this.stopMetricsCollection()
    this.callbacks.clear()
    this.alertCallbacks.clear()
  }
}

// Export singleton instance
export const subscriptionPerformanceMetrics = new SubscriptionPerformanceMetrics()
