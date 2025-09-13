'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Wifi, 
  WifiOff,
  Database,
  Settings,
  Download,
  Upload,
  Zap
} from 'lucide-react'
import { SyncStatusIndicator } from './sync-status-indicator'
import { SyncProgressBar } from './sync-progress-bar'
import { ConflictStatusDashboard } from './conflict-status-dashboard'
import { OfflineStorageStatus } from './offline-storage-status'
import { useOfflineStorage, useSyncQueue } from '@/hooks/use-offline-storage'
import { useBackgroundSync } from '@/hooks/use-service-worker'
import { useConflictDetection } from '@/hooks/use-conflict-detection'
import { useRealtime } from '@/lib/contexts/realtime-context'

export interface SyncStatusHeaderProps {
  variant?: 'compact' | 'detailed'
  showOfflineData?: boolean
  showConflicts?: boolean
  showSyncQueue?: boolean
  showConnection?: boolean
  className?: string
  userId?: string
  organizationId?: string
  matchId?: string
  tournamentId?: string
}

export function SyncStatusHeader({
  variant = 'compact',
  showOfflineData = true,
  showConflicts = true,
  showSyncQueue = true,
  showConnection = true,
  className = '',
  userId,
  organizationId,
  matchId,
  tournamentId
}: SyncStatusHeaderProps) {
  // Return null during SSR to avoid browser-only API issues
  if (typeof window === 'undefined') {
    return null
  }

  const { isOnline } = useRealtime()
  const { stats: offlineStats, refresh: refreshOfflineStats } = useOfflineStorage()
  const { pendingItems, refresh: refreshSyncQueue } = useSyncQueue()
  const { syncStatus, triggerSync } = useBackgroundSync()
  const { conflicts, stats: conflictStats } = useConflictDetection()

  const [showDetails, setShowDetails] = useState(false)

  // Determine overall status
  const getOverallStatus = () => {
    if (!isOnline) return 'offline'
    if (conflicts.length > 0) return 'conflicts'
    if (pendingItems.length > 0 || syncStatus.pendingItems > 0) return 'pending'
    return 'synced'
  }

  const overallStatus = getOverallStatus()

  // Get status icon and color
  const getStatusDisplay = () => {
    switch (overallStatus) {
      case 'offline':
        return {
          icon: <WifiOff className="h-4 w-4" />,
          color: 'text-red-500',
          bgColor: 'bg-red-500',
          text: 'Offline'
        }
      case 'conflicts':
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          color: 'text-orange-500',
          bgColor: 'bg-orange-500',
          text: 'Conflicts'
        }
      case 'pending':
        return {
          icon: <Clock className="h-4 w-4" />,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500',
          text: 'Pending'
        }
      case 'synced':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          color: 'text-green-500',
          bgColor: 'bg-green-500',
          text: 'Synced'
        }
      default:
        return {
          icon: <XCircle className="h-4 w-4" />,
          color: 'text-gray-500',
          bgColor: 'bg-gray-500',
          text: 'Unknown'
        }
    }
  }

  const statusDisplay = getStatusDisplay()

  const handleSync = () => {
    if (isOnline) {
      triggerSync()
      refreshOfflineStats()
      refreshSyncQueue()
    }
  }

  const handleRefresh = () => {
    refreshOfflineStats()
    refreshSyncQueue()
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <SyncStatusIndicator
          variant="compact"
          showOfflineData={showOfflineData}
          showConflicts={showConflicts}
          showSyncQueue={showSyncQueue}
          showConnection={showConnection}
          onSyncClick={handleSync}
        />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuItem onClick={handleSync} disabled={!isOnline}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Now
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleRefresh}>
              <Database className="h-4 w-4 mr-2" />
              Refresh Status
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowDetails(true)}>
              <Settings className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  // Detailed variant
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Status Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {statusDisplay.icon}
            <span className="font-medium">{statusDisplay.text}</span>
            <Badge className={statusDisplay.bgColor}>
              {statusDisplay.text}
            </Badge>
          </div>
          
          {/* Quick Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {showConnection && (
              <div className="flex items-center gap-1">
                {isOnline ? (
                  <Wifi className="h-3 w-3 text-green-500" />
                ) : (
                  <WifiOff className="h-3 w-3 text-red-500" />
                )}
                <span>{isOnline ? 'Online' : 'Offline'}</span>
              </div>
            )}
            
            {showOfflineData && offlineStats && (
              <div className="flex items-center gap-1">
                <Database className="h-3 w-3 text-blue-500" />
                <span>{offlineStats.totalMatches} offline</span>
              </div>
            )}
            
            {showSyncQueue && pendingItems.length > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-yellow-500" />
                <span>{pendingItems.length} pending</span>
              </div>
            )}
            
            {showConflicts && conflicts.length > 0 && (
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-orange-500" />
                <span>{conflicts.length} conflicts</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={!isOnline}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
          >
            <Database className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            <Settings className="h-4 w-4 mr-2" />
            {showDetails ? 'Hide' : 'Details'}
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <SyncProgressBar
        showDetails={false}
        showQueue={showSyncQueue}
        showConflicts={showConflicts}
      />

      {/* Detailed View */}
      {showDetails && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {showConflicts && (
            <ConflictStatusDashboard
              showDetails={false}
              compact={true}
              userId={userId}
              organizationId={organizationId}
              matchId={matchId}
              tournamentId={tournamentId}
            />
          )}
          
          {showOfflineData && (
            <OfflineStorageStatus
              showDetails={false}
              compact={true}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default SyncStatusHeader
