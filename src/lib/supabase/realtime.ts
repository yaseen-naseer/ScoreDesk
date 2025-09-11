import { createClient } from './client'
import type { Database } from './types'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

type Tables = Database['public']['Tables']
type TableName = keyof Tables

// Type for realtime payloads
export type RealtimePayload<T extends TableName> = RealtimePostgresChangesPayload<Tables[T]['Row']>

// Subscription callback types
export type SubscriptionCallback<T extends TableName> = (payload: RealtimePayload<T>) => void
export type SubscriptionErrorCallback = (error: any) => void

/**
 * Real-time subscription manager for ScoreDesk
 */
export class RealtimeManager {
  private supabase = createClient()
  private channels: Map<string, RealtimeChannel> = new Map()
  private subscriptions: Map<string, { channel: RealtimeChannel; callbacks: Set<Function> }> = new Map()

  /**
   * Subscribe to changes in a specific table
   */
  subscribeToTable<T extends TableName>(
    table: T,
    callback: SubscriptionCallback<T>,
    filter?: {
      event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
      schema?: string
      filter?: string
    }
  ): () => void {
    const channelName = `table:${table}:${filter?.event || '*'}:${filter?.filter || 'all'}`
    
    // Create or get existing channel
    let subscription = this.subscriptions.get(channelName)
    
    if (!subscription) {
      const channel = this.supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: filter?.event || '*',
            schema: filter?.schema || 'public',
            table: table as string,
            filter: filter?.filter,
          },
          callback as any
        )
        .subscribe()

      subscription = { channel, callbacks: new Set([callback]) }
      this.subscriptions.set(channelName, subscription)
      this.channels.set(channelName, channel)
    } else {
      subscription.callbacks.add(callback)
    }

    // Return unsubscribe function
    return () => {
      const sub = this.subscriptions.get(channelName)
      if (sub) {
        sub.callbacks.delete(callback)
        
        // If no more callbacks, remove the subscription
        if (sub.callbacks.size === 0) {
          sub.channel.unsubscribe()
          this.subscriptions.delete(channelName)
          this.channels.delete(channelName)
        }
      }
    }
  }

  /**
   * Subscribe to live match updates
   */
  subscribeToLiveMatch(
    matchId: string,
    callbacks: {
      onMatchUpdate?: (payload: RealtimePayload<'matches'>) => void
      onEventCreate?: (payload: RealtimePayload<'match_events'>) => void
      onStatsUpdate?: (payload: RealtimePayload<'match_statistics'>) => void
      onLineupChange?: (payload: RealtimePayload<'match_lineups'>) => void
      onError?: SubscriptionErrorCallback
    }
  ): () => void {
    const unsubscribeFunctions: (() => void)[] = []

    // Subscribe to match updates
    if (callbacks.onMatchUpdate) {
      const unsubMatch = this.subscribeToTable(
        'matches',
        callbacks.onMatchUpdate,
        { event: 'UPDATE', filter: `id=eq.${matchId}` }
      )
      unsubscribeFunctions.push(unsubMatch)
    }

    // Subscribe to match events
    if (callbacks.onEventCreate) {
      const unsubEvents = this.subscribeToTable(
        'match_events',
        callbacks.onEventCreate,
        { event: 'INSERT', filter: `match_id=eq.${matchId}` }
      )
      unsubscribeFunctions.push(unsubEvents)
    }

    // Subscribe to statistics updates
    if (callbacks.onStatsUpdate) {
      const unsubStats = this.subscribeToTable(
        'match_statistics',
        callbacks.onStatsUpdate,
        { event: '*', filter: `match_id=eq.${matchId}` }
      )
      unsubscribeFunctions.push(unsubStats)
    }

    // Subscribe to lineup changes
    if (callbacks.onLineupChange) {
      const unsubLineup = this.subscribeToTable(
        'match_lineups',
        callbacks.onLineupChange,
        { event: '*', filter: `match_id=eq.${matchId}` }
      )
      unsubscribeFunctions.push(unsubLineup)
    }

    // Return combined unsubscribe function
    return () => {
      unsubscribeFunctions.forEach(unsub => unsub())
    }
  }

  /**
   * Subscribe to organization updates
   */
  subscribeToOrganization(
    organizationId: string,
    callbacks: {
      onTeamChange?: (payload: RealtimePayload<'teams'>) => void
      onPlayerChange?: (payload: RealtimePayload<'players'>) => void
      onTournamentChange?: (payload: RealtimePayload<'tournaments'>) => void
      onMembershipChange?: (payload: RealtimePayload<'organization_memberships'>) => void
      onError?: SubscriptionErrorCallback
    }
  ): () => void {
    const unsubscribeFunctions: (() => void)[] = []

    // Subscribe to team changes
    if (callbacks.onTeamChange) {
      const unsubTeams = this.subscribeToTable(
        'teams',
        callbacks.onTeamChange,
        { event: '*', filter: `organization_id=eq.${organizationId}` }
      )
      unsubscribeFunctions.push(unsubTeams)
    }

    // Subscribe to player changes
    if (callbacks.onPlayerChange) {
      const unsubPlayers = this.subscribeToTable('players', callbacks.onPlayerChange)
      unsubscribeFunctions.push(unsubPlayers)
    }

    // Subscribe to tournament changes
    if (callbacks.onTournamentChange) {
      const unsubTournaments = this.subscribeToTable(
        'tournaments',
        callbacks.onTournamentChange,
        { event: '*', filter: `organization_id=eq.${organizationId}` }
      )
      unsubscribeFunctions.push(unsubTournaments)
    }

    // Subscribe to membership changes
    if (callbacks.onMembershipChange) {
      const unsubMemberships = this.subscribeToTable(
        'organization_memberships',
        callbacks.onMembershipChange,
        { event: '*', filter: `organization_id=eq.${organizationId}` }
      )
      unsubscribeFunctions.push(unsubMemberships)
    }

    return () => {
      unsubscribeFunctions.forEach(unsub => unsub())
    }
  }

  /**
   * Subscribe to tournament standings updates
   */
  subscribeToTournamentStandings(
    tournamentId: string,
    callback: (payload: RealtimePayload<'tournament_standings'>) => void
  ): () => void {
    return this.subscribeToTable(
      'tournament_standings',
      callback,
      { event: '*', filter: `tournament_id=eq.${tournamentId}` }
    )
  }

  /**
   * Subscribe to user session participants for collaborative features
   */
  subscribeToMatchSession(
    sessionId: string,
    callbacks: {
      onParticipantJoin?: (payload: RealtimePayload<'match_session_participants'>) => void
      onParticipantLeave?: (payload: RealtimePayload<'match_session_participants'>) => void
      onSessionUpdate?: (payload: RealtimePayload<'match_sessions'>) => void
    }
  ): () => void {
    const unsubscribeFunctions: (() => void)[] = []

    // Subscribe to participants joining
    if (callbacks.onParticipantJoin) {
      const unsubJoin = this.subscribeToTable(
        'match_session_participants',
        callbacks.onParticipantJoin,
        { event: 'INSERT', filter: `session_id=eq.${sessionId}` }
      )
      unsubscribeFunctions.push(unsubJoin)
    }

    // Subscribe to participants leaving
    if (callbacks.onParticipantLeave) {
      const unsubLeave = this.subscribeToTable(
        'match_session_participants',
        callbacks.onParticipantLeave,
        { event: 'UPDATE', filter: `session_id=eq.${sessionId}` }
      )
      unsubscribeFunctions.push(unsubLeave)
    }

    // Subscribe to session updates
    if (callbacks.onSessionUpdate) {
      const unsubSession = this.subscribeToTable(
        'match_sessions',
        callbacks.onSessionUpdate,
        { event: 'UPDATE', filter: `id=eq.${sessionId}` }
      )
      unsubscribeFunctions.push(unsubSession)
    }

    return () => {
      unsubscribeFunctions.forEach(unsub => unsub())
    }
  }

  /**
   * Get channel status
   */
  getChannelStatus(channelName: string): string | null {
    const channel = this.channels.get(channelName)
    return channel ? channel.state : null
  }

  /**
   * Get all active channels
   */
  getActiveChannels(): string[] {
    return Array.from(this.channels.keys())
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll(): void {
    this.channels.forEach(channel => {
      channel.unsubscribe()
    })
    this.channels.clear()
    this.subscriptions.clear()
  }

  /**
   * Send presence update for collaborative features
   */
  async updatePresence(channel: string, state: Record<string, any>): Promise<void> {
    const ch = this.channels.get(channel)
    if (ch) {
      await ch.track(state)
    }
  }

  /**
   * Subscribe to presence changes
   */
  subscribeToPresence(
    channel: string,
    callbacks: {
      onJoin?: (key: string, newPresences: any, currentPresences: any) => void
      onLeave?: (key: string, leftPresences: any, currentPresences: any) => void
      onSync?: () => void
    }
  ): () => void {
    let ch = this.channels.get(channel)
    
    if (!ch) {
      ch = this.supabase.channel(channel)
      this.channels.set(channel, ch)
    }

    if (callbacks.onJoin) {
      ch.on('presence', { event: 'join' }, callbacks.onJoin)
    }

    if (callbacks.onLeave) {
      ch.on('presence', { event: 'leave' }, callbacks.onLeave)
    }

    if (callbacks.onSync) {
      ch.on('presence', { event: 'sync' }, callbacks.onSync)
    }

    ch.subscribe()

    return () => {
      ch?.unsubscribe()
      this.channels.delete(channel)
    }
  }
}

// Export singleton instance
export const realtimeManager = new RealtimeManager()

// Export hook for easy usage in React components
export function useRealtimeSubscription() {
  return realtimeManager
}
