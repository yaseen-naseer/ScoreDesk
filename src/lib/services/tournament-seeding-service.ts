import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'

type Team = Database['public']['Tables']['teams']['Row']
type Tournament = Database['public']['Tables']['tournaments']['Row']
type Match = Database['public']['Tables']['matches']['Row']

export interface SeededTeam {
  team_id: string
  team_name: string
  seed: number
  group_id?: string
  group_name?: string
  previous_seed?: number
  seeding_method: 'manual' | 'random' | 'ranked' | 'balanced'
  seeding_data?: Record<string, any>
}

export interface SeedingResult {
  success: boolean
  seeded_teams: SeededTeam[]
  seeding_method: string
  seeding_criteria: string[]
  conflicts_resolved: number
  warnings: SeedingWarning[]
  bracket_positions: BracketPosition[]
}

export interface SeedingWarning {
  type: 'conflict' | 'imbalance' | 'missing_data' | 'manual_adjustment'
  message: string
  affected_teams: string[]
  suggestion: string
}

export interface BracketPosition {
  position: number
  round: number
  team_id?: string
  team_name?: string
  seed?: number
  is_bye: boolean
  bye_team_id?: string
}

export interface SeedingCriteria {
  method: 'manual' | 'random' | 'ranked' | 'balanced'
  ranking_criteria?: string[]
  group_balance?: boolean
  avoid_same_group?: boolean
  geographic_separation?: boolean
  previous_tournament_results?: boolean
  custom_weights?: Record<string, number>
}

export interface GroupSeeding {
  group_id: string
  group_name: string
  teams: SeededTeam[]
  max_teams_per_group: number
  seeding_method: string
}

export class TournamentSeedingService {
  private supabase = createClientComponentClient<Database>()

  constructor() {}

  /**
   * Seed teams for a tournament bracket
   */
  async seedTournament(
    tournamentId: string,
    teamIds: string[],
    criteria: SeedingCriteria
  ): Promise<SeedingResult> {
    try {
      // Get tournament details
      const tournament = await this.getTournament(tournamentId)
      if (!tournament) {
        throw new Error('Tournament not found')
      }

      // Get team details
      const teams = await this.getTeams(teamIds)
      if (teams.length !== teamIds.length) {
        throw new Error('Some teams not found')
      }

      // Validate seeding criteria
      this.validateSeedingCriteria(criteria, teams.length)

      // Perform seeding based on method
      let seededTeams: SeededTeam[]
      let warnings: SeedingWarning[] = []

      switch (criteria.method) {
        case 'manual':
          seededTeams = await this.performManualSeeding(teams, criteria)
          break
        case 'random':
          seededTeams = await this.performRandomSeeding(teams, criteria)
          break
        case 'ranked':
          seededTeams = await this.performRankedSeeding(teams, criteria)
          break
        case 'balanced':
          seededTeams = await this.performBalancedSeeding(teams, criteria)
          break
        default:
          throw new Error('Invalid seeding method')
      }

      // Generate bracket positions
      const bracketPositions = this.generateBracketPositions(seededTeams, tournament.format)

      // Save seeding results
      await this.saveSeedingResults(tournamentId, seededTeams)

      return {
        success: true,
        seeded_teams: seededTeams,
        seeding_method: criteria.method,
        seeding_criteria: criteria.ranking_criteria || [],
        conflicts_resolved: 0,
        warnings,
        bracket_positions: bracketPositions
      }

    } catch (error) {
      console.error('Error seeding tournament:', error)
      return {
        success: false,
        seeded_teams: [],
        seeding_method: criteria.method,
        seeding_criteria: criteria.ranking_criteria || [],
        conflicts_resolved: 0,
        warnings: [{
          type: 'missing_data',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          affected_teams: teamIds,
          suggestion: 'Please check tournament and team data'
        }],
        bracket_positions: []
      }
    }
  }

  /**
   * Perform manual seeding
   */
  private async performManualSeeding(teams: Team[], criteria: SeedingCriteria): Promise<SeededTeam[]> {
    // For manual seeding, we expect the teams to already be in the desired order
    // or have seeding data provided
    return teams.map((team, index) => ({
      team_id: team.id,
      team_name: team.name,
      seed: index + 1,
      seeding_method: 'manual',
      seeding_data: {
        manual_position: index + 1,
        seeded_at: new Date().toISOString()
      }
    }))
  }

  /**
   * Perform random seeding
   */
  private async performRandomSeeding(teams: Team[], criteria: SeedingCriteria): Promise<SeededTeam[]> {
    // Shuffle teams randomly
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5)
    
    return shuffledTeams.map((team, index) => ({
      team_id: team.id,
      team_name: team.name,
      seed: index + 1,
      seeding_method: 'random',
      seeding_data: {
        random_seed: Math.random(),
        seeded_at: new Date().toISOString()
      }
    }))
  }

  /**
   * Perform ranked seeding based on criteria
   */
  private async performRankedSeeding(teams: Team[], criteria: SeedingCriteria): Promise<SeededTeam[]> {
    const rankingCriteria = criteria.ranking_criteria || ['performance', 'points', 'goals_scored']
    
    // Get team statistics for ranking
    const teamStats = await this.getTeamStatistics(teams.map(t => t.id))
    
    // Sort teams based on ranking criteria
    const sortedTeams = teams.sort((a, b) => {
      const statsA = teamStats[a.id] || {}
      const statsB = teamStats[b.id] || {}
      
      for (const criterion of rankingCriteria) {
        const valueA = this.getCriterionValue(statsA, criterion)
        const valueB = this.getCriterionValue(statsB, criterion)
        
        if (valueA !== valueB) {
          return valueB - valueA // Higher values first
        }
      }
      
      return 0 // Equal ranking
    })
    
    return sortedTeams.map((team, index) => ({
      team_id: team.id,
      team_name: team.name,
      seed: index + 1,
      seeding_method: 'ranked',
      seeding_data: {
        ranking_criteria: rankingCriteria,
        team_stats: teamStats[team.id],
        seeded_at: new Date().toISOString()
      }
    }))
  }

  /**
   * Perform balanced seeding to ensure competitive balance
   */
  private async performBalancedSeeding(teams: Team[], criteria: SeedingCriteria): Promise<SeededTeam[]> {
    const teamStats = await this.getTeamStatistics(teams.map(t => t.id))
    
    // Calculate team strength scores
    const teamStrengths = teams.map(team => ({
      team,
      strength: this.calculateTeamStrength(teamStats[team.id] || {})
    }))
    
    // Sort by strength (strongest first)
    teamStrengths.sort((a, b) => b.strength - a.strength)
    
    // Create balanced seeding using snake draft pattern
    const seededTeams: SeededTeam[] = []
    const numTeams = teamStrengths.length
    const numRounds = Math.ceil(numTeams / 2)
    
    for (let round = 0; round < numRounds; round++) {
      const positions = this.getSnakeDraftPositions(round, numRounds, numTeams)
      
      positions.forEach((position, index) => {
        const teamIndex = round * 2 + index
        if (teamIndex < teamStrengths.length) {
          const teamStrength = teamStrengths[teamIndex]
          seededTeams[position - 1] = {
            team_id: teamStrength.team.id,
            team_name: teamStrength.team.name,
            seed: position,
            seeding_method: 'balanced',
            seeding_data: {
              team_strength: teamStrength.strength,
              snake_draft_round: round,
              seeded_at: new Date().toISOString()
            }
          }
        }
      })
    }
    
    return seededTeams.filter(Boolean)
  }

  /**
   * Generate bracket positions for seeded teams
   */
  private generateBracketPositions(seededTeams: SeededTeam[], tournamentFormat: string): BracketPosition[] {
    const positions: BracketPosition[] = []
    const numTeams = seededTeams.length
    const numRounds = Math.ceil(Math.log2(numTeams))
    
    // For knockout tournaments, create bracket positions
    if (tournamentFormat === 'knockout') {
      const totalPositions = Math.pow(2, numRounds)
      
      for (let i = 1; i <= totalPositions; i++) {
        const team = seededTeams.find(t => this.getBracketPosition(t.seed, totalPositions) === i)
        
        positions.push({
          position: i,
          round: 1,
          team_id: team?.team_id,
          team_name: team?.team_name,
          seed: team?.seed,
          is_bye: !team,
          bye_team_id: !team ? undefined : undefined
        })
      }
    }
    
    return positions
  }

  /**
   * Get bracket position for a seed
   */
  private getBracketPosition(seed: number, totalPositions: number): number {
    // Standard bracket seeding algorithm
    if (totalPositions <= 2) return seed
    
    const half = totalPositions / 2
    if (seed <= half) {
      return seed
    } else {
      return totalPositions - seed + 1
    }
  }

  /**
   * Get snake draft positions for a round
   */
  private getSnakeDraftPositions(round: number, numRounds: number, numTeams: number): number[] {
    const positions: number[] = []
    
    if (round % 2 === 0) {
      // Even rounds: ascending order
      positions.push(round * 2 + 1, round * 2 + 2)
    } else {
      // Odd rounds: descending order
      positions.push(round * 2 + 2, round * 2 + 1)
    }
    
    return positions.filter(p => p <= numTeams)
  }

  /**
   * Calculate team strength score
   */
  private calculateTeamStrength(stats: Record<string, any>): number {
    const weights = {
      win_rate: 0.3,
      goals_scored: 0.2,
      goals_conceded: 0.15,
      points: 0.2,
      recent_form: 0.15
    }
    
    let strength = 0
    
    Object.entries(weights).forEach(([key, weight]) => {
      const value = stats[key] || 0
      strength += value * weight
    })
    
    return strength
  }

  /**
   * Get criterion value from team stats
   */
  private getCriterionValue(stats: Record<string, any>, criterion: string): number {
    switch (criterion) {
      case 'performance':
        return (stats.wins || 0) / Math.max(stats.matches_played || 1, 1)
      case 'points':
        return stats.points || 0
      case 'goals_scored':
        return stats.goals_scored || 0
      case 'goal_difference':
        return (stats.goals_scored || 0) - (stats.goals_conceded || 0)
      case 'recent_form':
        return stats.recent_form || 0
      default:
        return stats[criterion] || 0
    }
  }

  /**
   * Get team statistics for ranking
   */
  private async getTeamStatistics(teamIds: string[]): Promise<Record<string, Record<string, any>>> {
    try {
      const stats: Record<string, Record<string, any>> = {}
      
      for (const teamId of teamIds) {
        // Get match statistics for each team
        const { data: matches } = await this.supabase
          .from('matches')
          .select('*')
          .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
          .eq('status', 'completed')
        
        const teamStats = this.calculateTeamStats(matches || [], teamId)
        stats[teamId] = teamStats
      }
      
      return stats
    } catch (error) {
      console.error('Error getting team statistics:', error)
      return {}
    }
  }

  /**
   * Calculate team statistics from matches
   */
  private calculateTeamStats(matches: any[], teamId: string): Record<string, any> {
    let wins = 0
    let draws = 0
    let losses = 0
    let goalsScored = 0
    let goalsConceded = 0
    let points = 0
    
    matches.forEach(match => {
      const isHome = match.home_team_id === teamId
      const teamScore = isHome ? match.home_score : match.away_score
      const opponentScore = isHome ? match.away_score : match.home_score
      
      goalsScored += teamScore || 0
      goalsConceded += opponentScore || 0
      
      if (teamScore > opponentScore) {
        wins++
        points += 3
      } else if (teamScore === opponentScore) {
        draws++
        points += 1
      } else {
        losses++
      }
    })
    
    const matchesPlayed = matches.length
    const winRate = matchesPlayed > 0 ? wins / matchesPlayed : 0
    const goalDifference = goalsScored - goalsConceded
    
    // Calculate recent form (last 5 matches)
    const recentMatches = matches.slice(-5)
    let recentForm = 0
    recentMatches.forEach(match => {
      const isHome = match.home_team_id === teamId
      const teamScore = isHome ? match.home_score : match.away_score
      const opponentScore = isHome ? match.away_score : match.home_score
      
      if (teamScore > opponentScore) {
        recentForm += 1
      } else if (teamScore === opponentScore) {
        recentForm += 0.5
      }
    })
    
    return {
      wins,
      draws,
      losses,
      matches_played: matchesPlayed,
      win_rate: winRate,
      goals_scored: goalsScored,
      goals_conceded: goalsConceded,
      goal_difference: goalDifference,
      points,
      recent_form: recentForm,
      recent_matches: recentMatches.length
    }
  }

  /**
   * Validate seeding criteria
   */
  private validateSeedingCriteria(criteria: SeedingCriteria, numTeams: number): void {
    if (numTeams < 2) {
      throw new Error('At least 2 teams required for seeding')
    }
    
    if (criteria.method === 'ranked' && (!criteria.ranking_criteria || criteria.ranking_criteria.length === 0)) {
      throw new Error('Ranking criteria required for ranked seeding')
    }
    
    // Check if number of teams is suitable for bracket
    const logTeams = Math.log2(numTeams)
    if (!Number.isInteger(logTeams) && criteria.method !== 'manual') {
      console.warn(`Number of teams (${numTeams}) is not a power of 2, some teams may receive byes`)
    }
  }

  /**
   * Save seeding results to database
   */
  private async saveSeedingResults(tournamentId: string, seededTeams: SeededTeam[]): Promise<void> {
    try {
      // Clear existing seeding
      await this.supabase
        .from('tournament_seeding')
        .delete()
        .eq('tournament_id', tournamentId)
      
      // Insert new seeding
      const seedingData = seededTeams.map(team => ({
        tournament_id: tournamentId,
        team_id: team.team_id,
        seed: team.seed,
        seeding_method: team.seeding_method,
        seeding_data: team.seeding_data
      }))
      
      const { error } = await this.supabase
        .from('tournament_seeding')
        .insert(seedingData)
      
      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Error saving seeding results:', error)
      throw error
    }
  }

  /**
   * Get tournament details
   */
  private async getTournament(tournamentId: string): Promise<Tournament | null> {
    try {
      const { data } = await this.supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single()
      
      return data
    } catch (error) {
      console.error('Error getting tournament:', error)
      return null
    }
  }

  /**
   * Get team details
   */
  private async getTeams(teamIds: string[]): Promise<Team[]> {
    try {
      const { data } = await this.supabase
        .from('teams')
        .select('*')
        .in('id', teamIds)
      
      return data || []
    } catch (error) {
      console.error('Error getting teams:', error)
      return []
    }
  }

  /**
   * Get existing seeding for a tournament
   */
  async getTournamentSeeding(tournamentId: string): Promise<SeededTeam[]> {
    try {
      const { data } = await this.supabase
        .from('tournament_seeding')
        .select(`
          *,
          teams (id, name, logo_url)
        `)
        .eq('tournament_id', tournamentId)
        .order('seed')
      
      if (!data) return []
      
      return data.map((item: any) => ({
        team_id: item.team_id,
        team_name: item.teams.name,
        seed: item.seed,
        seeding_method: item.seeding_method,
        seeding_data: item.seeding_data
      }))
    } catch (error) {
      console.error('Error getting tournament seeding:', error)
      return []
    }
  }

  /**
   * Update team seed manually
   */
  async updateTeamSeed(
    tournamentId: string,
    teamId: string,
    newSeed: number
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('tournament_seeding')
        .update({ 
          seed: newSeed,
          seeding_method: 'manual',
          updated_at: new Date().toISOString()
        })
        .eq('tournament_id', tournamentId)
        .eq('team_id', teamId)
      
      return !error
    } catch (error) {
      console.error('Error updating team seed:', error)
      return false
    }
  }

  /**
   * Clear tournament seeding
   */
  async clearTournamentSeeding(tournamentId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('tournament_seeding')
        .delete()
        .eq('tournament_id', tournamentId)
      
      return !error
    } catch (error) {
      console.error('Error clearing tournament seeding:', error)
      return false
    }
  }
}
