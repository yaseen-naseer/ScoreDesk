'use client'

import React, { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  RefreshCw,
  Wifi,
  WifiOff,
  Database,
  AlertCircle,
  X
} from 'lucide-react'
import { useOfflineStorage, useSyncQueue } from '@/hooks/use-offline-storage'
import { useBackgroundSync } from '@/hooks/use-service-worker'
import { useConflictDetection } from '@/hooks/use-conflict-detection'
import { useRealtime } from '@/lib/contexts/realtime-context'

export interface SyncNotificationProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
  autoHide?: boolean
  hideDelay?: number
  showOfflineNotification?: boolean
  showConflictNotification?: boolean
  showSyncNotification?: boolean
  onDismiss?: (type: string) => void
  className?: string
}

export interface NotificationState {
  id: string
  type: 'offline' | 'online' | 'conflict' | 'sync-start' | 'sync-complete' | 'sync-error' | 'conflict-resolved'
  title: string
  message: string
  severity: 'info' | 'warning' | 'error' | 'success'
  timestamp: Date
  persistent?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

export function SyncNotification({
  position = 'top-right',
  autoHide = true,
  hideDelay = 5000,
  showOfflineNotification = true,
  showConflictNotification = true,
  showSyncNotification = true,
  onDismiss,
  className = ''
}: SyncNotificationProps) {
  const { isOnline } = useRealtime()
  const { stats: offlineStats } = useOfflineStorage()
  const { pendingItems, isLoading } = useSyncQueue()
  const { syncStatus } = useBackgroundSync()
  const { conflicts, stats: conflictStats } = useConflictDetection()

  const [notifications, setNotifications] = useState<NotificationState[]>([])
  const [previousStates, setPreviousStates] = useState({
    isOnline: true,
    conflictsCount: 0,
    pendingItemsCount: 0,
    syncStatus: 'idle'
  })

  // Position classes
  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4'
      case 'top-left':
        return 'top-4 left-4'
      case 'bottom-right':
        return 'bottom-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2'
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2'
      default:
        return 'top-4 right-4'
    }
  }

  // Add notification
  const addNotification = (notification: Omit<NotificationState, 'id' | 'timestamp'>) => {
    const newNotification: NotificationState = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    }

    setNotifications(prev => [...prev, newNotification])

    // Auto-hide notification
    if (autoHide && !notification.persistent) {
      setTimeout(() => {
        removeNotification(newNotification.id)
      }, hideDelay)
    }
  }

  // Remove notification
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  // Monitor state changes and show notifications
  useEffect(() => {
    const currentStates = {
      isOnline,
      conflictsCount: conflicts.length,
      pendingItemsCount: pendingItems.length,
      syncStatus: isLoading ? 'syncing' : 'idle'
    }

    // Online/Offline notifications
    if (showOfflineNotification) {
      if (!previousStates.isOnline && isOnline) {
        addNotification({
          type: 'online',
          title: 'Connection Restored',
          message: 'You are back online. Data will sync automatically.',
          severity: 'success',
          action: {
            label: 'Sync Now',
            onClick: () => {
              // Trigger sync
              console.log('Manual sync triggered')
            }
          }
        })
      } else if (previousStates.isOnline && !isOnline) {
        addNotification({
          type: 'offline',
          title: 'Connection Lost',
          message: 'You are offline. Changes will be saved locally.',
          severity: 'warning',
          persistent: true
        })
      }
    }

    // Conflict notifications
    if (showConflictNotification) {
      if (conflicts.length > previousStates.conflictsCount) {
        const newConflicts = conflicts.length - previousStates.conflictsCount
        addNotification({
          type: 'conflict',
          title: 'Data Conflicts Detected',
          message: `${newConflicts} new conflict${newConflicts > 1 ? 's' : ''} detected. Please resolve them.`,
          severity: 'warning',
          action: {
            label: 'Resolve',
            onClick: () => {
              // Open conflict resolution dialog
              console.log('Open conflict resolution')
            }
          }
        })
      } else if (conflicts.length < previousStates.conflictsCount) {
        const resolvedConflicts = previousStates.conflictsCount - conflicts.length
        addNotification({
          type: 'conflict-resolved',
          title: 'Conflicts Resolved',
          message: `${resolvedConflicts} conflict${resolvedConflicts > 1 ? 's' : ''} resolved successfully.`,
          severity: 'success'
        })
      }
    }

    // Sync notifications
    if (showSyncNotification) {
      if (isLoading && previousStates.syncStatus !== 'syncing') {
        addNotification({
          type: 'sync-start',
          title: 'Synchronizing',
          message: 'Syncing data with server...',
          severity: 'info'
        })
      } else if (!isLoading && previousStates.syncStatus === 'syncing') {
        addNotification({
          type: 'sync-complete',
          title: 'Sync Complete',
          message: 'All data synchronized successfully.',
          severity: 'success'
        })
      }
    }

    setPreviousStates(currentStates)
  }, [isOnline, conflicts.length, pendingItems.length, isLoading, showOfflineNotification, showConflictNotification, showSyncNotification])

  // Get notification icon
  const getNotificationIcon = (type: NotificationState['type']) => {
    switch (type) {
      case 'offline':
        return <WifiOff className="h-4 w-4" />
      case 'online':
        return <Wifi className="h-4 w-4" />
      case 'conflict':
        return <AlertTriangle className="h-4 w-4" />
      case 'conflict-resolved':
        return <CheckCircle className="h-4 w-4" />
      case 'sync-start':
        return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'sync-complete':
        return <CheckCircle className="h-4 w-4" />
      case 'sync-error':
        return <XCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  // Get notification severity styles
  const getSeverityStyles = (severity: NotificationState['severity']) => {
    switch (severity) {
      case 'success':
        return 'border-green-200 bg-green-50 text-green-800'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800'
      case 'error':
        return 'border-red-200 bg-red-50 text-red-800'
      case 'info':
        return 'border-blue-200 bg-blue-50 text-blue-800'
      default:
        return 'border-gray-200 bg-gray-50 text-gray-800'
    }
  }

  if (notifications.length === 0) {
    return null
  }

  return (
    <div className={`fixed ${getPositionClasses()} z-50 space-y-2 max-w-sm ${className}`}>
      {notifications.map((notification) => (
        <Alert
          key={notification.id}
          className={`border ${getSeverityStyles(notification.severity)} shadow-lg`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {getNotificationIcon(notification.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">{notification.title}</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    removeNotification(notification.id)
                    onDismiss?.(notification.type)
                  }}
                  className="h-6 w-6 p-0 hover:bg-transparent"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              
              <AlertDescription className="text-sm mt-1">
                {notification.message}
              </AlertDescription>
              
              {notification.action && (
                <div className="mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={notification.action.onClick}
                    className="h-7 text-xs"
                  >
                    {notification.action.label}
                  </Button>
                </div>
              )}
              
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {notification.type.replace('-', ' ')}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {notification.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        </Alert>
      ))}
    </div>
  )
}

export default SyncNotification
