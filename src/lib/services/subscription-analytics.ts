/**
 * Subscription Analytics
 * Comprehensive analytics and reporting for subscription performance and usage
 */

import { subscriptionStateManager, SubscriptionState } from './subscription-state-manager'
import { subscriptionCleanupManager } from './subscription-cleanup-manager'
import { subscriptionRetryManager } from './subscription-retry-manager'
import { subscriptionHealthMonitor } from './subscription-health-monitor'
import { subscriptionOptimizer } from './subscription-optimizer'
import { subscriptionDebugger } from './subscription-debugger'

export interface AnalyticsTimeRange {
  start: Date
  end: Date
}

export interface SubscriptionAnalytics {
  overview: {
    totalSubscriptions: number
    activeSubscriptions: number
    errorSubscriptions: number
    averageLatency: number
    errorRate: number
    memoryUsage: number
    lastUpdated: Date
  }
  trends: {
    subscriptionsOverTime: Array<{ timestamp: Date; count: number }>
    latencyOverTime: Array<{ timestamp: Date; averageLatency: number }>
    errorRateOverTime: Array<{ timestamp: Date; errorRate: number }>
    memoryUsageOverTime: Array<{ timestamp: Date; memoryUsage: number }>
  }
  performance: {
    topPerformingSubscriptions: Array<{
      id: string
      channelName: string
      messageCount: number
      averageLatency: number
      uptime: number
    }>
    worstPerformingSubscriptions: Array<{
      id: string
      channelName: string
      errorCount: number
      retryCount: number
      issues: string[]
    }>
    latencyDistribution: Array<{
      range: string
      count: number
      percentage: number
    }>
  }
  usage: {
    subscriptionsByTable: Array<{
      tableName: string
      count: number
      percentage: number
      averageLatency: number
    }>
    subscriptionsByUser: Array<{
      userId: string
      count: number
      percentage: number
      totalMessages: number
    }>
    subscriptionsByPriority: Array<{
      priority: string
      count: number
      percentage: number
      averageLatency: number
    }>
    peakUsageTimes: Array<{
      hour: number
      subscriptionCount: number
      averageLatency: number
    }>
  }
  insights: {
    recommendations: string[]
    alerts: Array<{
      type: 'warning' | 'critical' | 'info'
      message: string
      timestamp: Date
    }>
    anomalies: Array<{
      type: string
      description: string
      timestamp: Date
      severity: 'low' | 'medium' | 'high'
    }>
  }
}

export interface AnalyticsReport {
  generatedAt: Date
  timeRange: AnalyticsTimeRange
  analytics: SubscriptionAnalytics
  summary: {
    healthScore: number
    keyMetrics: Array<{
      name: string
      value: string
      trend: 'up' | 'down' | 'stable'
      change: number
    }>
    topRecommendations: string[]
  }
}

export interface AnalyticsConfig {
  retentionDays: number
  aggregationInterval: number // minutes
  enableRealTimeAnalytics: boolean
  alertThresholds: {
    errorRate: number
    latency: number
    memoryUsage: number
    subscriptionCount: number
  }
}

export interface AnalyticsDataPoint {
  timestamp: Date
  subscriptionCount: number
  activeCount: number
  errorCount: number
  averageLatency: number
  memoryUsage: number
  errorRate: number
  messageCount: number
}

export class SubscriptionAnalytics {
  private config: AnalyticsConfig = {
    retentionDays: 30,
    aggregationInterval: 5, // 5 minutes
    enableRealTimeAnalytics: true,
    alertThresholds: {
      errorRate: 10, // 10%
      latency: 1000, // 1 second
      memoryUsage: 50 * 1024 * 1024, // 50MB
      subscriptionCount: 100
    }
  }

  private dataPoints: AnalyticsDataPoint[] = []
  private alerts: Array<{
    type: 'warning' | 'critical' | 'info'
    message: string
    timestamp: Date
  }> = []

  private analyticsTimer?: NodeJS.Timeout

  constructor() {
    if (this.config.enableRealTimeAnalytics) {
      this.startAnalyticsCollection()
    }
  }

  /**
   * Update analytics configuration
   */
  updateConfig(newConfig: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    if (newConfig.enableRealTimeAnalytics !== undefined) {
      if (newConfig.enableRealTimeAnalytics) {
        this.startAnalyticsCollection()
      } else {
        this.stopAnalyticsCollection()
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AnalyticsConfig {
    return { ...this.config }
  }

  /**
   * Generate comprehensive analytics report
   */
  generateReport(timeRange?: AnalyticsTimeRange): AnalyticsReport {
    const range = timeRange || {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      end: new Date()
    }

    const analytics = this.calculateAnalytics(range)
    const summary = this.generateSummary(analytics)

    return {
      generatedAt: new Date(),
      timeRange: range,
      analytics,
      summary
    }
  }

  /**
   * Calculate analytics for time range
   */
  private calculateAnalytics(timeRange: AnalyticsTimeRange): SubscriptionAnalytics {
    const subscriptions = subscriptionStateManager.getAllSubscriptions()
    const memoryStats = subscriptionCleanupManager.getMemoryStats()
    const retryStats = subscriptionRetryManager.getRetryStats()
    const healthMetrics = subscriptionHealthMonitor.getHealthMetrics()
    const optimizerMetrics = subscriptionOptimizer.getMetrics()

    // Filter data points for time range
    const relevantDataPoints = this.dataPoints.filter(dp => 
      dp.timestamp >= timeRange.start && dp.timestamp <= timeRange.end
    )

    return {
      overview: this.calculateOverview(subscriptions, memoryStats, healthMetrics),
      trends: this.calculateTrends(relevantDataPoints),
      performance: this.calculatePerformance(subscriptions),
      usage: this.calculateUsage(subscriptions),
      insights: this.generateInsights(subscriptions, healthMetrics, optimizerMetrics)
    }
  }

  /**
   * Calculate overview metrics
   */
  private calculateOverview(
    subscriptions: SubscriptionState[],
    memoryStats: any,
    healthMetrics: any
  ): SubscriptionAnalytics['overview'] {
    const activeSubscriptions = subscriptions.filter(s => s.status === 'subscribed')
    const errorSubscriptions = subscriptions.filter(s => s.status === 'error')
    
    const latencies = subscriptions
      .map(s => s.performance?.averageLatency)
      .filter(Boolean) as number[]
    const averageLatency = latencies.length > 0 
      ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length 
      : 0

    const errorRate = subscriptions.length > 0 
      ? (errorSubscriptions.length / subscriptions.length) * 100 
      : 0

    return {
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: activeSubscriptions.length,
      errorSubscriptions: errorSubscriptions.length,
      averageLatency,
      errorRate,
      memoryUsage: memoryStats.totalMemoryUsage,
      lastUpdated: new Date()
    }
  }

  /**
   * Calculate trends over time
   */
  private calculateTrends(dataPoints: AnalyticsDataPoint[]): SubscriptionAnalytics['trends'] {
    const subscriptionsOverTime = dataPoints.map(dp => ({
      timestamp: dp.timestamp,
      count: dp.subscriptionCount
    }))

    const latencyOverTime = dataPoints.map(dp => ({
      timestamp: dp.timestamp,
      averageLatency: dp.averageLatency
    }))

    const errorRateOverTime = dataPoints.map(dp => ({
      timestamp: dp.timestamp,
      errorRate: dp.errorRate
    }))

    const memoryUsageOverTime = dataPoints.map(dp => ({
      timestamp: dp.timestamp,
      memoryUsage: dp.memoryUsage
    }))

    return {
      subscriptionsOverTime,
      latencyOverTime,
      errorRateOverTime,
      memoryUsageOverTime
    }
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformance(subscriptions: SubscriptionState[]): SubscriptionAnalytics['performance'] {
    // Top performing subscriptions
    const topPerforming = subscriptions
      .filter(s => s.status === 'subscribed' && s.performance)
      .map(s => ({
        id: s.id,
        channelName: s.channelName,
        messageCount: s.performance!.messageCount,
        averageLatency: s.performance!.averageLatency || 0,
        uptime: this.calculateUptime(s)
      }))
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, 10)

    // Worst performing subscriptions
    const worstPerforming = subscriptions
      .filter(s => s.performance)
      .map(s => ({
        id: s.id,
        channelName: s.channelName,
        errorCount: s.performance!.errorCount,
        retryCount: s.retryCount,
        issues: this.identifyIssues(s)
      }))
      .sort((a, b) => b.errorCount - a.errorCount)
      .slice(0, 10)

    // Latency distribution
    const latencies = subscriptions
      .map(s => s.performance?.averageLatency)
      .filter(Boolean) as number[]
    
    const latencyDistribution = this.calculateLatencyDistribution(latencies)

    return {
      topPerformingSubscriptions: topPerforming,
      worstPerformingSubscriptions: worstPerforming,
      latencyDistribution
    }
  }

  /**
   * Calculate usage patterns
   */
  private calculateUsage(subscriptions: SubscriptionState[]): SubscriptionAnalytics['usage'] {
    // By table
    const tableUsage = subscriptions.reduce((acc, s) => {
      const tableName = s.tableName || 'unknown'
      if (!acc[tableName]) {
        acc[tableName] = { count: 0, latencies: [] }
      }
      acc[tableName].count++
      if (s.performance?.averageLatency) {
        acc[tableName].latencies.push(s.performance.averageLatency)
      }
      return acc
    }, {} as Record<string, { count: number; latencies: number[] }>)

    const subscriptionsByTable = Object.entries(tableUsage).map(([tableName, data]) => ({
      tableName,
      count: data.count,
      percentage: (data.count / subscriptions.length) * 100,
      averageLatency: data.latencies.length > 0 
        ? data.latencies.reduce((sum, l) => sum + l, 0) / data.latencies.length 
        : 0
    })).sort((a, b) => b.count - a.count)

    // By user
    const userUsage = subscriptions.reduce((acc, s) => {
      const userId = s.metadata?.userId || 'anonymous'
      if (!acc[userId]) {
        acc[userId] = { count: 0, messages: 0 }
      }
      acc[userId].count++
      acc[userId].messages += s.performance?.messageCount || 0
      return acc
    }, {} as Record<string, { count: number; messages: number }>)

    const subscriptionsByUser = Object.entries(userUsage).map(([userId, data]) => ({
      userId,
      count: data.count,
      percentage: (data.count / subscriptions.length) * 100,
      totalMessages: data.messages
    })).sort((a, b) => b.count - a.count)

    // By priority
    const priorityUsage = subscriptions.reduce((acc, s) => {
      if (!acc[s.priority]) {
        acc[s.priority] = { count: 0, latencies: [] }
      }
      acc[s.priority].count++
      if (s.performance?.averageLatency) {
        acc[s.priority].latencies.push(s.performance.averageLatency)
      }
      return acc
    }, {} as Record<string, { count: number; latencies: number[] }>)

    const subscriptionsByPriority = Object.entries(priorityUsage).map(([priority, data]) => ({
      priority,
      count: data.count,
      percentage: (data.count / subscriptions.length) * 100,
      averageLatency: data.latencies.length > 0 
        ? data.latencies.reduce((sum, l) => sum + l, 0) / data.latencies.length 
        : 0
    })).sort((a, b) => b.count - a.count)

    // Peak usage times (simplified - would need more detailed data)
    const peakUsageTimes = this.calculatePeakUsageTimes(subscriptions)

    return {
      subscriptionsByTable,
      subscriptionsByUser,
      subscriptionsByPriority,
      peakUsageTimes
    }
  }

  /**
   * Generate insights and recommendations
   */
  private generateInsights(
    subscriptions: SubscriptionState[],
    healthMetrics: any,
    optimizerMetrics: any
  ): SubscriptionAnalytics['insights'] {
    const recommendations: string[] = []
    const anomalies: Array<{
      type: string
      description: string
      timestamp: Date
      severity: 'low' | 'medium' | 'high'
    }> = []

    // Generate recommendations
    if (healthMetrics.errorRate > this.config.alertThresholds.errorRate) {
      recommendations.push('High error rate detected - review subscription filters and error handling')
    }

    if (healthMetrics.averageLatency > this.config.alertThresholds.latency) {
      recommendations.push('High latency detected - optimize network conditions and subscription filters')
    }

    if (optimizerMetrics.deduplicatedSubscriptions > 0) {
      recommendations.push('Duplicate subscriptions detected - enable automatic deduplication')
    }

    if (healthMetrics.memoryHealth < 70) {
      recommendations.push('Memory usage is high - consider cleanup or reducing subscription count')
    }

    // Generate alerts
    if (healthMetrics.errorRate > this.config.alertThresholds.errorRate) {
      this.alerts.push({
        type: 'critical',
        message: `Error rate ${healthMetrics.errorRate.toFixed(1)}% exceeds threshold`,
        timestamp: new Date()
      })
    }

    if (healthMetrics.averageLatency > this.config.alertThresholds.latency) {
      this.alerts.push({
        type: 'warning',
        message: `Average latency ${healthMetrics.averageLatency.toFixed(0)}ms exceeds threshold`,
        timestamp: new Date()
      })
    }

    // Detect anomalies
    const errorSubscriptions = subscriptions.filter(s => s.status === 'error')
    if (errorSubscriptions.length > 5) {
      anomalies.push({
        type: 'error_spike',
        description: `Unusual number of error subscriptions: ${errorSubscriptions.length}`,
        timestamp: new Date(),
        severity: 'high'
      })
    }

    const highRetrySubscriptions = subscriptions.filter(s => s.retryCount > 3)
    if (highRetrySubscriptions.length > 3) {
      anomalies.push({
        type: 'retry_spike',
        description: `Multiple subscriptions with high retry counts: ${highRetrySubscriptions.length}`,
        timestamp: new Date(),
        severity: 'medium'
      })
    }

    return {
      recommendations,
      alerts: this.alerts.slice(-10), // Last 10 alerts
      anomalies
    }
  }

  /**
   * Generate summary
   */
  private generateSummary(analytics: SubscriptionAnalytics): AnalyticsReport['summary'] {
    const healthScore = this.calculateHealthScore(analytics)
    
    const keyMetrics = [
      {
        name: 'Active Subscriptions',
        value: analytics.overview.activeSubscriptions.toString(),
        trend: this.calculateTrend(analytics.trends.subscriptionsOverTime),
        change: this.calculateChange(analytics.trends.subscriptionsOverTime)
      },
      {
        name: 'Error Rate',
        value: `${analytics.overview.errorRate.toFixed(1)}%`,
        trend: this.calculateTrend(analytics.trends.errorRateOverTime),
        change: this.calculateChange(analytics.trends.errorRateOverTime)
      },
      {
        name: 'Average Latency',
        value: `${analytics.overview.averageLatency.toFixed(0)}ms`,
        trend: this.calculateTrend(analytics.trends.latencyOverTime),
        change: this.calculateChange(analytics.trends.latencyOverTime)
      },
      {
        name: 'Memory Usage',
        value: `${(analytics.overview.memoryUsage / 1024 / 1024).toFixed(1)}MB`,
        trend: this.calculateTrend(analytics.trends.memoryUsageOverTime),
        change: this.calculateChange(analytics.trends.memoryUsageOverTime)
      }
    ]

    return {
      healthScore,
      keyMetrics,
      topRecommendations: analytics.insights.recommendations.slice(0, 3)
    }
  }

  /**
   * Calculate health score
   */
  private calculateHealthScore(analytics: SubscriptionAnalytics): number {
    let score = 100

    // Penalize for high error rate
    if (analytics.overview.errorRate > 5) {
      score -= Math.min(30, analytics.overview.errorRate * 3)
    }

    // Penalize for high latency
    if (analytics.overview.averageLatency > 500) {
      score -= Math.min(20, (analytics.overview.averageLatency - 500) / 50)
    }

    // Penalize for memory usage
    const memoryMB = analytics.overview.memoryUsage / 1024 / 1024
    if (memoryMB > 25) {
      score -= Math.min(15, (memoryMB - 25) * 0.6)
    }

    // Penalize for low active subscriptions
    const activeRatio = analytics.overview.activeSubscriptions / Math.max(1, analytics.overview.totalSubscriptions)
    if (activeRatio < 0.8) {
      score -= (0.8 - activeRatio) * 25
    }

    return Math.max(0, Math.round(score))
  }

  /**
   * Calculate trend direction
   */
  private calculateTrend(dataPoints: Array<{ timestamp: Date; [key: string]: any }>): 'up' | 'down' | 'stable' {
    if (dataPoints.length < 2) return 'stable'

    const first = dataPoints[0]
    const last = dataPoints[dataPoints.length - 1]
    const firstValue = Object.values(first).find(v => typeof v === 'number') as number
    const lastValue = Object.values(last).find(v => typeof v === 'number') as number

    const change = lastValue - firstValue
    const threshold = firstValue * 0.05 // 5% threshold

    if (change > threshold) return 'up'
    if (change < -threshold) return 'down'
    return 'stable'
  }

  /**
   * Calculate percentage change
   */
  private calculateChange(dataPoints: Array<{ timestamp: Date; [key: string]: any }>): number {
    if (dataPoints.length < 2) return 0

    const first = dataPoints[0]
    const last = dataPoints[dataPoints.length - 1]
    const firstValue = Object.values(first).find(v => typeof v === 'number') as number
    const lastValue = Object.values(last).find(v => typeof v === 'number') as number

    if (firstValue === 0) return 0
    return ((lastValue - firstValue) / firstValue) * 100
  }

  /**
   * Calculate uptime for subscription
   */
  private calculateUptime(subscription: SubscriptionState): number {
    const totalTime = Date.now() - subscription.createdAt.getTime()
    const activeTime = subscription.status === 'subscribed' ? totalTime : 
      (subscription.lastActivity?.getTime() || subscription.updatedAt.getTime()) - subscription.createdAt.getTime()
    
    return (activeTime / totalTime) * 100
  }

  /**
   * Identify issues with subscription
   */
  private identifyIssues(subscription: SubscriptionState): string[] {
    const issues: string[] = []

    if (subscription.status === 'error') {
      issues.push('Subscription in error state')
    }

    if (subscription.retryCount > 3) {
      issues.push('High retry count')
    }

    if (subscription.performance?.errorCount && subscription.performance.errorCount > 5) {
      issues.push('High error count')
    }

    const lastActivity = subscription.lastActivity || subscription.updatedAt
    const inactiveTime = Date.now() - lastActivity.getTime()
    if (inactiveTime > 300000) { // 5 minutes
      issues.push('Inactive for extended period')
    }

    return issues
  }

  /**
   * Calculate latency distribution
   */
  private calculateLatencyDistribution(latencies: number[]): Array<{
    range: string
    count: number
    percentage: number
  }> {
    const ranges = [
      { min: 0, max: 100, label: '0-100ms' },
      { min: 100, max: 500, label: '100-500ms' },
      { min: 500, max: 1000, label: '500ms-1s' },
      { min: 1000, max: 2000, label: '1-2s' },
      { min: 2000, max: Infinity, label: '>2s' }
    ]

    return ranges.map(range => {
      const count = latencies.filter(l => l >= range.min && l < range.max).length
      return {
        range: range.label,
        count,
        percentage: latencies.length > 0 ? (count / latencies.length) * 100 : 0
      }
    })
  }

  /**
   * Calculate peak usage times
   */
  private calculatePeakUsageTimes(subscriptions: SubscriptionState[]): Array<{
    hour: number
    subscriptionCount: number
    averageLatency: number
  }> {
    // Simplified implementation - would need more detailed time-based data
    const hours = Array.from({ length: 24 }, (_, i) => i)
    
    return hours.map(hour => {
      // Simulate peak usage during business hours
      const baseCount = subscriptions.length
      const multiplier = hour >= 9 && hour <= 17 ? 1.2 : 0.8
      const subscriptionCount = Math.round(baseCount * multiplier)
      
      return {
        hour,
        subscriptionCount,
        averageLatency: 100 + Math.random() * 200 // Simulated latency
      }
    })
  }

  /**
   * Collect analytics data point
   */
  private collectDataPoint(): void {
    const subscriptions = subscriptionStateManager.getAllSubscriptions()
    const memoryStats = subscriptionCleanupManager.getMemoryStats()
    const healthMetrics = subscriptionHealthMonitor.getHealthMetrics()

    const dataPoint: AnalyticsDataPoint = {
      timestamp: new Date(),
      subscriptionCount: subscriptions.length,
      activeCount: subscriptions.filter(s => s.status === 'subscribed').length,
      errorCount: subscriptions.filter(s => s.status === 'error').length,
      averageLatency: healthMetrics.averageLatency,
      memoryUsage: memoryStats.totalMemoryUsage,
      errorRate: healthMetrics.errorRate,
      messageCount: subscriptions.reduce((sum, s) => sum + (s.performance?.messageCount || 0), 0)
    }

    this.dataPoints.push(dataPoint)

    // Clean up old data points
    const cutoff = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000)
    this.dataPoints = this.dataPoints.filter(dp => dp.timestamp > cutoff)
  }

  /**
   * Start analytics collection
   */
  private startAnalyticsCollection(): void {
    this.analyticsTimer = setInterval(() => {
      this.collectDataPoint()
    }, this.config.aggregationInterval * 60 * 1000) // Convert minutes to milliseconds
  }

  /**
   * Stop analytics collection
   */
  private stopAnalyticsCollection(): void {
    if (this.analyticsTimer) {
      clearInterval(this.analyticsTimer)
      this.analyticsTimer = undefined
    }
  }

  /**
   * Get data points
   */
  getDataPoints(timeRange?: AnalyticsTimeRange): AnalyticsDataPoint[] {
    if (!timeRange) return [...this.dataPoints]
    
    return this.dataPoints.filter(dp => 
      dp.timestamp >= timeRange.start && dp.timestamp <= timeRange.end
    )
  }

  /**
   * Export analytics data
   */
  exportData(timeRange?: AnalyticsTimeRange): {
    config: AnalyticsConfig
    dataPoints: AnalyticsDataPoint[]
    alerts: typeof this.alerts
  } {
    return {
      config: this.getConfig(),
      dataPoints: this.getDataPoints(timeRange),
      alerts: [...this.alerts]
    }
  }

  /**
   * Stop analytics
   */
  stop(): void {
    this.stopAnalyticsCollection()
  }
}

// Export singleton instance
export const subscriptionAnalytics = new SubscriptionAnalytics()
