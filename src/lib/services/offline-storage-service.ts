/**
 * Offline Storage Service for ScoreDesk
 * Provides specialized offline storage for match data, events, and statistics
 */

import { indexedDBManager, StoredItem } from '@/lib/storage/indexeddb-manager'
import type { Database } from '@/lib/supabase/types'

type Match = Database['public']['Tables']['matches']['Row']
type MatchEvent = Database['public']['Tables']['match_events']['Row']
type MatchStatistics = Database['public']['Tables']['match_statistics']['Row']
type PlayerStatistics = Database['public']['Tables']['player_statistics']['Row']
type Team = Database['public']['Tables']['teams']['Row']
type Player = Database['public']['Tables']['players']['Row']

export interface OfflineMatchData {
  match: Match
  events: MatchEvent[]
  statistics: MatchStatistics[]
  playerStatistics: PlayerStatistics[]
  teams: Team[]
  players: Player[]
}

export interface SyncQueueItem {
  id: string
  operation: 'create' | 'update' | 'delete'
  type: 'match' | 'match_event' | 'match_statistics' | 'player_statistics' | 'team' | 'player'
  data: any
  timestamp: number
  status: 'pending' | 'syncing' | 'completed' | 'failed'
  retryCount: number
  lastError?: string
  metadata?: Record<string, any>
}

export interface OfflineStorageStats {
  totalMatches: number
  totalEvents: number
  totalStatistics: number
  totalPlayers: number
  totalTeams: number
  pendingSyncItems: number
  failedSyncItems: number
  lastSyncTime: Date | null
  storageSize: number
}

export class OfflineStorageService {
  private stores = indexedDBManager.getStores()

  /**
   * Store match data offline
   */
  async storeMatchData(matchId: string, data: OfflineMatchData): Promise<void> {
    const timestamp = Date.now()

    // Store match
    await indexedDBManager.store(this.stores.MATCHES, {
      id: matchId,
      type: 'match',
      data: data.match,
      metadata: { 
        eventCount: data.events.length,
        statisticsCount: data.statistics.length,
        playerStatisticsCount: data.playerStatistics.length
      }
    })

    // Store events
    for (const event of data.events) {
      await indexedDBManager.store(this.stores.MATCH_EVENTS, {
        id: `${matchId}_${event.id}`,
        type: 'match_event',
        data: event,
        metadata: { matchId }
      })
    }

    // Store statistics
    for (const stats of data.statistics) {
      await indexedDBManager.store(this.stores.MATCH_STATISTICS, {
        id: `${matchId}_${stats.id}`,
        type: 'match_statistics',
        data: stats,
        metadata: { matchId }
      })
    }

    // Store player statistics
    for (const playerStats of data.playerStatistics) {
      await indexedDBManager.store(this.stores.PLAYER_STATISTICS, {
        id: `${matchId}_${playerStats.id}`,
        type: 'player_statistics',
        data: playerStats,
        metadata: { matchId }
      })
    }

    // Store teams
    for (const team of data.teams) {
      await indexedDBManager.store(this.stores.TEAMS, {
        id: team.id,
        type: 'team',
        data: team,
        metadata: { matchId }
      })
    }

    // Store players
    for (const player of data.players) {
      await indexedDBManager.store(this.stores.PLAYERS, {
        id: player.id,
        type: 'player',
        data: player,
        metadata: { matchId }
      })
    }
  }

  /**
   * Retrieve match data from offline storage
   */
  async getMatchData(matchId: string): Promise<OfflineMatchData | null> {
    try {
      // Get match
      const matchItem = await indexedDBManager.retrieve<Match>(this.stores.MATCHES, matchId)
      if (!matchItem) return null

      // Get events
      const eventItems = await indexedDBManager.queryByIndex<MatchEvent>(
        this.stores.MATCH_EVENTS,
        'type',
        'match_event'
      )
      const events = eventItems
        .filter(item => item.metadata?.matchId === matchId)
        .map(item => item.data)

      // Get statistics
      const statsItems = await indexedDBManager.queryByIndex<MatchStatistics>(
        this.stores.MATCH_STATISTICS,
        'type',
        'match_statistics'
      )
      const statistics = statsItems
        .filter(item => item.metadata?.matchId === matchId)
        .map(item => item.data)

      // Get player statistics
      const playerStatsItems = await indexedDBManager.queryByIndex<PlayerStatistics>(
        this.stores.PLAYER_STATISTICS,
        'type',
        'player_statistics'
      )
      const playerStatistics = playerStatsItems
        .filter(item => item.metadata?.matchId === matchId)
        .map(item => item.data)

      // Get teams (unique by ID)
      const teamItems = await indexedDBManager.queryByIndex<Team>(
        this.stores.TEAMS,
        'type',
        'team'
      )
      const teamMap = new Map<string, Team>()
      teamItems
        .filter(item => item.metadata?.matchId === matchId)
        .forEach(item => teamMap.set(item.data.id, item.data))
      const teams = Array.from(teamMap.values())

      // Get players (unique by ID)
      const playerItems = await indexedDBManager.queryByIndex<Player>(
        this.stores.PLAYERS,
        'type',
        'player'
      )
      const playerMap = new Map<string, Player>()
      playerItems
        .filter(item => item.metadata?.matchId === matchId)
        .forEach(item => playerMap.set(item.data.id, item.data))
      const players = Array.from(playerMap.values())

      return {
        match: matchItem.data,
        events: events.sort((a, b) => a.minute - b.minute),
        statistics,
        playerStatistics,
        teams,
        players
      }
    } catch (error) {
      console.error('Error retrieving match data:', error)
      return null
    }
  }

  /**
   * Add item to sync queue
   */
  async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const syncItem: SyncQueueItem = {
      ...item,
      id: `${item.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0
    }

    await indexedDBManager.store(this.stores.SYNC_QUEUE, {
      id: syncItem.id,
      type: 'sync_queue_item',
      data: syncItem
    })
  }

  /**
   * Get pending sync queue items
   */
  async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    const items = await indexedDBManager.queryByIndex<SyncQueueItem>(
      this.stores.SYNC_QUEUE,
      'status_timestamp',
      ['pending', 0] // This is a simplified query - in practice, you'd need range queries
    )

    return items
      .map(item => item.data)
      .filter(item => item.status === 'pending')
      .sort((a, b) => a.timestamp - b.timestamp)
  }

  /**
   * Update sync queue item status
   */
  async updateSyncItemStatus(id: string, status: SyncQueueItem['status'], error?: string): Promise<void> {
    const item = await indexedDBManager.retrieve<SyncQueueItem>(this.stores.SYNC_QUEUE, id)
    if (!item) return

    const updates: Partial<StoredItem<SyncQueueItem>> = {
      data: {
        ...item.data,
        status,
        lastError: error,
        retryCount: status === 'failed' ? item.data.retryCount + 1 : item.data.retryCount
      }
    }

    await indexedDBManager.update(this.stores.SYNC_QUEUE, id, updates)
  }

  /**
   * Clear completed sync queue items
   */
  async clearCompletedSyncItems(): Promise<void> {
    const allItems = await indexedDBManager.retrieveAll<SyncQueueItem>(this.stores.SYNC_QUEUE)
    
    for (const item of allItems) {
      if (item.data.status === 'completed') {
        await indexedDBManager.delete(this.stores.SYNC_QUEUE, item.id)
      }
    }
  }

  /**
   * Store match event offline
   */
  async storeMatchEvent(matchId: string, event: MatchEvent): Promise<void> {
    await indexedDBManager.store(this.stores.MATCH_EVENTS, {
      id: `${matchId}_${event.id}`,
      type: 'match_event',
      data: event,
      metadata: { matchId }
    })

    // Add to sync queue
    await this.addToSyncQueue({
      operation: 'create',
      type: 'match_event',
      data: event,
      status: 'pending'
    })
  }

  /**
   * Update match statistics offline
   */
  async updateMatchStatistics(matchId: string, statistics: MatchStatistics): Promise<void> {
    await indexedDBManager.update(this.stores.MATCH_STATISTICS, `${matchId}_${statistics.id}`, {
      data: statistics,
      timestamp: Date.now()
    })

    // Add to sync queue
    await this.addToSyncQueue({
      operation: 'update',
      type: 'match_statistics',
      data: statistics,
      status: 'pending'
    })
  }

  /**
   * Get offline storage statistics
   */
  async getOfflineStats(): Promise<OfflineStorageStats> {
    const [matches, events, statistics, players, teams, syncItems] = await Promise.all([
      indexedDBManager.retrieveAll<Match>(this.stores.MATCHES),
      indexedDBManager.retrieveAll<MatchEvent>(this.stores.MATCH_EVENTS),
      indexedDBManager.retrieveAll<MatchStatistics>(this.stores.MATCH_STATISTICS),
      indexedDBManager.retrieveAll<Player>(this.stores.PLAYERS),
      indexedDBManager.retrieveAll<Team>(this.stores.TEAMS),
      indexedDBManager.retrieveAll<SyncQueueItem>(this.stores.SYNC_QUEUE)
    ])

    const pendingSyncItems = syncItems.filter(item => item.data.status === 'pending').length
    const failedSyncItems = syncItems.filter(item => item.data.status === 'failed').length

    const lastSyncTime = syncItems.length > 0 
      ? new Date(Math.max(...syncItems.map(item => item.timestamp)))
      : null

    const storageStats = await indexedDBManager.getStats()

    return {
      totalMatches: matches.length,
      totalEvents: events.length,
      totalStatistics: statistics.length,
      totalPlayers: players.length,
      totalTeams: teams.length,
      pendingSyncItems,
      failedSyncItems,
      lastSyncTime,
      storageSize: storageStats.totalSize
    }
  }

  /**
   * Clear all offline data
   */
  async clearAllData(): Promise<void> {
    await Promise.all([
      indexedDBManager.clearStore(this.stores.MATCHES),
      indexedDBManager.clearStore(this.stores.MATCH_EVENTS),
      indexedDBManager.clearStore(this.stores.MATCH_STATISTICS),
      indexedDBManager.clearStore(this.stores.PLAYER_STATISTICS),
      indexedDBManager.clearStore(this.stores.TEAMS),
      indexedDBManager.clearStore(this.stores.PLAYERS),
      indexedDBManager.clearStore(this.stores.SYNC_QUEUE)
    ])
  }

  /**
   * Get available matches offline
   */
  async getAvailableMatches(): Promise<Match[]> {
    const items = await indexedDBManager.retrieveAll<Match>(this.stores.MATCHES)
    return items.map(item => item.data)
  }

  /**
   * Check if match is available offline
   */
  async isMatchAvailableOffline(matchId: string): Promise<boolean> {
    const item = await indexedDBManager.retrieve<Match>(this.stores.MATCHES, matchId)
    return item !== null
  }

  /**
   * Subscribe to storage events
   */
  onStorageEvent(callback: (event: any) => void): () => void {
    return indexedDBManager.onEvent(callback)
  }
}

// Export singleton instance
export const offlineStorageService = new OfflineStorageService()
