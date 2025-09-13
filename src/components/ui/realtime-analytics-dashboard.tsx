/**
 * Real-time Analytics Dashboard
 * Comprehensive analytics and reporting for real-time subscriptions and performance
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Wifi,
  WifiOff,
  Database,
  Server,
  Users,
  MessageSquare,
  Timer,
  Cpu,
  HardDrive
} from 'lucide-react'
import { subscriptionAnalytics, AnalyticsReport } from '@/lib/services/subscription-analytics'
import { subscriptionHealthMonitor } from '@/lib/services/subscription-health-monitor'
import { subscriptionPerformanceMetrics } from '@/lib/services/subscription-performance-metrics'
import { subscriptionStateManager } from '@/lib/services/subscription-state-manager'

interface RealtimeAnalyticsDashboardProps {
  className?: string
}

export function RealtimeAnalyticsDashboard({ className = '' }: RealtimeAnalyticsDashboardProps) {
  const [report, setReport] = useState<AnalyticsReport | null>(null)
  const [healthMetrics, setHealthMetrics] = useState<any>(null)
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null)
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h')

  useEffect(() => {
    const updateMetrics = async () => {
      setIsLoading(true)
      try {
        // Generate analytics report
        const analyticsReport = subscriptionAnalytics.generateReport()
        setReport(analyticsReport)

        // Get health metrics
        const health = subscriptionHealthMonitor.getHealthMetrics()
        setHealthMetrics(health)

        // Get performance metrics
        const performance = subscriptionPerformanceMetrics.getMetrics()
        setPerformanceMetrics(performance)

        // Get subscription data
        const subs = subscriptionStateManager.getAllSubscriptions()
        setSubscriptions(subs)
      } catch (error) {
        console.error('Error updating analytics:', error)
      } finally {
        setIsLoading(false)
      }
    }

    updateMetrics()
    const interval = setInterval(updateMetrics, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [timeRange])

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'critical': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-600" />
      default: return <Activity className="h-5 w-5 text-gray-600" />
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />
      default: return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Real-time Analytics
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive analytics and performance monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {report?.analytics.overview.totalSubscriptions || 0} Subscriptions
          </Badge>
          <Badge variant={healthMetrics?.overallHealth === 'healthy' ? 'default' : 'destructive'}>
            {healthMetrics?.overallHealth || 'Unknown'}
          </Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Subscriptions</p>
                <p className="text-2xl font-bold">{report?.analytics.overview.totalSubscriptions || 0}</p>
              </div>
              <Database className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-2 flex items-center gap-2">
              {getTrendIcon(report?.summary.keyMetrics[0]?.trend || 'stable')}
              <span className="text-sm text-gray-500">
                {report?.summary.keyMetrics[0]?.change?.toFixed(1) || 0}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Subscriptions</p>
                <p className="text-2xl font-bold text-green-600">
                  {report?.analytics.overview.activeSubscriptions || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-2">
              <Progress 
                value={(report?.analytics.overview.activeSubscriptions || 0) / Math.max(1, report?.analytics.overview.totalSubscriptions || 1) * 100}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Latency</p>
                <p className="text-2xl font-bold">{report?.analytics.overview.averageLatency?.toFixed(0) || 0}ms</p>
              </div>
              <Timer className="h-8 w-8 text-purple-600" />
            </div>
            <div className="mt-2 flex items-center gap-2">
              {getTrendIcon(report?.summary.keyMetrics[2]?.trend || 'stable')}
              <span className="text-sm text-gray-500">
                {report?.summary.keyMetrics[2]?.change?.toFixed(1) || 0}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Error Rate</p>
                <p className="text-2xl font-bold text-red-600">
                  {report?.analytics.overview.errorRate?.toFixed(1) || 0}%
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <div className="mt-2">
              <Progress 
                value={report?.analytics.overview.errorRate || 0}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="usage">Usage Patterns</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overall Health</span>
                    <div className="flex items-center gap-2">
                      {getHealthIcon(healthMetrics?.overallHealth || 'unknown')}
                      <span className={getHealthColor(healthMetrics?.overallHealth || 'unknown')}>
                        {healthMetrics?.overallHealth || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subscription Health</span>
                      <span>{healthMetrics?.subscriptionHealth?.toFixed(1) || 0}%</span>
                    </div>
                    <Progress value={healthMetrics?.subscriptionHealth || 0} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Connection Health</span>
                      <span>{healthMetrics?.connectionHealth?.toFixed(1) || 0}%</span>
                    </div>
                    <Progress value={healthMetrics?.connectionHealth || 0} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Performance Health</span>
                      <span>{healthMetrics?.performanceHealth?.toFixed(1) || 0}%</span>
                    </div>
                    <Progress value={healthMetrics?.performanceHealth || 0} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Memory Health</span>
                      <span>{healthMetrics?.memoryHealth?.toFixed(1) || 0}%</span>
                    </div>
                    <Progress value={healthMetrics?.memoryHealth || 0} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resource Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Memory Usage</span>
                    <span className="text-sm">{formatBytes(healthMetrics?.memoryUsage || 0)}</span>
                  </div>
                  <Progress 
                    value={((healthMetrics?.memoryUsage || 0) / (50 * 1024 * 1024)) * 100} 
                    className="h-2"
                  />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Active Connections</span>
                    <span className="text-sm">{healthMetrics?.activeSubscriptions || 0}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Messages</span>
                    <span className="text-sm">{performanceMetrics?.totalMessages || 0}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Error Count</span>
                    <span className="text-sm text-red-600">{performanceMetrics?.totalErrors || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Subscriptions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report?.analytics.performance.topPerformingSubscriptions.slice(0, 5).map((sub, index) => (
                    <div key={sub.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{sub.channelName}</div>
                        <div className="text-sm text-gray-500">{sub.messageCount} messages</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{sub.averageLatency.toFixed(0)}ms</div>
                        <div className="text-xs text-gray-500">{sub.uptime.toFixed(1)}% uptime</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report?.analytics.performance.worstPerformingSubscriptions.slice(0, 5).map((sub, index) => (
                    <div key={sub.id} className="flex items-center justify-between p-3 border rounded-lg border-red-200 bg-red-50 dark:bg-red-950">
                      <div>
                        <div className="font-medium">{sub.channelName}</div>
                        <div className="text-sm text-red-600">{sub.errorCount} errors</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-red-600">{sub.retryCount} retries</div>
                        <div className="text-xs text-gray-500">
                          {sub.issues.slice(0, 2).join(', ')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Usage Patterns Tab */}
        <TabsContent value="usage" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Subscriptions by Table</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report?.analytics.usage.subscriptionsByTable.slice(0, 8).map((table) => (
                    <div key={table.tableName} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{table.tableName}</div>
                        <div className="text-sm text-gray-500">{table.averageLatency.toFixed(0)}ms avg</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{table.count}</div>
                        <div className="text-sm text-gray-500">{table.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Subscriptions by Priority</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report?.analytics.usage.subscriptionsByPriority.map((priority) => (
                    <div key={priority.priority} className="flex items-center justify-between">
                      <div>
                        <Badge variant={
                          priority.priority === 'critical' ? 'destructive' :
                          priority.priority === 'high' ? 'default' :
                          priority.priority === 'normal' ? 'secondary' :
                          'outline'
                        }>
                          {priority.priority}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{priority.count}</div>
                        <div className="text-sm text-gray-500">{priority.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report?.analytics.insights.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <p className="text-sm">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report?.analytics.insights.alerts.map((alert, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                      <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                        alert.type === 'critical' ? 'text-red-600' :
                        alert.type === 'warning' ? 'text-yellow-600' :
                        'text-blue-600'
                      }`} />
                      <div>
                        <p className="text-sm font-medium">{alert.message}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
