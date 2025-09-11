import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/types'

const supabase = createClient()

type Match = Database['public']['Tables']['matches']['Row']
type MatchInsert = Database['public']['Tables']['matches']['Insert']
type MatchUpdate = Database['public']['Tables']['matches']['Update']
type Referee = Database['public']['Tables']['referees']['Row']
type Venue = Database['public']['Tables']['venues']['Row']
type MatchOfficial = Database['public']['Tables']['match_officials']['Row']
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

      return { success: true }
    } catch (error) {
      console.error('Error in assignReferee:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
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
}

export const matchService = new MatchService()
