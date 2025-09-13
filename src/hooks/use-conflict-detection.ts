'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  syncConflictDetector, 
  ConflictInfo, 
  ConflictStats,
  ConflictDetectionOptions 
} from '@/lib/services/sync-conflict-detector'
import { 
  conflictResolutionService, 
  ResolutionStrategy, 
  ResolutionContext,
  ResolutionResult,
  ResolutionHistory 
} from '@/lib/services/conflict-resolution-service'

/**
 * Hook for conflict detection
 */
export function useConflictDetection() {
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([])
  const [stats, setStats] = useState<ConflictStats>(syncConflictDetector.getStats())
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Subscribe to conflict events
    const unsubscribe = syncConflictDetector.onEvent((event) => {
      switch (event.type) {
        case 'conflict_detected':
          setConflicts(syncConflictDetector.getAllConflicts())
          setStats(syncConflictDetector.getStats())
          break
        case 'conflict_resolved':
          setConflicts(syncConflictDetector.getAllConflicts())
          setStats(syncConflictDetector.getStats())
          break
        case 'conflict_escalated':
          setConflicts(syncConflictDetector.getAllConflicts())
          setStats(syncConflictDetector.getStats())
          break
      }
    })

    // Load initial data
    setConflicts(syncConflictDetector.getAllConflicts())
    setStats(syncConflictDetector.getStats())

    return unsubscribe
  }, [])

  const detectConflicts = useCallback(async (
    localData: any,
    remoteData: any,
    metadata?: ConflictInfo['metadata']
  ) => {
    setIsLoading(true)
    try {
      const detectedConflicts = await syncConflictDetector.detectConflicts(
        localData,
        remoteData,
        metadata
      )
      return detectedConflicts
    } catch (error) {
      console.error('Error detecting conflicts:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getConflictsByType = useCallback((type: ConflictInfo['type']) => {
    return conflicts.filter(conflict => conflict.type === type)
  }, [conflicts])

  const getConflictsBySeverity = useCallback((severity: ConflictInfo['severity']) => {
    return conflicts.filter(conflict => conflict.severity === severity)
  }, [conflicts])

  const getConflict = useCallback((conflictId: string) => {
    return syncConflictDetector.getConflict(conflictId)
  }, [])

  const clearOldConflicts = useCallback(() => {
    syncConflictDetector.clearOldConflicts()
    setConflicts(syncConflictDetector.getAllConflicts())
    setStats(syncConflictDetector.getStats())
  }, [])

  const updateOptions = useCallback((options: Partial<ConflictDetectionOptions>) => {
    syncConflictDetector.updateOptions(options)
  }, [])

  return {
    conflicts,
    stats,
    isLoading,
    detectConflicts,
    getConflictsByType,
    getConflictsBySeverity,
    getConflict,
    clearOldConflicts,
    updateOptions,
    hasConflicts: conflicts.length > 0,
    conflictCount: conflicts.length
  }
}

/**
 * Hook for conflict resolution
 */
export function useConflictResolution() {
  const [resolutionHistory, setResolutionHistory] = useState<ResolutionHistory[]>([])
  const [isResolving, setIsResolving] = useState(false)
  const [availableStrategies, setAvailableStrategies] = useState<ResolutionStrategy[]>([])

  useEffect(() => {
    // Load initial data
    setResolutionHistory(conflictResolutionService.getResolutionHistory())
    setAvailableStrategies(Array.from(conflictResolutionService['strategies'].values()))

    // Subscribe to resolution events
    const unsubscribe = conflictResolutionService.onEvent((event) => {
      switch (event.type) {
        case 'resolution_completed':
        case 'resolution_failed':
          setResolutionHistory(conflictResolutionService.getResolutionHistory())
          break
      }
    })

    return unsubscribe
  }, [])

  const resolveConflict = useCallback(async (
    conflictId: string,
    strategy: ResolutionResult['strategy'],
    context: ResolutionContext,
    userInput?: any
  ) => {
    setIsResolving(true)
    try {
      const result = await conflictResolutionService.resolveConflict(
        conflictId,
        strategy,
        context,
        userInput
      )
      return result
    } catch (error) {
      console.error('Error resolving conflict:', error)
      throw error
    } finally {
      setIsResolving(false)
    }
  }, [])

  const getAvailableStrategies = useCallback((conflict: ConflictInfo) => {
    return conflictResolutionService.getAvailableStrategies(conflict)
  }, [])

  const getResolutionStats = useCallback(() => {
    return conflictResolutionService.getResolutionStats()
  }, [])

  const addCustomStrategy = useCallback((strategy: ResolutionStrategy) => {
    conflictResolutionService.addStrategy(strategy)
    setAvailableStrategies(Array.from(conflictResolutionService['strategies'].values()))
  }, [])

  const removeStrategy = useCallback((strategyId: string) => {
    conflictResolutionService.removeStrategy(strategyId)
    setAvailableStrategies(Array.from(conflictResolutionService['strategies'].values()))
  }, [])

  return {
    resolutionHistory,
    isResolving,
    availableStrategies,
    resolveConflict,
    getAvailableStrategies,
    getResolutionStats,
    addCustomStrategy,
    removeStrategy,
    refreshHistory: () => setResolutionHistory(conflictResolutionService.getResolutionHistory())
  }
}

/**
 * Hook for specific conflict management
 */
export function useConflict(conflictId: string) {
  const { conflicts, getConflict } = useConflictDetection()
  const { resolveConflict, getAvailableStrategies, isResolving } = useConflictResolution()
  
  const [conflict, setConflict] = useState<ConflictInfo | undefined>()
  const [strategies, setStrategies] = useState<ResolutionStrategy[]>([])

  useEffect(() => {
    const conflictData = getConflict(conflictId)
    setConflict(conflictData)
    
    if (conflictData) {
      const availableStrategies = getAvailableStrategies(conflictData)
      setStrategies(availableStrategies)
    }
  }, [conflictId, conflicts, getConflict, getAvailableStrategies])

  const resolve = useCallback(async (
    strategy: ResolutionResult['strategy'],
    context: ResolutionContext,
    userInput?: any
  ) => {
    if (!conflict) {
      throw new Error('No conflict to resolve')
    }

    return await resolveConflict(conflictId, strategy, context, userInput)
  }, [conflict, conflictId, resolveConflict])

  const getDefaultStrategy = useCallback(() => {
    if (!conflict) return null
    
    // Find the best strategy based on conflict properties
    const automaticStrategies = strategies.filter(s => s.isAutomatic)
    if (automaticStrategies.length > 0) {
      return automaticStrategies[0].id
    }
    
    return strategies[0]?.id || null
  }, [conflict, strategies])

  return {
    conflict,
    strategies,
    isResolving,
    resolve,
    getDefaultStrategy,
    hasConflict: !!conflict,
    canAutoResolve: strategies.some(s => s.isAutomatic),
    requiresUserInput: strategies.some(s => s.requiresUserInput)
  }
}

/**
 * Hook for conflict analytics
 */
export function useConflictAnalytics() {
  const { stats } = useConflictDetection()
  const { getResolutionStats } = useConflictResolution()
  const [resolutionStats, setResolutionStats] = useState(conflictResolutionService.getResolutionStats())

  useEffect(() => {
    setResolutionStats(getResolutionStats())
  }, [getResolutionStats])

  const getConflictTrends = useCallback(() => {
    // This would typically analyze historical data
    // For now, return current stats
    return {
      totalConflicts: stats.totalConflicts,
      resolvedConflicts: stats.resolvedConflicts,
      pendingConflicts: stats.pendingConflicts,
      resolutionRate: stats.totalConflicts > 0 ? (stats.resolvedConflicts / stats.totalConflicts) * 100 : 0,
      averageResolutionTime: resolutionStats.averageResolutionTime
    }
  }, [stats, resolutionStats])

  const getTopConflictFields = useCallback(() => {
    return Object.entries(stats.conflictsByField)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([field, count]) => ({ field, count }))
  }, [stats.conflictsByField])

  const getConflictSeverityDistribution = useCallback(() => {
    return Object.entries(stats.conflictsBySeverity)
      .map(([severity, count]) => ({ severity, count }))
  }, [stats.conflictsBySeverity])

  const getResolutionStrategyUsage = useCallback(() => {
    return Object.entries(resolutionStats.strategiesUsed)
      .map(([strategy, count]) => ({ strategy, count }))
  }, [resolutionStats.strategiesUsed])

  return {
    conflictTrends: getConflictTrends(),
    topConflictFields: getTopConflictFields(),
    severityDistribution: getConflictSeverityDistribution(),
    strategyUsage: getResolutionStrategyUsage(),
    totalResolutions: resolutionStats.totalResolutions,
    successRate: resolutionStats.totalResolutions > 0 
      ? (resolutionStats.successfulResolutions / resolutionStats.totalResolutions) * 100 
      : 0
  }
}
