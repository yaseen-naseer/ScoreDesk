/**
 * React hooks for data versioning functionality
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  dataVersioningService, 
  DataVersion, 
  VersionHistory, 
  VersionDiff,
  VersionQuery,
  VersioningOptions 
} from '@/lib/services/data-versioning-service'
import { 
  versionHistoryManager,
  VersioningMetadata 
} from '@/lib/services/version-history-manager'

// Hook for managing entity versions
export function useEntityVersions(entityId: string, entityType: string) {
  const [versions, setVersions] = useState<DataVersion[]>([])
  const [currentVersion, setCurrentVersion] = useState<DataVersion | null>(null)
  const [history, setHistory] = useState<VersionHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadVersions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const versionHistory = dataVersioningService.getVersionHistory(entityId, entityType)
      const current = dataVersioningService.getCurrentVersion(entityId, entityType)

      setHistory(versionHistory)
      setCurrentVersion(current)
      setVersions(versionHistory?.versions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load versions')
    } finally {
      setLoading(false)
    }
  }, [entityId, entityType])

  const createVersion = useCallback(async (
    data: any,
    changeType: 'create' | 'update' | 'delete' | 'restore',
    metadata?: {
      userId?: string
      organizationId?: string
      changeDescription?: string
      metadata?: VersioningMetadata
    }
  ) => {
    try {
      const version = await dataVersioningService.createVersion(
        entityId,
        entityType,
        data,
        changeType,
        metadata
      )
      
      await loadVersions() // Refresh versions
      return version
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create version')
      throw err
    }
  }, [entityId, entityType, loadVersions])

  const restoreToVersion = useCallback(async (
    versionId: string,
    options?: {
      userId?: string
      organizationId?: string
      changeDescription?: string
    }
  ) => {
    try {
      const restoredVersion = await dataVersioningService.restoreToVersion(versionId, options)
      await loadVersions() // Refresh versions
      return restoredVersion
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore version')
      throw err
    }
  }, [loadVersions])

  const deleteVersion = useCallback(async (versionId: string) => {
    try {
      await dataVersioningService.deleteVersion(versionId)
      await loadVersions() // Refresh versions
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete version')
      throw err
    }
  }, [loadVersions])

  const clearHistory = useCallback(async () => {
    try {
      await dataVersioningService.clearVersionHistory(entityId, entityType)
      await loadVersions() // Refresh versions
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear history')
      throw err
    }
  }, [entityId, entityType, loadVersions])

  useEffect(() => {
    loadVersions()
  }, [loadVersions])

  return {
    versions,
    currentVersion,
    history,
    loading,
    error,
    createVersion,
    restoreToVersion,
    deleteVersion,
    clearHistory,
    refetch: loadVersions
  }
}

// Hook for version comparisons and diffs
export function useVersionComparison() {
  const [diff, setDiff] = useState<VersionDiff | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const compareVersions = useCallback(async (versionId1: string, versionId2: string) => {
    try {
      setLoading(true)
      setError(null)

      const diffResult = await dataVersioningService.calculateDiff(versionId1, versionId2)
      setDiff(diffResult)
      
      return diffResult
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compare versions')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const clearDiff = useCallback(() => {
    setDiff(null)
    setError(null)
  }, [])

  return {
    diff,
    loading,
    error,
    compareVersions,
    clearDiff
  }
}

// Hook for version queries and search
export function useVersionQuery() {
  const [versions, setVersions] = useState<DataVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const queryVersions = useCallback(async (query: VersionQuery) => {
    try {
      setLoading(true)
      setError(null)

      const results = dataVersioningService.queryVersions(query)
      setVersions(results)
      
      return results
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to query versions')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const clearResults = useCallback(() => {
    setVersions([])
    setError(null)
  }, [])

  return {
    versions,
    loading,
    error,
    queryVersions,
    clearResults
  }
}

// Hook for versioning statistics
export function useVersioningStats() {
  const [stats, setStats] = useState({
    totalVersions: 0,
    totalEntities: 0,
    totalHistories: 0,
    averageVersionsPerEntity: 0,
    storageSize: 0,
    oldestVersion: undefined as Date | undefined,
    newestVersion: undefined as Date | undefined
  })

  const [loading, setLoading] = useState(true)

  const loadStats = useCallback(async () => {
    try {
      setLoading(true)
      const versioningStats = dataVersioningService.getVersioningStats()
      setStats(versioningStats)
    } catch (err) {
      console.error('Failed to load versioning stats:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  return {
    stats,
    loading,
    refetch: loadStats
  }
}

// Hook for version timeline
export function useVersionTimeline(
  entityId: string,
  entityType: string,
  options?: {
    includeSnapshots?: boolean
    limit?: number
    startDate?: Date
    endDate?: Date
  }
) {
  const [timeline, setTimeline] = useState<{
    versions: DataVersion[]
    snapshots: any[]
    timeline: Array<{
      type: 'version' | 'snapshot'
      data: DataVersion | any
      timestamp: Date
    }>
  }>({
    versions: [],
    snapshots: [],
    timeline: []
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadTimeline = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const timelineData = await versionHistoryManager.getVersionTimeline(
        entityId,
        entityType,
        options
      )
      
      setTimeline(timelineData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timeline')
    } finally {
      setLoading(false)
    }
  }, [entityId, entityType, options])

  useEffect(() => {
    loadTimeline()
  }, [loadTimeline])

  return {
    timeline,
    loading,
    error,
    refetch: loadTimeline
  }
}

// Hook for auto-versioning
export function useAutoVersioning() {
  const [enabled, setEnabled] = useState(true)
  const [config, setConfig] = useState({
    entityTypes: ['matches', 'players', 'teams', 'tournaments', 'venues'],
    changeThreshold: 1,
    timeThreshold: 5000,
    excludedFields: ['updated_at', 'last_sync', 'sync_status']
  })

  const createAutoVersion = useCallback(async (
    entityId: string,
    entityType: string,
    data: any,
    metadata?: VersioningMetadata
  ) => {
    try {
      const version = await versionHistoryManager.createVersion(
        entityId,
        entityType,
        data,
        metadata
      )
      
      return version
    } catch (err) {
      console.error('Failed to create auto version:', err)
      throw err
    }
  }, [])

  const updateConfig = useCallback((newConfig: Partial<typeof config>) => {
    const updatedConfig = { ...config, ...newConfig }
    setConfig(updatedConfig)
    versionHistoryManager.updateAutoVersioningConfig({
      enabled,
      ...updatedConfig
    })
  }, [config, enabled])

  const toggleEnabled = useCallback((enabled: boolean) => {
    setEnabled(enabled)
    versionHistoryManager.updateAutoVersioningConfig({ enabled })
  }, [])

  return {
    enabled,
    config,
    createAutoVersion,
    updateConfig,
    toggleEnabled
  }
}

// Hook for versioning analytics
export function useVersioningAnalytics(options?: {
  entityType?: string
  startDate?: Date
  endDate?: Date
  userId?: string
}) {
  const [analytics, setAnalytics] = useState({
    totalVersions: 0,
    versionsByEntityType: {} as Record<string, number>,
    versionsByUser: {} as Record<string, number>,
    versionsByDay: {} as Record<string, number>,
    averageVersionsPerEntity: 0,
    mostActiveEntities: [] as Array<{
      entityId: string
      entityType: string
      versionCount: number
    }>,
    changePatterns: {
      mostChangedFields: [] as Array<{
        field: string
        entityType: string
        changeCount: number
      }>
    }
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const analyticsData = await versionHistoryManager.getVersioningAnalytics(options)
      setAnalytics(analyticsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [options])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  return {
    analytics,
    loading,
    error,
    refetch: loadAnalytics
  }
}

// Hook for versioning options and settings
export function useVersioningOptions() {
  const [options, setOptions] = useState<VersioningOptions>({
    maxVersionsPerEntity: 50,
    enableAutoVersioning: true,
    enableChecksumValidation: true,
    enableCompression: false,
    versionRetentionDays: 30,
    enableMetadataTracking: true,
    enableChangeTracking: true
  })

  const updateOptions = useCallback((newOptions: Partial<VersioningOptions>) => {
    const updatedOptions = { ...options, ...newOptions }
    setOptions(updatedOptions)
    dataVersioningService.updateOptions(updatedOptions)
  }, [options])

  const resetToDefaults = useCallback(() => {
    const defaultOptions: VersioningOptions = {
      maxVersionsPerEntity: 50,
      enableAutoVersioning: true,
      enableChecksumValidation: true,
      enableCompression: false,
      versionRetentionDays: 30,
      enableMetadataTracking: true,
      enableChangeTracking: true
    }
    
    setOptions(defaultOptions)
    dataVersioningService.updateOptions(defaultOptions)
  }, [])

  return {
    options,
    updateOptions,
    resetToDefaults
  }
}

// Hook for version events
export function useVersionEvents() {
  const [events, setEvents] = useState<Array<{
    type: 'version_created' | 'version_restored' | 'version_deleted' | 'history_cleared'
    version?: DataVersion
    history?: VersionHistory
    diff?: VersionDiff
    timestamp: Date
  }>>([])

  useEffect(() => {
    const unsubscribe = dataVersioningService.onEvent((event) => {
      setEvents(prev => [{
        ...event,
        timestamp: new Date()
      }, ...prev].slice(0, 100)) // Keep last 100 events
    })

    return unsubscribe
  }, [])

  const clearEvents = useCallback(() => {
    setEvents([])
  }, [])

  return {
    events,
    clearEvents
  }
}
