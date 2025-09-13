/**
 * Error Tracking Dashboard
 * UI component for viewing and managing error tracking and reporting
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { 
  AlertTriangle,
  Bug,
  Activity,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Database,
  Wifi,
  Zap,
  Sync,
  AlertCircle,
  RefreshCw,
  Download,
  Eye,
  EyeOff
} from 'lucide-react'
import { 
  realtimeErrorTracker, 
  ErrorReport, 
  ErrorPattern, 
  ErrorAlert, 
  ErrorStats 
} from '@/lib/services/realtime-error-tracker'

interface ErrorTrackingDashboardProps {
  className?: string
}

export function ErrorTrackingDashboard({ className = '' }: ErrorTrackingDashboardProps) {
  const [stats, setStats] = useState<ErrorStats | null>(null)
  const [patterns, setPatterns] = useState<ErrorPattern[]>([])
  const [alerts, setAlerts] = useState<ErrorAlert[]>([])
  const [trends, setTrends] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    const loadData = () => {
      setIsLoading(true)
      try {
        setStats(realtimeErrorTracker.getStats())
        setPatterns(realtimeErrorTracker.getErrorPatterns())
        setAlerts(realtimeErrorTracker.getAllAlerts(50))
        setTrends(realtimeErrorTracker.getErrorTrends(24))
      } catch (error) {
        console.error('Error loading error tracking data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()

    if (autoRefresh) {
      const interval = setInterval(loadData, 10000) // Refresh every 10 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'destructive'
      case 'investigating': return 'secondary'
      case 'resolved': return 'default'
      case 'ignored': return 'outline'
      default: return 'outline'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'subscription': return <Database className="h-4 w-4" />
      case 'connection': return <Wifi className="h-4 w-4" />
      case 'performance': return <Zap className="h-4 w-4" />
      case 'sync': return <Sync className="h-4 w-4" />
      case 'conflict': return <AlertCircle className="h-4 w-4" />
      case 'system': return <Activity className="h-4 w-4" />
      case 'user': return <Users className="h-4 w-4" />
      default: return <Bug className="h-4 w-4" />
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error_spike': return <TrendingUp className="h-4 w-4" />
      case 'critical_error': return <XCircle className="h-4 w-4" />
      case 'new_error_pattern': return <AlertTriangle className="h-4 w-4" />
      case 'error_rate_threshold': return <TrendingDown className="h-4 w-4" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  const exportData = () => {
    const data = realtimeErrorTracker.exportErrorData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `error-tracking-data-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const resolveAlert = (alertId: string) => {
    realtimeErrorTracker.resolveAlert(alertId, 'user', 'Resolved via dashboard')
    setAlerts(realtimeErrorTracker.getAllAlerts(50))
  }

  const updatePatternStatus = (patternId: string, status: ErrorPattern['status']) => {
    realtimeErrorTracker.updatePatternStatus(patternId, status)
    setPatterns(realtimeErrorTracker.getErrorPatterns())
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bug className="h-6 w-6" />
            Error Tracking Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor and manage errors, patterns, and alerts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsLoading(true)}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={exportData}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Errors</p>
                <p className="text-2xl font-bold">{stats?.totalErrors || 0}</p>
              </div>
              <Bug className="h-8 w-8 text-red-600" />
            </div>
            <div className="mt-2">
              <div className="text-sm text-gray-500">
                {stats?.averageErrorsPerHour || 0} per hour
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical Errors</p>
                <p className="text-2xl font-bold text-red-600">{stats?.criticalErrors || 0}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <div className="mt-2">
              <div className="text-sm text-gray-500">
                {stats?.errorRate?.toFixed(1) || 0}% error rate
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Error Patterns</p>
                <p className="text-2xl font-bold">{stats?.uniqueErrorPatterns || 0}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-2">
              <div className="text-sm text-gray-500">
                {stats?.activeErrorPatterns || 0} active
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resolution Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats?.resolvedErrors || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-2">
              <div className="text-sm text-gray-500">
                {stats?.uniqueErrorPatterns ? 
                  ((stats.resolvedErrors / stats.uniqueErrorPatterns) * 100).toFixed(1) : 0}% resolved
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="patterns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="patterns">Error Patterns</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        {/* Error Patterns Tab */}
        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Patterns</CardTitle>
              <CardDescription>
                Grouped errors with frequency and status tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {patterns.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No error patterns found.
                    </div>
                  ) : (
                    patterns.map((pattern) => (
                      <div key={pattern.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {getCategoryIcon(pattern.category)}
                            <div>
                              <div className="font-medium">{pattern.message}</div>
                              <div className="text-sm text-gray-500 mt-1">
                                {pattern.category} • {pattern.source || 'unknown'}
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant={getStatusColor(pattern.status)}>
                                  {pattern.status}
                                </Badge>
                                <Badge variant="outline">
                                  {pattern.severity}
                                </Badge>
                                <Badge variant="secondary">
                                  {pattern.frequency} occurrences
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500">
                              First: {pattern.firstSeen.toLocaleDateString()}
                            </div>
                            <div className="text-sm text-gray-500">
                              Last: {pattern.lastSeen.toLocaleDateString()}
                            </div>
                            {pattern.assignedTo && (
                              <div className="text-sm text-blue-600 mt-1">
                                Assigned to: {pattern.assignedTo}
                              </div>
                            )}
                          </div>
                        </div>
                        {pattern.resolution && (
                          <div className="mt-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                            <div className="text-sm font-medium text-green-800 dark:text-green-200">
                              Resolution:
                            </div>
                            <div className="text-sm text-green-700 dark:text-green-300">
                              {pattern.resolution}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 mt-3">
                          {pattern.status === 'active' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updatePatternStatus(pattern.id, 'investigating')}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Investigate
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updatePatternStatus(pattern.id, 'ignored')}
                              >
                                <EyeOff className="h-3 w-3 mr-1" />
                                Ignore
                              </Button>
                            </>
                          )}
                          {pattern.status === 'investigating' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePatternStatus(pattern.id, 'resolved')}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Resolve
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
              <CardDescription>
                Real-time alerts for error conditions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {alerts.filter(alert => !alert.resolved).length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No active alerts.
                    </div>
                  ) : (
                    alerts.filter(alert => !alert.resolved).map((alert) => (
                      <div key={alert.id} className={`p-4 border rounded-lg ${
                        alert.severity === 'critical' ? 'border-red-200 bg-red-50 dark:bg-red-950' :
                        alert.severity === 'warning' ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950' :
                        'border-blue-200 bg-blue-50 dark:bg-blue-950'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {getAlertIcon(alert.type)}
                            <div>
                              <div className="font-medium">{alert.message}</div>
                              <div className="text-sm text-gray-500 mt-1">
                                {alert.type} • {alert.severity}
                              </div>
                              <div className="text-sm text-gray-500">
                                {alert.timestamp.toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resolveAlert(alert.id)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Resolve
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Trends</CardTitle>
              <CardDescription>
                Historical error data and patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Error trends visualization coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Errors by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats && Object.entries(stats.errorsByCategory).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(category)}
                        <span className="font-medium capitalize">{category}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{count}</div>
                        <div className="text-sm text-gray-500">
                          {((count / stats.totalErrors) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Errors by Source</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats && Object.entries(stats.errorsBySource).slice(0, 10).map(([source, count]) => (
                    <div key={source} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        <span className="font-medium">{source}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{count}</div>
                        <div className="text-sm text-gray-500">
                          {((count / stats.totalErrors) * 100).toFixed(1)}%
                        </div>
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
