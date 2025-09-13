/**
 * Timer Conflict Resolution Service
 * Handles conflicts when multiple users try to control the timer simultaneously
 */

export interface TimerConflict {
  id: string
  matchId: string
  conflictType: 'concurrent_control' | 'state_mismatch' | 'permission_denied' | 'sync_conflict'
  timestamp: Date
  participants: Array<{
    userId: string
    userRole: string
    action: string
    timestamp: Date
  }>
  resolution: TimerConflictResolution | null
  status: 'pending' | 'resolved' | 'escalated'
}

export interface TimerConflictResolution {
  id: string
  conflictId: string
  strategy: 'priority_based' | 'time_based' | 'role_based' | 'manual' | 'consensus'
  resolvedBy: string
  resolvedAt: Date
  winner: {
    userId: string
    userRole: string
    reason: string
  }
  losers: Array<{
    userId: string
    userRole: string
    reason: string
  }>
  actions: Array<{
    type: 'accept' | 'reject' | 'modify' | 'rollback'
    description: string
    timestamp: Date
  }>
}

export interface TimerControlRequest {
  id: string
  matchId: string
  userId: string
  userRole: string
  action: string
  timestamp: Date
  priority: number
  data?: any
}

export interface UserRolePriority {
  role: string
  priority: number
  permissions: string[]
}

export class TimerConflictResolutionService {
  private conflicts: Map<string, TimerConflict> = new Map()
  private pendingRequests: Map<string, TimerControlRequest> = new Map()
  private rolePriorities: Map<string, UserRolePriority> = new Map()
  private conflictCallbacks: Array<(conflict: TimerConflict) => void> = []
  private resolutionCallbacks: Array<(resolution: TimerConflictResolution) => void> = []

  constructor() {
    this.initializeRolePriorities()
  }

  /**
   * Request timer control
   */
  async requestControl(request: Omit<TimerControlRequest, 'id' | 'timestamp' | 'priority'>): Promise<{
    success: boolean
    conflictId?: string
    message: string
  }> {
    const controlRequest: TimerControlRequest = {
      ...request,
      id: this.generateId(),
      timestamp: new Date(),
      priority: this.calculatePriority(request.userRole, request.action)
    }

    // Check for existing conflicts
    const existingConflict = this.findActiveConflict(request.matchId)
    if (existingConflict) {
      return this.handleExistingConflict(existingConflict, controlRequest)
    }

    // Check for concurrent requests
    const concurrentRequests = this.findConcurrentRequests(request.matchId, request.timestamp)
    if (concurrentRequests.length > 0) {
      return this.createConflict([controlRequest, ...concurrentRequests])
    }

    // No conflict, grant control
    this.pendingRequests.set(controlRequest.id, controlRequest)
    return {
      success: true,
      message: 'Control granted'
    }
  }

  /**
   * Resolve conflict automatically
   */
  async resolveConflict(conflictId: string, strategy?: TimerConflictResolution['strategy']): Promise<TimerConflictResolution | null> {
    const conflict = this.conflicts.get(conflictId)
    if (!conflict || conflict.status !== 'pending') {
      return null
    }

    const resolutionStrategy = strategy || this.determineBestStrategy(conflict)
    const resolution = await this.executeResolutionStrategy(conflict, resolutionStrategy)

    if (resolution) {
      conflict.resolution = resolution
      conflict.status = 'resolved'
      
      // Notify callbacks
      this.resolutionCallbacks.forEach(callback => {
        try {
          callback(resolution)
        } catch (error) {
          console.error('Error in resolution callback:', error)
        }
      })

      // Clean up pending requests
      resolution.winner && this.pendingRequests.delete(resolution.winner.userId)
      resolution.losers.forEach(loser => {
        this.pendingRequests.delete(loser.userId)
      })
    }

    return resolution
  }

  /**
   * Escalate conflict to manual resolution
   */
  escalateConflict(conflictId: string, escalatedBy: string): boolean {
    const conflict = this.conflicts.get(conflictId)
    if (!conflict) {
      return false
    }

    conflict.status = 'escalated'
    
    // Add escalation action
    if (conflict.resolution) {
      conflict.resolution.actions.push({
        type: 'modify',
        description: `Conflict escalated by ${escalatedBy} for manual resolution`,
        timestamp: new Date()
      })
    }

    return true
  }

  /**
   * Get active conflicts for a match
   */
  getActiveConflicts(matchId: string): TimerConflict[] {
    const conflicts: TimerConflict[] = []
    for (const conflict of this.conflicts.values()) {
      if (conflict.matchId === matchId && conflict.status === 'pending') {
        conflicts.push(conflict)
      }
    }
    return conflicts
  }

  /**
   * Get conflict history
   */
  getConflictHistory(matchId: string): TimerConflict[] {
    const conflicts: TimerConflict[] = []
    for (const conflict of this.conflicts.values()) {
      if (conflict.matchId === matchId) {
        conflicts.push(conflict)
      }
    }
    return conflicts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Subscribe to conflict events
   */
  onConflict(callback: (conflict: TimerConflict) => void): () => void {
    this.conflictCallbacks.push(callback)
    return () => {
      const index = this.conflictCallbacks.indexOf(callback)
      if (index > -1) {
        this.conflictCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Subscribe to resolution events
   */
  onResolution(callback: (resolution: TimerConflictResolution) => void): () => void {
    this.resolutionCallbacks.push(callback)
    return () => {
      const index = this.resolutionCallbacks.indexOf(callback)
      if (index > -1) {
        this.resolutionCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Clear conflicts for a match
   */
  clearMatchConflicts(matchId: string): void {
    for (const [id, conflict] of this.conflicts) {
      if (conflict.matchId === matchId) {
        this.conflicts.delete(id)
      }
    }
    
    for (const [id, request] of this.pendingRequests) {
      if (request.matchId === matchId) {
        this.pendingRequests.delete(id)
      }
    }
  }

  /**
   * Get conflict statistics
   */
  getConflictStatistics(matchId?: string): {
    totalConflicts: number
    resolvedConflicts: number
    pendingConflicts: number
    escalatedConflicts: number
    averageResolutionTime: number
    conflictsByType: Record<string, number>
    conflictsByRole: Record<string, number>
  } {
    const conflicts = matchId 
      ? this.getConflictHistory(matchId)
      : Array.from(this.conflicts.values())

    const stats = {
      totalConflicts: conflicts.length,
      resolvedConflicts: conflicts.filter(c => c.status === 'resolved').length,
      pendingConflicts: conflicts.filter(c => c.status === 'pending').length,
      escalatedConflicts: conflicts.filter(c => c.status === 'escalated').length,
      averageResolutionTime: 0,
      conflictsByType: {} as Record<string, number>,
      conflictsByRole: {} as Record<string, number>
    }

    // Calculate average resolution time
    const resolvedConflicts = conflicts.filter(c => c.resolution)
    if (resolvedConflicts.length > 0) {
      const totalTime = resolvedConflicts.reduce((sum, conflict) => {
        if (conflict.resolution) {
          return sum + (conflict.resolution.resolvedAt.getTime() - conflict.timestamp.getTime())
        }
        return sum
      }, 0)
      stats.averageResolutionTime = totalTime / resolvedConflicts.length
    }

    // Count by type and role
    conflicts.forEach(conflict => {
      stats.conflictsByType[conflict.conflictType] = (stats.conflictsByType[conflict.conflictType] || 0) + 1
      
      conflict.participants.forEach(participant => {
        stats.conflictsByRole[participant.userRole] = (stats.conflictsByRole[participant.userRole] || 0) + 1
      })
    })

    return stats
  }

  // Private methods

  private initializeRolePriorities(): void {
    this.rolePriorities.set('referee', {
      role: 'referee',
      priority: 100,
      permissions: ['start', 'pause', 'resume', 'stop', 'add_stoppage', 'add_extra_time', 'edit_time']
    })
    
    this.rolePriorities.set('assistant_referee', {
      role: 'assistant_referee',
      priority: 80,
      permissions: ['pause', 'resume', 'add_stoppage', 'add_extra_time']
    })
    
    this.rolePriorities.set('fourth_official', {
      role: 'fourth_official',
      priority: 60,
      permissions: ['add_stoppage']
    })
    
    this.rolePriorities.set('admin', {
      role: 'admin',
      priority: 90,
      permissions: ['start', 'pause', 'resume', 'stop', 'add_stoppage', 'add_extra_time', 'edit_time', 'override']
    })
    
    this.rolePriorities.set('scorer', {
      role: 'scorer',
      priority: 40,
      permissions: ['view']
    })
  }

  private calculatePriority(userRole: string, action: string): number {
    const rolePriority = this.rolePriorities.get(userRole)
    if (!rolePriority) {
      return 0
    }

    let actionMultiplier = 1
    switch (action) {
      case 'start':
      case 'stop':
        actionMultiplier = 1.5
        break
      case 'pause':
      case 'resume':
        actionMultiplier = 1.2
        break
      case 'add_stoppage':
      case 'add_extra_time':
        actionMultiplier = 1.0
        break
      case 'edit_time':
        actionMultiplier = 1.8
        break
      default:
        actionMultiplier = 0.8
    }

    return rolePriority.priority * actionMultiplier
  }

  private findActiveConflict(matchId: string): TimerConflict | null {
    for (const conflict of this.conflicts.values()) {
      if (conflict.matchId === matchId && conflict.status === 'pending') {
        return conflict
      }
    }
    return null
  }

  private findConcurrentRequests(matchId: string, timestamp: Date): TimerControlRequest[] {
    const concurrentRequests: TimerControlRequest[] = []
    const timeWindow = 5000 // 5 seconds

    for (const request of this.pendingRequests.values()) {
      if (request.matchId === matchId && 
          Math.abs(request.timestamp.getTime() - timestamp.getTime()) <= timeWindow) {
        concurrentRequests.push(request)
      }
    }

    return concurrentRequests
  }

  private async handleExistingConflict(existingConflict: TimerConflict, newRequest: TimerControlRequest): Promise<{
    success: boolean
    conflictId: string
    message: string
  }> {
    // Add new request to existing conflict
    existingConflict.participants.push({
      userId: newRequest.userId,
      userRole: newRequest.userRole,
      action: newRequest.action,
      timestamp: newRequest.timestamp
    })

    // Try to resolve automatically
    const resolution = await this.resolveConflict(existingConflict.id)
    
    if (resolution && resolution.winner.userId === newRequest.userId) {
      return {
        success: true,
        conflictId: existingConflict.id,
        message: `Control granted after resolving conflict with ${resolution.losers.map(l => l.userRole).join(', ')}`
      }
    }

    return {
      success: false,
      conflictId: existingConflict.id,
      message: `Conflict with existing request from ${existingConflict.participants[0].userRole}`
    }
  }

  private createConflict(requests: TimerControlRequest[]): { success: boolean; conflictId: string; message: string } {
    const conflict: TimerConflict = {
      id: this.generateId(),
      matchId: requests[0].matchId,
      conflictType: 'concurrent_control',
      timestamp: new Date(),
      participants: requests.map(req => ({
        userId: req.userId,
        userRole: req.userRole,
        action: req.action,
        timestamp: req.timestamp
      })),
      resolution: null,
      status: 'pending'
    }

    this.conflicts.set(conflict.id, conflict)

    // Try automatic resolution
    this.resolveConflict(conflict.id)

    // Notify callbacks
    this.conflictCallbacks.forEach(callback => {
      try {
        callback(conflict)
      } catch (error) {
        console.error('Error in conflict callback:', error)
      }
    })

    return {
      success: false,
      conflictId: conflict.id,
      message: `Conflict detected with ${requests.length - 1} other request(s)`
    }
  }

  private determineBestStrategy(conflict: TimerConflict): TimerConflictResolution['strategy'] {
    // Check if all participants have the same role
    const roles = conflict.participants.map(p => p.userRole)
    const uniqueRoles = [...new Set(roles)]
    
    if (uniqueRoles.length === 1) {
      return 'time_based' // Same role, use time-based resolution
    }

    // Check if there's a clear priority difference
    const priorities = conflict.participants.map(p => this.rolePriorities.get(p.userRole)?.priority || 0)
    const maxPriority = Math.max(...priorities)
    const minPriority = Math.min(...priorities)
    
    if (maxPriority - minPriority > 20) {
      return 'priority_based' // Clear priority difference
    }

    return 'role_based' // Default to role-based resolution
  }

  private async executeResolutionStrategy(
    conflict: TimerConflict, 
    strategy: TimerConflictResolution['strategy']
  ): Promise<TimerConflictResolution | null> {
    let winner: TimerConflictResolution['winner'] | null = null
    let losers: TimerConflictResolution['losers'] = []

    switch (strategy) {
      case 'priority_based':
        ({ winner, losers } = this.resolveByPriority(conflict))
        break
      case 'time_based':
        ({ winner, losers } = this.resolveByTime(conflict))
        break
      case 'role_based':
        ({ winner, losers } = this.resolveByRole(conflict))
        break
      case 'consensus':
        // For now, fall back to priority-based
        ({ winner, losers } = this.resolveByPriority(conflict))
        break
      case 'manual':
        // Manual resolution - mark as escalated
        conflict.status = 'escalated'
        return null
    }

    if (!winner) {
      return null
    }

    const resolution: TimerConflictResolution = {
      id: this.generateId(),
      conflictId: conflict.id,
      strategy,
      resolvedBy: 'system',
      resolvedAt: new Date(),
      winner,
      losers,
      actions: [{
        type: 'accept',
        description: `Automatic resolution using ${strategy} strategy`,
        timestamp: new Date()
      }]
    }

    return resolution
  }

  private resolveByPriority(conflict: TimerConflict): {
    winner: TimerConflictResolution['winner']
    losers: TimerConflictResolution['losers']
  } {
    const participants = conflict.participants.map(p => ({
      ...p,
      priority: this.rolePriorities.get(p.userRole)?.priority || 0
    })).sort((a, b) => b.priority - a.priority)

    const winner = participants[0]
    const losers = participants.slice(1)

    return {
      winner: {
        userId: winner.userId,
        userRole: winner.userRole,
        reason: `Highest priority role (${winner.priority})`
      },
      losers: losers.map(loser => ({
        userId: loser.userId,
        userRole: loser.userRole,
        reason: `Lower priority role (${loser.priority})`
      }))
    }
  }

  private resolveByTime(conflict: TimerConflict): {
    winner: TimerConflictResolution['winner']
    losers: TimerConflictResolution['losers']
  } {
    const participants = [...conflict.participants].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    )

    const winner = participants[0]
    const losers = participants.slice(1)

    return {
      winner: {
        userId: winner.userId,
        userRole: winner.userRole,
        reason: `First request (${winner.timestamp.toLocaleTimeString()})`
      },
      losers: losers.map(loser => ({
        userId: loser.userId,
        userRole: loser.userRole,
        reason: `Later request (${loser.timestamp.toLocaleTimeString()})`
      }))
    }
  }

  private resolveByRole(conflict: TimerConflict): {
    winner: TimerConflictResolution['winner']
    losers: TimerConflictResolution['losers']
  } {
    // Use priority-based resolution as role-based
    return this.resolveByPriority(conflict)
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
  }
}

// Export singleton instance
export const timerConflictResolutionService = new TimerConflictResolutionService()
