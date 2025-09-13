'use client'

import { useEffect, useState, useCallback } from 'react'
import { realtimeManager } from '@/lib/supabase/realtime'
import type { Database } from '@/lib/supabase/types'

type Match = Database['public']['Tables']['matches']['Row']
type MatchEvent = Database['public']['Tables']['match_events']['Row']
type MatchStatistics = Database['public']['Tables']['match_statistics']['Row']
type PlayerStatistics = Database['public']['Tables']['player_statistics']['Row']
type MatchLineup = Database['public']['Tables']['match_lineups']['Row']

interface LiveMatchData {
  match: Match | null
  events: MatchEvent[]
  statistics: MatchStatistics[]
  playerStatistics: PlayerStatistics[]
  lineups: MatchLineup[]
  isConnected: boolean
  connectionStatus: string
}

interface LiveMatchCallbacks {
  onMatchUpdate?: (match: Match) => void
  onNewEvent?: (event: MatchEvent) => void
  onStatsUpdate?: (stats: MatchStatistics) => void
  onPlayerStatsUpdate?: (playerStats: PlayerStatistics) => void
  onLineupChange?: (lineup: MatchLineup) => void
  onConnectionChange?: (isConnected: boolean) => void
}

/**
 * Hook for real-time live match updates
 */
export function useLiveMatch(matchId: string, callbacks?: LiveMatchCallbacks) {
  const [data, setData] = useState<LiveMatchData>({
    match: null,
    events: [],
    statistics: [],
    playerStatistics: [],
    lineups: [],
    isConnected: false,
    connectionStatus: 'disconnected',
  })

  // Update match data
  const updateMatch = useCallback((match: Match) => {
    setData(prev => ({ ...prev, match }))
    callbacks?.onMatchUpdate?.(match)
  }, [callbacks])

  // Add new event
  const addEvent = useCallback((event: MatchEvent) => {
    setData(prev => ({
      ...prev,
      events: [...prev.events, event].sort((a, b) => a.minute - b.minute),
    }))
    callbacks?.onNewEvent?.(event)
  }, [callbacks])

  // Update statistics
  const updateStats = useCallback((stats: MatchStatistics) => {
    setData(prev => ({
      ...prev,
      statistics: prev.statistics.map(s => 
        s.team_id === stats.team_id ? stats : s
      ),
    }))
    callbacks?.onStatsUpdate?.(stats)
  }, [callbacks])

  // Update player statistics
  const updatePlayerStats = useCallback((playerStats: PlayerStatistics) => {
    setData(prev => ({
      ...prev,
      playerStatistics: prev.playerStatistics.map(p => 
        p.player_id === playerStats.player_id ? playerStats : p
      ),
    }))
    callbacks?.onPlayerStatsUpdate?.(playerStats)
  }, [callbacks])

  // Update lineup
  const updateLineup = useCallback((lineup: MatchLineup) => {
    setData(prev => ({
      ...prev,
      lineups: prev.lineups.map(l => 
        l.id === lineup.id ? lineup : l
      ),
    }))
    callbacks?.onLineupChange?.(lineup)
  }, [callbacks])

  // Update connection status
  const updateConnection = useCallback((isConnected: boolean) => {
    setData(prev => ({
      ...prev,
      isConnected,
      connectionStatus: isConnected ? 'connected' : 'disconnected',
    }))
    callbacks?.onConnectionChange?.(isConnected)
  }, [callbacks])

  // Set up real-time subscriptions
  useEffect(() => {
    if (!matchId) return

    updateConnection(false)

    const unsubscribe = realtimeManager.subscribeToLiveMatch(matchId, {
      onMatchUpdate: (payload) => {
        updateMatch(payload.new as Match)
        updateConnection(true)
      },
      onEventCreate: (payload) => {
        addEvent(payload.new as MatchEvent)
        updateConnection(true)
      },
      onStatsUpdate: (payload) => {
        if (payload.eventType === 'UPDATE') {
          updateStats(payload.new as MatchStatistics)
        }
        updateConnection(true)
      },
      onPlayerStatsUpdate: (payload) => {
        if (payload.eventType === 'UPDATE') {
          updatePlayerStats(payload.new as PlayerStatistics)
        }
        updateConnection(true)
      },
      onLineupChange: (payload) => {
        updateLineup(payload.new as MatchLineup)
        updateConnection(true)
      },
    })

    // Set initial connection status
    setTimeout(() => updateConnection(true), 1000)

    return unsubscribe
  }, [matchId, updateMatch, addEvent, updateStats, updatePlayerStats, updateLineup, updateConnection])

  return {
    ...data,
    // Action functions for updating match data
    updateMatchScore: useCallback(async (homeScore: number, awayScore: number) => {
      // This would call an API endpoint to update the match
      // For now, it's a placeholder
      console.log('Updating match score:', { matchId, homeScore, awayScore })
    }, [matchId]),

    addMatchEvent: useCallback(async (eventData: Omit<MatchEvent, 'id' | 'match_id' | 'created_at'>) => {
      // This would call an API endpoint to add a match event
      console.log('Adding match event:', { matchId, eventData })
    }, [matchId]),

    updateTeamStats: useCallback(async (teamId: string, statsUpdate: Partial<MatchStatistics>) => {
      // This would call an API endpoint to update team statistics
      console.log('Updating team stats:', { matchId, teamId, statsUpdate })
    }, [matchId]),
  }
}

/**
 * Hook for real-time tournament updates
 */
export function useLiveTournament(tournamentId: string) {
  const [standings, setStandings] = useState<Database['public']['Tables']['tournament_standings']['Row'][]>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!tournamentId) return

    const unsubscribe = realtimeManager.subscribeToTournamentStandings(
      tournamentId,
      (payload) => {
        if (payload.eventType === 'INSERT') {
          setStandings(prev => [...prev, payload.new])
        } else if (payload.eventType === 'UPDATE') {
          setStandings(prev => 
            prev.map(s => s.id === payload.new.id ? payload.new : s)
          )
        } else if (payload.eventType === 'DELETE') {
          setStandings(prev => 
            prev.filter(s => s.id !== payload.old.id)
          )
        }
        setIsConnected(true)
      }
    )

    setTimeout(() => setIsConnected(true), 1000)

    return unsubscribe
  }, [tournamentId])

  return {
    standings,
    isConnected,
  }
}

/**
 * Hook for collaborative match session
 */
export function useMatchSession(sessionId: string) {
  const [participants, setParticipants] = useState<Database['public']['Tables']['match_session_participants']['Row'][]>([])
  const [session, setSession] = useState<Database['public']['Tables']['match_sessions']['Row'] | null>(null)
  const [presenceState, setPresenceState] = useState<Record<string, any>>({})

  useEffect(() => {
    if (!sessionId) return

    // Subscribe to session data changes
    const unsubscribeSession = realtimeManager.subscribeToMatchSession(sessionId, {
      onParticipantJoin: (payload) => {
        setParticipants(prev => [...prev, payload.new])
      },
      onParticipantLeave: (payload) => {
        if (payload.eventType === 'UPDATE' && payload.new.is_active === false) {
          setParticipants(prev => 
            prev.map(p => p.id === payload.new.id ? payload.new : p)
          )
        }
      },
      onSessionUpdate: (payload) => {
        setSession(payload.new)
      },
    })

    // Subscribe to presence for real-time user activity
    const unsubscribePresence = realtimeManager.subscribeToPresence(
      `match-session:${sessionId}`,
      {
        onJoin: (key, newPresences, currentPresences) => {
          setPresenceState(currentPresences)
        },
        onLeave: (key, leftPresences, currentPresences) => {
          setPresenceState(currentPresences)
        },
        onSync: () => {
          // Presence is in sync
        },
      }
    )

    return () => {
      unsubscribeSession()
      unsubscribePresence()
    }
  }, [sessionId])

  // Update user presence
  const updatePresence = useCallback(async (state: Record<string, any>) => {
    await realtimeManager.updatePresence(`match-session:${sessionId}`, state)
  }, [sessionId])

  return {
    participants,
    session,
    presenceState,
    activeParticipants: participants.filter(p => p.is_active),
    updatePresence,
  }
}
