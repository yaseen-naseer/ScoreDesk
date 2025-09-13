/**
 * Timer Audit Logging Service
 * Comprehensive audit logging for all timer operations and state changes
 */

export interface TimerAuditLog {
  id: string
  matchId: string
  timestamp: Date
  operation: TimerAuditOperation
  userId: string
  userRole: string
  sessionId: string
  ipAddress?: string
  userAgent?: string
  previousState?: any
  newState?: any
  metadata?: Record<string, any>
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'control' | 'state_change' | 'configuration' | 'security' | 'system'
}

export interface TimerAuditOperation {
  type: 'start' | 'pause' | 'resume' | 'stop' | 'add_stoppage' | 'add_extra_time' | 
        'edit_time' | 'period_change' | 'injury_start' | 'injury_end' | 'config_change' |
        'permission_granted' | 'permission_denied' | 'conflict_resolved' | 'error'
  description: string
  parameters?: Record<string, any>
  success: boolean
  errorMessage?: string
}

export interface TimerAuditFilter {
  matchId?: string
  userId?: string
  userRole?: string
  operationType?: string
  severity?: string
  category?: string
  dateFrom?: Date
  dateTo?: Date
  sessionId?: string
}

export interface TimerAuditStatistics {
  totalOperations: number
  operationsByType: Record<string, number>
  operationsByUser: Record<string, number>
  operationsByRole: Record<string, number>
  operationsBySeverity: Record<string, number>
  operationsByCategory: Record<string, number>
  successRate: number
  errorRate: number
  averageOperationsPerHour: number
  peakActivityHour: number
  mostActiveUser: string
  mostCommonOperation: string
}

export interface TimerAuditExport {
  format: 'json' | 'csv' | 'pdf'
  data: TimerAuditLog[]
  metadata: {
    exportDate: Date
    exportedBy: string
    matchId?: string
    dateRange?: { from: Date; to: Date }
    totalRecords: number
  }
}

export class TimerAuditService {
  private logs: TimerAuditLog[] = []
  private maxLogs: number = 10000
  private sessionId: string
  private auditCallbacks: Array<(log: TimerAuditLog) => void> = []
  private exportCallbacks: Array<(export: TimerAuditExport) => void> = []

  constructor() {
    this.sessionId = this.generateSessionId()
    this.initializeAuditLogging()
  }

  /**
   * Log timer operation
   */
  logOperation(
    matchId: string,
    operation: Omit<TimerAuditOperation, 'type'> & { type: TimerAuditOperation['type'] },
    userId: string,
    userRole: string,
    metadata?: {
      previousState?: any
      newState?: any
      ipAddress?: string
      userAgent?: string
      [key: string]: any
    }
  ): void {
    const auditLog: TimerAuditLog = {
      id: this.generateId(),
      matchId,
      timestamp: new Date(),
      operation: {
        type: operation.type,
        description: operation.description,
        parameters: operation.parameters,
        success: operation.success,
        errorMessage: operation.errorMessage
      },
      userId,
      userRole,
      sessionId: this.sessionId,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      previousState: metadata?.previousState,
      newState: metadata?.newState,
      metadata: metadata ? { ...metadata } : undefined,
      severity: this.calculateSeverity(operation.type, operation.success),
      category: this.categorizeOperation(operation.type)
    }

    this.addLog(auditLog)
  }

  /**
   * Log timer start
   */
  logTimerStart(
    matchId: string,
    userId: string,
    userRole: string,
    previousState?: any,
    newState?: any,
    metadata?: any
  ): void {
    this.logOperation(matchId, {
      type: 'start',
      description: 'Timer started',
      success: true,
      parameters: { action: 'start_timer' }
    }, userId, userRole, {
      previousState,
      newState,
      ...metadata
    })
  }

  /**
   * Log timer pause
   */
  logTimerPause(
    matchId: string,
    userId: string,
    userRole: string,
    previousState?: any,
    newState?: any,
    metadata?: any
  ): void {
    this.logOperation(matchId, {
      type: 'pause',
      description: 'Timer paused',
      success: true,
      parameters: { action: 'pause_timer' }
    }, userId, userRole, {
      previousState,
      newState,
      ...metadata
    })
  }

  /**
   * Log timer resume
   */
  logTimerResume(
    matchId: string,
    userId: string,
    userRole: string,
    previousState?: any,
    newState?: any,
    metadata?: any
  ): void {
    this.logOperation(matchId, {
      type: 'resume',
      description: 'Timer resumed',
      success: true,
      parameters: { action: 'resume_timer' }
    }, userId, userRole, {
      previousState,
      newState,
      ...metadata
    })
  }

  /**
   * Log stoppage time addition
   */
  logStoppageAdded(
    matchId: string,
    minutes: number,
    userId: string,
    userRole: string,
    previousState?: any,
    newState?: any,
    metadata?: any
  ): void {
    this.logOperation(matchId, {
      type: 'add_stoppage',
      description: `Stoppage time added: ${minutes} minutes`,
      success: true,
      parameters: { minutes, action: 'add_stoppage' }
    }, userId, userRole, {
      previousState,
      newState,
      ...metadata
    })
  }

  /**
   * Log injury time
   */
  logInjuryTime(
    matchId: string,
    playerId: string,
    action: 'start' | 'end',
    userId: string,
    userRole: string,
    duration?: number,
    metadata?: any
  ): void {
    this.logOperation(matchId, {
      type: action === 'start' ? 'injury_start' : 'injury_end',
      description: `Injury time ${action} for player ${playerId}${duration ? ` (${Math.floor(duration / 60000)} minutes)` : ''}`,
      success: true,
      parameters: { playerId, action, duration }
    }, userId, userRole, metadata)
  }

  /**
   * Log permission denied
   */
  logPermissionDenied(
    matchId: string,
    operation: string,
    userId: string,
    userRole: string,
    reason: string,
    metadata?: any
  ): void {
    this.logOperation(matchId, {
      type: 'permission_denied',
      description: `Permission denied for ${operation}: ${reason}`,
      success: false,
      errorMessage: reason,
      parameters: { operation, reason }
    }, userId, userRole, {
      ...metadata,
      severity: 'high',
      category: 'security'
    })
  }

  /**
   * Log conflict resolution
   */
  logConflictResolution(
    matchId: string,
    conflictId: string,
    resolution: string,
    winner: string,
    losers: string[],
    userId: string,
    userRole: string,
    metadata?: any
  ): void {
    this.logOperation(matchId, {
      type: 'conflict_resolved',
      description: `Conflict resolved: ${resolution}. Winner: ${winner}, Losers: ${losers.join(', ')}`,
      success: true,
      parameters: { conflictId, resolution, winner, losers }
    }, userId, userRole, metadata)
  }

  /**
   * Log error
   */
  logError(
    matchId: string,
    operation: string,
    error: string,
    userId: string,
    userRole: string,
    metadata?: any
  ): void {
    this.logOperation(matchId, {
      type: 'error',
      description: `Error in ${operation}: ${error}`,
      success: false,
      errorMessage: error,
      parameters: { operation, error }
    }, userId, userRole, {
      ...metadata,
      severity: 'critical',
      category: 'system'
    })
  }

  /**
   * Get audit logs with filtering
   */
  getAuditLogs(filter?: TimerAuditFilter): TimerAuditLog[] {
    let filteredLogs = [...this.logs]

    if (filter) {
      if (filter.matchId) {
        filteredLogs = filteredLogs.filter(log => log.matchId === filter.matchId)
      }
      if (filter.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filter.userId)
      }
      if (filter.userRole) {
        filteredLogs = filteredLogs.filter(log => log.userRole === filter.userRole)
      }
      if (filter.operationType) {
        filteredLogs = filteredLogs.filter(log => log.operation.type === filter.operationType)
      }
      if (filter.severity) {
        filteredLogs = filteredLogs.filter(log => log.severity === filter.severity)
      }
      if (filter.category) {
        filteredLogs = filteredLogs.filter(log => log.category === filter.category)
      }
      if (filter.dateFrom) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.dateFrom!)
      }
      if (filter.dateTo) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filter.dateTo!)
      }
      if (filter.sessionId) {
        filteredLogs = filteredLogs.filter(log => log.sessionId === filter.sessionId)
      }
    }

    return filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Get audit statistics
   */
  getAuditStatistics(filter?: TimerAuditFilter): TimerAuditStatistics {
    const logs = this.getAuditLogs(filter)
    
    const stats: TimerAuditStatistics = {
      totalOperations: logs.length,
      operationsByType: {},
      operationsByUser: {},
      operationsByRole: {},
      operationsBySeverity: {},
      operationsByCategory: {},
      successRate: 0,
      errorRate: 0,
      averageOperationsPerHour: 0,
      peakActivityHour: 0,
      mostActiveUser: '',
      mostCommonOperation: ''
    }

    if (logs.length === 0) {
      return stats
    }

    // Count operations by various dimensions
    logs.forEach(log => {
      // By type
      stats.operationsByType[log.operation.type] = (stats.operationsByType[log.operation.type] || 0) + 1
      
      // By user
      stats.operationsByUser[log.userId] = (stats.operationsByUser[log.userId] || 0) + 1
      
      // By role
      stats.operationsByRole[log.userRole] = (stats.operationsByRole[log.userRole] || 0) + 1
      
      // By severity
      stats.operationsBySeverity[log.severity] = (stats.operationsBySeverity[log.severity] || 0) + 1
      
      // By category
      stats.operationsByCategory[log.category] = (stats.operationsByCategory[log.category] || 0) + 1
    })

    // Calculate success/error rates
    const successfulOperations = logs.filter(log => log.operation.success).length
    const failedOperations = logs.filter(log => !log.operation.success).length
    
    stats.successRate = (successfulOperations / logs.length) * 100
    stats.errorRate = (failedOperations / logs.length) * 100

    // Calculate average operations per hour
    const timeSpan = logs.length > 1 ? 
      logs[0].timestamp.getTime() - logs[logs.length - 1].timestamp.getTime() : 
      1
    const hours = timeSpan / (1000 * 60 * 60)
    stats.averageOperationsPerHour = logs.length / Math.max(hours, 1)

    // Find peak activity hour
    const hourCounts: Record<number, number> = {}
    logs.forEach(log => {
      const hour = log.timestamp.getHours()
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    })
    stats.peakActivityHour = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] ? parseInt(Object.entries(hourCounts).sort(([,a], [,b]) => b - a)[0][0]) : 0

    // Find most active user and most common operation
    stats.mostActiveUser = Object.entries(stats.operationsByUser)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || ''
    stats.mostCommonOperation = Object.entries(stats.operationsByType)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || ''

    return stats
  }

  /**
   * Export audit logs
   */
  exportAuditLogs(
    format: TimerAuditExport['format'],
    filter?: TimerAuditFilter,
    exportedBy?: string
  ): TimerAuditExport {
    const logs = this.getAuditLogs(filter)
    
    const exportData: TimerAuditExport = {
      format,
      data: logs,
      metadata: {
        exportDate: new Date(),
        exportedBy: exportedBy || 'system',
        matchId: filter?.matchId,
        dateRange: filter?.dateFrom && filter?.dateTo ? 
          { from: filter.dateFrom, to: filter.dateTo } : undefined,
        totalRecords: logs.length
      }
    }

    // Notify export callbacks
    this.exportCallbacks.forEach(callback => {
      try {
        callback(exportData)
      } catch (error) {
        console.error('Error in export callback:', error)
      }
    })

    return exportData
  }

  /**
   * Subscribe to audit log events
   */
  onAuditLog(callback: (log: TimerAuditLog) => void): () => void {
    this.auditCallbacks.push(callback)
    return () => {
      const index = this.auditCallbacks.indexOf(callback)
      if (index > -1) {
        this.auditCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Subscribe to export events
   */
  onExport(callback: (export: TimerAuditExport) => void): () => void {
    this.exportCallbacks.push(callback)
    return () => {
      const index = this.exportCallbacks.indexOf(callback)
      if (index > -1) {
        this.exportCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Clear audit logs for a match
   */
  clearMatchLogs(matchId: string): void {
    this.logs = this.logs.filter(log => log.matchId !== matchId)
  }

  /**
   * Clear all audit logs
   */
  clearAllLogs(): void {
    this.logs = []
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId
  }

  /**
   * Generate new session ID
   */
  generateNewSession(): void {
    this.sessionId = this.generateSessionId()
  }

  // Private methods

  private addLog(log: TimerAuditLog): void {
    this.logs.unshift(log) // Add to beginning for chronological order
    
    // Maintain max logs limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs)
    }

    // Notify callbacks
    this.auditCallbacks.forEach(callback => {
      try {
        callback(log)
      } catch (error) {
        console.error('Error in audit callback:', error)
      }
    })
  }

  private calculateSeverity(operationType: string, success: boolean): TimerAuditLog['severity'] {
    if (!success) {
      return 'critical'
    }

    switch (operationType) {
      case 'start':
      case 'stop':
        return 'high'
      case 'pause':
      case 'resume':
      case 'add_stoppage':
      case 'add_extra_time':
        return 'medium'
      case 'injury_start':
      case 'injury_end':
        return 'medium'
      case 'permission_denied':
        return 'high'
      case 'conflict_resolved':
        return 'medium'
      case 'error':
        return 'critical'
      default:
        return 'low'
    }
  }

  private categorizeOperation(operationType: string): TimerAuditLog['category'] {
    switch (operationType) {
      case 'start':
      case 'pause':
      case 'resume':
      case 'stop':
      case 'add_stoppage':
      case 'add_extra_time':
      case 'edit_time':
        return 'control'
      case 'period_change':
        return 'state_change'
      case 'injury_start':
      case 'injury_end':
        return 'state_change'
      case 'config_change':
        return 'configuration'
      case 'permission_denied':
      case 'permission_granted':
        return 'security'
      case 'conflict_resolved':
        return 'system'
      case 'error':
        return 'system'
      default:
        return 'control'
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
  }

  private generateSessionId(): string {
    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36)
  }

  private initializeAuditLogging(): void {
    // Log service initialization
    this.logOperation('system', {
      type: 'config_change',
      description: 'Timer audit service initialized',
      success: true,
      parameters: { action: 'service_init' }
    }, 'system', 'system', {
      sessionId: this.sessionId,
      severity: 'low',
      category: 'system'
    })
  }
}

// Export singleton instance
export const timerAuditService = new TimerAuditService()
