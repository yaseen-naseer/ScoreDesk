'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  Activity, 
  Database, 
  Wifi, 
  Cpu, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { healthMonitor, HealthMetrics, HealthCheck } from '@/lib/utils/health-monitor'
import { useRealtime } from '@/lib/contexts/realtime-context'
import { useSupabase } from '@/components/providers/supabase-provider'
import { formatDistanceToNow } from 'date-fns'

interface HealthDashboardProps {
  className?: string
}

export function HealthDashboard({ className = '' }: HealthDashboardProps) {
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { realtimeManager } = useRealtime()
  const { supabase } = useSupabase()

  // Initialize health checks
  useEffect(() => {
    // Register health checks
    healthMonitor.registerCheck('database', 'Database Connection', () => 
      healthMonitor.HealthChecks.database(supabase)
    )
    
    healthMonitor.registerCheck('realtime', 'Real-time Connection', () => 
      healthMonitor.HealthChecks.realtime(realtimeManager)
    )
    
    healthMonitor.registerCheck('network', 'Network Connectivity', () => 
      healthMonitor.HealthChecks.network()
    )
    
    healthMonitor.registerCheck('performance', 'Browser Performance', () => 
      healthMonitor.HealthChecks.performance()
    )

    // Start monitoring
    healthMonitor.start(30000) // Check every 30 seconds

    // Initial metrics fetch
    updateMetrics()

    return () => {
      healthMonitor.stop()
    }
  }, [supabase, realtimeManager])

  const updateMetrics = async () => {
    const newMetrics = healthMonitor.getHealthMetrics()
    setMetrics(newMetrics)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    
    // Force all checks
    const checkIds = ['database', 'realtime', 'network', 'performance']
    await Promise.all(checkIds.map(id => healthMonitor.forceCheck(id)))
    
    await updateMetrics()
    setIsRefreshing(false)
  }

  const getStatusIcon = (status: HealthCheck['status']) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'degraded': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'unhealthy': return <XCircle className="h-4 w-4 text-red-500" />
      default: return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: HealthCheck['status']) => {
    switch (status) {
      case 'healthy': return 'bg-green-500'
      case 'degraded': return 'bg-yellow-500'
      case 'unhealthy': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getOverallStatusColor = () => {
    if (!metrics) return 'text-gray-500'
    switch (metrics.overallStatus) {
      case 'healthy': return 'text-green-500'
      case 'degraded': return 'text-yellow-500'
      case 'unhealthy': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getUptimeText = (uptime: number) => {
    const hours = Math.floor(uptime / (1000 * 60 * 60))
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  if (!metrics) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading health metrics...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <CardTitle>System Health</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <CardDescription>
          Real-time system health monitoring and diagnostics
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="checks">Health Checks</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Overall Status */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(metrics.overallStatus)}`} />
                <span className="font-medium">Overall Status</span>
              </div>
              <Badge variant="outline" className={getOverallStatusColor()}>
                {metrics.overallStatus.toUpperCase()}
              </Badge>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Uptime</span>
                </div>
                <p className="text-2xl font-bold">{getUptimeText(metrics.uptime)}</p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Avg Response</span>
                </div>
                <p className="text-2xl font-bold">{Math.round(metrics.averageResponseTime)}ms</p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">Error Rate</span>
                </div>
                <p className="text-2xl font-bold">{metrics.errorRate.toFixed(1)}%</p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Healthy Checks</span>
                </div>
                <p className="text-2xl font-bold">
                  {metrics.checks.filter(c => c.status === 'healthy').length}/{metrics.checks.length}
                </p>
              </div>
            </div>

            {/* Status Summary */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-3">Status Summary</h4>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm">
                    {metrics.checks.filter(c => c.status === 'healthy').length} Healthy
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-sm">
                    {metrics.checks.filter(c => c.status === 'degraded').length} Degraded
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm">
                    {metrics.checks.filter(c => c.status === 'unhealthy').length} Unhealthy
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="checks" className="space-y-4">
            {metrics.checks.map((check) => (
              <div key={check.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(check.status)}
                    <span className="font-medium">{check.name}</span>
                  </div>
                  <Badge variant="outline" className={getOverallStatusColor()}>
                    {check.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Last Check:</span>
                    <p>{formatDistanceToNow(check.lastCheck, { addSuffix: true })}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Response Time:</span>
                    <p>{check.responseTime ? `${Math.round(check.responseTime)}ms` : 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ID:</span>
                    <p className="font-mono text-xs">{check.id}</p>
                  </div>
                </div>

                {check.error && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700">{check.error}</p>
                  </div>
                )}

                {check.metadata && Object.keys(check.metadata).length > 0 && (
                  <div className="mt-3 p-3 bg-gray-50 border rounded-md">
                    <h5 className="text-sm font-medium mb-2">Metadata:</h5>
                    <div className="space-y-1">
                      {Object.entries(check.metadata).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{key}:</span>
                          <span className="font-mono">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            {/* Performance Metrics */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-3">Performance Metrics</h4>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Average Response Time</span>
                    <span>{Math.round(metrics.averageResponseTime)}ms</span>
                  </div>
                  <Progress 
                    value={Math.min((metrics.averageResponseTime / 1000) * 100, 100)} 
                    className="h-2"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Error Rate</span>
                    <span>{metrics.errorRate.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={metrics.errorRate} 
                    className="h-2"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>System Uptime</span>
                    <span>{getUptimeText(metrics.uptime)}</span>
                  </div>
                  <Progress 
                    value={Math.min((metrics.uptime / (24 * 60 * 60 * 1000)) * 100, 100)} 
                    className="h-2"
                  />
                </div>
              </div>
            </div>

            {/* Check Details */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-3">Check Details</h4>
              
              <div className="space-y-2">
                {metrics.checks.map((check) => (
                  <div key={check.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(check.status)}
                      <span className="text-sm">{check.name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {check.responseTime ? `${Math.round(check.responseTime)}ms` : 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* System Info */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-3">System Information</h4>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Checks:</span>
                  <p className="font-medium">{metrics.checks.length}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Last Updated:</span>
                  <p className="font-medium">{formatDistanceToNow(metrics.lastUpdated, { addSuffix: true })}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Monitoring Status:</span>
                  <p className="font-medium">{healthMonitor.isMonitoring() ? 'Active' : 'Inactive'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Browser:</span>
                  <p className="font-medium text-xs">{navigator.userAgent.split(' ').slice(-2).join(' ')}</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default HealthDashboard
