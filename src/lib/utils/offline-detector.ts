/**
 * Offline detection and handling system for ScoreDesk
 * Provides comprehensive offline/online state management with event handling
 */

export interface OfflineEvent {
  type: 'online' | 'offline' | 'connection_change'
  timestamp: Date
  previousState: boolean
  currentState: boolean
  details?: {
    connectionType?: string
    downlink?: number
    rtt?: number
    effectiveType?: string
  }
}

export interface OfflineState {
  isOnline: boolean
  lastOnline: Date | null
  lastOffline: Date | null
  offlineDuration: number
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown'
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown'
  events: OfflineEvent[]
}

export type OfflineStateCallback = (state: OfflineState) => void
export type OfflineEventCallback = (event: OfflineEvent) => void

export class OfflineDetector {
  private isOnline: boolean = navigator.onLine
  private lastOnline: Date | null = null
  private lastOffline: Date | null = null
  private offlineDuration: number = 0
  private events: OfflineEvent[] = []
  private stateCallbacks: Set<OfflineStateCallback> = new Set()
  private eventCallbacks: Set<OfflineEventCallback> = new Set()
  private connectionCheckInterval?: NodeJS.Timeout
  private heartbeatInterval?: NodeJS.Timeout
  private isMonitoring = false

  constructor() {
    this.initializeEventListeners()
    this.initializeConnectionMonitoring()
  }

  /**
   * Initialize browser offline/online event listeners
   */
  private initializeEventListeners(): void {
    // Only initialize in browser environment
    if (typeof window === 'undefined') return
    
    // Listen for browser online/offline events
    window.addEventListener('online', this.handleOnline.bind(this))
    window.addEventListener('offline', this.handleOffline.bind(this))

    // Listen for visibility change (tab switching)
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))

    // Listen for page load/unload
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this))
  }

  /**
   * Initialize connection monitoring with periodic checks
   */
  private initializeConnectionMonitoring(): void {
    // Check connection every 30 seconds
    this.connectionCheckInterval = setInterval(() => {
      this.checkConnection()
    }, 30000)

    // Heartbeat check every 10 seconds when online
    this.heartbeatInterval = setInterval(() => {
      if (this.isOnline) {
        this.performHeartbeat()
      }
    }, 10000)
  }

  /**
   * Handle browser online event
   */
  private handleOnline(): void {
    const previousState = this.isOnline
    this.isOnline = true
    this.lastOnline = new Date()
    
    if (this.lastOffline) {
      this.offlineDuration = this.lastOnline.getTime() - this.lastOffline.getTime()
    }

    this.addEvent({
      type: 'online',
      timestamp: new Date(),
      previousState,
      currentState: this.isOnline,
      details: this.getConnectionDetails()
    })

    this.notifyStateCallbacks()
    this.notifyEventCallbacks()
  }

  /**
   * Handle browser offline event
   */
  private handleOffline(): void {
    const previousState = this.isOnline
    this.isOnline = false
    this.lastOffline = new Date()

    this.addEvent({
      type: 'offline',
      timestamp: new Date(),
      previousState,
      currentState: this.isOnline,
      details: this.getConnectionDetails()
    })

    this.notifyStateCallbacks()
    this.notifyEventCallbacks()
  }

  /**
   * Handle visibility change (tab switching)
   */
  private handleVisibilityChange(): void {
    if (document.visibilityState === 'visible' && this.isOnline) {
      // Re-check connection when tab becomes visible
      setTimeout(() => {
        this.checkConnection()
      }, 1000)
    }
  }

  /**
   * Handle before unload event
   */
  private handleBeforeUnload(): void {
    // Clean up intervals
    this.stop()
  }

  /**
   * Perform connection check using fetch
   */
  private async checkConnection(): Promise<void> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (response.ok && !this.isOnline) {
        // Connection restored
        this.handleOnline()
      } else if (!response.ok && this.isOnline) {
        // Connection lost
        this.handleOffline()
      }
    } catch (error) {
      if (this.isOnline) {
        // Connection lost
        this.handleOffline()
      }
    }
  }

  /**
   * Perform heartbeat check to server
   */
  private async performHeartbeat(): Promise<void> {
    try {
      const startTime = performance.now()
      
      const response = await fetch('/api/heartbeat', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(3000)
      })

      const responseTime = performance.now() - startTime

      if (response.ok) {
        // Update connection quality based on response time
        this.updateConnectionQuality(responseTime)
      } else {
        this.handleOffline()
      }
    } catch (error) {
      this.handleOffline()
    }
  }

  /**
   * Update connection quality based on response time
   */
  private updateConnectionQuality(responseTime: number): void {
    let quality: OfflineState['connectionQuality'] = 'unknown'

    if (responseTime < 100) {
      quality = 'excellent'
    } else if (responseTime < 300) {
      quality = 'good'
    } else if (responseTime < 1000) {
      quality = 'fair'
    } else {
      quality = 'poor'
    }

    // Only notify if quality changed
    if (this.getConnectionQuality() !== quality) {
      this.addEvent({
        type: 'connection_change',
        timestamp: new Date(),
        previousState: this.isOnline,
        currentState: this.isOnline,
        details: {
          ...this.getConnectionDetails(),
          rtt: responseTime
        }
      })

      this.notifyEventCallbacks()
    }
  }

  /**
   * Get connection details from Navigator API
   */
  private getConnectionDetails(): OfflineEvent['details'] {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection

    if (connection) {
      return {
        connectionType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        effectiveType: connection.effectiveType
      }
    }

    return undefined
  }

  /**
   * Get current connection type
   */
  private getConnectionType(): OfflineState['connectionType'] {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection

    if (connection) {
      const type = connection.type || connection.effectiveType
      if (type?.includes('wifi')) return 'wifi'
      if (type?.includes('cellular')) return 'cellular'
      if (type?.includes('ethernet')) return 'ethernet'
    }

    return 'unknown'
  }

  /**
   * Get current connection quality
   */
  private getConnectionQuality(): OfflineState['connectionQuality'] {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection

    if (connection) {
      const effectiveType = connection.effectiveType
      switch (effectiveType) {
        case 'slow-2g':
        case '2g':
          return 'poor'
        case '3g':
          return 'fair'
        case '4g':
          return 'good'
        default:
          return 'excellent'
      }
    }

    return 'unknown'
  }

  /**
   * Add event to history
   */
  private addEvent(event: OfflineEvent): void {
    this.events.push(event)
    
    // Keep only last 100 events
    if (this.events.length > 100) {
      this.events.shift()
    }
  }

  /**
   * Notify state callbacks
   */
  private notifyStateCallbacks(): void {
    const state = this.getState()
    this.stateCallbacks.forEach(callback => {
      try {
        callback(state)
      } catch (error) {
        console.error('Error in offline state callback:', error)
      }
    })
  }

  /**
   * Notify event callbacks
   */
  private notifyEventCallbacks(): void {
    const latestEvent = this.events[this.events.length - 1]
    if (latestEvent) {
      this.eventCallbacks.forEach(callback => {
        try {
          callback(latestEvent)
        } catch (error) {
          console.error('Error in offline event callback:', error)
        }
      })
    }
  }

  /**
   * Subscribe to offline state changes
   */
  onStateChange(callback: OfflineStateCallback): () => void {
    this.stateCallbacks.add(callback)
    
    // Immediately call with current state
    callback(this.getState())
    
    return () => {
      this.stateCallbacks.delete(callback)
    }
  }

  /**
   * Subscribe to offline events
   */
  onEvent(callback: OfflineEventCallback): () => void {
    this.eventCallbacks.add(callback)
    
    return () => {
      this.eventCallbacks.delete(callback)
    }
  }

  /**
   * Get current offline state
   */
  getState(): OfflineState {
    return {
      isOnline: this.isOnline,
      lastOnline: this.lastOnline,
      lastOffline: this.lastOffline,
      offlineDuration: this.offlineDuration,
      connectionQuality: this.getConnectionQuality(),
      connectionType: this.getConnectionType(),
      events: [...this.events]
    }
  }

  /**
   * Get offline event history
   */
  getEvents(): OfflineEvent[] {
    return [...this.events]
  }

  /**
   * Force check connection status
   */
  async forceCheck(): Promise<boolean> {
    await this.checkConnection()
    return this.isOnline
  }

  /**
   * Start monitoring
   */
  start(): void {
    if (this.isMonitoring) return

    this.isMonitoring = true
    this.initializeConnectionMonitoring()
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval)
      this.connectionCheckInterval = undefined
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = undefined
    }

    this.isMonitoring = false
  }

  /**
   * Check if currently monitoring
   */
  isActive(): boolean {
    return this.isMonitoring
  }

  /**
   * Get offline statistics
   */
  getStats(): {
    totalOfflineTime: number
    offlineCount: number
    averageOfflineDuration: number
    lastOfflineTime: Date | null
    uptimePercentage: number
  } {
    const now = Date.now()
    const offlineEvents = this.events.filter(e => e.type === 'offline')
    const onlineEvents = this.events.filter(e => e.type === 'online')

    let totalOfflineTime = 0
    let offlineCount = 0

    for (let i = 0; i < Math.min(offlineEvents.length, onlineEvents.length); i++) {
      const offlineEvent = offlineEvents[i]
      const onlineEvent = onlineEvents[i]
      
      if (onlineEvent && onlineEvent.timestamp > offlineEvent.timestamp) {
        totalOfflineTime += onlineEvent.timestamp.getTime() - offlineEvent.timestamp.getTime()
        offlineCount++
      }
    }

    const averageOfflineDuration = offlineCount > 0 ? totalOfflineTime / offlineCount : 0
    const lastOfflineTime = this.lastOffline
    const uptimePercentage = this.events.length > 0 ? 
      ((now - totalOfflineTime) / now) * 100 : 100

    return {
      totalOfflineTime,
      offlineCount,
      averageOfflineDuration,
      lastOfflineTime,
      uptimePercentage: Math.max(0, Math.min(100, uptimePercentage))
    }
  }
}

// Export singleton instance
export const offlineDetector = new OfflineDetector()
