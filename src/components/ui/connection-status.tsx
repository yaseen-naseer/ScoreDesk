'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertTriangle, 
  Activity,
  Clock,
  Zap,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { useRealtime } from '@/lib/contexts/realtime-context'
import { formatDistanceToNow } from 'date-fns'

interface ConnectionStatusProps {
  showDetails?: boolean
  compact?: boolean
  className?: string
}

export function ConnectionStatus({ 
  showDetails = false, 
  compact = false, 
  className = '' 
}: ConnectionStatusProps) {
  const {
    connectionState,
    connectionMetrics,
    isConnected,
    isConnecting,
    hasError,
    forceReconnect,
    getConnectionQualityColor,
    getConnectionQualityIcon
  } = useRealtime()

  const getStatusIcon = () => {
    if (isConnecting) return <RefreshCw className="h-4 w-4 animate-spin" />
    if (hasError) return <AlertTriangle className="h-4 w-4 text-red-500" />
    if (isConnected) return <Wifi className="h-4 w-4 text-green-500" />
    return <WifiOff className="h-4 w-4 text-gray-500" />
  }

  const getStatusText = () => {
    switch (connectionState.status) {
      case 'connecting': return 'Connecting...'
      case 'connected': return 'Connected'
      case 'disconnected': return 'Disconnected'
      case 'reconnecting': return `Reconnecting... (${connectionState.reconnectAttempts}/${connectionState.maxReconnectAttempts})`
      case 'error': return 'Connection Error'
      default: return 'Unknown'
    }
  }

  const getStatusColor = () => {
    switch (connectionState.status) {
      case 'connecting':
      case 'reconnecting': return 'bg-yellow-500'
      case 'connected': return 'bg-green-500'
      case 'disconnected': return 'bg-gray-500'
      case 'error': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getLatencyText = () => {
    if (!connectionState.latency) return 'N/A'
    return `${Math.round(connectionState.latency)}ms`
  }

  const getUptimeText = () => {
    if (!connectionState.lastConnected) return 'Never'
    return formatDistanceToNow(connectionState.lastConnected, { addSuffix: true })
  }

  const getConnectionQualityBadge = () => {
    const quality = connectionState.connectionQuality
    const color = getConnectionQualityColor()
    const icon = getConnectionQualityIcon()
    
    return (
      <Badge variant="outline" className={`${color} border-current`}>
        {icon} {quality}
      </Badge>
    )
  }

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-2 ${className}`}>
              <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
              <span className="text-sm font-medium">{getStatusText()}</span>
              {isConnected && (
                <span className={`text-xs ${getConnectionQualityColor()}`}>
                  {getLatencyText()}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p>Status: {getStatusText()}</p>
              {isConnected && (
                <>
                  <p>Latency: {getLatencyText()}</p>
                  <p>Quality: {connectionState.connectionQuality}</p>
                  <p>Connected: {getUptimeText()}</p>
                </>
              )}
              {hasError && connectionState.error && (
                <p className="text-red-500">Error: {connectionState.error}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (!showDetails) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {getStatusIcon()}
        <span className="text-sm font-medium">{getStatusText()}</span>
        {isConnected && (
          <div className="flex items-center gap-1">
            <span className={`text-xs ${getConnectionQualityColor()}`}>
              {getLatencyText()}
            </span>
            {getConnectionQualityBadge()}
          </div>
        )}
        {hasError && (
          <Button
            variant="outline"
            size="sm"
            onClick={forceReconnect}
            className="h-6 px-2 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle className="text-lg">Connection Status</CardTitle>
          </div>
          {hasError && (
            <Button
              variant="outline"
              size="sm"
              onClick={forceReconnect}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          )}
        </div>
        <CardDescription>
          Real-time connection monitoring and metrics
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <Badge className={getStatusColor()}>
            {getStatusText()}
          </Badge>
        </div>

        {/* Connection Quality */}
        {isConnected && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Quality:</span>
            {getConnectionQualityBadge()}
          </div>
        )}

        {/* Latency */}
        {isConnected && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Latency:</span>
            <span className={`text-sm ${getConnectionQualityColor()}`}>
              {getLatencyText()}
            </span>
          </div>
        )}

        {/* Last Connected */}
        {connectionState.lastConnected && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Connected:</span>
            <span className="text-sm text-muted-foreground">
              {getUptimeText()}
            </span>
          </div>
        )}

        {/* Error Message */}
        {hasError && connectionState.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-700">Error:</span>
            </div>
            <p className="text-sm text-red-600 mt-1">{connectionState.error}</p>
          </div>
        )}

        {/* Connection Metrics */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Connection Metrics
          </h4>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center justify-between">
              <span>Total Connections:</span>
              <span className="font-mono">{connectionMetrics.totalConnections}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Successful:</span>
              <span className="font-mono text-green-600">{connectionMetrics.successfulConnections}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Failed:</span>
              <span className="font-mono text-red-600">{connectionMetrics.failedConnections}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Avg Latency:</span>
              <span className="font-mono">{Math.round(connectionMetrics.averageLatency)}ms</span>
            </div>
          </div>

          {/* Success Rate */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Success Rate:</span>
              <span className="text-sm font-mono">
                {connectionMetrics.totalConnections > 0 
                  ? Math.round((connectionMetrics.successfulConnections / connectionMetrics.totalConnections) * 100)
                  : 0}%
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: connectionMetrics.totalConnections > 0 
                    ? `${(connectionMetrics.successfulConnections / connectionMetrics.totalConnections) * 100}%`
                    : '0%'
                }}
              />
            </div>
          </div>
        </div>

        {/* Reconnection Info */}
        {connectionState.reconnectAttempts > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-yellow-600">
              <RefreshCw className="h-4 w-4" />
              <span>
                Reconnection attempt {connectionState.reconnectAttempts} of {connectionState.maxReconnectAttempts}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ConnectionStatus
