/**
 * Real-time Event Debugging Console
 * Comprehensive debugging interface for real-time events and subscriptions
 */

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Play, 
  Pause, 
  Square, 
  Filter, 
  Search, 
  Trash2, 
  Download, 
  Settings,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Wifi,
  WifiOff,
  Zap
} from 'lucide-react'
import { subscriptionDebugger, DebugLog, DebugSession } from '@/lib/services/subscription-debugger'
import { subscriptionStateManager } from '@/lib/services/subscription-state-manager'
import { subscriptionHealthMonitor } from '@/lib/services/subscription-health-monitor'
import { subscriptionPerformanceMetrics } from '@/lib/services/subscription-performance-metrics'

interface DebugConsoleProps {
  className?: string
}

export function RealtimeDebugConsole({ className = '' }: DebugConsoleProps) {
  const [isActive, setIsActive] = useState(false)
  const [currentSession, setCurrentSession] = useState<DebugSession | null>(null)
  const [logs, setLogs] = useState<DebugLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<DebugLog[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLevels, setSelectedLevels] = useState<string[]>(['debug', 'info', 'warn', 'error'])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [autoScroll, setAutoScroll] = useState(true)
  const [metrics, setMetrics] = useState<any>(null)
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Initialize debugging session
  useEffect(() => {
    if (isActive && !currentSession) {
      const sessionId = subscriptionDebugger.startSession('Real-time Debug Console')
      const session = subscriptionDebugger.getCurrentSession()
      setCurrentSession(session)
      
      // Subscribe to debug logs
      const unsubscribe = subscriptionDebugger.onLog((log) => {
        setLogs(prev => [log, ...prev])
        if (autoScroll && scrollAreaRef.current) {
          scrollAreaRef.current.scrollTop = 0
        }
      })
      
      return () => {
        unsubscribe()
        if (sessionId) {
          subscriptionDebugger.endSession(sessionId)
        }
      }
    }
  }, [isActive, currentSession, autoScroll])

  // Update metrics periodically
  useEffect(() => {
    if (!isActive) return

    const interval = setInterval(() => {
      setMetrics(subscriptionDebugger.getMetrics())
      setSubscriptions(subscriptionStateManager.getAllSubscriptions())
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive])

  // Filter logs based on search and filters
  useEffect(() => {
    let filtered = logs

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by levels
    filtered = filtered.filter(log => selectedLevels.includes(log.level))

    // Filter by categories
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(log => selectedCategories.includes(log.category))
    }

    setFilteredLogs(filtered)
  }, [logs, searchTerm, selectedLevels, selectedCategories])

  const toggleDebugging = () => {
    if (isActive) {
      setIsActive(false)
      setCurrentSession(null)
    } else {
      setIsActive(true)
    }
  }

  const clearLogs = () => {
    subscriptionDebugger.clearLogs()
    setLogs([])
    setFilteredLogs([])
  }

  const exportLogs = () => {
    const data = {
      session: currentSession,
      logs: filteredLogs,
      metrics,
      exportedAt: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `debug-logs-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />
      case 'warn': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'info': return <Info className="h-4 w-4 text-blue-500" />
      case 'debug': return <Activity className="h-4 w-4 text-gray-500" />
      default: return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  const getLogColor = (level: string) => {
    switch (level) {
      case 'error': return 'border-l-red-500 bg-red-50 dark:bg-red-950'
      case 'warn': return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950'
      case 'info': return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950'
      case 'debug': return 'border-l-gray-500 bg-gray-50 dark:bg-gray-950'
      default: return 'border-l-gray-300 bg-gray-50 dark:bg-gray-950'
    }
  }

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'error': return 'destructive'
      case 'warn': return 'secondary'
      case 'info': return 'default'
      case 'debug': return 'outline'
      default: return 'outline'
    }
  }

  const getConnectionStatus = () => {
    const healthMetrics = subscriptionHealthMonitor.getHealthMetrics()
    return {
      status: healthMetrics.overallHealth,
      subscriptions: subscriptions.length,
      active: subscriptions.filter(s => s.status === 'subscribed').length,
      errors: subscriptions.filter(s => s.status === 'error').length
    }
  }

  const connectionStatus = getConnectionStatus()

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Real-time Debug Console
              </CardTitle>
              <CardDescription>
                Monitor and debug real-time events, subscriptions, and performance
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={toggleDebugging}
                variant={isActive ? "destructive" : "default"}
                size="sm"
              >
                {isActive ? (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                    Stop Debugging
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Debugging
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Connection Status */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Wifi className="h-4 w-4" />
                <span className="text-sm font-medium">Status</span>
              </div>
              <Badge variant={connectionStatus.status === 'healthy' ? 'default' : 'destructive'}>
                {connectionStatus.status}
              </Badge>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium mb-1">Total</div>
              <div className="text-2xl font-bold">{connectionStatus.subscriptions}</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium mb-1">Active</div>
              <div className="text-2xl font-bold text-green-600">{connectionStatus.active}</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium mb-1">Errors</div>
              <div className="text-2xl font-bold text-red-600">{connectionStatus.errors}</div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={clearLogs}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <Button variant="outline" size="sm" onClick={exportLogs}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">Event Logs</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="metrics">Performance</TabsTrigger>
          <TabsTrigger value="health">Health Status</TabsTrigger>
        </TabsList>

        {/* Event Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Event Logs</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{filteredLogs.length} logs</Badge>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={autoScroll}
                      onChange={(e) => setAutoScroll(e.target.checked)}
                    />
                    Auto-scroll
                  </label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea ref={scrollAreaRef} className="h-96">
                <div className="space-y-2">
                  {filteredLogs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      {logs.length === 0 ? 'No logs yet. Start debugging to see events.' : 'No logs match the current filters.'}
                    </div>
                  ) : (
                    filteredLogs.map((log) => (
                      <div
                        key={log.id}
                        className={`p-3 rounded-lg border-l-4 ${getLogColor(log.level)}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getLogIcon(log.level)}
                            <Badge variant={getLevelBadgeColor(log.level)}>
                              {log.level.toUpperCase()}
                            </Badge>
                            <Badge variant="outline">{log.category}</Badge>
                            <span className="text-xs text-gray-500">
                              {log.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          {log.subscriptionId && (
                            <Badge variant="secondary" className="text-xs">
                              {log.subscriptionId.slice(-8)}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-2">
                          <p className="text-sm font-medium">{log.message}</p>
                          {log.data && (
                            <details className="mt-2">
                              <summary className="text-xs text-gray-500 cursor-pointer">
                                View Data
                              </summary>
                              <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1 overflow-x-auto">
                                {JSON.stringify(log.data, null, 2)}
                              </pre>
                            </details>
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

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {subscriptions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No subscriptions found.
                  </div>
                ) : (
                  subscriptions.map((subscription) => (
                    <div key={subscription.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{subscription.channelName}</div>
                          <div className="text-sm text-gray-500">{subscription.tableName}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            subscription.status === 'subscribed' ? 'default' :
                            subscription.status === 'error' ? 'destructive' :
                            'secondary'
                          }>
                            {subscription.status}
                          </Badge>
                          {subscription.priority && (
                            <Badge variant="outline">{subscription.priority}</Badge>
                          )}
                        </div>
                      </div>
                      {subscription.performance && (
                        <div className="mt-2 text-xs text-gray-500">
                          Messages: {subscription.performance.messageCount} | 
                          Errors: {subscription.performance.errorCount} |
                          Latency: {subscription.performance.averageLatency?.toFixed(0)}ms
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{metrics.totalSubscriptions}</div>
                    <div className="text-sm text-gray-500">Total Subscriptions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{metrics.activeSubscriptions}</div>
                    <div className="text-sm text-gray-500">Active</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{metrics.errorSubscriptions}</div>
                    <div className="text-sm text-gray-500">Errors</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{metrics.averageLatency?.toFixed(0)}ms</div>
                    <div className="text-sm text-gray-500">Avg Latency</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Start debugging to see performance metrics.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Health Status Tab */}
        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Health Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Health monitoring integration coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
