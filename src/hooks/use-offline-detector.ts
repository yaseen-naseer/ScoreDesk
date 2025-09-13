'use client'

import { useState, useEffect, useCallback } from 'react'
import { offlineDetector, OfflineState, OfflineEvent } from '@/lib/utils/offline-detector'

/**
 * Hook for offline detection and handling
 */
export function useOfflineDetector() {
  const [offlineState, setOfflineState] = useState<OfflineState>(
    offlineDetector.getState()
  )
  const [isOnline, setIsOnline] = useState(offlineDetector.getState().isOnline)
  const [connectionQuality, setConnectionQuality] = useState(
    offlineDetector.getState().connectionQuality
  )

  // Subscribe to offline state changes
  useEffect(() => {
    const unsubscribe = offlineDetector.onStateChange((state) => {
      setOfflineState(state)
      setIsOnline(state.isOnline)
      setConnectionQuality(state.connectionQuality)
    })

    return unsubscribe
  }, [])

  // Force check connection
  const forceCheck = useCallback(async () => {
    const isOnline = await offlineDetector.forceCheck()
    return isOnline
  }, [])

  // Get offline statistics
  const getStats = useCallback(() => {
    return offlineDetector.getStats()
  }, [])

  // Get offline events
  const getEvents = useCallback(() => {
    return offlineDetector.getEvents()
  }, [])

  return {
    ...offlineState,
    isOnline,
    connectionQuality,
    forceCheck,
    getStats,
    getEvents,
    isMonitoring: offlineDetector.isActive()
  }
}

/**
 * Hook for offline events only
 */
export function useOfflineEvents() {
  const [events, setEvents] = useState<OfflineEvent[]>([])

  useEffect(() => {
    const unsubscribe = offlineDetector.onEvent((event) => {
      setEvents(prev => [...prev, event].slice(-50)) // Keep last 50 events
    })

    return unsubscribe
  }, [])

  return events
}

/**
 * Hook for connection quality only
 */
export function useConnectionQuality() {
  const [quality, setQuality] = useState(offlineDetector.getState().connectionQuality)

  useEffect(() => {
    const unsubscribe = offlineDetector.onStateChange((state) => {
      setQuality(state.connectionQuality)
    })

    return unsubscribe
  }, [])

  return quality
}

/**
 * Hook for online/offline status only
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(offlineDetector.getState().isOnline)

  useEffect(() => {
    const unsubscribe = offlineDetector.onStateChange((state) => {
      setIsOnline(state.isOnline)
    })

    return unsubscribe
  }, [])

  return isOnline
}
