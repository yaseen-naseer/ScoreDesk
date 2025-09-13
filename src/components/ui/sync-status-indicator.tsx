'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Wifi, 
  WifiOff,
  Cloud,
  CloudOff,
  Database,
  AlertCircle
} from 'lucide-react'
import { useOfflineStorage, useSyncQueue } from '@/hooks/use-offline-storage'
import { useBackgroundSync } from '@/hooks/use-service-worker'
import { useConflictDetection } from '@/hooks/use-conflict-detection'
import { useRealtime } from '@/lib/contexts/realtime-context'

export interface SyncStatusIndicatorProps {
  variant?: 'compact' | 'detailed' | 'minimal'
  showOfflineData?: boolean
  showConflicts?: boolean
  showSyncQueue?: boolean
  showConnection?: boolean
  className?: string
  onSyncClick?: () => void
}

export function SyncStatusIndicator({
  variant = 'compact',
  showOfflineData = true,
  showConflicts = true,
  showSyncQueue = true,
  showConnection = true,
  className = '',
  onSyncClick
}: SyncStatusIndicatorProps) {
  // Return null during SSR to avoid browser-only API issues
  if (typeof window === 'undefined') {
    return null
  }

  const { isOnline } = useRealtime()
  const { stats: offlineStats } = useOfflineStorage()
  const { pendingItems } = useSyncQueue()
  const { syncStatus } = useBackgroundSync()
  const { conflicts } = useConflictDetection()

  // Determine overall sync status
  const getSyncStatus = () => {
    if (!isOnline) return 'offline'
    if (conflicts.length > 0) return 'conflicts'
    if (pendingItems.length > 0) return 'pending'
    if (syncStatus.pendingItems > 0) return 'syncing'
    return 'synced'
  }

  const currentSyncStatus = getSyncStatus()

  // Get status icon and color
  const getStatusDisplay = () => {
    switch (currentSyncStatus) {
      case 'offline':
        return {
          icon: <WifiOff className="h-4 w-4" />,
          color: 'text-red-500',
          bgColor: 'bg-red-500',
          text: 'Offline',
          description: 'No internet connection'
        }
      case 'conflicts':
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          color: 'text-orange-500',
          bgColor: 'bg-orange-500',
          text: 'Conflicts',
          description: `${conflicts.length} conflicts need resolution`
        }
      case 'pending':
        return {
          icon: <Clock className="h-4 w-4" />,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500',
          text: 'Pending',
          description: `${pendingItems.length} items pending sync`
        }
      case 'syncing':
        return {
          icon: <RefreshCw className="h-4 w-4 animate-spin" />,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500',
          text: 'Syncing',
          description: 'Synchronizing data...'
        }
      case 'synced':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          color: 'text-green-500',
          bgColor: 'bg-green-500',
          text: 'Synced',
          description: 'All data synchronized'
        }
      default:
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          color: 'text-gray-500',
          bgColor: 'bg-gray-500',
          text: 'Unknown',
          description: 'Sync status unknown'
        }
    }
  }

  const statusDisplay = getStatusDisplay()

  if (variant === 'minimal') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-1 ${className}`}>
              <div className={`w-2 h-2 rounded-full ${statusDisplay.bgColor}`} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{statusDisplay.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-2 ${className}`}>
              {statusDisplay.icon}
              <span className="text-sm font-medium">{statusDisplay.text}</span>
              {showSyncQueue && pendingItems.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {pendingItems.length}
                </Badge>
              )}
              {showConflicts && conflicts.length > 0 && (
                <Badge variant="outline" className="text-xs text-orange-600 border-orange-600">
                  {conflicts.length}
                </Badge>
              )}
              {onSyncClick && currentSyncStatus !== 'synced' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSyncClick}
                  className="h-6 w-6 p-0"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p>{statusDisplay.description}</p>
              {showOfflineData && offlineStats && (
                <p className="text-xs">
                  Offline: {offlineStats.totalMatches} matches
                </p>
              )}
              {showSyncQueue && pendingItems.length > 0 && (
                <p className="text-xs">
                  Queue: {pendingItems.length} pending
                </p>
              )}
              {showConflicts && conflicts.length > 0 && (
                <p className="text-xs">
                  Conflicts: {conflicts.length} unresolved
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Detailed variant
  return (
    <div className={`space-y-2 ${className}`}>
      {/* Main Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {statusDisplay.icon}
          <span className="font-medium">{statusDisplay.text}</span>
          <Badge className={statusDisplay.bgColor}>
            {statusDisplay.text}
          </Badge>
        </div>
        {onSyncClick && currentSyncStatus !== 'synced' && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSyncClick}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync
          </Button>
        )}
      </div>

      {/* Status Description */}
      <p className="text-sm text-muted-foreground">
        {statusDisplay.description}
      </p>

      {/* Detailed Information */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        {showConnection && (
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        )}

        {showOfflineData && offlineStats && (
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-blue-500" />
            <span>{offlineStats.totalMatches} offline matches</span>
          </div>
        )}

        {showSyncQueue && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-500" />
            <span>{pendingItems.length} pending sync</span>
          </div>
        )}

        {showConflicts && (
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span>{conflicts.length} conflicts</span>
          </div>
        )}
      </div>

      {/* Progress Indicators */}
      {currentSyncStatus === 'syncing' && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Syncing...</span>
            <span>{syncStatus.pendingItems} items</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      )}
    </div>
  )
}

export default SyncStatusIndicator
