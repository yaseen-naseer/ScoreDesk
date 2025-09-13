import { Database } from '@/lib/supabase/types'

// Services should receive supabase client as parameter to avoid multiple instances

type Match = Database['public']['Tables']['matches']['Row']
type MatchInsert = Database['public']['Tables']['matches']['Insert']
type MatchUpdate = Database['public']['Tables']['matches']['Update']
// Loosen specific table types to be resilient to generated type drift
type Referee = any
type Venue = any
type MatchOfficial = any
type Team = Database['public']['Tables']['teams']['Row']
type Tournament = Database['public']['Tables']['tournaments']['Row']

export interface MatchWithDetails extends Match {
  home_team?: Team
  away_team?: Team
  tournament?: Tournament
  venue_details?: Venue
  officials?: MatchOfficial[]
}

export interface MatchCreationData {
  tournament_id: string
  home_team_id: string
  away_team_id: string
  scheduled_date: string
  venue_id?: string
  venue?: string
  round_name?: string
  notes?: string
  match_duration?: number
}

export interface MatchUpdateData {
  scheduled_date?: string
  venue_id?: string
  venue?: string
  status?: 'scheduled' | 'live' | 'paused' | 'completed' | 'cancelled' | 'postponed'
  home_score?: number
  away_score?: number
  match_duration?: number
  round_name?: string
  notes?: string
  weather_conditions?: Record<string, any>
  attendance?: number
  actual_start_time?: string
  actual_end_time?: string
}

export interface RefereeAssignment {
  referee_id: string
  official_type: 'referee' | 'assistant_referee_1' | 'assistant_referee_2' | 'fourth_official' | 'var_official'
  notes?: string
}

export interface MatchFilters {
  tournament_id?: string
  team_id?: string
  status?: string
  venue_id?: string
  date_from?: string
  date_to?: string
  round_name?: string
}

export interface VenueAvailability {
  venue_id: string
  venue_name: string
  is_available: boolean
  conflicting_matches?: Match[]
}

export interface RefereeAvailability {
  referee_id: string
  referee_name: string
  is_available: boolean
  conflicting_matches?: Match[]
  weekly_match_count: number
  max_weekly_matches: number
}

export class MatchService {
  constructor(private supabase: any) {}

  /**
   * Create a new match
   */
  async createMatch(data: MatchCreationData): Promise<{ success: boolean; match?: MatchWithDetails; error?: string }> {
    try {
      // Validate teams are different
      if (data.home_team_id === data.away_team_id) {
        return {
          success: false,
          error: 'Home team and away team cannot be the same'
        }
      }

      // Check venue availability if venue_id is provided
      if (data.venue_id) {
        const { data: venueAvailable } = await supabase.rpc('check_venue_availability', {
          venue_id_param: data.venue_id,
          match_date_param: data.scheduled_date,
          match_duration_minutes: data.match_duration || 90
        })

        if (!venueAvailable) {
          return {
            success: false,
            error: 'Venue is not available at the scheduled time'
          }
        }
      }

      // Create match
      const { data: match, error } = await supabase
        .from('matches')
        .insert({
          tournament_id: data.tournament_id,
          home_team_id: data.home_team_id,
          away_team_id: data.away_team_id,
          scheduled_date: data.scheduled_date,
          venue_id: data.venue_id,
          venue: data.venue,
          round_name: data.round_name,
          notes: data.notes,
          match_duration: data.match_duration || 90,
          status: 'scheduled',
          home_score: 0,
          away_score: 0,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(*),
          away_team:teams!matches_away_team_id_fkey(*),
          tournament:tournaments(*),
          venue_details:venues(*)
        `)
        .single()

      if (error) {
        console.error('Error creating match:', error)
        return {
          success: false,
          error: 'Failed to create match'
        }
      }

      return {
        success: true,
        match: match as MatchWithDetails
      }
    } catch (error) {
      console.error('Error in createMatch:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
    }
  }

  /**
   * Get match by ID with full details
   */
  async getMatch(matchId: string): Promise<MatchWithDetails | null> {
    try {
      const { data: match, error } = await supabase
        .from('matches')
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(*),
          away_team:teams!matches_away_team_id_fkey(*),
          tournament:tournaments(*),
          venue_details:venues(*),
          officials:match_officials(
            *,
            referee:referees(*)
          )
        `)
        .eq('id', matchId)
        .single()

      if (error || !match) {
        return null
      }

      return match as MatchWithDetails
    } catch (error) {
      console.error('Error getting match:', error)
      return null
    }
  }

  /**
   * Get matches with filters
   */
  async getMatches(filters: MatchFilters): Promise<MatchWithDetails[]> {
    try {
      let query = supabase
        .from('matches')
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(*),
          away_team:teams!matches_away_team_id_fkey(*),
          tournament:tournaments(*),
          venue_details:venues(*)
        `)

      if (filters.tournament_id) {
        query = query.eq('tournament_id', filters.tournament_id)
      }
      if (filters.team_id) {
        query = query.or(`home_team_id.eq.${filters.team_id},away_team_id.eq.${filters.team_id}`)
      }
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.venue_id) {
        query = query.eq('venue_id', filters.venue_id)
      }
      if (filters.date_from) {
        query = query.gte('scheduled_date', filters.date_from)
      }
      if (filters.date_to) {
        query = query.lte('scheduled_date', filters.date_to)
      }
      if (filters.round_name) {
        query = query.eq('round_name', filters.round_name)
      }

      const { data: matches, error } = await query
        .order('scheduled_date', { ascending: true })

      if (error) {
        throw error
      }

      return matches as MatchWithDetails[]
    } catch (error) {
      console.error('Error getting matches:', error)
      return []
    }
  }

  /**
   * Update match
   */
  async updateMatch(matchId: string, updates: MatchUpdateData): Promise<{ success: boolean; match?: MatchWithDetails; error?: string }> {
    try {
      // Check venue availability if venue_id is being updated
      if (updates.venue_id) {
        const match = await this.getMatch(matchId)
        if (match) {
          const { data: venueAvailable } = await supabase.rpc('check_venue_availability', {
            venue_id_param: updates.venue_id,
            match_date_param: updates.scheduled_date || match.scheduled_date,
            match_duration_minutes: updates.match_duration || match.match_duration || 90
          })

          if (!venueAvailable) {
            return {
              success: false,
              error: 'Venue is not available at the scheduled time'
            }
          }
        }
      }

      const { data: match, error } = await supabase
        .from('matches')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', matchId)
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(*),
          away_team:teams!matches_away_team_id_fkey(*),
          tournament:tournaments(*),
          venue_details:venues(*)
        `)
        .single()

      if (error) {
        console.error('Error updating match:', error)
        return {
          success: false,
          error: 'Failed to update match'
        }
      }

      return {
        success: true,
        match: match as MatchWithDetails
      }
    } catch (error) {
      console.error('Error in updateMatch:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
    }
  }

  /**
   * Delete match
   */
  async deleteMatch(matchId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId)

      if (error) {
        console.error('Error deleting match:', error)
        return {
          success: false,
          error: 'Failed to delete match'
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Error in deleteMatch:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
    }
  }

  /**
   * Assign referee to match
   */
  async assignReferee(matchId: string, assignment: RefereeAssignment): Promise<{ success: boolean; error?: string }> {
    try {
      // Check referee availability
      const match = await this.getMatch(matchId)
      if (!match) {
        return {
          success: false,
          error: 'Match not found'
        }
      }

      const { data: refereeAvailable } = await supabase.rpc('check_referee_availability', {
        referee_id_param: assignment.referee_id,
        match_date_param: match.scheduled_date,
        match_duration_minutes: match.match_duration || 90
      })

      if (!refereeAvailable) {
        return {
          success: false,
          error: 'Referee is not available for this match'
        }
      }

      // Remove existing assignment for this official type
      await supabase
        .from('match_officials')
        .delete()
        .eq('match_id', matchId)
        .eq('official_type', assignment.official_type)

      // Create new assignment
      const { error } = await supabase
        .from('match_officials')
        .insert({
          match_id: matchId,
          referee_id: assignment.referee_id,
          official_type: assignment.official_type,
          notes: assignment.notes,
          assigned_by: (await supabase.auth.getUser()).data.user?.id
        })

      if (error) {
        console.error('Error assigning referee:', error)
        return {
          success: false,
          error: 'Failed to assign referee'
        }
      }

      // Minimal notification stub (non-blocking)
      try {
        await this.sendRefereeNotification({
          referee_id: assignment.referee_id,
          match_id: matchId,
          type: 'assignment',
          message: `You have been assigned as ${assignment.official_type.replace('_', ' ')} for a match.`
        })
      } catch (_) {}

      return { success: true }
    } catch (error) {
      console.error('Error in assignReferee:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
    }
  }

  private async sendRefereeNotification(payload: {
    referee_id: string
    match_id: string
    type: 'assignment' | 'reminder' | 'change' | 'cancellation'
    message: string
  }): Promise<void> {
    // Log to console as a stub
    console.log('[notification]', payload)
    // Optionally persist if a notifications table exists
    try {
      await supabase.from('notifications').insert({
        user_id: payload.referee_id,
        match_id: payload.match_id,
        channel: 'system',
        type: payload.type,
        message: payload.message
      })
    } catch (_) {
      // ignore missing table/policy
    }
  }

  /**
   * Get available referees for a match
   */
  async getAvailableReferees(matchId: string, officialType?: string): Promise<RefereeAvailability[]> {
    try {
      const match = await this.getMatch(matchId)
      if (!match) {
        return []
      }

      const { data: referees } = await supabase
        .from('referees')
        .select('*')
        .eq('is_active', true)
        .eq('organization_id', match.tournament?.organization_id)

      if (!referees) {
        return []
      }

      const availability: RefereeAvailability[] = []

      for (const referee of referees) {
        // Check if referee specializes in the required role
        if (officialType && referee.specialization !== officialType && referee.specialization !== 'referee') {
          continue
        }

        const { data: isAvailable } = await supabase.rpc('check_referee_availability', {
          referee_id_param: referee.id,
          match_date_param: match.scheduled_date,
          match_duration_minutes: match.match_duration || 90
        })

        // Get weekly match count
        const { count: weeklyMatches } = await supabase
          .from('match_officials')
          .select('*', { count: 'exact', head: true })
          .eq('referee_id', referee.id)
          .gte('assigned_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

        availability.push({
          referee_id: referee.id,
          referee_name: referee.name,
          is_available: isAvailable || false,
          weekly_match_count: weeklyMatches || 0,
          max_weekly_matches: referee.max_matches_per_week || 3
        })
      }

      return availability
    } catch (error) {
      console.error('Error getting available referees:', error)
      return []
    }
  }

  /**
   * Get available venues for a match
   */
  async getAvailableVenues(matchId: string): Promise<VenueAvailability[]> {
    try {
      const match = await this.getMatch(matchId)
      if (!match) {
        return []
      }

      const { data: venues } = await supabase
        .from('venues')
        .select('*')
        .eq('is_active', true)
        .eq('organization_id', match.tournament?.organization_id)

      if (!venues) {
        return []
      }

      const availability: VenueAvailability[] = []

      for (const venue of venues) {
        const { data: isAvailable } = await supabase.rpc('check_venue_availability', {
          venue_id_param: venue.id,
          match_date_param: match.scheduled_date,
          match_duration_minutes: match.match_duration || 90
        })

        availability.push({
          venue_id: venue.id,
          venue_name: venue.name,
          is_available: isAvailable || false
        })
      }

      return availability
    } catch (error) {
      console.error('Error getting available venues:', error)
      return []
    }
  }

  /**
   * Get match statistics
   */
  async getMatchStatistics(matchId: string): Promise<{
    total_matches: number
    upcoming_matches: number
    live_matches: number
    completed_matches: number
    cancelled_matches: number
  }> {
    try {
      const [total, upcoming, live, completed, cancelled] = await Promise.all([
        supabase
          .from('matches')
          .select('*', { count: 'exact', head: true })
          .eq('id', matchId),
        supabase
          .from('matches')
          .select('*', { count: 'exact', head: true })
          .eq('id', matchId)
          .eq('status', 'scheduled'),
        supabase
          .from('matches')
          .select('*', { count: 'exact', head: true })
          .eq('id', matchId)
          .in('status', ['live', 'paused']),
        supabase
          .from('matches')
          .select('*', { count: 'exact', head: true })
          .eq('id', matchId)
          .eq('status', 'completed'),
        supabase
          .from('matches')
          .select('*', { count: 'exact', head: true })
          .eq('id', matchId)
          .in('status', ['cancelled', 'postponed'])
      ])

      return {
        total_matches: total.count || 0,
        upcoming_matches: upcoming.count || 0,
        live_matches: live.count || 0,
        completed_matches: completed.count || 0,
        cancelled_matches: cancelled.count || 0
      }
    } catch (error) {
      console.error('Error getting match statistics:', error)
      return {
        total_matches: 0,
        upcoming_matches: 0,
        live_matches: 0,
        completed_matches: 0,
        cancelled_matches: 0
      }
    }
  }

  /**
   * Start match (change status to live)
   */
  async startMatch(matchId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Lightweight validation: ensure teams and main referee exist; allow from scheduled/paused only
      const match = await this.getMatch(matchId)
      if (!match) {
        return { success: false, error: 'Match not found' }
      }
      if (!match.home_team_id || !match.away_team_id) {
        return { success: false, error: 'Both teams must be set before starting the match' }
      }
      const hasMainReferee = (match.officials || []).some(o => o.official_type === 'referee')
      if (!hasMainReferee) {
        return { success: false, error: 'Assign a main referee before starting the match' }
      }
      if (match.status !== 'scheduled' && match.status !== 'paused') {
        return { success: false, error: `Cannot start match from status ${match.status}` }
      }

      const { error } = await supabase
        .from('matches')
        .update({
          status: 'live',
          actual_start_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', matchId)

      if (error) {
        console.error('Error starting match:', error)
        return {
          success: false,
          error: 'Failed to start match'
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Error in startMatch:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
    }
  }

  /**
   * Pause match (live -> paused)
   */
  async pauseMatch(matchId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const match = await this.getMatch(matchId)
      if (!match) return { success: false, error: 'Match not found' }
      if (match.status !== 'live') {
        return { success: false, error: 'Only live matches can be paused' }
      }

      const { error } = await supabase
        .from('matches')
        .update({ status: 'paused', updated_at: new Date().toISOString() })
        .eq('id', matchId)

      if (error) {
        console.error('Error pausing match:', error)
        return { success: false, error: 'Failed to pause match' }
      }

      return { success: true }
    } catch (error) {
      console.error('Error in pauseMatch:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  /**
   * Resume match (paused -> live)
   */
  async resumeMatch(matchId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const match = await this.getMatch(matchId)
      if (!match) return { success: false, error: 'Match not found' }
      if (match.status !== 'paused') {
        return { success: false, error: 'Only paused matches can be resumed' }
      }

      const { error } = await supabase
        .from('matches')
        .update({ status: 'live', updated_at: new Date().toISOString() })
        .eq('id', matchId)

      if (error) {
        console.error('Error resuming match:', error)
        return { success: false, error: 'Failed to resume match' }
      }

      return { success: true }
    } catch (error) {
      console.error('Error in resumeMatch:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  /**
   * End match (change status to completed)
   */
  async endMatch(matchId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('matches')
        .update({
          status: 'completed',
          actual_end_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', matchId)

      if (error) {
        console.error('Error ending match:', error)
        return {
          success: false,
          error: 'Failed to end match'
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Error in endMatch:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
    }
  }

  /**
   * Team sheet submission and pre-match validation
   */
  async submitTeamSheet(
    matchId: string,
    teamId: string,
    players: Array<{
      player_id: string
      jersey_number: number
      position?: string
      status: 'starting' | 'substitute' | 'bench'
      is_captain?: boolean
    }>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Basic validations
      if (!players || players.length === 0) {
        return { success: false, error: 'Team sheet cannot be empty' }
      }
      const starting = players.filter(p => p.status === 'starting')
      if (starting.length < 11) {
        return { success: false, error: 'At least 11 starting players are required' }
      }
      const captains = players.filter(p => p.is_captain)
      if (captains.length !== 1) {
        return { success: false, error: 'Exactly one captain must be selected' }
      }
      const jerseyNumbers = players.map(p => p.jersey_number)
      const unique = new Set(jerseyNumbers)
      if (unique.size !== jerseyNumbers.length) {
        return { success: false, error: 'Jersey numbers must be unique' }
      }

      // Replace existing lineup for this team
      await supabase
        .from('match_lineups')
        .delete()
        .eq('match_id', matchId)
        .eq('team_id', teamId)

      const rows = players.map(p => ({
        match_id: matchId,
        team_id: teamId,
        player_id: p.player_id,
        jersey_number: p.jersey_number,
        position: p.position,
        status: p.status,
        is_captain: !!p.is_captain
      }))

      const { error } = await supabase
        .from('match_lineups')
        .insert(rows)

      if (error) {
        console.error('Error submitting team sheet:', error)
        return { success: false, error: 'Failed to submit team sheet' }
      }

      return { success: true }
    } catch (error) {
      console.error('Error in submitTeamSheet:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  async getTeamSheets(matchId: string): Promise<
    Array<{
      team_id: string
      team_name: string
      players: Array<{
        player_id: string
        player_name: string
        jersey_number: number
        position?: string | null
        status: 'starting' | 'substitute' | 'bench'
        is_captain: boolean
      }>
    }>
  > {
    try {
      const { data } = await supabase
        .from('match_lineups')
        .select(`
          *,
          team:teams(name),
          player:players(name)
        `)
        .eq('match_id', matchId)

      if (!data || data.length === 0) return []

      const grouped: Record<string, any> = {}
      for (const row of data) {
        const key = row.team_id
        if (!grouped[key]) {
          grouped[key] = {
            team_id: row.team_id,
            team_name: row.team?.name || 'Unknown',
            players: [] as any[]
          }
        }
        grouped[key].players.push({
          player_id: row.player_id,
          player_name: row.player?.name || 'Unknown',
          jersey_number: row.jersey_number,
          position: row.position,
          status: row.status,
          is_captain: !!row.is_captain
        })
      }

      return Object.values(grouped)
    } catch (error) {
      console.error('Error in getTeamSheets:', error)
      return []
    }
  }

  async getPreMatchValidation(matchId: string): Promise<{
    teams_set: boolean
    main_referee_assigned: boolean
    both_lineups_submitted: boolean
    venue_assigned: boolean
  }> {
    try {
      const match = await this.getMatch(matchId)
      if (!match) {
        return {
          teams_set: false,
          main_referee_assigned: false,
          both_lineups_submitted: false,
          venue_assigned: false
        }
      }

      const teams_set = !!(match.home_team_id && match.away_team_id)
      const main_referee_assigned = (match.officials || []).some(o => o.official_type === 'referee')
      const venue_assigned = !!(((match as any).venue_id) || match.venue)

      const teamSheets = await this.getTeamSheets(matchId)
      const both_lineups_submitted = teamSheets.length >= 2

      return { teams_set, main_referee_assigned, both_lineups_submitted, venue_assigned }
    } catch (error) {
      console.error('Error in getPreMatchValidation:', error)
      return { teams_set: false, main_referee_assigned: false, both_lineups_submitted: false, venue_assigned: false }
    }
  }
}

export const matchService = new MatchService()
