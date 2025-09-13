/**
 * Professional Match Timer Service
 * Provides referee-grade match timing with millisecond precision, synchronization, and multi-user control
 */

import { Database } from '@/lib/supabase/types'

type MatchTimerState = Database['public']['Tables']['match_timer_states']['Row']
type MatchTimerInsert = Database['public']['Tables']['match_timer_states']['Insert']
type MatchTimerUpdate = Database['public']['Tables']['match_timer_states']['Update']

export type TimerPeriod = 'H1' | 'HT' | 'H2' | 'FT' | 'ET1' | 'ET2' | 'AET' | 'PEN'
export type TimerStatus = 'stopped' | 'running' | 'paused' | 'error'

export interface TimerControl {
  canStart: boolean
  canPause: boolean
  canResume: boolean
  canStop: boolean
  canAddStoppage: boolean
  canAddExtraTime: boolean
  canEditTime: boolean
}

export interface TimerOperation {
  id: string
  type: 'start' | 'pause' | 'resume' | 'stop' | 'add_stoppage' | 'add_extra_time' | 'edit_time' | 'period_change'
  timestamp: Date
  userId: string
  userRole: string
  matchId: string
  details?: Record<string, any>
  previousState?: Partial<MatchTimerState>
  newState?: Partial<MatchTimerState>
}

export interface TimerNotification {
  id: string
  type: 'period_transition' | 'stoppage_added' | 'extra_time_added' | 'timer_started' | 'timer_stopped' | 'timer_paused'
  timestamp: Date
  matchId: string
  message: string
  severity: 'info' | 'warning' | 'error'
  data?: Record<string, any>
}

export interface InjuryTimeEntry {
  id: string
  startTime: Date
  endTime?: Date
  duration: number // in milliseconds
  reason?: string
  playerId?: string
  matchId: string
  recordedBy: string
}

export interface PeriodSummary {
  period: TimerPeriod
  startTime: Date
  endTime?: Date
  duration: number // in milliseconds
  events: Array<{
    minute: number
    second?: number
    type: string
    description: string
  }>
  stoppageTime: number
  injuryTime: number
}

export interface PrecisionTimerState {
  // High-precision timing using Performance API
  startTimestamp: number // performance.now() when timer started
  pauseTimestamp?: number // performance.now() when paused
  totalPausedDuration: number // accumulated paused time
  currentElapsed: number // current elapsed time in milliseconds
  precision: number // timer precision in milliseconds
  
  // Period management
  currentPeriod: TimerPeriod
  periodStartTime: Date
  periodDuration: number // standard period duration in milliseconds
  
  // Stoppage and injury time
  stoppageTime: number // in milliseconds
  injuryTimeEntries: InjuryTimeEntry[]
  
  // Real-time synchronization
  lastSyncTime: Date
  syncOffset: number // offset from server time in milliseconds
  
  // Control state
  status: TimerStatus
  isMaster: boolean // whether this client controls the timer
  lastControlUser: string
  lastControlTime: Date
}

export interface TimerSyncMessage {
  type: 'state_update' | 'control_request' | 'control_granted' | 'control_denied' | 'period_transition'
  matchId: string
  userId: string
  userRole: string
  timestamp: Date
  data: {
    state?: PrecisionTimerState
    operation?: TimerOperation
    notification?: TimerNotification
  }
}

export class MatchTimerService {
  private supabase: any
  private precisionTimer: PrecisionTimerState | null = null
  private syncChannel: any = null
  private operationHistory: TimerOperation[] = []
  private notifications: TimerNotification[] = []
  private injuryTimeEntries: InjuryTimeEntry[] = []
  private periodSummaries: PeriodSummary[] = []
  
  // Event callbacks
  private onStateChangeCallbacks: Array<(state: PrecisionTimerState) => void> = []
  private onNotificationCallbacks: Array<(notification: TimerNotification) => void> = []
  private onPeriodTransitionCallbacks: Array<(summary: PeriodSummary) => void> = []
  
  // Performance monitoring
  private performanceMetrics = {
    averageLatency: 0,
    syncAccuracy: 0,
    operationCount: 0,
    lastSyncTime: new Date()
  }

  constructor(supabase: any) {
    this.supabase = supabase
    this.initializePerformanceMonitoring()
  }

  /**
   * Initialize timer for a match
   */
  async initializeTimer(matchId: string, userId: string, userRole: string): Promise<boolean> {
    try {
      // Get existing timer state from database
      const { data: existingState, error: fetchError } = await this.supabase
        .from('match_timer_states')
        .select('*')
        .eq('match_id', matchId)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching timer state:', fetchError)
        return false
      }

      if (existingState) {
        // Load existing state
        this.precisionTimer = this.convertDatabaseStateToPrecisionState(existingState)
      } else {
        // Create new timer state
        const newState: MatchTimerInsert = {
          match_id: matchId,
          is_running: false,
          current_half: 1,
          elapsed_minutes: 0,
          total_minutes: 90,
          added_time: 0,
          total_pause_duration: 0
        }

        const { error: insertError } = await this.supabase
          .from('match_timer_states')
          .insert(newState)

        if (insertError) {
          console.error('Error creating timer state:', insertError)
          return false
        }

        // Initialize precision timer
        this.precisionTimer = this.createInitialPrecisionState(matchId)
      }

      // Set up real-time synchronization
      await this.setupRealtimeSync(matchId, userId, userRole)

      // Start performance monitoring
      this.startPerformanceMonitoring()

      return true
    } catch (error) {
      console.error('Error initializing timer:', error)
      return false
    }
  }

  /**
   * Start the timer with high precision
   */
  async startTimer(matchId: string, userId: string, userRole: string): Promise<boolean> {
    if (!this.precisionTimer) {
      await this.initializeTimer(matchId, userId, userRole)
    }

    if (!this.precisionTimer || this.precisionTimer.status === 'running') {
      return false
    }

    try {
      const now = performance.now()
      const currentTime = new Date()

      // Update precision timer state
      this.precisionTimer.status = 'running'
      this.precisionTimer.startTimestamp = now
      this.precisionTimer.lastControlUser = userId
      this.precisionTimer.lastControlTime = currentTime

      // Record operation
      const operation: TimerOperation = {
        id: this.generateId(),
        type: 'start',
        timestamp: currentTime,
        userId,
        userRole,
        matchId,
        newState: { is_running: true, start_time: currentTime.toISOString() }
      }
      this.operationHistory.push(operation)

      // Update database
      await this.updateDatabaseState(matchId, {
        is_running: true,
        start_time: currentTime.toISOString()
      })

      // Send real-time update
      await this.broadcastStateUpdate(matchId, userId, userRole, 'state_update')

      // Notify listeners
      this.notifyStateChange()
      this.addNotification({
        id: this.generateId(),
        type: 'timer_started',
        timestamp: currentTime,
        matchId,
        message: `Timer started by ${userRole}`,
        severity: 'info'
      })

      return true
    } catch (error) {
      console.error('Error starting timer:', error)
      return false
    }
  }

  /**
   * Pause the timer
   */
  async pauseTimer(matchId: string, userId: string, userRole: string): Promise<boolean> {
    if (!this.precisionTimer || this.precisionTimer.status !== 'running') {
      return false
    }

    try {
      const now = performance.now()
      const currentTime = new Date()

      // Calculate elapsed time
      const elapsed = now - this.precisionTimer.startTimestamp - this.precisionTimer.totalPausedDuration

      // Update precision timer state
      this.precisionTimer.status = 'paused'
      this.precisionTimer.pauseTimestamp = now
      this.precisionTimer.totalPausedDuration += now - this.precisionTimer.startTimestamp - this.precisionTimer.totalPausedDuration
      this.precisionTimer.currentElapsed = elapsed
      this.precisionTimer.lastControlUser = userId
      this.precisionTimer.lastControlTime = currentTime

      // Record operation
      const operation: TimerOperation = {
        id: this.generateId(),
        type: 'pause',
        timestamp: currentTime,
        userId,
        userRole,
        matchId,
        newState: { 
          is_running: false, 
          pause_time: currentTime.toISOString(),
          elapsed_minutes: Math.floor(elapsed / 60000)
        }
      }
      this.operationHistory.push(operation)

      // Update database
      await this.updateDatabaseState(matchId, {
        is_running: false,
        pause_time: currentTime.toISOString(),
        elapsed_minutes: Math.floor(elapsed / 60000),
        total_pause_duration: Math.floor(this.precisionTimer.totalPausedDuration / 1000)
      })

      // Send real-time update
      await this.broadcastStateUpdate(matchId, userId, userRole, 'state_update')

      // Notify listeners
      this.notifyStateChange()
      this.addNotification({
        id: this.generateId(),
        type: 'timer_paused',
        timestamp: currentTime,
        matchId,
        message: `Timer paused by ${userRole}`,
        severity: 'info'
      })

      return true
    } catch (error) {
      console.error('Error pausing timer:', error)
      return false
    }
  }

  /**
   * Resume the timer
   */
  async resumeTimer(matchId: string, userId: string, userRole: string): Promise<boolean> {
    if (!this.precisionTimer || this.precisionTimer.status !== 'paused') {
      return false
    }

    try {
      const now = performance.now()
      const currentTime = new Date()

      // Update precision timer state
      this.precisionTimer.status = 'running'
      this.precisionTimer.startTimestamp = now - this.precisionTimer.currentElapsed
      this.precisionTimer.pauseTimestamp = undefined
      this.precisionTimer.lastControlUser = userId
      this.precisionTimer.lastControlTime = currentTime

      // Record operation
      const operation: TimerOperation = {
        id: this.generateId(),
        type: 'resume',
        timestamp: currentTime,
        userId,
        userRole,
        matchId,
        newState: { 
          is_running: true,
          pause_time: null
        }
      }
      this.operationHistory.push(operation)

      // Update database
      await this.updateDatabaseState(matchId, {
        is_running: true,
        pause_time: null
      })

      // Send real-time update
      await this.broadcastStateUpdate(matchId, userId, userRole, 'state_update')

      // Notify listeners
      this.notifyStateChange()
      this.addNotification({
        id: this.generateId(),
        type: 'timer_started',
        timestamp: currentTime,
        matchId,
        message: `Timer resumed by ${userRole}`,
        severity: 'info'
      })

      return true
    } catch (error) {
      console.error('Error resuming timer:', error)
      return false
    }
  }

  /**
   * Add stoppage time
   */
  async addStoppageTime(matchId: string, minutes: number, userId: string, userRole: string): Promise<boolean> {
    if (!this.precisionTimer) {
      return false
    }

    try {
      const currentTime = new Date()
      const additionalStoppage = minutes * 60000 // convert to milliseconds

      // Update precision timer state
      this.precisionTimer.stoppageTime += additionalStoppage
      this.precisionTimer.lastControlUser = userId
      this.precisionTimer.lastControlTime = currentTime

      // Record operation
      const operation: TimerOperation = {
        id: this.generateId(),
        type: 'add_stoppage',
        timestamp: currentTime,
        userId,
        userRole,
        matchId,
        details: { minutes, additionalStoppage },
        newState: { added_time: Math.floor(this.precisionTimer.stoppageTime / 60000) }
      }
      this.operationHistory.push(operation)

      // Update database
      await this.updateDatabaseState(matchId, {
        added_time: Math.floor(this.precisionTimer.stoppageTime / 60000)
      })

      // Send real-time update
      await this.broadcastStateUpdate(matchId, userId, userRole, 'state_update')

      // Notify listeners
      this.notifyStateChange()
      this.addNotification({
        id: this.generateId(),
        type: 'stoppage_added',
        timestamp: currentTime,
        matchId,
        message: `+${minutes}' stoppage time added by ${userRole}`,
        severity: 'info',
        data: { minutes }
      })

      return true
    } catch (error) {
      console.error('Error adding stoppage time:', error)
      return false
    }
  }

  /**
   * Add injury time entry
   */
  async addInjuryTime(matchId: string, playerId: string, reason: string, userId: string, userRole: string): Promise<boolean> {
    if (!this.precisionTimer) {
      return false
    }

    try {
      const currentTime = new Date()

      const injuryEntry: InjuryTimeEntry = {
        id: this.generateId(),
        startTime: currentTime,
        matchId,
        playerId,
        reason,
        duration: 0,
        recordedBy: userId
      }

      this.injuryTimeEntries.push(injuryEntry)
      this.precisionTimer.injuryTimeEntries.push(injuryEntry)

      // Record operation
      const operation: TimerOperation = {
        id: this.generateId(),
        type: 'edit_time',
        timestamp: currentTime,
        userId,
        userRole,
        matchId,
        details: { injuryEntry, action: 'start_injury' }
      }
      this.operationHistory.push(operation)

      // Send real-time update
      await this.broadcastStateUpdate(matchId, userId, userRole, 'state_update')

      // Notify listeners
      this.addNotification({
        id: this.generateId(),
        type: 'stoppage_added',
        timestamp: currentTime,
        matchId,
        message: `Injury time started for player ${playerId}`,
        severity: 'warning',
        data: { playerId, reason }
      })

      return true
    } catch (error) {
      console.error('Error adding injury time:', error)
      return false
    }
  }

  /**
   * End injury time entry
   */
  async endInjuryTime(injuryId: string, matchId: string, userId: string, userRole: string): Promise<boolean> {
    try {
      const currentTime = new Date()
      const injuryEntry = this.injuryTimeEntries.find(entry => entry.id === injuryId)

      if (!injuryEntry || injuryEntry.endTime) {
        return false
      }

      injuryEntry.endTime = currentTime
      injuryEntry.duration = currentTime.getTime() - injuryEntry.startTime.getTime()

      // Update precision timer state
      this.precisionTimer!.injuryTimeEntries = this.injuryTimeEntries

      // Record operation
      const operation: TimerOperation = {
        id: this.generateId(),
        type: 'edit_time',
        timestamp: currentTime,
        userId,
        userRole,
        matchId,
        details: { injuryId, injuryEntry, action: 'end_injury' }
      }
      this.operationHistory.push(operation)

      // Send real-time update
      await this.broadcastStateUpdate(matchId, userId, userRole, 'state_update')

      // Notify listeners
      this.addNotification({
        id: this.generateId(),
        type: 'stoppage_added',
        timestamp: currentTime,
        matchId,
        message: `Injury time ended (${Math.floor(injuryEntry.duration / 60000)} minutes)`,
        severity: 'info',
        data: { injuryId, duration: injuryEntry.duration }
      })

      return true
    } catch (error) {
      console.error('Error ending injury time:', error)
      return false
    }
  }

  /**
   * Get current timer state
   */
  getCurrentState(): PrecisionTimerState | null {
    if (!this.precisionTimer) {
      return null
    }

    // Update current elapsed time if running
    if (this.precisionTimer.status === 'running') {
      const now = performance.now()
      this.precisionTimer.currentElapsed = now - this.precisionTimer.startTimestamp - this.precisionTimer.totalPausedDuration
    }

    return { ...this.precisionTimer }
  }

  /**
   * Get timer control permissions for a user
   */
  getTimerControl(userRole: string): TimerControl {
    const baseControl: TimerControl = {
      canStart: false,
      canPause: false,
      canResume: false,
      canStop: false,
      canAddStoppage: false,
      canAddExtraTime: false,
      canEditTime: false
    }

    switch (userRole) {
      case 'referee':
        return {
          ...baseControl,
          canStart: true,
          canPause: true,
          canResume: true,
          canStop: true,
          canAddStoppage: true,
          canAddExtraTime: true,
          canEditTime: true
        }
      case 'assistant_referee':
        return {
          ...baseControl,
          canPause: true,
          canResume: true,
          canAddStoppage: true,
          canAddExtraTime: true
        }
      case 'fourth_official':
        return {
          ...baseControl,
          canAddStoppage: true
        }
      case 'admin':
        return {
          ...baseControl,
          canStart: true,
          canPause: true,
          canResume: true,
          canStop: true,
          canAddStoppage: true,
          canAddExtraTime: true,
          canEditTime: true
        }
      default:
        return baseControl
    }
  }

  /**
   * Get operation history
   */
  getOperationHistory(): TimerOperation[] {
    return [...this.operationHistory]
  }

  /**
   * Get notifications
   */
  getNotifications(): TimerNotification[] {
    return [...this.notifications]
  }

  /**
   * Get period summaries
   */
  getPeriodSummaries(): PeriodSummary[] {
    return [...this.periodSummaries]
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: (state: PrecisionTimerState) => void): () => void {
    this.onStateChangeCallbacks.push(callback)
    return () => {
      const index = this.onStateChangeCallbacks.indexOf(callback)
      if (index > -1) {
        this.onStateChangeCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Subscribe to notifications
   */
  onNotification(callback: (notification: TimerNotification) => void): () => void {
    this.onNotificationCallbacks.push(callback)
    return () => {
      const index = this.onNotificationCallbacks.indexOf(callback)
      if (index > -1) {
        this.onNotificationCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Subscribe to period transitions
   */
  onPeriodTransition(callback: (summary: PeriodSummary) => void): () => void {
    this.onPeriodTransitionCallbacks.push(callback)
    return () => {
      const index = this.onPeriodTransitionCallbacks.indexOf(callback)
      if (index > -1) {
        this.onPeriodTransitionCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.syncChannel) {
      this.supabase.removeChannel(this.syncChannel)
    }
    this.onStateChangeCallbacks = []
    this.onNotificationCallbacks = []
    this.onPeriodTransitionCallbacks = []
  }

  // Private methods

  private convertDatabaseStateToPrecisionState(dbState: MatchTimerState): PrecisionTimerState {
    return {
      startTimestamp: dbState.start_time ? new Date(dbState.start_time).getTime() : 0,
      totalPausedDuration: dbState.total_pause_duration * 1000, // convert to milliseconds
      currentElapsed: dbState.elapsed_minutes * 60000, // convert to milliseconds
      precision: 1, // 1ms precision
      currentPeriod: this.getPeriodFromHalf(dbState.current_half),
      periodStartTime: new Date(),
      periodDuration: (dbState.total_minutes / 2) * 60000, // convert to milliseconds
      stoppageTime: dbState.added_time * 60000, // convert to milliseconds
      injuryTimeEntries: [],
      lastSyncTime: new Date(),
      syncOffset: 0,
      status: dbState.is_running ? 'running' : 'paused',
      isMaster: false,
      lastControlUser: '',
      lastControlTime: new Date()
    }
  }

  private createInitialPrecisionState(matchId: string): PrecisionTimerState {
    return {
      startTimestamp: 0,
      totalPausedDuration: 0,
      currentElapsed: 0,
      precision: 1,
      currentPeriod: 'H1',
      periodStartTime: new Date(),
      periodDuration: 45 * 60000, // 45 minutes in milliseconds
      stoppageTime: 0,
      injuryTimeEntries: [],
      lastSyncTime: new Date(),
      syncOffset: 0,
      status: 'stopped',
      isMaster: false,
      lastControlUser: '',
      lastControlTime: new Date()
    }
  }

  private getPeriodFromHalf(half: number): TimerPeriod {
    switch (half) {
      case 1: return 'H1'
      case 2: return 'H2'
      case 3: return 'ET1'
      case 4: return 'ET2'
      default: return 'H1'
    }
  }

  private async updateDatabaseState(matchId: string, updates: Partial<MatchTimerUpdate>): Promise<void> {
    const { error } = await this.supabase
      .from('match_timer_states')
      .update({
        ...updates,
        last_updated: new Date().toISOString()
      })
      .eq('match_id', matchId)

    if (error) {
      console.error('Error updating database state:', error)
      throw error
    }
  }

  private async setupRealtimeSync(matchId: string, userId: string, userRole: string): Promise<void> {
    this.syncChannel = this.supabase
      .channel(`timer-sync-${matchId}`)
      .on(
        'broadcast',
        { event: 'timer_state_update' },
        (payload: TimerSyncMessage) => {
          this.handleSyncMessage(payload, userId, userRole)
        }
      )
      .subscribe()
  }

  private async broadcastStateUpdate(matchId: string, userId: string, userRole: string, type: TimerSyncMessage['type']): Promise<void> {
    if (!this.syncChannel || !this.precisionTimer) {
      return
    }

    const message: TimerSyncMessage = {
      type,
      matchId,
      userId,
      userRole,
      timestamp: new Date(),
      data: {
        state: { ...this.precisionTimer }
      }
    }

    await this.syncChannel.send({
      type: 'broadcast',
      event: 'timer_state_update',
      payload: message
    })
  }

  private handleSyncMessage(message: TimerSyncMessage, currentUserId: string, currentUserRole: string): void {
    if (message.userId === currentUserId) {
      return // Ignore own messages
    }

    if (message.type === 'state_update' && message.data.state) {
      // Sync with remote state
      this.precisionTimer = { ...message.data.state }
      this.notifyStateChange()
    }

    if (message.data.notification) {
      this.addNotification(message.data.notification)
    }
  }

  private notifyStateChange(): void {
    if (!this.precisionTimer) {
      return
    }

    this.onStateChangeCallbacks.forEach(callback => {
      try {
        callback({ ...this.precisionTimer! })
      } catch (error) {
        console.error('Error in state change callback:', error)
      }
    })
  }

  private addNotification(notification: TimerNotification): void {
    this.notifications.push(notification)
    
    // Keep only last 100 notifications
    if (this.notifications.length > 100) {
      this.notifications.shift()
    }

    this.onNotificationCallbacks.forEach(callback => {
      try {
        callback(notification)
      } catch (error) {
        console.error('Error in notification callback:', error)
      }
    })
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
  }

  private initializePerformanceMonitoring(): void {
    // Initialize performance metrics
    this.performanceMetrics = {
      averageLatency: 0,
      syncAccuracy: 0,
      operationCount: 0,
      lastSyncTime: new Date()
    }
  }

  private startPerformanceMonitoring(): void {
    // Monitor timer precision and sync accuracy
    setInterval(() => {
      if (this.precisionTimer && this.precisionTimer.status === 'running') {
        const now = performance.now()
        const expectedElapsed = now - this.precisionTimer.startTimestamp - this.precisionTimer.totalPausedDuration
        const actualElapsed = this.precisionTimer.currentElapsed
        const accuracy = Math.abs(expectedElapsed - actualElapsed)
        
        this.performanceMetrics.syncAccuracy = accuracy
        this.performanceMetrics.lastSyncTime = new Date()
      }
    }, 1000) // Check every second
  }
}
