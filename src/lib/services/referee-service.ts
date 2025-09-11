import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/types'

const supabase = createClient()

type Referee = Database['public']['Tables']['referees']['Row']
type RefereeInsert = Database['public']['Tables']['referees']['Insert']
type RefereeUpdate = Database['public']['Tables']['referees']['Update']
type MatchOfficial = Database['public']['Tables']['match_officials']['Row']
type Match = Database['public']['Tables']['matches']['Row']

export interface RefereeWithDetails extends Referee {
  match_history?: MatchOfficial[]
  performance_stats?: RefereePerformanceStats
}

export interface RefereePerformanceStats {
  total_matches: number
  matches_this_month: number
  matches_this_week: number
  average_rating: number
  specialization_matches: Record<string, number>
  recent_matches: MatchOfficial[]
}

export interface RefereeFormData {
  name: string
  email?: string
  phone?: string
  license_number?: string
  license_level: 'fifa' | 'continental' | 'national' | 'regional' | 'local'
  specialization: 'referee' | 'assistant_referee' | 'fourth_official' | 'var_official'
  experience_years: number
  max_matches_per_week: number
  travel_radius_km: number
  preferred_venues?: string[]
  availability_schedule?: Record<string, any>
}

export interface RefereeAssignment {
  referee_id: string
  official_type: 'referee' | 'assistant_referee_1' | 'assistant_referee_2' | 'fourth_official' | 'var_official'
  notes?: string
}

export interface RefereeFilters {
  specialization?: string
  license_level?: string
  is_active?: boolean
  availability_date?: string
  max_travel_distance?: number
  venue_id?: string
}

export interface RefereeAvailability {
  referee_id: string
  referee_name: string
  is_available: boolean
  conflicting_matches?: Match[]
  weekly_match_count: number
  max_weekly_matches: number
  travel_distance_km?: number
}

export interface NotificationData {
  referee_id: string
  match_id: string
  notification_type: 'assignment' | 'reminder' | 'change' | 'cancellation'
  message: string
  scheduled_for?: string
}

export class RefereeService {
  /**
   * Create a new referee
   */
  async createReferee(organizationId: string, data: RefereeFormData): Promise<{ success: boolean; referee?: RefereeWithDetails; error?: string }> {
    try {
      // Check if referee with same email already exists
      if (data.email) {
        const { data: existingReferee } = await supabase
          .from('referees')
          .select('id')
          .eq('email', data.email)
          .eq('organization_id', organizationId)
          .single()

        if (existingReferee) {
          return {
            success: false,
            error: 'A referee with this email already exists in your organization'
          }
        }
      }

      const { data: referee, error } = await supabase
        .from('referees')
        .insert({
          organization_id: organizationId,
          ...data,
          is_active: true
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating referee:', error)
        return {
          success: false,
          error: 'Failed to create referee'
        }
      }

      return {
        success: true,
        referee: referee as RefereeWithDetails
      }
    } catch (error) {
      console.error('Error in createReferee:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
    }
  }

  /**
   * Get referee by ID with full details
   */
  async getReferee(refereeId: string): Promise<RefereeWithDetails | null> {
    try {
      const { data: referee, error } = await supabase
        .from('referees')
        .select('*')
        .eq('id', refereeId)
        .single()

      if (error || !referee) {
        return null
      }

      // Get match history and performance stats
      const [matchHistory, performanceStats] = await Promise.all([
        this.getRefereeMatchHistory(refereeId),
        this.getRefereePerformanceStats(refereeId)
      ])

      return {
        ...referee,
        match_history: matchHistory,
        performance_stats: performanceStats
      } as RefereeWithDetails
    } catch (error) {
      console.error('Error getting referee:', error)
      return null
    }
  }

  /**
   * Get referees for organization with filters
   */
  async getOrganizationReferees(
    organizationId: string,
    filters?: RefereeFilters
  ): Promise<RefereeWithDetails[]> {
    try {
      let query = supabase
        .from('referees')
        .select('*')
        .eq('organization_id', organizationId)

      if (filters) {
        if (filters.specialization) {
          query = query.eq('specialization', filters.specialization)
        }
        if (filters.license_level) {
          query = query.eq('license_level', filters.license_level)
        }
        if (filters.is_active !== undefined) {
          query = query.eq('is_active', filters.is_active)
        }
      }

      const { data: referees, error } = await query
        .order('name')

      if (error) {
        throw error
      }

      // Enhance referees with performance stats
      const enhancedReferees = await Promise.all(
        (referees || []).map(async (referee) => {
          const performanceStats = await this.getRefereePerformanceStats(referee.id)
          return {
            ...referee,
            performance_stats: performanceStats
          }
        })
      )

      return enhancedReferees as RefereeWithDetails[]
    } catch (error) {
      console.error('Error getting organization referees:', error)
      return []
    }
  }

  /**
   * Update referee
   */
  async updateReferee(refereeId: string, updates: Partial<RefereeFormData>): Promise<{ success: boolean; referee?: RefereeWithDetails; error?: string }> {
    try {
      const { data: referee, error } = await supabase
        .from('referees')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', refereeId)
        .select()
        .single()

      if (error) {
        console.error('Error updating referee:', error)
        return {
          success: false,
          error: 'Failed to update referee'
        }
      }

      return {
        success: true,
        referee: referee as RefereeWithDetails
      }
    } catch (error) {
      console.error('Error in updateReferee:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
    }
  }

  /**
   * Delete referee
   */
  async deleteReferee(refereeId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if referee has upcoming matches
      const { count: upcomingMatches } = await supabase
        .from('match_officials')
        .select('*', { count: 'exact', head: true })
        .eq('referee_id', refereeId)
        .gte('assigned_at', new Date().toISOString())

      if (upcomingMatches && upcomingMatches > 0) {
        return {
          success: false,
          error: 'Cannot delete referee with upcoming match assignments. Please reassign matches first.'
        }
      }

      const { error } = await supabase
        .from('referees')
        .delete()
        .eq('id', refereeId)

      if (error) {
        console.error('Error deleting referee:', error)
        return {
          success: false,
          error: 'Failed to delete referee'
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Error in deleteReferee:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
    }
  }

  /**
   * Get available referees for a match
   */
  async getAvailableRefereesForMatch(
    matchId: string,
    officialType?: string,
    venueId?: string
  ): Promise<RefereeAvailability[]> {
    try {
      const match = await this.getMatchDetails(matchId)
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

        // Check availability
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

        // Calculate travel distance if venue is provided
        let travelDistance = 0
        if (venueId && referee.preferred_venues) {
          // This would typically involve geocoding and distance calculation
          // For now, we'll use a simple check if venue is in preferred venues
          travelDistance = referee.preferred_venues.includes(venueId) ? 0 : referee.travel_radius_km || 50
        }

        availability.push({
          referee_id: referee.id,
          referee_name: referee.name,
          is_available: isAvailable || false,
          weekly_match_count: weeklyMatches || 0,
          max_weekly_matches: referee.max_matches_per_week || 3,
          travel_distance_km: travelDistance
        })
      }

      return availability.sort((a, b) => {
        // Sort by availability first, then by weekly match count
        if (a.is_available !== b.is_available) {
          return a.is_available ? -1 : 1
        }
        return a.weekly_match_count - b.weekly_match_count
      })
    } catch (error) {
      console.error('Error getting available referees:', error)
      return []
    }
  }

  /**
   * Assign referee to match
   */
  async assignRefereeToMatch(matchId: string, assignment: RefereeAssignment): Promise<{ success: boolean; error?: string }> {
    try {
      // Check referee availability
      const { data: refereeAvailable } = await supabase.rpc('check_referee_availability', {
        referee_id_param: assignment.referee_id,
        match_date_param: (await this.getMatchDetails(matchId))?.scheduled_date || '',
        match_duration_minutes: 90
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

      // Send notification
      await this.sendRefereeNotification({
        referee_id: assignment.referee_id,
        match_id: matchId,
        notification_type: 'assignment',
        message: `You have been assigned as ${assignment.official_type.replace('_', ' ')} for a match`
      })

      return { success: true }
    } catch (error) {
      console.error('Error in assignRefereeToMatch:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
    }
  }

  /**
   * Get referee match history
   */
  private async getRefereeMatchHistory(refereeId: string): Promise<MatchOfficial[]> {
    try {
      const { data: matchHistory } = await supabase
        .from('match_officials')
        .select(`
          *,
          match:matches(
            *,
            home_team:teams!matches_home_team_id_fkey(name),
            away_team:teams!matches_away_team_id_fkey(name),
            tournament:tournaments(name)
          )
        `)
        .eq('referee_id', refereeId)
        .order('assigned_at', { ascending: false })
        .limit(10)

      return matchHistory || []
    } catch (error) {
      console.error('Error getting referee match history:', error)
      return []
    }
  }

  /**
   * Get referee performance statistics
   */
  private async getRefereePerformanceStats(refereeId: string): Promise<RefereePerformanceStats> {
    try {
      const now = new Date()
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const [totalMatches, monthlyMatches, weeklyMatches, recentMatches] = await Promise.all([
        supabase
          .from('match_officials')
          .select('*', { count: 'exact', head: true })
          .eq('referee_id', refereeId),
        supabase
          .from('match_officials')
          .select('*', { count: 'exact', head: true })
          .eq('referee_id', refereeId)
          .gte('assigned_at', thisMonth.toISOString()),
        supabase
          .from('match_officials')
          .select('*', { count: 'exact', head: true })
          .eq('referee_id', refereeId)
          .gte('assigned_at', thisWeek.toISOString()),
        supabase
          .from('match_officials')
          .select('*')
          .eq('referee_id', refereeId)
          .order('assigned_at', { ascending: false })
          .limit(5)
      ])

      // Calculate specialization matches
      const specializationMatches: Record<string, number> = {}
      if (recentMatches.data) {
        recentMatches.data.forEach(match => {
          const type = match.official_type
          specializationMatches[type] = (specializationMatches[type] || 0) + 1
        })
      }

      return {
        total_matches: totalMatches.count || 0,
        matches_this_month: monthlyMatches.count || 0,
        matches_this_week: weeklyMatches.count || 0,
        average_rating: 0, // This would be calculated from match ratings
        specialization_matches: specializationMatches,
        recent_matches: recentMatches.data || []
      }
    } catch (error) {
      console.error('Error getting referee performance stats:', error)
      return {
        total_matches: 0,
        matches_this_month: 0,
        matches_this_week: 0,
        average_rating: 0,
        specialization_matches: {},
        recent_matches: []
      }
    }
  }

  /**
   * Get match details for availability checking
   */
  private async getMatchDetails(matchId: string): Promise<Match | null> {
    try {
      const { data: match } = await supabase
        .from('matches')
        .select(`
          *,
          tournament:tournaments(*)
        `)
        .eq('id', matchId)
        .single()

      return match
    } catch (error) {
      console.error('Error getting match details:', error)
      return null
    }
  }

  /**
   * Send notification to referee
   */
  private async sendRefereeNotification(notification: NotificationData): Promise<void> {
    try {
      // This would integrate with email/SMS services
      // For now, we'll just log the notification
      console.log('Referee notification:', notification)
      
      // In a real implementation, this would:
      // 1. Get referee contact information
      // 2. Send email/SMS based on referee preferences
      // 3. Store notification in database for tracking
      // 4. Handle delivery status and retries
    } catch (error) {
      console.error('Error sending referee notification:', error)
    }
  }

  /**
   * Get referee statistics for organization
   */
  async getRefereeStatistics(organizationId: string): Promise<{
    total_referees: number
    active_referees: number
    inactive_referees: number
    referees_by_specialization: Record<string, number>
    referees_by_license_level: Record<string, number>
  }> {
    try {
      const { data: referees } = await supabase
        .from('referees')
        .select('specialization, license_level, is_active')
        .eq('organization_id', organizationId)

      if (!referees) {
        return {
          total_referees: 0,
          active_referees: 0,
          inactive_referees: 0,
          referees_by_specialization: {},
          referees_by_license_level: {}
        }
      }

      const stats = {
        total_referees: referees.length,
        active_referees: referees.filter(r => r.is_active).length,
        inactive_referees: referees.filter(r => !r.is_active).length,
        referees_by_specialization: {} as Record<string, number>,
        referees_by_license_level: {} as Record<string, number>
      }

      referees.forEach(referee => {
        // Count by specialization
        const spec = referee.specialization || 'unknown'
        stats.referees_by_specialization[spec] = (stats.referees_by_specialization[spec] || 0) + 1

        // Count by license level
        const level = referee.license_level || 'unknown'
        stats.referees_by_license_level[level] = (stats.referees_by_license_level[level] || 0) + 1
      })

      return stats
    } catch (error) {
      console.error('Error getting referee statistics:', error)
      return {
        total_referees: 0,
        active_referees: 0,
        inactive_referees: 0,
        referees_by_specialization: {},
        referees_by_license_level: {}
      }
    }
  }
}

export const refereeService = new RefereeService()
