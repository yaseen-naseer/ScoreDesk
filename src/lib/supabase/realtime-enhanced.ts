import { createClient } from './client'
import type { Database } from './types'
import type { RealtimeChannel, RealtimePostgresChangesPayload, RealtimeClient } from '@supabase/supabase-js'
import { healthMonitor, HealthChecks } from '@/lib/utils/health-monitor'
import { offlineDetector } from '@/lib/utils/offline-detector'

type Tables = Database['public']['Tables']
type TableName = keyof Tables

// Enhanced types for connection management
export interface ConnectionState {
  status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error'
  lastConnected?: Date
  lastDisconnected?: Date
  reconnectAttempts: number
  maxReconnectAttempts: number
  reconnectDelay: number
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown'
  latency?: number
  error?: string
}

export interface ConnectionMetrics {
  totalConnections: number
  successfulConnections: number
  failedConnections: number
  averageLatency: number
  uptime: number
  lastError?: string
  lastErrorTime?: Date
}

export interface ConnectionEvent {
  type: 'connect' | 'disconnect' | 'reconnect' | 'error' | 'quality_change'
  timestamp: Date
  details?: any
}

// Type for realtime payloads
export type RealtimePayload<T extends TableName> = RealtimePostgresChangesPayload<Tables[T]['Row']>

// Subscription callback types
export type SubscriptionCallback<T extends TableName> = (payload: RealtimePayload<T>) => void
export type SubscriptionErrorCallback = (error: any) => void
export type ConnectionStateCallback = (state: ConnectionState) => void
export type ConnectionMetricsCallback = (metrics: ConnectionMetrics) => void

/**
 * Enhanced Real-time subscription manager with connection management
 */
export class EnhancedRealtimeManager {
  private supabase: RealtimeClient
  private channels: Map<string, RealtimeChannel> = new Map()
  private subscriptions: Map<string, { channel: RealtimeChannel; callbacks: Set<Function> }> = new Map()
  
  // Connection management
  private connectionState: ConnectionState = {
    status: 'disconnected',
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    reconnectDelay: 1000,
    connectionQuality: 'unknown'
  }
  
  private connectionMetrics: ConnectionMetrics = {
    totalConnections: 0,
    successfulConnections: 0,
    failedConnections: 0,
    averageLatency: 0,
    uptime: 0
  }
  
  private connectionEvents: ConnectionEvent[] = []
  private connectionStateCallbacks: Set<ConnectionStateCallback> = new Set()
  private connectionMetricsCallbacks: Set<ConnectionMetricsCallback> = new Set()
  
  // Reconnection management
  private reconnectTimeout?: NodeJS.Timeout
  private healthCheckInterval?: NodeJS.Timeout
  private latencyCheckInterval?: NodeJS.Timeout
  
  // Performance monitoring
  private startTime = Date.now()
  private latencyHistory: number[] = []
  
  constructor() {
    this.supabase = createClient()
    // Only initialize in browser environment
    if (typeof window !== 'undefined') {
      this.initializeConnectionManagement()
      this.initializeHealthMonitoring()
      this.initializeOfflineHandling()
    }
  }

  /**
   * Initialize connection management and monitoring
   */
  private initializeConnectionManagement(): void {
    // Set up connection state monitoring
    // Note: Supabase realtime doesn't have onOpen/onClose methods
    // We'll use the connection state from the channel instead
    this.monitorConnectionState()
    
    // Monitor for realtime errors
    this.monitorRealtimeErrors()
    
    // Start health check monitoring
    this.startHealthCheck()
    
    // Start latency monitoring
    this.startLatencyMonitoring()
  }

  /**
   * Initialize health monitoring for real-time connections
   */
  private initializeHealthMonitoring(): void {
    // Register real-time health check
    healthMonitor.registerCheck('realtime-connection', 'Real-time Connection', async () => {
      const state = this.connectionState
      
      if (state.status === 'connected') {
        return {
          status: 'healthy',
          metadata: {
            latency: state.latency,
            quality: state.connectionQuality,
            activeChannels: this.channels.size
          }
        }
      } else if (state.status === 'reconnecting') {
        return {
          status: 'degraded',
          metadata: {
            reconnectAttempts: state.reconnectAttempts,
            maxAttempts: state.maxReconnectAttempts
          }
        }
      } else {
        return {
          status: 'unhealthy',
          error: state.error || `Connection status: ${state.status}`
        }
      }
    })

    // Register channel health check
    healthMonitor.registerCheck('realtime-channels', 'Active Channels', async () => {
      const channelCount = this.channels.size
      const subscriptionCount = this.subscriptions.size
      
      if (channelCount > 0) {
        // Check if any channels are in error state
        let errorChannels = 0
        this.channels.forEach(channel => {
          if (channel.state === 'CHANNEL_ERROR') {
            errorChannels++
          }
        })

        if (errorChannels > 0) {
          return {
            status: 'degraded',
            metadata: {
              totalChannels: channelCount,
              errorChannels,
              subscriptions: subscriptionCount
            }
          }
        }

        return {
          status: 'healthy',
          metadata: {
            totalChannels: channelCount,
            subscriptions: subscriptionCount
          }
        }
      }

      return {
        status: 'healthy',
        metadata: {
          totalChannels: 0,
          subscriptions: 0
        }
      }
    })
  }

  /**
   * Initialize offline handling integration
   */
  private initializeOfflineHandling(): void {
    // Subscribe to offline state changes
    offlineDetector.onStateChange((offlineState) => {
      // Pause real-time subscriptions when offline
      if (!offlineState.isOnline) {
        this.pauseAllSubscriptions()
        this.addConnectionEvent('offline', { 
          duration: offlineState.offlineDuration,
          lastOnline: offlineState.lastOnline 
        })
      } else {
        // Resume subscriptions when back online
        this.resumeAllSubscriptions()
        this.addConnectionEvent('online', { 
          offlineDuration: offlineState.offlineDuration,
          connectionQuality: offlineState.connectionQuality 
        })
      }
    })

    // Register offline health check
    healthMonitor.registerCheck('offline-detection', 'Offline Detection', async () => {
      const offlineState = offlineDetector.getState()
      
      if (offlineState.isOnline) {
        return {
          status: 'healthy',
          metadata: {
            connectionQuality: offlineState.connectionQuality,
            connectionType: offlineState.connectionType
          }
        }
      } else {
        return {
          status: 'unhealthy',
          error: 'Device is offline',
          metadata: {
            offlineDuration: offlineState.offlineDuration,
            lastOnline: offlineState.lastOnline
          }
        }
      }
    })
  }

  /**
   * Pause all active subscriptions
   */
  private pauseAllSubscriptions(): void {
    this.channels.forEach(channel => {
      if (channel.state === 'SUBSCRIBED') {
        channel.unsubscribe()
      }
    })
  }

  /**
   * Resume all subscriptions
   */
  private resumeAllSubscriptions(): void {
    // Re-establish subscriptions that were paused
    this.channels.forEach(channel => {
      if (channel.state !== 'SUBSCRIBED') {
        channel.subscribe()
      }
    })
  }

  /**
   * Monitor connection state using Supabase realtime
   */
  private monitorConnectionState(): void {
    // Use navigator.onLine to detect network connectivity
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.handleConnection('connected')
      })
      
      window.addEventListener('offline', () => {
        this.handleConnection('disconnected')
      })
    }
  }

  /**
   * Monitor for realtime errors
   */
  private monitorRealtimeErrors(): void {
    // Monitor for WebSocket errors
    if (typeof window !== 'undefined' && window.WebSocket) {
      const originalWebSocket = window.WebSocket
      const self = this
      
      window.WebSocket = function(...args) {
        const ws = new originalWebSocket(...args)
        
        ws.addEventListener('open', () => {
          self.handleConnection('connected')
        })
        
        ws.addEventListener('close', () => {
          self.handleConnection('disconnected')
        })
        
        ws.addEventListener('error', (error) => {
          self.handleConnection('error', error)
        })
        
        return ws
      }
    }
  }

  /**
   * Handle connection state changes
   */
  private handleConnection(status: ConnectionState['status'], error?: any): void {
    const previousState = this.connectionState.status
    const now = new Date()
    
    this.connectionState.status = status
    
    // Update connection metrics
    this.connectionMetrics.totalConnections++
    
    switch (status) {
      case 'connected':
        this.connectionState.lastConnected = now
        this.connectionState.reconnectAttempts = 0
        this.connectionState.error = undefined
        this.connectionMetrics.successfulConnections++
        this.startTime = Date.now()
        this.addConnectionEvent('connect', { previousState })
        break
        
      case 'disconnected':
        this.connectionState.lastDisconnected = now
        this.addConnectionEvent('disconnect', { previousState })
        
        // Start reconnection if not manual disconnect
        if (previousState === 'connected' && this.connectionState.reconnectAttempts < this.connectionState.maxReconnectAttempts) {
          this.scheduleReconnect()
        }
        break
        
      case 'reconnecting':
        this.connectionState.reconnectAttempts++
        this.addConnectionEvent('reconnect', { attempt: this.connectionState.reconnectAttempts })
        break
        
      case 'error':
        this.connectionState.error = error?.message || 'Unknown error'
        this.connectionState.lastDisconnected = now
        this.connectionMetrics.failedConnections++
        this.connectionMetrics.lastError = this.connectionState.error
        this.connectionMetrics.lastErrorTime = now
        this.addConnectionEvent('error', { error: this.connectionState.error })
        
        // Schedule reconnection on error
        if (this.connectionState.reconnectAttempts < this.connectionState.maxReconnectAttempts) {
          this.scheduleReconnect()
        }
        break
    }
    
    // Notify callbacks
    this.notifyConnectionStateCallbacks()
    this.notifyConnectionMetricsCallbacks()
  }

  /**
   * Schedule automatic reconnection
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }
    
    this.connectionState.status = 'reconnecting'
    
    // Exponential backoff with jitter
    const baseDelay = this.connectionState.reconnectDelay
    const backoffDelay = baseDelay * Math.pow(2, this.connectionState.reconnectAttempts)
    const jitter = Math.random() * 1000
    const finalDelay = Math.min(backoffDelay + jitter, 30000) // Max 30 seconds
    
    this.reconnectTimeout = setTimeout(() => {
      this.attemptReconnect()
    }, finalDelay)
    
    this.notifyConnectionStateCallbacks()
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.connectionState.reconnectAttempts >= this.connectionState.maxReconnectAttempts) {
      this.connectionState.status = 'error'
      this.connectionState.error = 'Max reconnection attempts reached'
      this.notifyConnectionStateCallbacks()
      return
    }
    
    try {
      // Force reconnection by closing and reopening
      this.supabase.realtime.disconnect()
      setTimeout(() => {
        this.supabase.realtime.connect()
      }, 100)
    } catch (error) {
      this.handleConnection('error', error)
    }
  }

  /**
   * Start health check monitoring
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck()
    }, 30000) // Check every 30 seconds
  }

  /**
   * Perform connection health check
   */
  private performHealthCheck(): void {
    if (this.connectionState.status === 'connected') {
      const startTime = performance.now()
      
      // Send a ping to check connection health
      this.supabase.realtime.send({
        type: 'ping',
        payload: { timestamp: startTime }
      })
    }
  }

  /**
   * Start latency monitoring
   */
  private startLatencyMonitoring(): void {
    this.latencyCheckInterval = setInterval(() => {
      this.measureLatency()
    }, 10000) // Check every 10 seconds
  }

  /**
   * Measure connection latency
   */
  private measureLatency(): void {
    if (this.connectionState.status !== 'connected') return
    
    const startTime = performance.now()
    
    // Use a lightweight subscription to measure latency
    const testChannel = this.supabase.channel('latency-test')
    
    testChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        const latency = performance.now() - startTime
        this.updateLatency(latency)
        testChannel.unsubscribe()
      }
    })
  }

  /**
   * Update latency metrics
   */
  private updateLatency(latency: number): void {
    this.connectionState.latency = latency
    this.latencyHistory.push(latency)
    
    // Keep only last 10 measurements
    if (this.latencyHistory.length > 10) {
      this.latencyHistory.shift()
    }
    
    // Calculate average latency
    const avgLatency = this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length
    this.connectionMetrics.averageLatency = avgLatency
    
    // Update connection quality based on latency
    const previousQuality = this.connectionState.connectionQuality
    this.connectionState.connectionQuality = this.calculateConnectionQuality(avgLatency)
    
    if (previousQuality !== this.connectionState.connectionQuality) {
      this.addConnectionEvent('quality_change', { 
        from: previousQuality, 
        to: this.connectionState.connectionQuality,
        latency: avgLatency
      })
    }
    
    this.notifyConnectionStateCallbacks()
    this.notifyConnectionMetricsCallbacks()
  }

  /**
   * Calculate connection quality based on latency
   */
  private calculateConnectionQuality(latency: number): ConnectionState['connectionQuality'] {
    if (latency < 50) return 'excellent'
    if (latency < 100) return 'good'
    if (latency < 200) return 'fair'
    return 'poor'
  }

  /**
   * Add connection event to history
   */
  private addConnectionEvent(type: ConnectionEvent['type'], details?: any): void {
    const event: ConnectionEvent = {
      type,
      timestamp: new Date(),
      details
    }
    
    this.connectionEvents.push(event)
    
    // Keep only last 100 events
    if (this.connectionEvents.length > 100) {
      this.connectionEvents.shift()
    }
  }

  /**
   * Notify connection state callbacks
   */
  private notifyConnectionStateCallbacks(): void {
    this.connectionStateCallbacks.forEach(callback => {
      try {
        callback(this.connectionState)
      } catch (error) {
        console.error('Error in connection state callback:', error)
      }
    })
  }

  /**
   * Notify connection metrics callbacks
   */
  private notifyConnectionMetricsCallbacks(): void {
    // Update uptime
    this.connectionMetrics.uptime = Date.now() - this.startTime
    
    this.connectionMetricsCallbacks.forEach(callback => {
      try {
        callback(this.connectionMetrics)
      } catch (error) {
        console.error('Error in connection metrics callback:', error)
      }
    })
  }

  /**
   * Subscribe to connection state changes
   */
  onConnectionStateChange(callback: ConnectionStateCallback): () => void {
    this.connectionStateCallbacks.add(callback)
    
    // Immediately call with current state
    callback(this.connectionState)
    
    return () => {
      this.connectionStateCallbacks.delete(callback)
    }
  }

  /**
   * Subscribe to connection metrics changes
   */
  onConnectionMetricsChange(callback: ConnectionMetricsCallback): () => void {
    this.connectionMetricsCallbacks.add(callback)
    
    // Immediately call with current metrics
    callback(this.connectionMetrics)
    
    return () => {
      this.connectionMetricsCallbacks.delete(callback)
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState }
  }

  /**
   * Get current connection metrics
   */
  getConnectionMetrics(): ConnectionMetrics {
    return { ...this.connectionMetrics }
  }

  /**
   * Get connection event history
   */
  getConnectionEvents(): ConnectionEvent[] {
    return [...this.connectionEvents]
  }

  /**
   * Force reconnection
   */
  forceReconnect(): void {
    this.connectionState.reconnectAttempts = 0
    this.attemptReconnect()
  }

  /**
   * Set connection configuration
   */
  setConnectionConfig(config: Partial<Pick<ConnectionState, 'maxReconnectAttempts' | 'reconnectDelay'>>): void {
    if (config.maxReconnectAttempts !== undefined) {
      this.connectionState.maxReconnectAttempts = config.maxReconnectAttempts
    }
    if (config.reconnectDelay !== undefined) {
      this.connectionState.reconnectDelay = config.reconnectDelay
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    if (this.latencyCheckInterval) {
      clearInterval(this.latencyCheckInterval)
    }
    
    this.connectionStateCallbacks.clear()
    this.connectionMetricsCallbacks.clear()
    this.unsubscribeAll()
  }

  // ... (rest of the existing methods from RealtimeManager will be added here)
  // For now, I'll include the essential subscription methods

  /**
   * Subscribe to changes in a specific table
   */
  subscribeToTable<T extends TableName>(
    table: T,
    callback: SubscriptionCallback<T>,
    filter?: {
      event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
      schema?: string
      filter?: string
    }
  ): () => void {
    const channelName = `table:${table}:${filter?.event || '*'}:${filter?.filter || 'all'}`
    
    // Create or get existing channel
    let subscription = this.subscriptions.get(channelName)
    
    if (!subscription) {
      const channel = this.supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: filter?.event || '*',
            schema: filter?.schema || 'public',
            table: table as string,
            filter: filter?.filter,
          },
          (payload) => {
            try {
              callback(payload as any)
            } catch (error) {
              console.error('Error in subscription callback:', error)
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`Subscribed to ${channelName}`)
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`Subscription error for ${channelName}`)
          }
        })

      subscription = { channel, callbacks: new Set([callback]) }
      this.subscriptions.set(channelName, subscription)
      this.channels.set(channelName, channel)
    } else {
      subscription.callbacks.add(callback)
    }

    // Return unsubscribe function
    return () => {
      const sub = this.subscriptions.get(channelName)
      if (sub) {
        sub.callbacks.delete(callback)
        
        // If no more callbacks, remove the subscription
        if (sub.callbacks.size === 0) {
          sub.channel.unsubscribe()
          this.subscriptions.delete(channelName)
          this.channels.delete(channelName)
        }
      }
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll(): void {
    this.channels.forEach(channel => {
      channel.unsubscribe()
    })
    this.channels.clear()
    this.subscriptions.clear()
  }

  /**
   * Get all active channels
   */
  getActiveChannels(): string[] {
    return Array.from(this.channels.keys())
  }

  /**
   * Get channel status
   */
  getChannelStatus(channelName: string): string | null {
    const channel = this.channels.get(channelName)
    return channel ? channel.state : null
  }

  /**
   * Get health metrics for real-time connections
   */
  getHealthMetrics() {
    return {
      connectionState: this.connectionState,
      connectionMetrics: this.connectionMetrics,
      activeChannels: this.channels.size,
      activeSubscriptions: this.subscriptions.size,
      healthChecks: healthMonitor.getHealthMetrics(),
      offlineState: offlineDetector.getState()
    }
  }

  /**
   * Get offline state information
   */
  getOfflineState() {
    return offlineDetector.getState()
  }

  /**
   * Get offline statistics
   */
  getOfflineStats() {
    return offlineDetector.getStats()
  }

  /**
   * Force check offline status
   */
  async forceOfflineCheck(): Promise<boolean> {
    return await offlineDetector.forceCheck()
  }
}

// Export singleton instance
export const enhancedRealtimeManager = new EnhancedRealtimeManager()
