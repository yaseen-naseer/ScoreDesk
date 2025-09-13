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
  Signal, 
  SignalZero,
  SignalLow,
  SignalMedium,
  SignalHigh,
  Clock,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'
import { useOfflineDetector, useOnlineStatus } from '@/hooks/use-offline-detector'
import { formatDistanceToNow } from 'date-fns'

interface OfflineStatusProps {
  showDetails?: boolean
  compact?: boolean
  className?: string
}

export function OfflineStatus({ 
  showDetails = false, 
  compact = false, 
  className = '' 
}: OfflineStatusProps) {
  const {
    isOnline,
    connectionQuality,
    connectionType,
    lastOnline,
    lastOffline,
    offlineDuration,
    forceCheck,
    getStats
  } = useOfflineDetector()

  const getConnectionIcon = () => {
    if (!isOnline) return <WifiOff className="h-4 w-4 text-red-500" />
    
    switch (connectionQuality) {
      case 'excellent': return <SignalHigh className="h-4 w-4 text-green-500" />
      case 'good': return <SignalMedium className="h-4 w-4 text-blue-500" />
      case 'fair': return <SignalLow className="h-4 w-4 text-yellow-500" />
      case 'poor': return <SignalZero className="h-4 w-4 text-red-500" />
      default: return <Signal className="h-4 w-4 text-gray-500" />
    }
  }

  const getConnectionText = () => {
    if (!isOnline) return 'Offline'
    
    const quality = connectionQuality.charAt(0).toUpperCase() + connectionQuality.slice(1)
    const type = connectionType.charAt(0).toUpperCase() + connectionType.slice(1)
    
    return `${quality} (${type})`
  }

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500'
    
    switch (connectionQuality) {
      case 'excellent': return 'bg-green-500'
      case 'good': return 'bg-blue-500'
      case 'fair': return 'bg-yellow-500'
      case 'poor': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getOfflineDurationText = () => {
    if (!offlineDuration) return 'N/A'
    
    const minutes = Math.floor(offlineDuration / (1000 * 60))
    const seconds = Math.floor((offlineDuration % (1000 * 60)) / 1000)
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    }
    return `${seconds}s`
  }

  const getLastOnlineText = () => {
    if (!lastOnline) return 'Never'
    return formatDistanceToNow(lastOnline, { addSuffix: true })
  }

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-2 ${className}`}>
              <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
              <span className="text-sm font-medium">{getConnectionText()}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p>Status: {getConnectionText()}</p>
              {!isOnline && lastOffline && (
                <p>Offline since: {formatDistanceToNow(lastOffline, { addSuffix: true })}</p>
              )}
              {isOnline && lastOnline && (
                <p>Last online: {getLastOnlineText()}</p>
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
        {getConnectionIcon()}
        <span className="text-sm font-medium">{getConnectionText()}</span>
        {!isOnline && (
          <Button
            variant="outline"
            size="sm"
            onClick={forceCheck}
            className="h-6 px-2 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Check
          </Button>
        )}
      </div>
    )
  }

  const stats = getStats()

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getConnectionIcon()}
            <CardTitle className="text-lg">Connection Status</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={forceCheck}
            disabled={!isOnline}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Check
          </Button>
        </div>
        <CardDescription>
          Network connectivity and offline status monitoring
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <Badge className={getStatusColor()}>
            {getConnectionText()}
          </Badge>
        </div>

        {/* Connection Quality */}
        {isOnline && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Quality:</span>
            <span className="text-sm text-muted-foreground capitalize">
              {connectionQuality}
            </span>
          </div>
        )}

        {/* Connection Type */}
        {isOnline && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Type:</span>
            <span className="text-sm text-muted-foreground capitalize">
              {connectionType}
            </span>
          </div>
        )}

        {/* Last Online */}
        {lastOnline && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Last Online:</span>
            <span className="text-sm text-muted-foreground">
              {getLastOnlineText()}
            </span>
          </div>
        )}

        {/* Offline Duration */}
        {!isOnline && lastOffline && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Offline Duration:</span>
            <span className="text-sm text-red-600">
              {getOfflineDurationText()}
            </span>
          </div>
        )}

        {/* Offline Warning */}
        {!isOnline && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-700">Offline Mode</span>
            </div>
            <p className="text-sm text-red-600 mt-1">
              You're currently offline. Some features may be limited. Data will sync when connection is restored.
            </p>
          </div>
        )}

        {/* Connection Statistics */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Connection Statistics
          </h4>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center justify-between">
              <span>Uptime:</span>
              <span className="font-mono">{stats.uptimePercentage.toFixed(1)}%</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Offline Count:</span>
              <span className="font-mono">{stats.offlineCount}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Total Offline:</span>
              <span className="font-mono">
                {Math.round(stats.totalOfflineTime / (1000 * 60))}m
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Avg Offline:</span>
              <span className="font-mono">
                {Math.round(stats.averageOfflineDuration / (1000 * 60))}m
              </span>
            </div>
          </div>

          {/* Uptime Progress */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Uptime:</span>
              <span className="text-sm font-mono">{stats.uptimePercentage.toFixed(1)}%</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${stats.uptimePercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Last Offline Time */}
        {stats.lastOfflineTime && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Last offline: {formatDistanceToNow(stats.lastOfflineTime, { addSuffix: true })}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default OfflineStatus
