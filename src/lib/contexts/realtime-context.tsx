'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { 
  EnhancedRealtimeManager, 
  enhancedRealtimeManager,
  ConnectionState, 
  ConnectionMetrics, 
  ConnectionEvent 
} from '@/lib/supabase/realtime-enhanced'
import { OfflineState } from '@/lib/utils/offline-detector'

interface RealtimeContextType {
  // Connection state
  connectionState: ConnectionState
  connectionMetrics: ConnectionMetrics
  connectionEvents: ConnectionEvent[]
  
  // Offline state
  offlineState: OfflineState
  
  // Connection management
  forceReconnect: () => void
  setConnectionConfig: (config: Partial<Pick<ConnectionState, 'maxReconnectAttempts' | 'reconnectDelay'>>) => void
  
  // Real-time manager instance
  realtimeManager: EnhancedRealtimeManager
  
  // Utility functions
  isConnected: boolean
  isConnecting: boolean
  hasError: boolean
  isOnline: boolean
  getConnectionQualityColor: () => string
  getConnectionQualityIcon: () => string
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined)

interface RealtimeProviderProps {
  children: ReactNode
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    enhancedRealtimeManager.getConnectionState()
  )
  const [connectionMetrics, setConnectionMetrics] = useState<ConnectionMetrics>(
    enhancedRealtimeManager.getConnectionMetrics()
  )
  const [connectionEvents, setConnectionEvents] = useState<ConnectionEvent[]>(
    enhancedRealtimeManager.getConnectionEvents()
  )
  const [offlineState, setOfflineState] = useState<OfflineState>(
    enhancedRealtimeManager.getOfflineState()
  )

  // Subscribe to connection state changes
  useEffect(() => {
    const unsubscribe = enhancedRealtimeManager.onConnectionStateChange((state) => {
      setConnectionState(state)
    })

    return unsubscribe
  }, [])

  // Subscribe to connection metrics changes
  useEffect(() => {
    const unsubscribe = enhancedRealtimeManager.onConnectionMetricsChange((metrics) => {
      setConnectionMetrics(metrics)
    })

    return unsubscribe
  }, [])

  // Update connection events periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setConnectionEvents(enhancedRealtimeManager.getConnectionEvents())
      setOfflineState(enhancedRealtimeManager.getOfflineState())
    }, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [])

  // Force reconnection
  const forceReconnect = useCallback(() => {
    enhancedRealtimeManager.forceReconnect()
  }, [])

  // Set connection configuration
  const setConnectionConfig = useCallback((config: Partial<Pick<ConnectionState, 'maxReconnectAttempts' | 'reconnectDelay'>>) => {
    enhancedRealtimeManager.setConnectionConfig(config)
  }, [])

  // Utility functions
  const isConnected = connectionState.status === 'connected'
  const isConnecting = connectionState.status === 'connecting' || connectionState.status === 'reconnecting'
  const hasError = connectionState.status === 'error'
  const isOnline = offlineState.isOnline

  const getConnectionQualityColor = useCallback(() => {
    switch (connectionState.connectionQuality) {
      case 'excellent': return 'text-green-500'
      case 'good': return 'text-blue-500'
      case 'fair': return 'text-yellow-500'
      case 'poor': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }, [connectionState.connectionQuality])

  const getConnectionQualityIcon = useCallback(() => {
    switch (connectionState.connectionQuality) {
      case 'excellent': return '🟢'
      case 'good': return '🔵'
      case 'fair': return '🟡'
      case 'poor': return '🔴'
      default: return '⚪'
    }
  }, [connectionState.connectionQuality])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Note: We don't destroy the singleton instance here as it's shared
      // across the entire application
    }
  }, [])

  const value: RealtimeContextType = {
    connectionState,
    connectionMetrics,
    connectionEvents,
    offlineState,
    forceReconnect,
    setConnectionConfig,
    realtimeManager: enhancedRealtimeManager,
    isConnected,
    isConnecting,
    hasError,
    isOnline,
    getConnectionQualityColor,
    getConnectionQualityIcon,
  }

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtime(): RealtimeContextType {
  const context = useContext(RealtimeContext)
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider')
  }
  return context
}

// Hook for connection state only
export function useConnectionState() {
  const { connectionState, isConnected, isConnecting, hasError } = useRealtime()
  return {
    connectionState,
    isConnected,
    isConnecting,
    hasError,
  }
}

// Hook for connection metrics only
export function useConnectionMetrics() {
  const { connectionMetrics } = useRealtime()
  return connectionMetrics
}

// Hook for connection events only
export function useConnectionEvents() {
  const { connectionEvents } = useRealtime()
  return connectionEvents
}
