/**
 * Service Worker Manager
 * Handles service worker registration, updates, and communication
 */

export interface ServiceWorkerMessage {
  type: string
  data?: any
}

export interface ServiceWorkerStatus {
  isSupported: boolean
  isRegistered: boolean
  isActive: boolean
  isInstalling: boolean
  isWaiting: boolean
  registration?: ServiceWorkerRegistration
  error?: string
}

export interface BackgroundSyncStatus {
  isSupported: boolean
  isRegistered: boolean
  pendingItems: number
  lastSync?: Date
}

export type ServiceWorkerEventCallback = (event: {
  type: 'installing' | 'installed' | 'activating' | 'activated' | 'error' | 'update'
  registration?: ServiceWorkerRegistration
  error?: Error
}) => void

export type BackgroundSyncEventCallback = (event: {
  type: 'sync-completed' | 'sync-failed' | 'sync-registered'
  data?: any
}) => void

export class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null
  private eventCallbacks: Set<ServiceWorkerEventCallback> = new Set()
  private syncEventCallbacks: Set<BackgroundSyncEventCallback> = new Set()
  private messageChannel: MessageChannel | null = null

  constructor() {
    this.initialize()
  }

  /**
   * Initialize service worker manager
   */
  private async initialize(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.log('[SW Manager] Service workers not supported')
      return
    }

    try {
      await this.registerServiceWorker()
      this.setupMessageChannel()
      this.setupEventListeners()
    } catch (error) {
      console.error('[SW Manager] Initialization failed:', error)
    }
  }

  /**
   * Register service worker
   */
  async registerServiceWorker(): Promise<ServiceWorkerRegistration> {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service workers not supported')
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })

      console.log('[SW Manager] Service worker registered:', this.registration)

      return this.registration
    } catch (error) {
      console.error('[SW Manager] Service worker registration failed:', error)
      throw error
    }
  }

  /**
   * Setup message channel for communication
   */
  private setupMessageChannel(): void {
    if (!this.registration) return

    this.messageChannel = new MessageChannel()
    
    // Send port to service worker
    this.registration.active?.postMessage(
      { type: 'SETUP_MESSAGE_CHANNEL' },
      [this.messageChannel.port2]
    )

    // Listen for messages from service worker
    this.messageChannel.port1.onmessage = (event) => {
      this.handleServiceWorkerMessage(event.data)
    }

    this.messageChannel.port1.start()
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!navigator.serviceWorker) return

    // Listen for service worker updates
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW Manager] Service worker controller changed')
      this.notifyEvent({ type: 'activated' })
    })

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      this.handleServiceWorkerMessage(event.data)
    })

    // Listen for service worker registration events
    if (this.registration) {
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration!.installing
        if (!newWorker) return

        console.log('[SW Manager] New service worker found')

        newWorker.addEventListener('statechange', () => {
          switch (newWorker.state) {
            case 'installing':
              console.log('[SW Manager] Service worker installing')
              this.notifyEvent({ type: 'installing', registration: this.registration! })
              break

            case 'installed':
              console.log('[SW Manager] Service worker installed')
              this.notifyEvent({ type: 'installed', registration: this.registration! })
              break

            case 'activating':
              console.log('[SW Manager] Service worker activating')
              this.notifyEvent({ type: 'activating', registration: this.registration! })
              break

            case 'activated':
              console.log('[SW Manager] Service worker activated')
              this.notifyEvent({ type: 'activated', registration: this.registration! })
              break
          }
        })
      })
    }
  }

  /**
   * Handle messages from service worker
   */
  private handleServiceWorkerMessage(message: any): void {
    console.log('[SW Manager] Message from service worker:', message)

    const { type, data } = message

    switch (type) {
      case 'sync-completed':
        this.notifySyncEvent({ type: 'sync-completed', data })
        break

      case 'sync-failed':
        this.notifySyncEvent({ type: 'sync-failed', data })
        break

      case 'SYNC_STATUS':
        // Handle sync status response
        break

      default:
        console.log('[SW Manager] Unknown message type:', type)
    }
  }

  /**
   * Get service worker status
   */
  getStatus(): ServiceWorkerStatus {
    const isSupported = 'serviceWorker' in navigator
    const isRegistered = !!this.registration
    const isActive = !!this.registration?.active
    const isInstalling = !!this.registration?.installing
    const isWaiting = !!this.registration?.waiting

    return {
      isSupported,
      isRegistered,
      isActive,
      isInstalling,
      isWaiting,
      registration: this.registration || undefined
    }
  }

  /**
   * Check if background sync is supported
   */
  isBackgroundSyncSupported(): boolean {
    return 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype
  }

  /**
   * Register background sync
   */
  async registerBackgroundSync(): Promise<void> {
    if (!this.registration || !this.isBackgroundSyncSupported()) {
      throw new Error('Background sync not supported')
    }

    try {
      await this.registration.sync.register('background-sync')
      console.log('[SW Manager] Background sync registered')
      this.notifySyncEvent({ type: 'sync-registered' })
    } catch (error) {
      console.error('[SW Manager] Failed to register background sync:', error)
      throw error
    }
  }

  /**
   * Send message to service worker
   */
  sendMessage(message: ServiceWorkerMessage): void {
    if (!this.registration?.active) {
      console.warn('[SW Manager] No active service worker to send message to')
      return
    }

    this.registration.active.postMessage(message)
  }

  /**
   * Send message and wait for response
   */
  sendMessageWithResponse(message: ServiceWorkerMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.messageChannel) {
        reject(new Error('Message channel not established'))
        return
      }

      const timeout = setTimeout(() => {
        reject(new Error('Message timeout'))
      }, 5000)

      const handleResponse = (event: MessageEvent) => {
        if (event.data.type === message.type + '_RESPONSE') {
          clearTimeout(timeout)
          this.messageChannel!.port1.removeEventListener('message', handleResponse)
          resolve(event.data.data)
        }
      }

      this.messageChannel.port1.addEventListener('message', handleResponse)
      this.sendMessage(message)
    })
  }

  /**
   * Cache match data for offline access
   */
  async cacheMatchData(matchData: any): Promise<void> {
    this.sendMessage({
      type: 'CACHE_MATCH_DATA',
      data: matchData
    })
  }

  /**
   * Get sync status from service worker
   */
  async getSyncStatus(): Promise<BackgroundSyncStatus> {
    try {
      const status = await this.sendMessageWithResponse({
        type: 'GET_SYNC_STATUS'
      })

      return {
        isSupported: this.isBackgroundSyncSupported(),
        isRegistered: this.isBackgroundSyncSupported(),
        pendingItems: status.pendingItems || 0,
        lastSync: status.lastSync ? new Date(status.lastSync) : undefined
      }
    } catch (error) {
      console.error('[SW Manager] Failed to get sync status:', error)
      return {
        isSupported: this.isBackgroundSyncSupported(),
        isRegistered: false,
        pendingItems: 0
      }
    }
  }

  /**
   * Update service worker
   */
  async updateServiceWorker(): Promise<void> {
    if (!this.registration) {
      throw new Error('No service worker registration')
    }

    try {
      await this.registration.update()
      console.log('[SW Manager] Service worker update requested')
    } catch (error) {
      console.error('[SW Manager] Failed to update service worker:', error)
      throw error
    }
  }

  /**
   * Skip waiting for service worker update
   */
  skipWaiting(): void {
    if (this.registration?.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
  }

  /**
   * Unregister service worker
   */
  async unregisterServiceWorker(): Promise<void> {
    if (!this.registration) {
      return
    }

    try {
      await this.registration.unregister()
      this.registration = null
      console.log('[SW Manager] Service worker unregistered')
    } catch (error) {
      console.error('[SW Manager] Failed to unregister service worker:', error)
      throw error
    }
  }

  /**
   * Subscribe to service worker events
   */
  onEvent(callback: ServiceWorkerEventCallback): () => void {
    this.eventCallbacks.add(callback)
    return () => this.eventCallbacks.delete(callback)
  }

  /**
   * Subscribe to background sync events
   */
  onSyncEvent(callback: BackgroundSyncEventCallback): () => void {
    this.syncEventCallbacks.add(callback)
    return () => this.syncEventCallbacks.delete(callback)
  }

  /**
   * Notify event callbacks
   */
  private notifyEvent(event: Parameters<ServiceWorkerEventCallback>[0]): void {
    this.eventCallbacks.forEach(callback => {
      try {
        callback(event)
      } catch (error) {
        console.error('[SW Manager] Error in event callback:', error)
      }
    })
  }

  /**
   * Notify sync event callbacks
   */
  private notifySyncEvent(event: Parameters<BackgroundSyncEventCallback>[0]): void {
    this.syncEventCallbacks.forEach(callback => {
      try {
        callback(event)
      } catch (error) {
        console.error('[SW Manager] Error in sync event callback:', error)
      }
    })
  }

  /**
   * Check if service worker is ready
   */
  isReady(): boolean {
    return !!this.registration?.active
  }

  /**
   * Get service worker registration
   */
  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration
  }
}

// Export singleton instance
export const serviceWorkerManager = new ServiceWorkerManager()
