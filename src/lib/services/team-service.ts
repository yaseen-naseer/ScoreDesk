/**
 * Team Service
 * Handles team registration, management, and operations
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'

export interface TeamRegistrationData {
  name: string
  short_name?: string
  description?: string
  founded_year?: number
  home_venue?: string
  venue_address?: string
  venue_capacity?: number
  primary_color: string
  secondary_color: string
  logo_url?: string
  contact_email?: string
  contact_phone?: string
  website_url?: string
  social_media?: {
    facebook?: string
    twitter?: string
    instagram?: string
    youtube?: string
  }
  team_type: 'football' | 'futsal' | 'both'
  division?: string
  category: 'senior' | 'youth' | 'women' | 'mixed'
  status: 'active' | 'inactive' | 'suspended'
}

export interface TeamProfile {
  id: string
  organization_id: string
  name: string
  short_name?: string
  description?: string
  founded_year?: number
  home_venue?: string
  venue_address?: string
  venue_capacity?: number
  primary_color: string
  secondary_color: string
  logo_url?: string
  contact_email?: string
  contact_phone?: string
  website_url?: string
  social_media?: Record<string, any>
  team_type: 'football' | 'futsal' | 'both'
  division?: string
  category: 'senior' | 'youth' | 'women' | 'mixed'
  status: 'active' | 'inactive' | 'suspended'
  created_at: string
  updated_at: string
  statistics?: TeamStatistics
  playerCount?: number
  recentMatches?: number
}

export interface TeamStatistics {
  totalPlayers: number
  totalMatches: number
  wins: number
  losses: number
  draws: number
  goalsFor: number
  goalsAgainst: number
  winPercentage: number
  currentStreak: string
  homeRecord: string
  awayRecord: string
  topScorer?: {
    playerId: string
    playerName: string
    goals: number
  }
}

export interface TeamSearchFilters {
  search?: string
  team_type?: 'football' | 'futsal' | 'both'
  category?: 'senior' | 'youth' | 'women' | 'mixed'
  status?: 'active' | 'inactive' | 'suspended'
  division?: string
  founded_year_min?: number
  founded_year_max?: number
}

class TeamService {
  private supabase = createClientComponentClient<Database>()

  /**
   * Register a new team
   */
  async registerTeam(
    organizationId: string,
    teamData: TeamRegistrationData
  ): Promise<{ success: boolean; team?: TeamProfile; error?: string }> {
    try {
      // Check if team name exists in organization
      const { data: existingTeam } = await this.supabase
        .from('teams')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('name', teamData.name)
        .single()

      if (existingTeam) {
        return {
          success: false,
          error: 'A team with this name already exists in your organization'
        }
      }

      // Insert team
      const { data: team, error } = await this.supabase
        .from('teams')
        .insert({
          organization_id: organizationId,
          ...teamData,
          social_media: teamData.social_media || null
        })
        .select()
        .single()

      if (error) {
        console.error('Error registering team:', error)
        return {
          success: false,
          error: 'Failed to register team'
        }
      }

      return {
        success: true,
        team: team as TeamProfile
      }
    } catch (error) {
      console.error('Error in registerTeam:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
    }
  }

  /**
   * Get team by ID
   */
  async getTeam(teamId: string): Promise<TeamProfile | null> {
    try {
      const { data: team, error } = await this.supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single()

      if (error || !team) {
        return null
      }

      // Get team statistics
      const statistics = await this.getTeamStatistics(teamId)
      const playerCount = await this.getPlayerCount(teamId)
      const recentMatches = await this.getRecentMatchesCount(teamId)

      return {
        ...team,
        statistics,
        playerCount,
        recentMatches
      } as TeamProfile
    } catch (error) {
      console.error('Error getting team:', error)
      return null
    }
  }

  /**
   * Get teams for organization
   */
  async getOrganizationTeams(
    organizationId: string,
    filters?: TeamSearchFilters,
    options?: {
      limit?: number
      offset?: number
      orderBy?: { column: string; ascending: boolean }
    }
  ): Promise<{ teams: TeamProfile[]; totalCount: number }> {
    try {
      let query = this.supabase
        .from('teams')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)

      // Apply filters
      if (filters) {
        if (filters.search) {
          query = query.or(`name.ilike.%${filters.search}%,short_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
        }
        if (filters.team_type) {
          query = query.eq('team_type', filters.team_type)
        }
        if (filters.category) {
          query = query.eq('category', filters.category)
        }
        if (filters.status) {
          query = query.eq('status', filters.status)
        }
        if (filters.division) {
          query = query.eq('division', filters.division)
        }
        if (filters.founded_year_min) {
          query = query.gte('founded_year', filters.founded_year_min)
        }
        if (filters.founded_year_max) {
          query = query.lte('founded_year', filters.founded_year_max)
        }
      }

      // Apply ordering
      if (options?.orderBy) {
        query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit)
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
      }

      const { data: teams, error, count } = await query

      if (error) {
        throw error
      }

      // Enhance teams with additional data
      const enhancedTeams = await Promise.all(
        (teams || []).map(async (team) => {
          const [statistics, playerCount, recentMatches] = await Promise.all([
            this.getTeamStatistics(team.id),
            this.getPlayerCount(team.id),
            this.getRecentMatchesCount(team.id)
          ])

          return {
            ...team,
            statistics,
            playerCount,
            recentMatches
          }
        })
      )

      return {
        teams: enhancedTeams as TeamProfile[],
        totalCount: count || 0
      }
    } catch (error) {
      console.error('Error getting organization teams:', error)
      return { teams: [], totalCount: 0 }
    }
  }

  /**
   * Update team profile
   */
  async updateTeam(
    teamId: string,
    updates: Partial<TeamRegistrationData>
  ): Promise<{ success: boolean; team?: TeamProfile; error?: string }> {
    try {
      const { data: team, error } = await this.supabase
        .from('teams')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', teamId)
        .select()
        .single()

      if (error) {
        console.error('Error updating team:', error)
        return {
          success: false,
          error: 'Failed to update team'
        }
      }

      return {
        success: true,
        team: team as TeamProfile
      }
    } catch (error) {
      console.error('Error in updateTeam:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
    }
  }

  /**
   * Delete team
   */
  async deleteTeam(teamId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if team has players
      const playerCount = await this.getPlayerCount(teamId)
      if (playerCount > 0) {
        return {
          success: false,
          error: 'Cannot delete team with active players. Please remove all players first.'
        }
      }

      // Check if team has matches
      const matchCount = await this.getMatchCount(teamId)
      if (matchCount > 0) {
        return {
          success: false,
          error: 'Cannot delete team with match history. Please archive the team instead.'
        }
      }

      const { error } = await this.supabase
        .from('teams')
        .delete()
        .eq('id', teamId)

      if (error) {
        console.error('Error deleting team:', error)
        return {
          success: false,
          error: 'Failed to delete team'
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Error in deleteTeam:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
    }
  }

  /**
   * Upload team logo
   */
  async uploadTeamLogo(teamId: string, file: File): Promise<{ success: boolean; logoUrl?: string; error?: string }> {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${teamId}-${Date.now()}.${fileExt}`
      const filePath = `team-logos/${fileName}`

      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('public')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        throw uploadError
      }

      const { data: { publicUrl } } = this.supabase.storage
        .from('public')
        .getPublicUrl(filePath)

      // Update team with logo URL
      const { error: updateError } = await this.supabase
        .from('teams')
        .update({ logo_url: publicUrl })
        .eq('id', teamId)

      if (updateError) {
        throw updateError
      }

      return {
        success: true,
        logoUrl: publicUrl
      }
    } catch (error) {
      console.error('Error uploading team logo:', error)
      return {
        success: false,
        error: 'Failed to upload team logo'
      }
    }
  }

  /**
   * Get team statistics
   */
  private async getTeamStatistics(teamId: string): Promise<TeamStatistics> {
    try {
      // This would typically involve complex queries to calculate statistics
      // For now, return mock data that would be calculated from actual match data
      return {
        totalPlayers: await this.getPlayerCount(teamId),
        totalMatches: await this.getMatchCount(teamId),
        wins: 0,
        losses: 0,
        draws: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        winPercentage: 0,
        currentStreak: 'No matches',
        homeRecord: '0-0-0',
        awayRecord: '0-0-0'
      }
    } catch (error) {
      console.error('Error getting team statistics:', error)
      return {
        totalPlayers: 0,
        totalMatches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        winPercentage: 0,
        currentStreak: 'Unknown',
        homeRecord: '0-0-0',
        awayRecord: '0-0-0'
      }
    }
  }

  /**
   * Get player count for team
   */
  private async getPlayerCount(teamId: string): Promise<number> {
    try {
      const { count } = await this.supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('status', 'active')

      return count || 0
    } catch (error) {
      console.error('Error getting player count:', error)
      return 0
    }
  }

  /**
   * Get match count for team
   */
  private async getMatchCount(teamId: string): Promise<number> {
    try {
      const { count } = await this.supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)

      return count || 0
    } catch (error) {
      console.error('Error getting match count:', error)
      return 0
    }
  }

  /**
   * Get recent matches count (last 30 days)
   */
  private async getRecentMatchesCount(teamId: string): Promise<number> {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { count } = await this.supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .gte('match_date', thirtyDaysAgo.toISOString())

      return count || 0
    } catch (error) {
      console.error('Error getting recent matches count:', error)
      return 0
    }
  }

  /**
   * Get available divisions for organization
   */
  async getOrganizationDivisions(organizationId: string): Promise<string[]> {
    try {
      const { data } = await this.supabase
        .from('teams')
        .select('division')
        .eq('organization_id', organizationId)
        .not('division', 'is', null)

      const divisions = [...new Set(data?.map(team => team.division).filter(Boolean))] as string[]
      return divisions.sort()
    } catch (error) {
      console.error('Error getting divisions:', error)
      return []
    }
  }

  /**
   * Validate team name availability
   */
  async isTeamNameAvailable(organizationId: string, name: string, excludeTeamId?: string): Promise<boolean> {
    try {
      let query = this.supabase
        .from('teams')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('name', name)

      if (excludeTeamId) {
        query = query.neq('id', excludeTeamId)
      }

      const { data } = await query.single()
      return !data
    } catch (error) {
      // If no team found, name is available
      return true
    }
  }
}

export const teamService = new TeamService()
export default TeamService
