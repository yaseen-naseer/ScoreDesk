'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  RefreshCw,
  Wifi,
  WifiOff,
  Database,
  AlertCircle
} from 'lucide-react'
import { useOfflineStorage, useSyncQueue } from '@/hooks/use-offline-storage'
import { useBackgroundSync } from '@/hooks/use-service-worker'
import { useConflictDetection } from '@/hooks/use-conflict-detection'
import { useRealtime } from '@/lib/contexts/realtime-context'

export interface SyncStatusBadgeProps {
  variant?: 'default' | 'outline' | 'secondary' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  showText?: boolean
  showCount?: boolean
  showTooltip?: boolean
  className?: string
}

export function SyncStatusBadge({
  variant = 'default',
  size = 'md',
  showIcon = true,
  showText = true,
  showCount = true,
  showTooltip = true,
  className = ''
}: SyncStatusBadgeProps) {
  const { isOnline } = useRealtime()
  const { stats: offlineStats } = useOfflineStorage()
  const { pendingItems } = useSyncQueue()
  const { syncStatus } = useBackgroundSync()
  const { conflicts } = useConflictDetection()

  // Determine sync status
  const getSyncStatus = () => {
    if (!isOnline) return 'offline'
    if (conflicts.length > 0) return 'conflicts'
    if (pendingItems.length > 0 || syncStatus.pendingItems > 0) return 'pending'
    return 'synced'
  }

  const syncStatus = getSyncStatus()

  // Get status display
  const getStatusDisplay = () => {
    switch (syncStatus) {
      case 'offline':
        return {
          icon: <WifiOff className="h-3 w-3" />,
          text: 'Offline',
          variant: 'destructive' as const,
          count: 0,
          tooltip: 'No internet connection. Data will sync when online.'
        }
      case 'conflicts':
        return {
          icon: <AlertTriangle className="h-3 w-3" />,
          text: 'Conflicts',
          variant: 'destructive' as const,
          count: conflicts.length,
          tooltip: `${conflicts.length} conflicts need resolution`
        }
      case 'pending':
        return {
          icon: <Clock className="h-3 w-3" />,
          text: 'Pending',
          variant: 'secondary' as const,
          count: pendingItems.length + syncStatus.pendingItems,
          tooltip: `${pendingItems.length + syncStatus.pendingItems} items pending sync`
        }
      case 'synced':
        return {
          icon: <CheckCircle className="h-3 w-3" />,
          text: 'Synced',
          variant: 'default' as const,
          count: 0,
          tooltip: 'All data synchronized'
        }
      default:
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          text: 'Unknown',
          variant: 'secondary' as const,
          count: 0,
          tooltip: 'Sync status unknown'
        }
    }
  }

  const statusDisplay = getStatusDisplay()

  // Size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-1'
      case 'md':
        return 'text-sm px-3 py-1'
      case 'lg':
        return 'text-base px-4 py-2'
      default:
        return 'text-sm px-3 py-1'
    }
  }

  // Icon size classes
  const getIconSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-3 w-3'
      case 'md':
        return 'h-4 w-4'
      case 'lg':
        return 'h-5 w-5'
      default:
        return 'h-4 w-4'
    }
  }

  const badgeContent = (
    <Badge
      variant={variant === 'default' ? statusDisplay.variant : variant}
      className={`${getSizeClasses()} ${className}`}
    >
      <div className="flex items-center gap-1">
        {showIcon && (
          <div className={getIconSizeClasses()}>
            {statusDisplay.icon}
          </div>
        )}
        {showText && (
          <span>{statusDisplay.text}</span>
        )}
        {showCount && statusDisplay.count > 0 && (
          <span className="ml-1">({statusDisplay.count})</span>
        )}
      </div>
    </Badge>
  )

  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badgeContent}
          </TooltipTrigger>
          <TooltipContent>
            <p>{statusDisplay.tooltip}</p>
            {offlineStats && offlineStats.totalMatches > 0 && (
              <p className="text-xs mt-1">
                {offlineStats.totalMatches} matches available offline
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return badgeContent
}

export default SyncStatusBadge
