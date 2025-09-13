'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Settings, 
  RefreshCw, 
  Download, 
  Wifi, 
  WifiOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Bell,
  BellOff
} from 'lucide-react'
import { useServiceWorker, useBackgroundSync, useServiceWorkerNotifications, useServiceWorkerUpdate } from '@/hooks/use-service-worker'
import { formatDistanceToNow } from 'date-fns'

interface ServiceWorkerStatusProps {
  showDetails?: boolean
  compact?: boolean
  className?: string
}

export function ServiceWorkerStatus({ 
  showDetails = false, 
  compact = false, 
  className = '' 
}: ServiceWorkerStatusProps) {
  const { status, isReady, updateServiceWorker, cacheMatchData } = useServiceWorker()
  const { syncStatus, isLoading, registerBackgroundSync, triggerSync } = useBackgroundSync()
  const { permission, requestPermission, showNotification } = useServiceWorkerNotifications()
  const { hasUpdate, showUpdatePrompt, handleUpdate, handleSkipWaiting, dismissUpdatePrompt } = useServiceWorkerUpdate()

  const getStatusIcon = () => {
    if (!status.isSupported) return <XCircle className="h-4 w-4 text-red-500" />
    if (status.isActive) return <CheckCircle className="h-4 w-4 text-green-500" />
    if (status.isInstalling) return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
    if (status.isWaiting) return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    return <XCircle className="h-4 w-4 text-gray-500" />
  }

  const getStatusText = () => {
    if (!status.isSupported) return 'Not Supported'
    if (status.isActive) return 'Active'
    if (status.isInstalling) return 'Installing'
    if (status.isWaiting) return 'Update Available'
    if (status.isRegistered) return 'Registered'
    return 'Not Registered'
  }

  const getStatusColor = () => {
    if (!status.isSupported) return 'bg-red-500'
    if (status.isActive) return 'bg-green-500'
    if (status.isInstalling) return 'bg-blue-500'
    if (status.isWaiting) return 'bg-yellow-500'
    return 'bg-gray-500'
  }

  const getSyncStatusIcon = () => {
    if (!syncStatus.isSupported) return <XCircle className="h-4 w-4 text-red-500" />
    if (syncStatus.pendingItems > 0) return <Clock className="h-4 w-4 text-orange-500" />
    return <CheckCircle className="h-4 w-4 text-green-500" />
  }

  const getNotificationIcon = () => {
    if (permission === 'granted') return <Bell className="h-4 w-4 text-green-500" />
    if (permission === 'denied') return <BellOff className="h-4 w-4 text-red-500" />
    return <Bell className="h-4 w-4 text-gray-500" />
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {getStatusIcon()}
        <span className="text-sm font-medium">{getStatusText()}</span>
        {syncStatus.pendingItems > 0 && (
          <Badge variant="outline" className="text-orange-600 border-orange-600">
            {syncStatus.pendingItems} sync
          </Badge>
        )}
      </div>
    )
  }

  if (!showDetails) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {getStatusIcon()}
        <span className="text-sm font-medium">{getStatusText()}</span>
        {hasUpdate && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSkipWaiting}
            className="h-6 px-2 text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            Update
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
            <Settings className="h-5 w-5" />
            <CardTitle className="text-lg">Service Worker</CardTitle>
          </div>
          <div className="flex gap-2">
            {hasUpdate && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSkipWaiting}
              >
                <Download className="h-4 w-4 mr-2" />
                Update Now
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={updateServiceWorker}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Check Updates
            </Button>
          </div>
        </div>
        <CardDescription>
          Background sync, offline support, and push notifications
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Service Worker Status */}
        <div className="p-4 border rounded-lg">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            {getStatusIcon()}
            Service Worker Status
          </h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Status:</span>
              <Badge className={getStatusColor()}>
                {getStatusText()}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Ready:</span>
              <span className="text-sm text-muted-foreground">
                {isReady ? 'Yes' : 'No'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Supported:</span>
              <span className="text-sm text-muted-foreground">
                {status.isSupported ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>

        {/* Background Sync Status */}
        <div className="p-4 border rounded-lg">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            {getSyncStatusIcon()}
            Background Sync
          </h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Supported:</span>
              <span className="text-sm text-muted-foreground">
                {syncStatus.isSupported ? 'Yes' : 'No'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Registered:</span>
              <span className="text-sm text-muted-foreground">
                {syncStatus.isRegistered ? 'Yes' : 'No'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Pending Items:</span>
              <Badge variant={syncStatus.pendingItems > 0 ? 'outline' : 'secondary'}>
                {syncStatus.pendingItems}
              </Badge>
            </div>
            
            {syncStatus.lastSync && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Last Sync:</span>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(syncStatus.lastSync, { addSuffix: true })}
                </span>
              </div>
            )}
          </div>

          {!syncStatus.isRegistered && syncStatus.isSupported && (
            <div className="mt-3 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={registerBackgroundSync}
                className="w-full"
              >
                Register Background Sync
              </Button>
            </div>
          )}
        </div>

        {/* Notifications Status */}
        <div className="p-4 border rounded-lg">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            {getNotificationIcon()}
            Push Notifications
          </h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Permission:</span>
              <Badge variant={
                permission === 'granted' ? 'default' :
                permission === 'denied' ? 'destructive' : 'secondary'
              }>
                {permission}
              </Badge>
            </div>
          </div>

          {permission !== 'granted' && (
            <div className="mt-3 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={requestPermission}
                className="w-full"
              >
                Request Permission
              </Button>
            </div>
          )}

          {permission === 'granted' && (
            <div className="mt-3 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => showNotification('Test Notification', {
                  body: 'This is a test notification from ScoreDesk',
                  tag: 'test'
                })}
                className="w-full"
              >
                Test Notification
              </Button>
            </div>
          )}
        </div>

        {/* Update Available */}
        {showUpdatePrompt && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-700">Update Available</span>
            </div>
            <p className="text-sm text-blue-600 mb-3">
              A new version of ScoreDesk is available. Update now to get the latest features and improvements.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSkipWaiting}
              >
                <Download className="h-4 w-4 mr-2" />
                Update Now
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={dismissUpdatePrompt}
              >
                Later
              </Button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-3">Actions</h4>
          
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={updateServiceWorker}
              disabled={!status.isSupported}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Check Updates
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={triggerSync}
              disabled={!syncStatus.isSupported}
            >
              <Wifi className="h-4 w-4 mr-2" />
              Trigger Sync
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ServiceWorkerStatus
