/**
 * Sync Conflict Detection Service
 * Detects conflicts between local and remote data during synchronization
 */

export interface ConflictInfo {
  id: string
  type: 'field' | 'record' | 'relationship' | 'timestamp' | 'version'
  severity: 'low' | 'medium' | 'high' | 'critical'
  field?: string
  localValue: any
  remoteValue: any
  localTimestamp: Date
  remoteTimestamp: Date
  localVersion: number
  remoteVersion: number
  conflictReason: string
  resolutionStrategy?: 'last_write_wins' | 'user_resolution' | 'merge' | 'automatic'
  metadata?: {
    userId?: string
    organizationId?: string
    matchId?: string
    tournamentId?: string
    fieldType?: string
    dataType?: string
  }
}

export interface ConflictResolution {
  conflictId: string
  strategy: 'last_write_wins' | 'user_resolution' | 'merge' | 'automatic'
  resolvedValue: any
  resolvedTimestamp: Date
  resolvedBy?: string
  notes?: string
  metadata?: Record<string, any>
}

export interface ConflictStats {
  totalConflicts: number
  resolvedConflicts: number
  pendingConflicts: number
  conflictsByType: Record<string, number>
  conflictsBySeverity: Record<string, number>
  conflictsByField: Record<string, number>
  averageResolutionTime: number
  lastConflictTime?: Date
}

export interface ConflictDetectionOptions {
  enableFieldLevelDetection: boolean
  enableTimestampValidation: boolean
  enableVersionValidation: boolean
  enableRelationshipValidation: boolean
  maxConflictAge: number // in milliseconds
  conflictThreshold: number // maximum conflicts before blocking sync
  autoResolveLowSeverity: boolean
  enableConflictAnalytics: boolean
}

export type ConflictEventCallback = (event: {
  type: 'conflict_detected' | 'conflict_resolved' | 'conflict_escalated'
  conflict?: ConflictInfo
  resolution?: ConflictResolution
  stats?: ConflictStats
}) => void

export class SyncConflictDetector {
  private conflicts: Map<string, ConflictInfo> = new Map()
  private resolutions: Map<string, ConflictResolution> = new Map()
  private eventCallbacks: Set<ConflictEventCallback> = new Set()
  private options: ConflictDetectionOptions = {
    enableFieldLevelDetection: true,
    enableTimestampValidation: true,
    enableVersionValidation: true,
    enableRelationshipValidation: true,
    maxConflictAge: 24 * 60 * 60 * 1000, // 24 hours
    conflictThreshold: 100,
    autoResolveLowSeverity: false,
    enableConflictAnalytics: true
  }

  constructor(options?: Partial<ConflictDetectionOptions>) {
    if (options) {
      this.options = { ...this.options, ...options }
    }
  }

  /**
   * Detect conflicts between local and remote data
   */
  async detectConflicts(
    localData: any,
    remoteData: any,
    metadata?: ConflictInfo['metadata']
  ): Promise<ConflictInfo[]> {
    const conflicts: ConflictInfo[] = []

    try {
      // Field-level conflict detection
      if (this.options.enableFieldLevelDetection) {
        const fieldConflicts = this.detectFieldConflicts(localData, remoteData, metadata)
        conflicts.push(...fieldConflicts)
      }

      // Timestamp validation
      if (this.options.enableTimestampValidation) {
        const timestampConflicts = this.detectTimestampConflicts(localData, remoteData, metadata)
        conflicts.push(...timestampConflicts)
      }

      // Version validation
      if (this.options.enableVersionValidation) {
        const versionConflicts = this.detectVersionConflicts(localData, remoteData, metadata)
        conflicts.push(...versionConflicts)
      }

      // Relationship validation
      if (this.options.enableRelationshipValidation) {
        const relationshipConflicts = this.detectRelationshipConflicts(localData, remoteData, metadata)
        conflicts.push(...relationshipConflicts)
      }

      // Store conflicts and notify
      for (const conflict of conflicts) {
        this.conflicts.set(conflict.id, conflict)
        this.notifyEvent({
          type: 'conflict_detected',
          conflict,
          stats: this.getStats()
        })
      }

      // Check if we've exceeded the conflict threshold
      if (conflicts.length > this.options.conflictThreshold) {
        throw new Error(`Too many conflicts detected: ${conflicts.length}. Sync blocked.`)
      }

      return conflicts
    } catch (error) {
      console.error('Error detecting conflicts:', error)
      throw error
    }
  }

  /**
   * Detect field-level conflicts
   */
  private detectFieldConflicts(
    localData: any,
    remoteData: any,
    metadata?: ConflictInfo['metadata']
  ): ConflictInfo[] {
    const conflicts: ConflictInfo[] = []

    if (!localData || !remoteData) return conflicts

    // Compare all fields
    const allKeys = new Set([...Object.keys(localData), ...Object.keys(remoteData)])

    for (const key of allKeys) {
      const localValue = localData[key]
      const remoteValue = remoteData[key]

      // Skip metadata fields
      if (this.isMetadataField(key)) continue

      // Check for conflicts
      if (this.hasFieldConflict(localValue, remoteValue)) {
        const conflict: ConflictInfo = {
          id: this.generateConflictId(),
          type: 'field',
          severity: this.calculateFieldSeverity(key, localValue, remoteValue),
          field: key,
          localValue,
          remoteValue,
          localTimestamp: localData.updated_at ? new Date(localData.updated_at) : new Date(),
          remoteTimestamp: remoteData.updated_at ? new Date(remoteData.updated_at) : new Date(),
          localVersion: localData.version || 1,
          remoteVersion: remoteData.version || 1,
          conflictReason: `Field '${key}' has different values`,
          resolutionStrategy: this.getDefaultResolutionStrategy(key, localValue, remoteValue),
          metadata: {
            ...metadata,
            fieldType: typeof localValue,
            dataType: this.getDataType(key)
          }
        }

        conflicts.push(conflict)
      }
    }

    return conflicts
  }

  /**
   * Detect timestamp conflicts
   */
  private detectTimestampConflicts(
    localData: any,
    remoteData: any,
    metadata?: ConflictInfo['metadata']
  ): ConflictInfo[] {
    const conflicts: ConflictInfo[] = []

    if (!localData.updated_at || !remoteData.updated_at) return conflicts

    const localTimestamp = new Date(localData.updated_at)
    const remoteTimestamp = new Date(remoteData.updated_at)

    // Check if timestamps are too close (potential race condition)
    const timeDiff = Math.abs(localTimestamp.getTime() - remoteTimestamp.getTime())
    const threshold = 1000 // 1 second

    if (timeDiff < threshold && timeDiff > 0) {
      const conflict: ConflictInfo = {
        id: this.generateConflictId(),
        type: 'timestamp',
        severity: 'medium',
        localValue: localTimestamp,
        remoteValue: remoteTimestamp,
        localTimestamp,
        remoteTimestamp,
        localVersion: localData.version || 1,
        remoteVersion: remoteData.version || 1,
        conflictReason: 'Timestamps too close - potential race condition',
        resolutionStrategy: 'last_write_wins',
        metadata: {
          ...metadata,
          fieldType: 'timestamp',
          dataType: 'datetime'
        }
      }

      conflicts.push(conflict)
    }

    return conflicts
  }

  /**
   * Detect version conflicts
   */
  private detectVersionConflicts(
    localData: any,
    remoteData: any,
    metadata?: ConflictInfo['metadata']
  ): ConflictInfo[] {
    const conflicts: ConflictInfo[] = []

    const localVersion = localData.version || 1
    const remoteVersion = remoteData.version || 1

    if (localVersion !== remoteVersion) {
      const conflict: ConflictInfo = {
        id: this.generateConflictId(),
        type: 'version',
        severity: 'high',
        localValue: localVersion,
        remoteValue: remoteVersion,
        localTimestamp: localData.updated_at ? new Date(localData.updated_at) : new Date(),
        remoteTimestamp: remoteData.updated_at ? new Date(remoteData.updated_at) : new Date(),
        localVersion,
        remoteVersion,
        conflictReason: `Version mismatch: local=${localVersion}, remote=${remoteVersion}`,
        resolutionStrategy: 'user_resolution',
        metadata: {
          ...metadata,
          fieldType: 'number',
          dataType: 'version'
        }
      }

      conflicts.push(conflict)
    }

    return conflicts
  }

  /**
   * Detect relationship conflicts
   */
  private detectRelationshipConflicts(
    localData: any,
    remoteData: any,
    metadata?: ConflictInfo['metadata']
  ): ConflictInfo[] {
    const conflicts: ConflictInfo[] = []

    // Check for foreign key conflicts
    const foreignKeyFields = ['match_id', 'team_id', 'player_id', 'tournament_id', 'organization_id']
    
    for (const field of foreignKeyFields) {
      if (localData[field] && remoteData[field] && localData[field] !== remoteData[field]) {
        const conflict: ConflictInfo = {
          id: this.generateConflictId(),
          type: 'relationship',
          severity: 'critical',
          field,
          localValue: localData[field],
          remoteValue: remoteData[field],
          localTimestamp: localData.updated_at ? new Date(localData.updated_at) : new Date(),
          remoteTimestamp: remoteData.updated_at ? new Date(remoteData.updated_at) : new Date(),
          localVersion: localData.version || 1,
          remoteVersion: remoteData.version || 1,
          conflictReason: `Relationship conflict in field '${field}'`,
          resolutionStrategy: 'user_resolution',
          metadata: {
            ...metadata,
            fieldType: 'string',
            dataType: 'foreign_key'
          }
        }

        conflicts.push(conflict)
      }
    }

    return conflicts
  }

  /**
   * Check if field has a conflict
   */
  private hasFieldConflict(localValue: any, remoteValue: any): boolean {
    // Handle null/undefined values
    if (localValue === null || localValue === undefined) {
      return remoteValue !== null && remoteValue !== undefined
    }
    if (remoteValue === null || remoteValue === undefined) {
      return localValue !== null && localValue !== undefined
    }

    // Handle different types
    if (typeof localValue !== typeof remoteValue) {
      return true
    }

    // Handle objects
    if (typeof localValue === 'object' && localValue !== null) {
      return JSON.stringify(localValue) !== JSON.stringify(remoteValue)
    }

    // Handle primitives
    return localValue !== remoteValue
  }

  /**
   * Calculate field conflict severity
   */
  private calculateFieldSeverity(field: string, localValue: any, remoteValue: any): ConflictInfo['severity'] {
    // Critical fields
    const criticalFields = ['id', 'match_id', 'team_id', 'player_id', 'tournament_id']
    if (criticalFields.includes(field)) {
      return 'critical'
    }

    // High importance fields
    const highFields = ['score', 'status', 'winner', 'start_time', 'end_time']
    if (highFields.includes(field)) {
      return 'high'
    }

    // Medium importance fields
    const mediumFields = ['notes', 'description', 'location', 'referee']
    if (mediumFields.includes(field)) {
      return 'medium'
    }

    // Default to low
    return 'low'
  }

  /**
   * Get default resolution strategy for field
   */
  private getDefaultResolutionStrategy(field: string, localValue: any, remoteValue: any): ConflictInfo['resolutionStrategy'] {
    // Critical fields require user resolution
    const criticalFields = ['id', 'match_id', 'team_id', 'player_id', 'tournament_id']
    if (criticalFields.includes(field)) {
      return 'user_resolution'
    }

    // Timestamps use last write wins
    if (field.includes('_at') || field.includes('time')) {
      return 'last_write_wins'
    }

    // Scores and status might need user resolution
    if (['score', 'status', 'winner'].includes(field)) {
      return 'user_resolution'
    }

    // Default to last write wins
    return 'last_write_wins'
  }

  /**
   * Check if field is metadata
   */
  private isMetadataField(field: string): boolean {
    const metadataFields = ['created_at', 'updated_at', 'version', 'id']
    return metadataFields.includes(field)
  }

  /**
   * Get data type for field
   */
  private getDataType(field: string): string {
    if (field.includes('_id')) return 'foreign_key'
    if (field.includes('_at') || field.includes('time')) return 'datetime'
    if (field.includes('score') || field.includes('count')) return 'number'
    if (field.includes('email')) return 'email'
    if (field.includes('url')) return 'url'
    if (field.includes('status')) return 'enum'
    return 'string'
  }

  /**
   * Resolve conflict
   */
  async resolveConflict(
    conflictId: string,
    strategy: ConflictResolution['strategy'],
    resolvedValue?: any,
    resolvedBy?: string,
    notes?: string
  ): Promise<ConflictResolution> {
    const conflict = this.conflicts.get(conflictId)
    if (!conflict) {
      throw new Error(`Conflict not found: ${conflictId}`)
    }

    let resolvedValueToUse = resolvedValue

    // Apply resolution strategy if no value provided
    if (!resolvedValueToUse) {
      resolvedValueToUse = this.applyResolutionStrategy(conflict, strategy)
    }

    const resolution: ConflictResolution = {
      conflictId,
      strategy,
      resolvedValue: resolvedValueToUse,
      resolvedTimestamp: new Date(),
      resolvedBy,
      notes,
      metadata: {
        originalConflict: conflict,
        resolutionTime: Date.now() - conflict.localTimestamp.getTime()
      }
    }

    // Store resolution
    this.resolutions.set(conflictId, resolution)

    // Remove conflict
    this.conflicts.delete(conflictId)

    // Notify event
    this.notifyEvent({
      type: 'conflict_resolved',
      resolution,
      stats: this.getStats()
    })

    return resolution
  }

  /**
   * Apply resolution strategy
   */
  private applyResolutionStrategy(conflict: ConflictInfo, strategy: ConflictResolution['strategy']): any {
    switch (strategy) {
      case 'last_write_wins':
        return conflict.remoteTimestamp > conflict.localTimestamp 
          ? conflict.remoteValue 
          : conflict.localValue

      case 'merge':
        return this.mergeValues(conflict.localValue, conflict.remoteValue)

      case 'automatic':
        // Use field-specific automatic resolution
        return this.getAutomaticResolution(conflict)

      default:
        throw new Error(`Unknown resolution strategy: ${strategy}`)
    }
  }

  /**
   * Merge values for complex data types
   */
  private mergeValues(localValue: any, remoteValue: any): any {
    if (typeof localValue === 'object' && typeof remoteValue === 'object') {
      return { ...localValue, ...remoteValue }
    }

    // For primitives, use last write wins
    return remoteValue
  }

  /**
   * Get automatic resolution based on field type
   */
  private getAutomaticResolution(conflict: ConflictInfo): any {
    const field = conflict.field

    if (!field) return conflict.remoteValue

    // Numeric fields: use maximum
    if (field.includes('score') || field.includes('count')) {
      return Math.max(conflict.localValue, conflict.remoteValue)
    }

    // Timestamps: use latest
    if (field.includes('_at') || field.includes('time')) {
      return conflict.remoteTimestamp > conflict.localTimestamp 
        ? conflict.remoteValue 
        : conflict.localValue
    }

    // Default to remote value
    return conflict.remoteValue
  }

  /**
   * Get conflict by ID
   */
  getConflict(conflictId: string): ConflictInfo | undefined {
    return this.conflicts.get(conflictId)
  }

  /**
   * Get all conflicts
   */
  getAllConflicts(): ConflictInfo[] {
    return Array.from(this.conflicts.values())
  }

  /**
   * Get conflicts by type
   */
  getConflictsByType(type: ConflictInfo['type']): ConflictInfo[] {
    return Array.from(this.conflicts.values()).filter(conflict => conflict.type === type)
  }

  /**
   * Get conflicts by severity
   */
  getConflictsBySeverity(severity: ConflictInfo['severity']): ConflictInfo[] {
    return Array.from(this.conflicts.values()).filter(conflict => conflict.severity === severity)
  }

  /**
   * Get conflict statistics
   */
  getStats(): ConflictStats {
    const allConflicts = Array.from(this.conflicts.values())
    const allResolutions = Array.from(this.resolutions.values())

    const stats: ConflictStats = {
      totalConflicts: allConflicts.length + allResolutions.length,
      resolvedConflicts: allResolutions.length,
      pendingConflicts: allConflicts.length,
      conflictsByType: {},
      conflictsBySeverity: {},
      conflictsByField: {},
      averageResolutionTime: 0,
      lastConflictTime: undefined
    }

    // Count by type
    allConflicts.forEach(conflict => {
      stats.conflictsByType[conflict.type] = (stats.conflictsByType[conflict.type] || 0) + 1
      stats.conflictsBySeverity[conflict.severity] = (stats.conflictsBySeverity[conflict.severity] || 0) + 1
      
      if (conflict.field) {
        stats.conflictsByField[conflict.field] = (stats.conflictsByField[conflict.field] || 0) + 1
      }

      if (!stats.lastConflictTime || conflict.localTimestamp > stats.lastConflictTime) {
        stats.lastConflictTime = conflict.localTimestamp
      }
    })

    // Calculate average resolution time
    if (allResolutions.length > 0) {
      const totalResolutionTime = allResolutions.reduce((sum, resolution) => {
        return sum + (resolution.resolvedTimestamp.getTime() - resolution.metadata?.originalConflict?.localTimestamp.getTime() || 0)
      }, 0)
      stats.averageResolutionTime = totalResolutionTime / allResolutions.length
    }

    return stats
  }

  /**
   * Clear old conflicts
   */
  clearOldConflicts(): void {
    const now = Date.now()
    const maxAge = this.options.maxConflictAge

    for (const [conflictId, conflict] of this.conflicts.entries()) {
      if (now - conflict.localTimestamp.getTime() > maxAge) {
        this.conflicts.delete(conflictId)
      }
    }
  }

  /**
   * Update options
   */
  updateOptions(options: Partial<ConflictDetectionOptions>): void {
    this.options = { ...this.options, ...options }
  }

  /**
   * Subscribe to conflict events
   */
  onEvent(callback: ConflictEventCallback): () => void {
    this.eventCallbacks.add(callback)
    return () => this.eventCallbacks.delete(callback)
  }

  /**
   * Notify event callbacks
   */
  private notifyEvent(event: Parameters<ConflictEventCallback>[0]): void {
    this.eventCallbacks.forEach(callback => {
      try {
        callback(event)
      } catch (error) {
        console.error('Error in conflict event callback:', error)
      }
    })
  }

  /**
   * Generate unique conflict ID
   */
  private generateConflictId(): string {
    return `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Check if conflicts exist
   */
  hasConflicts(): boolean {
    return this.conflicts.size > 0
  }

  /**
   * Get conflict count
   */
  getConflictCount(): number {
    return this.conflicts.size
  }
}

// Export singleton instance
export const syncConflictDetector = new SyncConflictDetector()
