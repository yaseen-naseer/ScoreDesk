'use client'

import { useState, useEffect, useCallback } from 'react'
import { offlineStorageService, OfflineStorageStats, OfflineMatchData } from '@/lib/services/offline-storage-service'
import type { Database } from '@/lib/supabase/types'

type Match = Database['public']['Tables']['matches']['Row']

/**
 * Hook for offline storage management
 */
export function useOfflineStorage() {
  const [stats, setStats] = useState<OfflineStorageStats | null>(null)
  const [availableMatches, setAvailableMatches] = useState<Match[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load initial data
  useEffect(() => {
    loadStats()
    loadAvailableMatches()
  }, [])

  // Subscribe to storage events
  useEffect(() => {
    const unsubscribe = offlineStorageService.onStorageEvent(() => {
      loadStats()
      loadAvailableMatches()
    })

    return unsubscribe
  }, [])

  const loadStats = useCallback(async () => {
    try {
      const newStats = await offlineStorageService.getOfflineStats()
      setStats(newStats)
    } catch (error) {
      console.error('Error loading offline storage stats:', error)
    }
  }, [])

  const loadAvailableMatches = useCallback(async () => {
    try {
      const matches = await offlineStorageService.getAvailableMatches()
      setAvailableMatches(matches)
    } catch (error) {
      console.error('Error loading available matches:', error)
    }
  }, [])

  // Store match data
  const storeMatchData = useCallback(async (matchId: string, data: OfflineMatchData) => {
    setIsLoading(true)
    try {
      await offlineStorageService.storeMatchData(matchId, data)
      await loadStats()
      await loadAvailableMatches()
    } catch (error) {
      console.error('Error storing match data:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [loadStats, loadAvailableMatches])

  // Get match data
  const getMatchData = useCallback(async (matchId: string): Promise<OfflineMatchData | null> => {
    try {
      return await offlineStorageService.getMatchData(matchId)
    } catch (error) {
      console.error('Error getting match data:', error)
      return null
    }
  }, [])

  // Check if match is available offline
  const isMatchAvailableOffline = useCallback(async (matchId: string): Promise<boolean> => {
    try {
      return await offlineStorageService.isMatchAvailableOffline(matchId)
    } catch (error) {
      console.error('Error checking match availability:', error)
      return false
    }
  }, [])

  // Clear all data
  const clearAllData = useCallback(async () => {
    setIsLoading(true)
    try {
      await offlineStorageService.clearAllData()
      await loadStats()
      await loadAvailableMatches()
    } catch (error) {
      console.error('Error clearing offline data:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [loadStats, loadAvailableMatches])

  // Refresh data
  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      await loadStats()
      await loadAvailableMatches()
    } finally {
      setIsLoading(false)
    }
  }, [loadStats, loadAvailableMatches])

  return {
    stats,
    availableMatches,
    isLoading,
    storeMatchData,
    getMatchData,
    isMatchAvailableOffline,
    clearAllData,
    refresh
  }
}

/**
 * Hook for specific match offline data
 */
export function useOfflineMatch(matchId: string) {
  const [matchData, setMatchData] = useState<OfflineMatchData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAvailable, setIsAvailable] = useState(false)

  const loadMatchData = useCallback(async () => {
    if (!matchId) return

    setIsLoading(true)
    try {
      const data = await offlineStorageService.getMatchData(matchId)
      setMatchData(data)
      setIsAvailable(data !== null)
    } catch (error) {
      console.error('Error loading offline match data:', error)
      setMatchData(null)
      setIsAvailable(false)
    } finally {
      setIsLoading(false)
    }
  }, [matchId])

  const storeMatchData = useCallback(async (data: OfflineMatchData) => {
    if (!matchId) return

    setIsLoading(true)
    try {
      await offlineStorageService.storeMatchData(matchId, data)
      setMatchData(data)
      setIsAvailable(true)
    } catch (error) {
      console.error('Error storing match data:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [matchId])

  const storeMatchEvent = useCallback(async (event: Database['public']['Tables']['match_events']['Row']) => {
    if (!matchId) return

    try {
      await offlineStorageService.storeMatchEvent(matchId, event)
      // Reload match data to get updated events
      await loadMatchData()
    } catch (error) {
      console.error('Error storing match event:', error)
      throw error
    }
  }, [matchId, loadMatchData])

  const updateMatchStatistics = useCallback(async (statistics: Database['public']['Tables']['match_statistics']['Row']) => {
    if (!matchId) return

    try {
      await offlineStorageService.updateMatchStatistics(matchId, statistics)
      // Reload match data to get updated statistics
      await loadMatchData()
    } catch (error) {
      console.error('Error updating match statistics:', error)
      throw error
    }
  }, [matchId, loadMatchData])

  useEffect(() => {
    loadMatchData()
  }, [loadMatchData])

  return {
    matchData,
    isLoading,
    isAvailable,
    storeMatchData,
    storeMatchEvent,
    updateMatchStatistics,
    refresh: loadMatchData
  }
}

/**
 * Hook for sync queue management
 */
export function useSyncQueue() {
  const [pendingItems, setPendingItems] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadPendingItems = useCallback(async () => {
    setIsLoading(true)
    try {
      const items = await offlineStorageService.getPendingSyncItems()
      setPendingItems(items)
    } catch (error) {
      console.error('Error loading pending sync items:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearCompletedItems = useCallback(async () => {
    try {
      await offlineStorageService.clearCompletedSyncItems()
      await loadPendingItems()
    } catch (error) {
      console.error('Error clearing completed sync items:', error)
    }
  }, [loadPendingItems])

  useEffect(() => {
    loadPendingItems()
  }, [loadPendingItems])

  return {
    pendingItems,
    isLoading,
    refresh: loadPendingItems,
    clearCompletedItems
  }
}
