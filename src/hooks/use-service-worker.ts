'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  serviceWorkerManager, 
  ServiceWorkerStatus, 
  BackgroundSyncStatus 
} from '@/lib/services/service-worker-manager'

/**
 * Hook for service worker management
 */
export function useServiceWorker() {
  const [status, setStatus] = useState<ServiceWorkerStatus>(
    serviceWorkerManager.getStatus()
  )
  const [isReady, setIsReady] = useState(serviceWorkerManager.isReady())

  useEffect(() => {
    // Subscribe to service worker events
    const unsubscribe = serviceWorkerManager.onEvent((event) => {
      setStatus(serviceWorkerManager.getStatus())
      setIsReady(serviceWorkerManager.isReady())
    })

    return unsubscribe
  }, [])

  const registerBackgroundSync = useCallback(async () => {
    try {
      await serviceWorkerManager.registerBackgroundSync()
    } catch (error) {
      console.error('Failed to register background sync:', error)
      throw error
    }
  }, [])

  const updateServiceWorker = useCallback(async () => {
    try {
      await serviceWorkerManager.updateServiceWorker()
    } catch (error) {
      console.error('Failed to update service worker:', error)
      throw error
    }
  }, [])

  const skipWaiting = useCallback(() => {
    serviceWorkerManager.skipWaiting()
  }, [])

  const cacheMatchData = useCallback(async (matchData: any) => {
    try {
      await serviceWorkerManager.cacheMatchData(matchData)
    } catch (error) {
      console.error('Failed to cache match data:', error)
      throw error
    }
  }, [])

  const sendMessage = useCallback((type: string, data?: any) => {
    serviceWorkerManager.sendMessage({ type, data })
  }, [])

  const sendMessageWithResponse = useCallback(async (type: string, data?: any) => {
    try {
      return await serviceWorkerManager.sendMessageWithResponse({ type, data })
    } catch (error) {
      console.error('Failed to send message with response:', error)
      throw error
    }
  }, [])

  return {
    status,
    isReady,
    isSupported: status.isSupported,
    isRegistered: status.isRegistered,
    isActive: status.isActive,
    isInstalling: status.isInstalling,
    isWaiting: status.isWaiting,
    registerBackgroundSync,
    updateServiceWorker,
    skipWaiting,
    cacheMatchData,
    sendMessage,
    sendMessageWithResponse
  }
}

/**
 * Hook for background sync functionality
 */
export function useBackgroundSync() {
  const [syncStatus, setSyncStatus] = useState<BackgroundSyncStatus>({
    isSupported: false,
    isRegistered: false,
    pendingItems: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  const loadSyncStatus = useCallback(async () => {
    try {
      const status = await serviceWorkerManager.getSyncStatus()
      setSyncStatus(status)
    } catch (error) {
      console.error('Failed to load sync status:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSyncStatus()
  }, [loadSyncStatus])

  useEffect(() => {
    // Subscribe to sync events
    const unsubscribe = serviceWorkerManager.onSyncEvent((event) => {
      switch (event.type) {
        case 'sync-completed':
        case 'sync-failed':
          loadSyncStatus()
          break
        case 'sync-registered':
          setSyncStatus(prev => ({ ...prev, isRegistered: true }))
          break
      }
    })

    return unsubscribe
  }, [loadSyncStatus])

  const registerBackgroundSync = useCallback(async () => {
    try {
      await serviceWorkerManager.registerBackgroundSync()
      await loadSyncStatus()
    } catch (error) {
      console.error('Failed to register background sync:', error)
      throw error
    }
  }, [loadSyncStatus])

  const triggerSync = useCallback(() => {
    serviceWorkerManager.sendMessage({ type: 'TRIGGER_SYNC' })
  }, [])

  const getSyncStatus = useCallback(async () => {
    try {
      const status = await serviceWorkerManager.getSyncStatus()
      setSyncStatus(status)
      return status
    } catch (error) {
      console.error('Failed to get sync status:', error)
      throw error
    }
  }, [])

  return {
    syncStatus,
    isLoading,
    isSupported: syncStatus.isSupported,
    isRegistered: syncStatus.isRegistered,
    pendingItems: syncStatus.pendingItems,
    lastSync: syncStatus.lastSync,
    registerBackgroundSync,
    triggerSync,
    getSyncStatus,
    refresh: loadSyncStatus
  }
}

/**
 * Hook for service worker notifications
 */
export function useServiceWorkerNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    setIsSupported('Notification' in window)
    setPermission(Notification.permission)
  }, [])

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      throw new Error('Notifications not supported')
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result
    } catch (error) {
      console.error('Failed to request notification permission:', error)
      throw error
    }
  }, [isSupported])

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') {
      console.warn('Notifications not available or permission not granted')
      return
    }

    try {
      const notification = new Notification(title, {
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        ...options
      })

      return notification
    } catch (error) {
      console.error('Failed to show notification:', error)
      throw error
    }
  }, [isSupported, permission])

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
    canShowNotifications: isSupported && permission === 'granted'
  }
}

/**
 * Hook for service worker updates
 */
export function useServiceWorkerUpdate() {
  const { status, updateServiceWorker, skipWaiting } = useServiceWorker()
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false)

  useEffect(() => {
    if (status.isWaiting) {
      setShowUpdatePrompt(true)
    }
  }, [status.isWaiting])

  const handleUpdate = useCallback(async () => {
    try {
      await updateServiceWorker()
    } catch (error) {
      console.error('Failed to update service worker:', error)
      throw error
    }
  }, [updateServiceWorker])

  const handleSkipWaiting = useCallback(() => {
    skipWaiting()
    setShowUpdatePrompt(false)
  }, [skipWaiting])

  const dismissUpdatePrompt = useCallback(() => {
    setShowUpdatePrompt(false)
  }, [])

  return {
    hasUpdate: status.isWaiting,
    showUpdatePrompt,
    isInstalling: status.isInstalling,
    handleUpdate,
    handleSkipWaiting,
    dismissUpdatePrompt
  }
}
