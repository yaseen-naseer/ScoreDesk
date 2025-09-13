'use client'

import React, { useEffect } from 'react'
import { serviceWorkerManager } from '@/lib/services/service-worker-manager'

interface ServiceWorkerProviderProps {
  children: React.ReactNode
}

export default function ServiceWorkerProvider({ children }: ServiceWorkerProviderProps) {
  useEffect(() => {
    // Service worker is automatically initialized in the manager
    // This provider just ensures it's available throughout the app
    
    const handleServiceWorkerEvent = (event: any) => {
      console.log('[ServiceWorkerProvider] Event:', event.type)
      
      // Handle service worker events if needed
      switch (event.type) {
        case 'activated':
          console.log('[ServiceWorkerProvider] Service worker activated')
          break
        case 'installed':
          console.log('[ServiceWorkerProvider] Service worker installed')
          break
        default:
          break
      }
    }

    const handleSyncEvent = (event: any) => {
      console.log('[ServiceWorkerProvider] Sync event:', event.type)
      
      // Handle sync events if needed
      switch (event.type) {
        case 'sync-completed':
          console.log('[ServiceWorkerProvider] Background sync completed')
          break
        case 'sync-failed':
          console.log('[ServiceWorkerProvider] Background sync failed:', event.data?.error)
          break
        default:
          break
      }
    }

    // Subscribe to service worker events
    const unsubscribeSW = serviceWorkerManager.onEvent(handleServiceWorkerEvent)
    const unsubscribeSync = serviceWorkerManager.onSyncEvent(handleSyncEvent)

    return () => {
      unsubscribeSW()
      unsubscribeSync()
    }
  }, [])

  return <>{children}</>
}
