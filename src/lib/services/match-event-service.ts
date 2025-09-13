import { Database } from '@/lib/supabase/types'

type MatchEvent = Database['public']['Tables']['match_events']['Row']
type MatchEventInsert = Database['public']['Tables']['match_events']['Insert']
type MatchEventUpdate = Database['public']['Tables']['match_events']['Update']

export type EventType = 'goal' | 'own_goal' | 'penalty_goal' | 'yellow_card' | 'red_card' | 'second_yellow_card' | 'substitution' | 'corner' | 'free_kick' | 'penalty_miss' | 'offside' | 'foul'

export interface MatchEventData {
  event_type: EventType
  minute: number
  second_minute?: number
  team_id: string
  player_id?: string
  assist_player_id?: string
  substituted_player_id?: string
  description?: string
}

export interface MatchEventWithDetails extends MatchEvent {
  player?: {
    id: string
    name: string
    jersey_number?: number
  }
  assist_player?: {
    id: string
    name: string
    jersey_number?: number
  }
  substituted_player?: {
    id: string
    name: string
    jersey_number?: number
  }
  team?: {
    id: string
    name: string
    logo_url?: string
  }
}

export interface EventTimelineItem {
  id: string
  minute: number
  second_minute?: number
  event_type: EventType
  team_name: string
  team_id: string
  player_name?: string
  player_id?: string
  assist_player_name?: string
  assist_player_id?: string
  substituted_player_name?: string
  substituted_player_id?: string
  description?: string
  created_at: string
  team_color?: string
  team_logo_url?: string
}

export interface MatchStatistics {
  home_team: {
    goals: number
    yellow_cards: number
    red_cards: number
    corners: number
    fouls: number
    substitutions: number
    shots_on_target: number
    possession_percentage?: number
  }
  away_team: {
    goals: number
    yellow_cards: number
    red_cards: number
    corners: number
    fouls: number
    substitutions: number
    shots_on_target: number
    possession_percentage?: number
  }
  total_events: number
  first_half_events: number
  second_half_events: number
}

export interface EventFilter {
  event_types?: EventType[]
  team_id?: string
  player_id?: string
  minute_from?: number
  minute_to?: number
  half?: 1 | 2
}

export class MatchEventService {
  constructor(private supabase: any) {}

  /**
   * Add a new match event
   */
  async addEvent(matchId: string, eventData: MatchEventData): Promise<{ success: boolean; event?: MatchEventWithDetails; error?: string }> {
    try {
      // Validate match exists and is live
      const match = await this.getMatch(matchId)
      if (!match) {
        return { success: false, error: 'Match not found' }
      }

      if (match.status !== 'live') {
        return { success: false, error: 'Events can only be added to live matches' }
      }

      // Validate minute is reasonable
      if (eventData.minute < 0 || eventData.minute > 120) {
        return { success: false, error: 'Invalid minute value' }
      }

      // Validate team belongs to match
      if (eventData.team_id !== match.home_team_id && eventData.team_id !== match.away_team_id) {
        return { success: false, error: 'Team does not belong to this match' }
      }

      // Validate player belongs to team (if player_id provided)
      if (eventData.player_id) {
        const playerValid = await this.validatePlayerInTeam(eventData.player_id, eventData.team_id, matchId)
        if (!playerValid) {
          return { success: false, error: 'Player does not belong to the specified team' }
        }
      }

      // Validate assist player (if provided)
      if (eventData.assist_player_id) {
        const assistPlayerValid = await this.validatePlayerInTeam(eventData.assist_player_id, eventData.team_id, matchId)
        if (!assistPlayerValid) {
          return { success: false, error: 'Assist player does not belong to the specified team' }
        }
      }

      // Validate substituted player (if provided)
      if (eventData.substituted_player_id) {
        const substitutedPlayerValid = await this.validatePlayerInTeam(eventData.substituted_player_id, eventData.team_id, matchId)
        if (!substitutedPlayerValid) {
          return { success: false, error: 'Substituted player does not belong to the specified team' }
        }
      }

      // Create event
      const { data: event, error } = await this.supabase
        .from('match_events')
        .insert({
          match_id: matchId,
          player_id: eventData.player_id,
          team_id: eventData.team_id,
          event_type: eventData.event_type,
          minute: eventData.minute,
          second_minute: eventData.second_minute,
          description: eventData.description,
          assist_player_id: eventData.assist_player_id,
          substituted_player_id: eventData.substituted_player_id
        })
        .select(`
          *,
          player:players(id, name, jersey_number),
          assist_player:players!match_events_assist_player_id_fkey(id, name, jersey_number),
          substituted_player:players!match_events_substituted_player_id_fkey(id, name, jersey_number),
          team:teams(id, name, logo_url)
        `)
        .single()

      if (error) {
        console.error('Error adding match event:', error)
        return { success: false, error: 'Failed to add event' }
      }

      // Update match score if it's a goal event
      if (['goal', 'own_goal', 'penalty_goal'].includes(eventData.event_type)) {
        await this.updateMatchScore(matchId, eventData.team_id, eventData.event_type)
      }

      // Broadcast event to real-time subscribers
      await this.broadcastEvent(matchId, event as MatchEventWithDetails)

      return { success: true, event: event as MatchEventWithDetails }
    } catch (error) {
      console.error('Error in addEvent:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  /**
   * Get events for a match with optional filters
   */
  async getMatchEvents(matchId: string, filters?: EventFilter): Promise<MatchEventWithDetails[]> {
    try {
      let query = this.supabase
        .from('match_events')
        .select(`
          *,
          player:players(id, name, jersey_number),
          assist_player:players!match_events_assist_player_id_fkey(id, name, jersey_number),
          substituted_player:players!match_events_substituted_player_id_fkey(id, name, jersey_number),
          team:teams(id, name, logo_url)
        `)
        .eq('match_id', matchId)

      if (filters) {
        if (filters.event_types && filters.event_types.length > 0) {
          query = query.in('event_type', filters.event_types)
        }
        if (filters.team_id) {
          query = query.eq('team_id', filters.team_id)
        }
        if (filters.player_id) {
          query = query.eq('player_id', filters.player_id)
        }
        if (filters.minute_from !== undefined) {
          query = query.gte('minute', filters.minute_from)
        }
        if (filters.minute_to !== undefined) {
          query = query.lte('minute', filters.minute_to)
        }
        if (filters.half) {
          if (filters.half === 1) {
            query = query.lte('minute', 45)
          } else {
            query = query.gt('minute', 45)
          }
        }
      }

      const { data: events, error } = await query
        .order('minute', { ascending: true })
        .order('second_minute', { ascending: true })

      if (error) {
        console.error('Error getting match events:', error)
        return []
      }

      return events as MatchEventWithDetails[]
    } catch (error) {
      console.error('Error in getMatchEvents:', error)
      return []
    }
  }

  /**
   * Get event timeline for a match
   */
  async getEventTimeline(matchId: string): Promise<EventTimelineItem[]> {
    try {
      const events = await this.getMatchEvents(matchId)
      
      return events.map(event => ({
        id: event.id,
        minute: event.minute,
        second_minute: event.second_minute,
        event_type: event.event_type,
        team_name: event.team?.name || 'Unknown Team',
        team_id: event.team_id,
        player_name: event.player?.name,
        player_id: event.player_id,
        assist_player_name: event.assist_player?.name,
        assist_player_id: event.assist_player_id,
        substituted_player_name: event.substituted_player?.name,
        substituted_player_id: event.substituted_player_id,
        description: event.description,
        created_at: event.created_at,
        team_color: event.team?.logo_url ? undefined : '#3b82f6', // Default color
        team_logo_url: event.team?.logo_url
      }))
    } catch (error) {
      console.error('Error in getEventTimeline:', error)
      return []
    }
  }

  /**
   * Get match statistics
   */
  async getMatchStatistics(matchId: string): Promise<MatchStatistics> {
    try {
      const match = await this.getMatch(matchId)
      if (!match) {
        throw new Error('Match not found')
      }

      const events = await this.getMatchEvents(matchId)
      
      const homeTeamStats = {
        goals: 0,
        yellow_cards: 0,
        red_cards: 0,
        corners: 0,
        fouls: 0,
        substitutions: 0,
        shots_on_target: 0
      }

      const awayTeamStats = {
        goals: 0,
        yellow_cards: 0,
        red_cards: 0,
        corners: 0,
        fouls: 0,
        substitutions: 0,
        shots_on_target: 0
      }

      let firstHalfEvents = 0
      let secondHalfEvents = 0

      for (const event of events) {
        const isHomeTeam = event.team_id === match.home_team_id
        const stats = isHomeTeam ? homeTeamStats : awayTeamStats

        // Count events by type
        switch (event.event_type) {
          case 'goal':
          case 'own_goal':
          case 'penalty_goal':
            stats.goals++
            stats.shots_on_target++
            break
          case 'yellow_card':
            stats.yellow_cards++
            break
          case 'red_card':
          case 'second_yellow_card':
            stats.red_cards++
            break
          case 'corner':
            stats.corners++
            break
          case 'foul':
            stats.fouls++
            break
          case 'substitution':
            stats.substitutions++
            break
          case 'penalty_miss':
            stats.shots_on_target++
            break
        }

        // Count by half
        if (event.minute <= 45) {
          firstHalfEvents++
        } else {
          secondHalfEvents++
        }
      }

      return {
        home_team: homeTeamStats,
        away_team: awayTeamStats,
        total_events: events.length,
        first_half_events: firstHalfEvents,
        second_half_events: secondHalfEvents
      }
    } catch (error) {
      console.error('Error in getMatchStatistics:', error)
      return {
        home_team: { goals: 0, yellow_cards: 0, red_cards: 0, corners: 0, fouls: 0, substitutions: 0, shots_on_target: 0 },
        away_team: { goals: 0, yellow_cards: 0, red_cards: 0, corners: 0, fouls: 0, substitutions: 0, shots_on_target: 0 },
        total_events: 0,
        first_half_events: 0,
        second_half_events: 0
      }
    }
  }

  /**
   * Update an existing event
   */
  async updateEvent(eventId: string, updates: Partial<MatchEventData>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('match_events')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId)

      if (error) {
        console.error('Error updating event:', error)
        return { success: false, error: 'Failed to update event' }
      }

      return { success: true }
    } catch (error) {
      console.error('Error in updateEvent:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('match_events')
        .delete()
        .eq('id', eventId)

      if (error) {
        console.error('Error deleting event:', error)
        return { success: false, error: 'Failed to delete event' }
      }

      return { success: true }
    } catch (error) {
      console.error('Error in deleteEvent:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  /**
   * Subscribe to real-time match events
   */
  subscribeToMatchEvents(matchId: string, callback: (event: MatchEventWithDetails) => void) {
    const channel = this.supabase
      .channel(`match-events-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'match_events',
          filter: `match_id=eq.${matchId}`
        },
        async (payload) => {
          // Fetch the full event with details
          const event = await this.getEventWithDetails(payload.new.id)
          if (event) {
            callback(event)
          }
        }
      )
      .subscribe()

    return channel
  }

  /**
   * Subscribe to match statistics updates
   */
  subscribeToMatchStatistics(matchId: string, callback: (stats: MatchStatistics) => void) {
    const channel = this.supabase
      .channel(`match-stats-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_events',
          filter: `match_id=eq.${matchId}`
        },
        async () => {
          const stats = await this.getMatchStatistics(matchId)
          callback(stats)
        }
      )
      .subscribe()

    return channel
  }

  /**
   * Get event with full details
   */
  private async getEventWithDetails(eventId: string): Promise<MatchEventWithDetails | null> {
    try {
      const { data: event, error } = await this.supabase
        .from('match_events')
        .select(`
          *,
          player:players(id, name, jersey_number),
          assist_player:players!match_events_assist_player_id_fkey(id, name, jersey_number),
          substituted_player:players!match_events_substituted_player_id_fkey(id, name, jersey_number),
          team:teams(id, name, logo_url)
        `)
        .eq('id', eventId)
        .single()

      if (error || !event) {
        return null
      }

      return event as MatchEventWithDetails
    } catch (error) {
      console.error('Error getting event details:', error)
      return null
    }
  }

  /**
   * Validate player belongs to team in match
   */
  private async validatePlayerInTeam(playerId: string, teamId: string, matchId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('match_lineups')
        .select('id')
        .eq('match_id', matchId)
        .eq('team_id', teamId)
        .eq('player_id', playerId)
        .single()

      return !error && !!data
    } catch (error) {
      console.error('Error validating player in team:', error)
      return false
    }
  }

  /**
   * Update match score based on goal events
   */
  private async updateMatchScore(matchId: string, teamId: string, eventType: EventType): Promise<void> {
    try {
      const match = await this.getMatch(matchId)
      if (!match) return

      const isHomeTeam = teamId === match.home_team_id
      const isOwnGoal = eventType === 'own_goal'
      
      // For own goals, the score goes to the opposing team
      const scoreTeamId = isOwnGoal ? (isHomeTeam ? match.away_team_id : match.home_team_id) : teamId
      const isScoreForHomeTeam = scoreTeamId === match.home_team_id

      const currentHomeScore = match.home_score || 0
      const currentAwayScore = match.away_score || 0

      const { error } = await this.supabase
        .from('matches')
        .update({
          home_score: isScoreForHomeTeam ? currentHomeScore + 1 : currentHomeScore,
          away_score: isScoreForHomeTeam ? currentAwayScore : currentAwayScore + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', matchId)

      if (error) {
        console.error('Error updating match score:', error)
      }
    } catch (error) {
      console.error('Error in updateMatchScore:', error)
    }
  }

  /**
   * Broadcast event to real-time subscribers
   */
  private async broadcastEvent(matchId: string, event: MatchEventWithDetails): Promise<void> {
    try {
      // Broadcast to match events channel
      await this.supabase
        .channel(`match-events-${matchId}`)
        .send({
          type: 'broadcast',
          event: 'new_event',
          payload: event
        })

      // Broadcast to scoreboard channel
      await this.supabase
        .channel(`scoreboard-matches-${matchId}`)
        .send({
          type: 'broadcast',
          event: 'score_update',
          payload: {
            match_id: matchId,
            event: event
          }
        })
    } catch (error) {
      console.error('Error broadcasting event:', error)
    }
  }

  /**
   * Get match by ID
   */
  private async getMatch(matchId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single()

      if (error) {
        return null
      }

      return data
    } catch (error) {
      console.error('Error getting match:', error)
      return null
    }
  }
}
