import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/types'

const supabase = createClient()

type Tournament = Database['public']['Tables']['tournaments']['Row']
type TournamentInsert = Database['public']['Tables']['tournaments']['Insert']
type TournamentUpdate = Database['public']['Tables']['tournaments']['Update']
type TournamentGroup = Database['public']['Tables']['tournament_groups']['Row']
type TournamentTeam = Database['public']['Tables']['tournament_teams']['Row']

export interface TournamentWithDetails extends Tournament {
  groups?: TournamentGroup[]
  teams?: TournamentTeam[]
  standings?: Database['public']['Tables']['tournament_standings']['Row'][]
}

export interface TournamentCreationData {
  name: string
  description?: string
  sport: 'football' | 'futsal'
  format: 'league' | 'knockout' | 'group'
  start_date: string
  end_date: string
  max_teams?: number
  registration_deadline?: string
}

export interface ScheduleGenerationOptions {
  tournament_id: string
  teams: string[]
  venue?: string
  start_date: string
  match_duration_minutes?: number
  break_between_matches_minutes?: number
}

export class TournamentService {
  /**
   * Create a new tournament
   */
  async createTournament(data: TournamentCreationData, organizationId: string): Promise<Tournament> {
    const { data: tournament, error } = await supabase
      .from('tournaments')
      .insert({
        organization_id: organizationId,
        name: data.name,
        description: data.description,
        sport: data.sport,
        format: data.format,
        start_date: data.start_date,
        end_date: data.end_date,
        max_teams: data.max_teams,
        registration_deadline: data.registration_deadline,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create tournament: ${error.message}`)
    }

    return tournament
  }

  /**
   * Get all tournaments for an organization
   */
  async getTournaments(organizationId: string): Promise<Tournament[]> {
    const { data: tournaments, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch tournaments: ${error.message}`)
    }

    return tournaments || []
  }

  /**
   * Get tournament with full details
   */
  async getTournamentWithDetails(tournamentId: string): Promise<TournamentWithDetails | null> {
    const { data: tournament, error } = await supabase
      .from('tournaments')
      .select(`
        *,
        groups:tournament_groups(*),
        teams:tournament_teams(
          *,
          team:teams(*)
        ),
        standings:tournament_standings(*)
      `)
      .eq('id', tournamentId)
      .single()

    if (error) {
      throw new Error(`Failed to fetch tournament details: ${error.message}`)
    }

    return tournament
  }

  /**
   * Update tournament
   */
  async updateTournament(tournamentId: string, updates: TournamentUpdate): Promise<Tournament> {
    const { data: tournament, error } = await supabase
      .from('tournaments')
      .update(updates)
      .eq('id', tournamentId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update tournament: ${error.message}`)
    }

    return tournament
  }

  /**
   * Delete tournament (soft delete)
   */
  async deleteTournament(tournamentId: string): Promise<void> {
    const { error } = await supabase
      .from('tournaments')
      .update({ is_active: false })
      .eq('id', tournamentId)

    if (error) {
      throw new Error(`Failed to delete tournament: ${error.message}`)
    }
  }

  /**
   * Create tournament groups for group stage format
   */
  async createTournamentGroups(tournamentId: string, groups: Array<{ name: string; advance_teams?: number }>): Promise<TournamentGroup[]> {
    const groupData = groups.map((group, index) => ({
      tournament_id: tournamentId,
      name: group.name,
      display_order: index + 1,
      advance_teams: group.advance_teams || 2
    }))

    const { data: createdGroups, error } = await supabase
      .from('tournament_groups')
      .insert(groupData)
      .select()

    if (error) {
      throw new Error(`Failed to create tournament groups: ${error.message}`)
    }

    return createdGroups
  }

  /**
   * Register team for tournament
   */
  async registerTeamForTournament(tournamentId: string, teamId: string, groupName?: string): Promise<TournamentTeam> {
    const { data: registration, error } = await supabase
      .from('tournament_teams')
      .insert({
        tournament_id: tournamentId,
        team_id: teamId,
        group_name: groupName,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to register team: ${error.message}`)
    }

    return registration
  }

  /**
   * Generate schedule for league tournament (round-robin)
   */
  async generateLeagueSchedule(options: ScheduleGenerationOptions): Promise<void> {
    const { teams, start_date, venue, match_duration_minutes = 90, break_between_matches_minutes = 15 } = options
    
    if (teams.length < 2) {
      throw new Error('At least 2 teams required for league tournament')
    }

    const matches = this.generateRoundRobinMatches(teams)
    const startDate = new Date(start_date)
    
    let currentTime = new Date(startDate)
    
    for (const match of matches) {
      await supabase
        .from('matches')
        .insert({
          tournament_id: options.tournament_id,
          home_team_id: match.home_team_id,
          away_team_id: match.away_team_id,
          scheduled_date: currentTime.toISOString(),
          venue: venue,
          status: 'scheduled',
          match_duration: match_duration_minutes
        })

      // Add break between matches
      currentTime.setMinutes(currentTime.getMinutes() + match_duration_minutes + break_between_matches_minutes)
    }
  }

  /**
   * Generate schedule for knockout tournament
   */
  async generateKnockoutSchedule(options: ScheduleGenerationOptions): Promise<void> {
    const { teams, start_date, venue, match_duration_minutes = 90 } = options
    
    if (teams.length < 2) {
      throw new Error('At least 2 teams required for knockout tournament')
    }

    // Ensure we have a power of 2 teams (add byes if needed)
    const totalTeams = this.getNextPowerOfTwo(teams.length)
    const byes = totalTeams - teams.length
    
    // Shuffle teams and add byes
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5)
    const teamsWithByes = [...shuffledTeams, ...Array(byes).fill(null)]

    const rounds = this.generateKnockoutRounds(teamsWithByes)
    const startDate = new Date(start_date)
    
    let currentTime = new Date(startDate)
    
    for (const round of rounds) {
      for (const match of round) {
        if (match.home_team_id && match.away_team_id) {
          await supabase
            .from('matches')
            .insert({
              tournament_id: options.tournament_id,
              home_team_id: match.home_team_id,
              away_team_id: match.away_team_id,
              scheduled_date: currentTime.toISOString(),
              venue: venue,
              status: 'scheduled',
              match_duration: match_duration_minutes,
              round_name: match.round_name
            })

          currentTime.setMinutes(currentTime.getMinutes() + match_duration_minutes + 15)
        }
      }
    }
  }

  /**
   * Generate schedule for group stage tournament
   */
  async generateGroupStageSchedule(options: ScheduleGenerationOptions): Promise<void> {
    const { teams, start_date, venue, match_duration_minutes = 90 } = options
    
    if (teams.length < 4) {
      throw new Error('At least 4 teams required for group stage tournament')
    }

    // Get tournament groups
    const { data: groups, error: groupsError } = await supabase
      .from('tournament_groups')
      .select('*')
      .eq('tournament_id', options.tournament_id)
      .order('display_order')

    if (groupsError || !groups?.length) {
      throw new Error('No groups found for group stage tournament')
    }

    const startDate = new Date(start_date)
    let currentTime = new Date(startDate)

    for (const group of groups) {
      // Get teams in this group
      const { data: groupTeams, error: teamsError } = await supabase
        .from('tournament_teams')
        .select('team_id')
        .eq('tournament_id', options.tournament_id)
        .eq('group_name', group.name)

      if (teamsError || !groupTeams?.length) {
        continue
      }

      const teamIds = groupTeams.map(t => t.team_id)
      const groupMatches = this.generateRoundRobinMatches(teamIds)

      for (const match of groupMatches) {
        await supabase
          .from('matches')
          .insert({
            tournament_id: options.tournament_id,
            home_team_id: match.home_team_id,
            away_team_id: match.away_team_id,
            scheduled_date: currentTime.toISOString(),
            venue: venue,
            status: 'scheduled',
            match_duration: match_duration_minutes,
            round_name: `Group ${group.name}`
          })

        currentTime.setMinutes(currentTime.getMinutes() + match_duration_minutes + 15)
      }
    }
  }

  /**
   * Generate round-robin matches for league format
   */
  private generateRoundRobinMatches(teams: string[]): Array<{ home_team_id: string; away_team_id: string }> {
    const matches: Array<{ home_team_id: string; away_team_id: string }> = []
    const n = teams.length
    
    // Generate all possible pairs
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        matches.push({
          home_team_id: teams[i],
          away_team_id: teams[j]
        })
      }
    }
    
    return matches
  }

  /**
   * Generate knockout rounds
   */
  private generateKnockoutRounds(teams: (string | null)[]): Array<Array<{ home_team_id: string | null; away_team_id: string | null; round_name: string }>> {
    const rounds: Array<Array<{ home_team_id: string | null; away_team_id: string | null; round_name: string }>> = []
    let currentTeams = [...teams]
    let roundNumber = 1
    
    while (currentTeams.length > 1) {
      const roundMatches: Array<{ home_team_id: string | null; away_team_id: string | null; round_name: string }> = []
      
      for (let i = 0; i < currentTeams.length; i += 2) {
        roundMatches.push({
          home_team_id: currentTeams[i],
          away_team_id: currentTeams[i + 1] || null,
          round_name: this.getRoundName(currentTeams.length, roundNumber)
        })
      }
      
      rounds.push(roundMatches)
      currentTeams = Array(Math.ceil(currentTeams.length / 2)).fill(null) // Winners advance
      roundNumber++
    }
    
    return rounds
  }

  /**
   * Get round name based on number of teams
   */
  private getRoundName(teamCount: number, roundNumber: number): string {
    if (teamCount === 2) return 'Final'
    if (teamCount === 4) return roundNumber === 1 ? 'Semi-Final' : 'Final'
    if (teamCount === 8) {
      switch (roundNumber) {
        case 1: return 'Quarter-Final'
        case 2: return 'Semi-Final'
        case 3: return 'Final'
        default: return `Round ${roundNumber}`
      }
    }
    return `Round ${roundNumber}`
  }

  /**
   * Get next power of 2
   */
  private getNextPowerOfTwo(n: number): number {
    return Math.pow(2, Math.ceil(Math.log2(n)))
  }

  /**
   * Validate tournament configuration
   */
  validateTournamentConfig(data: TournamentCreationData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data.name || data.name.length < 2) {
      errors.push('Tournament name must be at least 2 characters')
    }

    if (!data.start_date || !data.end_date) {
      errors.push('Start date and end date are required')
    }

    if (data.start_date && data.end_date && new Date(data.start_date) >= new Date(data.end_date)) {
      errors.push('End date must be after start date')
    }

    if (data.max_teams && data.max_teams < 2) {
      errors.push('Maximum teams must be at least 2')
    }

    if (data.registration_deadline && data.start_date && new Date(data.registration_deadline) >= new Date(data.start_date)) {
      errors.push('Registration deadline must be before start date')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

export const tournamentService = new TournamentService()
