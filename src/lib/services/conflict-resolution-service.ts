/**
 * Conflict Resolution Service
 * Handles conflict resolution strategies and user interaction
 */

import { syncConflictDetector, ConflictInfo, ConflictResolution } from './sync-conflict-detector'

export interface ResolutionStrategy {
  id: string
  name: string
  description: string
  applicableTypes: ConflictInfo['type'][]
  applicableSeverities: ConflictInfo['severity'][]
  isAutomatic: boolean
  requiresUserInput: boolean
}

export interface ResolutionContext {
  conflictId: string
  userId?: string
  organizationId?: string
  matchId?: string
  tournamentId?: string
  userPreferences?: Record<string, any>
  systemRules?: Record<string, any>
}

export interface ResolutionResult {
  success: boolean
  resolvedValue: any
  strategy: ConflictResolution['strategy']
  timestamp: Date
  error?: string
  metadata?: Record<string, any>
}

export interface ResolutionHistory {
  conflictId: string
  resolution: ConflictResolution
  context: ResolutionContext
  result: ResolutionResult
  timestamp: Date
}

export type ResolutionEventCallback = (event: {
  type: 'resolution_started' | 'resolution_completed' | 'resolution_failed' | 'strategy_changed'
  conflictId?: string
  strategy?: string
  result?: ResolutionResult
  error?: string
}) => void

export class ConflictResolutionService {
  private resolutionHistory: ResolutionHistory[] = []
  private eventCallbacks: Set<ResolutionEventCallback> = new Set()
  private strategies: Map<string, ResolutionStrategy> = new Map()

  constructor() {
    this.initializeDefaultStrategies()
  }

  /**
   * Initialize default resolution strategies
   */
  private initializeDefaultStrategies(): void {
    const defaultStrategies: ResolutionStrategy[] = [
      {
        id: 'last_write_wins',
        name: 'Last Write Wins',
        description: 'Use the most recent value based on timestamp',
        applicableTypes: ['field', 'timestamp'],
        applicableSeverities: ['low', 'medium'],
        isAutomatic: true,
        requiresUserInput: false
      },
      {
        id: 'user_resolution',
        name: 'User Resolution',
        description: 'Require user to choose the correct value',
        applicableTypes: ['field', 'record', 'relationship'],
        applicableSeverities: ['high', 'critical'],
        isAutomatic: false,
        requiresUserInput: true
      },
      {
        id: 'merge',
        name: 'Merge Values',
        description: 'Combine local and remote values where possible',
        applicableTypes: ['field', 'record'],
        applicableSeverities: ['low', 'medium'],
        isAutomatic: true,
        requiresUserInput: false
      },
      {
        id: 'automatic',
        name: 'Automatic Resolution',
        description: 'Use field-specific automatic resolution rules',
        applicableTypes: ['field'],
        applicableSeverities: ['low', 'medium'],
        isAutomatic: true,
        requiresUserInput: false
      },
      {
        id: 'remote_wins',
        name: 'Remote Wins',
        description: 'Always use the remote value',
        applicableTypes: ['field', 'record'],
        applicableSeverities: ['low', 'medium'],
        isAutomatic: true,
        requiresUserInput: false
      },
      {
        id: 'local_wins',
        name: 'Local Wins',
        description: 'Always use the local value',
        applicableTypes: ['field', 'record'],
        applicableSeverities: ['low', 'medium'],
        isAutomatic: true,
        requiresUserInput: false
      }
    ]

    defaultStrategies.forEach(strategy => {
      this.strategies.set(strategy.id, strategy)
    })
  }

  /**
   * Resolve conflict with specified strategy
   */
  async resolveConflict(
    conflictId: string,
    strategy: ConflictResolution['strategy'],
    context: ResolutionContext,
    userInput?: any
  ): Promise<ResolutionResult> {
    const conflict = syncConflictDetector.getConflict(conflictId)
    if (!conflict) {
      throw new Error(`Conflict not found: ${conflictId}`)
    }

    const resolutionStrategy = this.strategies.get(strategy)
    if (!resolutionStrategy) {
      throw new Error(`Unknown resolution strategy: ${strategy}`)
    }

    // Validate strategy applicability
    if (!this.isStrategyApplicable(resolutionStrategy, conflict)) {
      throw new Error(`Strategy '${strategy}' is not applicable to this conflict`)
    }

    this.notifyEvent({
      type: 'resolution_started',
      conflictId,
      strategy
    })

    try {
      let resolvedValue: any
      let finalStrategy = strategy

      // Apply user preferences and system rules
      const adjustedStrategy = this.adjustStrategyForContext(strategy, context, conflict)
      if (adjustedStrategy !== strategy) {
        finalStrategy = adjustedStrategy
        this.notifyEvent({
          type: 'strategy_changed',
          conflictId,
          strategy: finalStrategy
        })
      }

      // Resolve based on strategy
      if (resolutionStrategy.requiresUserInput && !userInput) {
        throw new Error(`User input required for strategy '${strategy}'`)
      }

      resolvedValue = await this.applyResolutionStrategy(conflict, finalStrategy, userInput, context)

      // Create resolution
      const resolution = await syncConflictDetector.resolveConflict(
        conflictId,
        finalStrategy,
        resolvedValue,
        context.userId,
        `Resolved using ${finalStrategy} strategy`
      )

      // Record resolution history
      const history: ResolutionHistory = {
        conflictId,
        resolution,
        context,
        result: {
          success: true,
          resolvedValue,
          strategy: finalStrategy,
          timestamp: new Date(),
          metadata: {
            originalConflict: conflict,
            resolutionTime: Date.now() - conflict.localTimestamp.getTime()
          }
        },
        timestamp: new Date()
      }

      this.resolutionHistory.push(history)

      const result: ResolutionResult = {
        success: true,
        resolvedValue,
        strategy: finalStrategy,
        timestamp: new Date(),
        metadata: history.result.metadata
      }

      this.notifyEvent({
        type: 'resolution_completed',
        conflictId,
        result
      })

      return result
    } catch (error) {
      const result: ResolutionResult = {
        success: false,
        resolvedValue: null,
        strategy,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }

      this.notifyEvent({
        type: 'resolution_failed',
        conflictId,
        result,
        error: result.error
      })

      throw error
    }
  }

  /**
   * Apply resolution strategy
   */
  private async applyResolutionStrategy(
    conflict: ConflictInfo,
    strategy: ConflictResolution['strategy'],
    userInput?: any,
    context?: ResolutionContext
  ): Promise<any> {
    switch (strategy) {
      case 'last_write_wins':
        return this.applyLastWriteWins(conflict)

      case 'user_resolution':
        return this.applyUserResolution(conflict, userInput)

      case 'merge':
        return this.applyMerge(conflict)

      case 'automatic':
        return this.applyAutomaticResolution(conflict, context)

      case 'remote_wins':
        return conflict.remoteValue

      case 'local_wins':
        return conflict.localValue

      default:
        throw new Error(`Unknown resolution strategy: ${strategy}`)
    }
  }

  /**
   * Apply last write wins strategy
   */
  private applyLastWriteWins(conflict: ConflictInfo): any {
    return conflict.remoteTimestamp > conflict.localTimestamp 
      ? conflict.remoteValue 
      : conflict.localValue
  }

  /**
   * Apply user resolution strategy
   */
  private applyUserResolution(conflict: ConflictInfo, userInput?: any): any {
    if (userInput === undefined) {
      throw new Error('User input required for user resolution strategy')
    }

    // Validate user input
    if (!this.isValidUserInput(conflict, userInput)) {
      throw new Error('Invalid user input for conflict resolution')
    }

    return userInput
  }

  /**
   * Apply merge strategy
   */
  private applyMerge(conflict: ConflictInfo): any {
    const localValue = conflict.localValue
    const remoteValue = conflict.remoteValue

    // Handle different data types
    if (typeof localValue === 'object' && typeof remoteValue === 'object') {
      return this.mergeObjects(localValue, remoteValue)
    }

    if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
      return this.mergeArrays(localValue, remoteValue)
    }

    // For primitives, use last write wins
    return this.applyLastWriteWins(conflict)
  }

  /**
   * Apply automatic resolution strategy
   */
  private applyAutomaticResolution(conflict: ConflictInfo, context?: ResolutionContext): any {
    const field = conflict.field

    if (!field) return conflict.remoteValue

    // Apply field-specific rules
    const fieldRules = this.getFieldSpecificRules(field, context)
    if (fieldRules) {
      return this.applyFieldRules(conflict, fieldRules)
    }

    // Apply data type rules
    const dataType = conflict.metadata?.dataType
    if (dataType) {
      return this.applyDataTypeRules(conflict, dataType)
    }

    // Default to last write wins
    return this.applyLastWriteWins(conflict)
  }

  /**
   * Merge objects
   */
  private mergeObjects(local: any, remote: any): any {
    const result = { ...local }

    for (const [key, value] of Object.entries(remote)) {
      if (result[key] === undefined) {
        result[key] = value
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.mergeObjects(result[key], value)
      } else if (Array.isArray(value)) {
        result[key] = this.mergeArrays(result[key], value)
      } else {
        // For primitives, use remote value
        result[key] = value
      }
    }

    return result
  }

  /**
   * Merge arrays
   */
  private mergeArrays(local: any[], remote: any[]): any[] {
    const result = [...local]
    const localIds = new Set(local.map(item => item.id).filter(Boolean))

    for (const remoteItem of remote) {
      if (remoteItem.id && localIds.has(remoteItem.id)) {
        // Update existing item
        const index = result.findIndex(item => item.id === remoteItem.id)
        if (index !== -1) {
          result[index] = { ...result[index], ...remoteItem }
        }
      } else {
        // Add new item
        result.push(remoteItem)
      }
    }

    return result
  }

  /**
   * Get field-specific rules
   */
  private getFieldSpecificRules(field: string, context?: ResolutionContext): any {
    const rules: Record<string, any> = {
      'score': { strategy: 'max', fallback: 'last_write_wins' },
      'count': { strategy: 'max', fallback: 'last_write_wins' },
      'status': { strategy: 'user_resolution', fallback: 'remote_wins' },
      'winner': { strategy: 'user_resolution', fallback: 'remote_wins' },
      'start_time': { strategy: 'earliest', fallback: 'last_write_wins' },
      'end_time': { strategy: 'latest', fallback: 'last_write_wins' }
    }

    return rules[field]
  }

  /**
   * Apply field rules
   */
  private applyFieldRules(conflict: ConflictInfo, rules: any): any {
    const { strategy, fallback } = rules

    switch (strategy) {
      case 'max':
        return Math.max(conflict.localValue, conflict.remoteValue)
      case 'min':
        return Math.min(conflict.localValue, conflict.remoteValue)
      case 'earliest':
        return new Date(Math.min(
          new Date(conflict.localValue).getTime(),
          new Date(conflict.remoteValue).getTime()
        ))
      case 'latest':
        return new Date(Math.max(
          new Date(conflict.localValue).getTime(),
          new Date(conflict.remoteValue).getTime()
        ))
      case 'user_resolution':
        throw new Error('User resolution required')
      default:
        return this.applyResolutionStrategy(conflict, fallback)
    }
  }

  /**
   * Apply data type rules
   */
  private applyDataTypeRules(conflict: ConflictInfo, dataType: string): any {
    switch (dataType) {
      case 'number':
        return Math.max(conflict.localValue, conflict.remoteValue)
      case 'datetime':
        return this.applyLastWriteWins(conflict)
      case 'email':
        return conflict.remoteValue // Prefer remote for emails
      case 'url':
        return conflict.remoteValue // Prefer remote for URLs
      default:
        return this.applyLastWriteWins(conflict)
    }
  }

  /**
   * Validate user input
   */
  private isValidUserInput(conflict: ConflictInfo, userInput: any): boolean {
    // Check if user input is one of the conflicting values
    return userInput === conflict.localValue || userInput === conflict.remoteValue
  }

  /**
   * Adjust strategy based on context
   */
  private adjustStrategyForContext(
    strategy: ConflictResolution['strategy'],
    context: ResolutionContext,
    conflict: ConflictInfo
  ): ConflictResolution['strategy'] {
    // Apply user preferences
    if (context.userPreferences?.conflictResolution) {
      const userPreference = context.userPreferences.conflictResolution[conflict.field || 'default']
      if (userPreference && this.strategies.has(userPreference)) {
        return userPreference
      }
    }

    // Apply system rules
    if (context.systemRules?.conflictResolution) {
      const systemRule = context.systemRules.conflictResolution[conflict.type]
      if (systemRule && this.strategies.has(systemRule)) {
        return systemRule
      }
    }

    return strategy
  }

  /**
   * Check if strategy is applicable to conflict
   */
  private isStrategyApplicable(strategy: ResolutionStrategy, conflict: ConflictInfo): boolean {
    return strategy.applicableTypes.includes(conflict.type) &&
           strategy.applicableSeverities.includes(conflict.severity)
  }

  /**
   * Get available strategies for conflict
   */
  getAvailableStrategies(conflict: ConflictInfo): ResolutionStrategy[] {
    return Array.from(this.strategies.values()).filter(strategy =>
      this.isStrategyApplicable(strategy, conflict)
    )
  }

  /**
   * Get resolution history
   */
  getResolutionHistory(): ResolutionHistory[] {
    return [...this.resolutionHistory]
  }

  /**
   * Get resolution statistics
   */
  getResolutionStats(): {
    totalResolutions: number
    successfulResolutions: number
    failedResolutions: number
    averageResolutionTime: number
    strategiesUsed: Record<string, number>
    conflictsByType: Record<string, number>
  } {
    const history = this.resolutionHistory

    const stats = {
      totalResolutions: history.length,
      successfulResolutions: history.filter(h => h.result.success).length,
      failedResolutions: history.filter(h => !h.result.success).length,
      averageResolutionTime: 0,
      strategiesUsed: {} as Record<string, number>,
      conflictsByType: {} as Record<string, number>
    }

    if (history.length > 0) {
      // Calculate average resolution time
      const totalTime = history.reduce((sum, h) => {
        return sum + (h.result.metadata?.resolutionTime || 0)
      }, 0)
      stats.averageResolutionTime = totalTime / history.length

      // Count strategies used
      history.forEach(h => {
        stats.strategiesUsed[h.result.strategy] = (stats.strategiesUsed[h.result.strategy] || 0) + 1
      })

      // Count conflicts by type
      history.forEach(h => {
        const conflictType = h.result.metadata?.originalConflict?.type || 'unknown'
        stats.conflictsByType[conflictType] = (stats.conflictsByType[conflictType] || 0) + 1
      })
    }

    return stats
  }

  /**
   * Add custom strategy
   */
  addStrategy(strategy: ResolutionStrategy): void {
    this.strategies.set(strategy.id, strategy)
  }

  /**
   * Remove strategy
   */
  removeStrategy(strategyId: string): void {
    this.strategies.delete(strategyId)
  }

  /**
   * Subscribe to resolution events
   */
  onEvent(callback: ResolutionEventCallback): () => void {
    this.eventCallbacks.add(callback)
    return () => this.eventCallbacks.delete(callback)
  }

  /**
   * Notify event callbacks
   */
  private notifyEvent(event: Parameters<ResolutionEventCallback>[0]): void {
    this.eventCallbacks.forEach(callback => {
      try {
        callback(event)
      } catch (error) {
        console.error('Error in resolution event callback:', error)
      }
    })
  }
}

// Export singleton instance
export const conflictResolutionService = new ConflictResolutionService()
