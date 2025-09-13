'use client'

import React from 'react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Pause,
  Play
} from 'lucide-react'
import { useSyncQueue } from '@/hooks/use-offline-storage'
import { useBackgroundSync } from '@/hooks/use-service-worker'
import { useConflictDetection } from '@/hooks/use-conflict-detection'

export interface SyncProgressBarProps {
  showDetails?: boolean
  showControls?: boolean
  showQueue?: boolean
  showConflicts?: boolean
  className?: string
  onPause?: () => void
  onResume?: () => void
  onRetry?: () => void
}

export function SyncProgressBar({
  showDetails = false,
  showControls = false,
  showQueue = true,
  showConflicts = true,
  className = '',
  onPause,
  onResume,
  onRetry
}: SyncProgressBarProps) {
  const { pendingItems, isLoading } = useSyncQueue()
  const { syncStatus } = useBackgroundSync()
  const { conflicts } = useConflictDetection()

  // Calculate progress
  const totalItems = pendingItems.length + syncStatus.pendingItems
  const completedItems = Math.max(0, totalItems - pendingItems.length - syncStatus.pendingItems)
  const progressPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 100

  // Determine status
  const getSyncStatus = () => {
    if (conflicts.length > 0) return 'conflicts'
    if (isLoading || syncStatus.pendingItems > 0) return 'syncing'
    if (pendingItems.length > 0) return 'pending'
    return 'completed'
  }

  const status = getSyncStatus()

  // Get status display
  const getStatusDisplay = () => {
    switch (status) {
      case 'conflicts':
        return {
          icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
          text: 'Conflicts Detected',
          color: 'text-orange-600',
          bgColor: 'bg-orange-100 border-orange-200'
        }
      case 'syncing':
        return {
          icon: <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />,
          text: 'Synchronizing',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100 border-blue-200'
        }
      case 'pending':
        return {
          icon: <Clock className="h-4 w-4 text-yellow-500" />,
          text: 'Pending Sync',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100 border-yellow-200'
        }
      case 'completed':
        return {
          icon: <CheckCircle className="h-4 w-4 text-green-500" />,
          text: 'Synchronized',
          color: 'text-green-600',
          bgColor: 'bg-green-100 border-green-200'
        }
      default:
        return {
          icon: <XCircle className="h-4 w-4 text-gray-500" />,
          text: 'Unknown',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100 border-gray-200'
        }
    }
  }

  const statusDisplay = getStatusDisplay()

  if (!showDetails) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex-1">
          <Progress value={progressPercentage} className="h-2" />
        </div>
        <div className="flex items-center gap-2">
          {statusDisplay.icon}
          <span className="text-sm font-medium">{statusDisplay.text}</span>
          {totalItems > 0 && (
            <Badge variant="outline" className="text-xs">
              {completedItems}/{totalItems}
            </Badge>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card className={`border ${statusDisplay.bgColor} ${className}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {statusDisplay.icon}
              <span className={`font-medium ${statusDisplay.color}`}>
                {statusDisplay.text}
              </span>
            </div>
            
            {showControls && (
              <div className="flex items-center gap-2">
                {status === 'syncing' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onPause}
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onResume}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </Button>
                )}
                
                {status === 'conflicts' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRetry}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{completedItems} of {totalItems} items</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {showQueue && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span>Queue: {pendingItems.length}</span>
              </div>
            )}

            {showConflicts && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span>Conflicts: {conflicts.length}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Completed: {completedItems}</span>
            </div>

            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-blue-500" />
              <span>Syncing: {syncStatus.pendingItems}</span>
            </div>
          </div>

          {/* Status Messages */}
          {status === 'conflicts' && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
              <p className="text-sm text-orange-700">
                {conflicts.length} conflicts detected. Please resolve them to continue synchronization.
              </p>
            </div>
          )}

          {status === 'syncing' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">
                Synchronizing data with server... This may take a few moments.
              </p>
            </div>
          )}

          {status === 'completed' && totalItems === 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-700">
                All data is synchronized and up to date.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default SyncProgressBar
