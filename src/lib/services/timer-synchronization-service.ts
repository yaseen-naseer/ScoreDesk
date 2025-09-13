/**
 * Timer Synchronization Service
 * Handles real-time timer synchronization across multiple devices
 */

import { createClient } from '@/lib/supabase/client'
import { PrecisionTimerState, TimerSyncMessage } from './match-timer-service'

export interface SyncConfig {
  syncInterval: number // milliseconds
  maxSyncDelay: number // milliseconds
  retryAttempts: number
  retryDelay: number // milliseconds
  enableConflictResolution: boolean
  enableOfflineSync: boolean
}

export interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  lastSyncTime: Date | null
  syncLatency: number // milliseconds
  syncErrors: number
  pendingOperations: number
  conflictCount: number
}

export interface SyncOperation {
  id: string
  type: 'state_sync' | 'operation_sync' | 'conflict_resolution'
  timestamp: Date
  data: any
  status: 'pending' | 'syncing' | 'completed' | 'failed'
  retryCount: number
  error?: string
}

export class TimerSynchronizationService {
  private supabase: any
  private syncChannel: any = null
  private syncConfig: SyncConfig
  private syncStatus: SyncStatus
  private pendingOperations: Map<string, SyncOperation> = new Map()
  private syncCallbacks: Array<(message: TimerSyncMessage) => void> = []
  private statusCallbacks: Array<(status: SyncStatus) => void> = []
  private syncInterval: NodeJS.Timeout | null = null
  private lastKnownState: PrecisionTimerState | null = null
  private masterClient: string | null = null

  constructor(supabase?: any, config?: Partial<SyncConfig>) {
    this.supabase = supabase || createClient()
    this.syncConfig = {
      syncInterval: 1000, // 1 second
      maxSyncDelay: 5000, // 5 seconds
      retryAttempts: 3,
      retryDelay: 1000, // 1 second
      enableConflictResolution: true,
      enableOfflineSync: true,
      ...config
    }
    this.syncStatus = {
      isOnline: navigator.onLine,
      isSyncing: false,
      lastSyncTime: null,
      syncLatency: 0,
      syncErrors: 0,
      pendingOperations: 0,
      conflictCount: 0
    }
    
    this.initializeSync()
  }

  /**
   * Start synchronization for a match
   */
  async startSync(matchId: string, userId: string, userRole: string): Promise<boolean> {
    try {
      // Set up real-time channel
      this.syncChannel = this.supabase
        .channel(`timer-sync-${matchId}`)
        .on(
          'broadcast',
          { event: 'timer_sync' },
          (payload: TimerSyncMessage) => {
            this.handleSyncMessage(payload, userId)
          }
        )
        .on(
          'presence',
          { event: 'sync' },
          ({ key, newPresences }: any) => {
            this.handlePresenceUpdate(newPresences)
          }
        )
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            console.log(`Timer sync started for match ${matchId}`)
            
            // Join presence channel
            await this.syncChannel.track({
              user_id: userId,
              user_role: userRole,
              online_at: new Date().toISOString(),
              client_id: this.generateClientId()
            })

            // Start periodic sync
            this.startPeriodicSync(matchId, userId, userRole)
          }
        })

      return true
    } catch (error) {
      console.error('Error starting timer sync:', error)
      return false
    }
  }

  /**
   * Stop synchronization
   */
  stopSync(): void {
    if (this.syncChannel) {
      this.supabase.removeChannel(this.syncChannel)
      this.syncChannel = null
    }

    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }

    this.syncStatus.isSyncing = false
    this.notifyStatusChange()
  }

  /**
   * Send timer state update
   */
  async sendStateUpdate(matchId: string, userId: string, userRole: string, state: PrecisionTimerState): Promise<boolean> {
    try {
      if (!this.syncChannel) {
        return false
      }

      const message: TimerSyncMessage = {
        type: 'state_update',
        matchId,
        userId,
        userRole,
        timestamp: new Date(),
        data: { state }
      }

      const startTime = performance.now()
      
      await this.syncChannel.send({
        type: 'broadcast',
        event: 'timer_sync',
        payload: message
      })

      // Update sync latency
      const latency = performance.now() - startTime
      this.updateSyncLatency(latency)

      // Update last known state
      this.lastKnownState = { ...state }

      return true
    } catch (error) {
      console.error('Error sending state update:', error)
      this.syncStatus.syncErrors++
      this.notifyStatusChange()
      return false
    }
  }

  /**
   * Send timer operation
   */
  async sendOperation(matchId: string, userId: string, userRole: string, operation: any): Promise<boolean> {
    try {
      if (!this.syncChannel) {
        return false
      }

      const message: TimerSyncMessage = {
        type: 'operation_sync',
        matchId,
        userId,
        userRole,
        timestamp: new Date(),
        data: { operation }
      }

      await this.syncChannel.send({
        type: 'broadcast',
        event: 'timer_sync',
        payload: message
      })

      return true
    } catch (error) {
      console.error('Error sending operation:', error)
      this.syncStatus.syncErrors++
      this.notifyStatusChange()
      return false
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus }
  }

  /**
   * Get pending operations
   */
  getPendingOperations(): SyncOperation[] {
    return Array.from(this.pendingOperations.values())
  }

  /**
   * Subscribe to sync messages
   */
  onSyncMessage(callback: (message: TimerSyncMessage) => void): () => void {
    this.syncCallbacks.push(callback)
    return () => {
      const index = this.syncCallbacks.indexOf(callback)
      if (index > -1) {
        this.syncCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Subscribe to sync status changes
   */
  onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.statusCallbacks.push(callback)
    return () => {
      const index = this.statusCallbacks.indexOf(callback)
      if (index > -1) {
        this.statusCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Force sync
   */
  async forceSync(matchId: string, userId: string, userRole: string): Promise<boolean> {
    if (!this.lastKnownState) {
      return false
    }

    return await this.sendStateUpdate(matchId, userId, userRole, this.lastKnownState)
  }

  /**
   * Update sync configuration
   */
  updateSyncConfig(config: Partial<SyncConfig>): void {
    this.syncConfig = { ...this.syncConfig, ...config }
    
    // Restart sync interval if it changed
    if (config.syncInterval && this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
      // Note: Would need matchId, userId, userRole to restart - handled by calling code
    }
  }

  /**
   * Clear sync data
   */
  clearSyncData(): void {
    this.pendingOperations.clear()
    this.lastKnownState = null
    this.masterClient = null
    this.syncStatus.syncErrors = 0
    this.syncStatus.conflictCount = 0
    this.syncStatus.pendingOperations = 0
    this.notifyStatusChange()
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopSync()
    this.syncCallbacks = []
    this.statusCallbacks = []
    this.pendingOperations.clear()
  }

  // Private methods

  private initializeSync(): void {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.syncStatus.isOnline = true
      this.notifyStatusChange()
    })

    window.addEventListener('offline', () => {
      this.syncStatus.isOnline = false
      this.syncStatus.isSyncing = false
      this.notifyStatusChange()
    })
  }

  private startPeriodicSync(matchId: string, userId: string, userRole: string): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }

    this.syncInterval = setInterval(async () => {
      if (this.syncStatus.isOnline && this.lastKnownState) {
        await this.sendStateUpdate(matchId, userId, userRole, this.lastKnownState)
      }
    }, this.syncConfig.syncInterval)
  }

  private handleSyncMessage(message: TimerSyncMessage, currentUserId: string): void {
    // Ignore own messages
    if (message.userId === currentUserId) {
      return
    }

    // Update sync status
    this.syncStatus.lastSyncTime = new Date()
    this.notifyStatusChange()

    // Handle different message types
    switch (message.type) {
      case 'state_update':
        this.handleStateUpdate(message)
        break
      case 'operation_sync':
        this.handleOperationSync(message)
        break
      case 'control_request':
        this.handleControlRequest(message)
        break
      case 'control_granted':
        this.handleControlGranted(message)
        break
      case 'control_denied':
        this.handleControlDenied(message)
        break
      case 'period_transition':
        this.handlePeriodTransition(message)
        break
    }

    // Notify callbacks
    this.syncCallbacks.forEach(callback => {
      try {
        callback(message)
      } catch (error) {
        console.error('Error in sync callback:', error)
      }
    })
  }

  private handleStateUpdate(message: TimerSyncMessage): void {
    if (message.data?.state) {
      const remoteState = message.data.state as PrecisionTimerState
      
      // Check for conflicts
      if (this.lastKnownState && this.syncConfig.enableConflictResolution) {
        const conflict = this.detectStateConflict(this.lastKnownState, remoteState)
        if (conflict) {
          this.syncStatus.conflictCount++
          this.notifyStatusChange()
          console.warn('Timer state conflict detected:', conflict)
        }
      }

      // Update last known state
      this.lastKnownState = { ...remoteState }
    }
  }

  private handleOperationSync(message: TimerSyncMessage): void {
    if (message.data?.operation) {
      console.log('Received timer operation:', message.data.operation)
    }
  }

  private handleControlRequest(message: TimerSyncMessage): void {
    console.log('Timer control request received:', message)
  }

  private handleControlGranted(message: TimerSyncMessage): void {
    console.log('Timer control granted:', message)
  }

  private handleControlDenied(message: TimerSyncMessage): void {
    console.log('Timer control denied:', message)
  }

  private handlePeriodTransition(message: TimerSyncMessage): void {
    console.log('Period transition received:', message)
  }

  private handlePresenceUpdate(presences: any[]): void {
    // Handle presence updates for multi-user coordination
    const activeUsers = presences.filter(p => p.online_at)
    
    if (activeUsers.length === 0) {
      this.masterClient = null
    } else {
      // Determine master client based on role priority or first online
      const sortedUsers = activeUsers.sort((a, b) => {
        const rolePriority = this.getRolePriority(b.user_role) - this.getRolePriority(a.user_role)
        if (rolePriority !== 0) return rolePriority
        return new Date(a.online_at).getTime() - new Date(b.online_at).getTime()
      })
      
      this.masterClient = sortedUsers[0].user_id
    }
  }

  private detectStateConflict(localState: PrecisionTimerState, remoteState: PrecisionTimerState): any | null {
    const conflicts = []

    // Check for significant differences
    if (Math.abs(localState.currentElapsed - remoteState.currentElapsed) > 5000) { // 5 seconds
      conflicts.push({
        field: 'currentElapsed',
        local: localState.currentElapsed,
        remote: remoteState.currentElapsed,
        difference: Math.abs(localState.currentElapsed - remoteState.currentElapsed)
      })
    }

    if (Math.abs(localState.stoppageTime - remoteState.stoppageTime) > 60000) { // 1 minute
      conflicts.push({
        field: 'stoppageTime',
        local: localState.stoppageTime,
        remote: remoteState.stoppageTime,
        difference: Math.abs(localState.stoppageTime - remoteState.stoppageTime)
      })
    }

    if (localState.status !== remoteState.status) {
      conflicts.push({
        field: 'status',
        local: localState.status,
        remote: remoteState.status
      })
    }

    if (localState.currentPeriod !== remoteState.currentPeriod) {
      conflicts.push({
        field: 'currentPeriod',
        local: localState.currentPeriod,
        remote: remoteState.currentPeriod
      })
    }

    return conflicts.length > 0 ? { conflicts, timestamp: new Date() } : null
  }

  private getRolePriority(role: string): number {
    const priorities: Record<string, number> = {
      'referee': 100,
      'admin': 90,
      'assistant_referee': 80,
      'fourth_official': 60,
      'scorer': 40,
      'viewer': 20
    }
    return priorities[role] || 0
  }

  private updateSyncLatency(latency: number): void {
    // Simple moving average
    this.syncStatus.syncLatency = (this.syncStatus.syncLatency * 0.8) + (latency * 0.2)
    this.notifyStatusChange()
  }

  private notifyStatusChange(): void {
    this.statusCallbacks.forEach(callback => {
      try {
        callback({ ...this.syncStatus })
      } catch (error) {
        console.error('Error in status callback:', error)
      }
    })
  }

  private generateClientId(): string {
    return 'client_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36)
  }
}

// Export singleton instance
export const timerSynchronizationService = new TimerSynchronizationService()
