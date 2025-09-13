import { Database } from '@/lib/supabase/types'

export type BracketType = 'single_elimination' | 'double_elimination' | 'round_robin' | 'group_stage'
export type BracketStatus = 'pending' | 'active' | 'completed' | 'cancelled'
export type MatchStatus = 'pending' | 'scheduled' | 'live' | 'completed' | 'postponed' | 'cancelled'

export interface BracketNode {
  id: string
  match_id?: string
  round: number
  position: number
  parent_id?: string
  left_child_id?: string
  right_child_id?: string
  home_team_id?: string
  away_team_id?: string
  home_team?: TeamInfo
  away_team?: TeamInfo
  winner_id?: string
  loser_id?: string
  score?: {
    home: number
    away: number
  }
  status: MatchStatus
  scheduled_date?: string
  venue_id?: string
  venue?: VenueInfo
  is_bye: boolean
  seed_position?: number
}

export interface TeamInfo {
  id: string
  name: string
  logo_url?: string
  seed?: number
  group_id?: string
  group_name?: string
}

export interface VenueInfo {
  id: string
  name: string
  capacity?: number
  location?: string
}

export interface BracketStructure {
  id: string
  tournament_id: string
  bracket_type: BracketType
  status: BracketStatus
  total_teams: number
  total_rounds: number
  current_round: number
  created_at: string
  updated_at: string
  nodes: BracketNode[]
  seeding_method: 'manual' | 'random' | 'ranked' | 'balanced'
  third_place_match: boolean
  consolation_bracket: boolean
}

export interface BracketMatch {
  id: string
  bracket_id: string
  node_id: string
  round: number
  position: number
  home_team_id: string
  away_team_id: string
  home_team: TeamInfo
  away_team: TeamInfo
  winner_id?: string
  score?: {
    home: number
    away: number
    penalty_home?: number
    penalty_away?: number
  }
  status: MatchStatus
  scheduled_date?: string
  venue_id?: string
  venue?: VenueInfo
  referee_id?: string
  assistant_referee_1_id?: string
  assistant_referee_2_id?: string
  fourth_official_id?: string
  match_duration_minutes?: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface BracketSeeding {
  team_id: string
  seed_number: number
  team: TeamInfo
}

export interface BracketStats {
  total_matches: number
  completed_matches: number
  pending_matches: number
  live_matches: number
  total_goals: number
  average_goals_per_match: number
  most_goals_in_match: number
  teams_participating: number
  teams_eliminated: number
  current_round_progress: number
  estimated_completion: string
}

export interface BracketVisualization {
  bracket_id: string
  nodes: BracketNode[]
  connections: BracketConnection[]
  round_positions: RoundPosition[]
  viewport: {
    width: number
    height: number
    zoom: number
    pan_x: number
    pan_y: number
  }
}

export interface BracketConnection {
  from_node_id: string
  to_node_id: string
  connection_type: 'winner' | 'loser' | 'consolation'
}

export interface RoundPosition {
  round: number
  x_position: number
  width: number
  match_spacing: number
}

export class TournamentBracketService {
  constructor(private supabase: any) {}

  /**
   * Create a new tournament bracket
   */
  async createBracket(
    tournamentId: string,
    bracketType: BracketType,
    teams: TeamInfo[],
    options: {
      seedingMethod?: 'manual' | 'random' | 'ranked' | 'balanced'
      thirdPlaceMatch?: boolean
      consolationBracket?: boolean
    } = {}
  ): Promise<{ success: boolean; bracket?: BracketStructure; error?: string }> {
    try {
      const totalTeams = teams.length
      const totalRounds = this.calculateTotalRounds(totalTeams, bracketType)
      
      // Create bracket structure
      const { data: bracket, error: bracketError } = await this.supabase
        .from('tournament_brackets')
        .insert({
          tournament_id: tournamentId,
          bracket_type: bracketType,
          status: 'pending',
          total_teams: totalTeams,
          total_rounds: totalRounds,
          current_round: 0,
          seeding_method: options.seedingMethod || 'balanced',
          third_place_match: options.thirdPlaceMatch || false,
          consolation_bracket: options.consolationBracket || false
        })
        .select()
        .single()

      if (bracketError) {
        console.error('Error creating bracket:', bracketError)
        return { success: false, error: 'Failed to create bracket' }
      }

      // Generate bracket nodes
      const nodes = this.generateBracketNodes(bracket.id, totalTeams, totalRounds, bracketType)
      
      // Seed teams
      const seededTeams = this.seedTeams(teams, options.seedingMethod || 'balanced')
      
      // Apply seeding to first round
      await this.applySeeding(bracket.id, seededTeams)

      // Create bracket matches for first round
      await this.createBracketMatches(bracket.id, nodes.filter(n => n.round === 1))

      return { success: true, bracket: { ...bracket, nodes } }
    } catch (error) {
      console.error('Error creating bracket:', error)
      return { success: false, error: 'Failed to create bracket' }
    }
  }

  /**
   * Get bracket structure with all nodes and matches
   */
  async getBracketStructure(bracketId: string): Promise<BracketStructure | null> {
    try {
      const { data: bracket } = await this.supabase
        .from('tournament_brackets')
        .select('*')
        .eq('id', bracketId)
        .single()

      if (!bracket) {
        return null
      }

      // Get all nodes
      const { data: nodes } = await this.supabase
        .from('bracket_nodes')
        .select(`
          *,
          home_team:teams!bracket_nodes_home_team_id_fkey(id, name, logo_url),
          away_team:teams!bracket_nodes_away_team_id_fkey(id, name, logo_url),
          venue:venues(id, name, capacity, location)
        `)
        .eq('bracket_id', bracketId)
        .order('round', { ascending: true })
        .order('position', { ascending: true })

      return {
        ...bracket,
        nodes: nodes || []
      }
    } catch (error) {
      console.error('Error getting bracket structure:', error)
      return null
    }
  }

  /**
   * Get bracket matches for a specific round
   */
  async getBracketMatches(
    bracketId: string,
    round?: number
  ): Promise<BracketMatch[]> {
    try {
      let query = this.supabase
        .from('bracket_matches')
        .select(`
          *,
          home_team:teams!bracket_matches_home_team_id_fkey(id, name, logo_url),
          away_team:teams!bracket_matches_away_team_id_fkey(id, name, logo_url),
          venue:venues(id, name, capacity, location),
          referee:referees(id, name),
          assistant_referee_1:referees!bracket_matches_assistant_referee_1_id_fkey(id, name),
          assistant_referee_2:referees!bracket_matches_assistant_referee_2_id_fkey(id, name),
          fourth_official:referees!bracket_matches_fourth_official_id_fkey(id, name)
        `)
        .eq('bracket_id', bracketId)

      if (round !== undefined) {
        query = query.eq('round', round)
      }

      const { data: matches } = await query.order('position', { ascending: true })

      return matches || []
    } catch (error) {
      console.error('Error getting bracket matches:', error)
      return []
    }
  }

  /**
   * Update match result and advance bracket
   */
  async updateMatchResult(
    matchId: string,
    result: {
      home_score: number
      away_score: number
      penalty_home?: number
      penalty_away?: number
      winner_id: string
      notes?: string
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get match details
      const { data: match } = await this.supabase
        .from('bracket_matches')
        .select('*')
        .eq('id', matchId)
        .single()

      if (!match) {
        return { success: false, error: 'Match not found' }
      }

      // Update match result
      const { error: updateError } = await this.supabase
        .from('bracket_matches')
        .update({
          score: {
            home: result.home_score,
            away: result.away_score,
            penalty_home: result.penalty_home,
            penalty_away: result.penalty_away
          },
          winner_id: result.winner_id,
          status: 'completed',
          notes: result.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', matchId)

      if (updateError) {
        console.error('Error updating match result:', updateError)
        return { success: false, error: 'Failed to update match result' }
      }

      // Update bracket node
      await this.supabase
        .from('bracket_nodes')
        .update({
          winner_id: result.winner_id,
          loser_id: result.winner_id === match.home_team_id ? match.away_team_id : match.home_team_id,
          score: {
            home: result.home_score,
            away: result.away_score
          },
          status: 'completed'
        })
        .eq('match_id', matchId)

      // Advance winner to next round
      await this.advanceWinner(match.bracket_id, match.node_id, result.winner_id)

      // Update bracket status if all matches in round are complete
      await this.checkAndUpdateBracketStatus(match.bracket_id, match.round)

      return { success: true }
    } catch (error) {
      console.error('Error updating match result:', error)
      return { success: false, error: 'Failed to update match result' }
    }
  }

  /**
   * Get bracket statistics
   */
  async getBracketStats(bracketId: string): Promise<BracketStats | null> {
    try {
      const { data: matches } = await this.supabase
        .from('bracket_matches')
        .select('*')
        .eq('bracket_id', bracketId)

      if (!matches) {
        return null
      }

      const completedMatches = matches.filter(m => m.status === 'completed')
      const totalGoals = completedMatches.reduce((sum, match) => {
        return sum + (match.score?.home || 0) + (match.score?.away || 0)
      }, 0)

      const mostGoalsInMatch = completedMatches.reduce((max, match) => {
        const matchGoals = (match.score?.home || 0) + (match.score?.away || 0)
        return Math.max(max, matchGoals)
      }, 0)

      const { data: bracket } = await this.supabase
        .from('tournament_brackets')
        .select('total_teams, current_round, total_rounds')
        .eq('id', bracketId)
        .single()

      const currentRoundMatches = matches.filter(m => m.round === bracket?.current_round)
      const currentRoundCompleted = currentRoundMatches.filter(m => m.status === 'completed').length

      return {
        total_matches: matches.length,
        completed_matches: completedMatches.length,
        pending_matches: matches.filter(m => m.status === 'pending').length,
        live_matches: matches.filter(m => m.status === 'live').length,
        total_goals: totalGoals,
        average_goals_per_match: completedMatches.length > 0 ? totalGoals / completedMatches.length : 0,
        most_goals_in_match: mostGoalsInMatch,
        teams_participating: bracket?.total_teams || 0,
        teams_eliminated: this.calculateEliminatedTeams(bracket?.total_teams || 0, completedMatches.length),
        current_round_progress: currentRoundMatches.length > 0 ? (currentRoundCompleted / currentRoundMatches.length) * 100 : 0,
        estimated_completion: this.estimateCompletion(bracket?.current_round || 0, bracket?.total_rounds || 0)
      }
    } catch (error) {
      console.error('Error getting bracket stats:', error)
      return null
    }
  }

  /**
   * Generate bracket visualization data
   */
  async generateBracketVisualization(bracketId: string): Promise<BracketVisualization | null> {
    try {
      const bracket = await this.getBracketStructure(bracketId)
      if (!bracket) {
        return null
      }

      const connections = this.generateConnections(bracket.nodes)
      const roundPositions = this.calculateRoundPositions(bracket.total_rounds)

      return {
        bracket_id: bracketId,
        nodes: bracket.nodes,
        connections,
        round_positions: roundPositions,
        viewport: {
          width: 1200,
          height: 800,
          zoom: 1,
          pan_x: 0,
          pan_y: 0
        }
      }
    } catch (error) {
      console.error('Error generating bracket visualization:', error)
      return null
    }
  }

  /**
   * Reseed bracket (for manual seeding changes)
   */
  async reseedBracket(
    bracketId: string,
    newSeeding: BracketSeeding[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate seeding
      const validation = this.validateSeeding(newSeeding)
      if (!validation.isValid) {
        return { success: false, error: validation.error }
      }

      // Update first round nodes with new seeding
      const { data: firstRoundNodes } = await this.supabase
        .from('bracket_nodes')
        .select('*')
        .eq('bracket_id', bracketId)
        .eq('round', 1)
        .order('position', { ascending: true })

      if (!firstRoundNodes) {
        return { success: false, error: 'No first round nodes found' }
      }

      // Apply new seeding
      for (let i = 0; i < Math.min(firstRoundNodes.length, newSeeding.length); i++) {
        const node = firstRoundNodes[i]
        const seed = newSeeding[i]

        await this.supabase
          .from('bracket_nodes')
          .update({
            home_team_id: seed.team_id,
            seed_position: seed.seed_number
          })
          .eq('id', node.id)
      }

      return { success: true }
    } catch (error) {
      console.error('Error reseeding bracket:', error)
      return { success: false, error: 'Failed to reseed bracket' }
    }
  }

  /**
   * Private helper methods
   */
  private calculateTotalRounds(teamCount: number, bracketType: BracketType): number {
    switch (bracketType) {
      case 'single_elimination':
        return Math.ceil(Math.log2(teamCount))
      case 'double_elimination':
        return Math.ceil(Math.log2(teamCount)) * 2 - 1
      case 'round_robin':
        return teamCount - 1
      case 'group_stage':
        return Math.ceil(teamCount / 4) * 2 // Assuming 4 teams per group
      default:
        return Math.ceil(Math.log2(teamCount))
    }
  }

  private generateBracketNodes(
    bracketId: string,
    teamCount: number,
    totalRounds: number,
    bracketType: BracketType
  ): BracketNode[] {
    const nodes: BracketNode[] = []
    let nodeId = 1

    // Generate nodes for each round
    for (let round = 1; round <= totalRounds; round++) {
      const matchesInRound = this.getMatchesInRound(teamCount, round, bracketType)
      
      for (let position = 1; position <= matchesInRound; position++) {
        const node: BracketNode = {
          id: `node_${nodeId++}`,
          round,
          position,
          status: 'pending',
          is_bye: false
        }

        // Set up parent-child relationships
        if (round > 1) {
          const parentPosition = Math.ceil(position / 2)
          const parentRound = round - 1
          const parentNode = nodes.find(n => n.round === parentRound && n.position === parentPosition)
          
          if (parentNode) {
            node.parent_id = parentNode.id
            if (position % 2 === 1) {
              parentNode.left_child_id = node.id
            } else {
              parentNode.right_child_id = node.id
            }
          }
        }

        nodes.push(node)
      }
    }

    return nodes
  }

  private getMatchesInRound(teamCount: number, round: number, bracketType: BracketType): number {
    switch (bracketType) {
      case 'single_elimination':
        return Math.ceil(teamCount / Math.pow(2, round))
      case 'double_elimination':
        if (round === 1) return Math.ceil(teamCount / 2)
        return Math.ceil(teamCount / Math.pow(2, round))
      default:
        return Math.ceil(teamCount / Math.pow(2, round))
    }
  }

  private seedTeams(teams: TeamInfo[], method: string): BracketSeeding[] {
    switch (method) {
      case 'random':
        return teams
          .sort(() => Math.random() - 0.5)
          .map((team, index) => ({ team, seed_number: index + 1 }))
      
      case 'ranked':
        return teams
          .sort((a, b) => (a.seed || 0) - (b.seed || 0))
          .map((team, index) => ({ team, seed_number: index + 1 }))
      
      case 'balanced':
        return this.balancedSeeding(teams)
      
      default:
        return teams.map((team, index) => ({ team, seed_number: index + 1 }))
    }
  }

  private balancedSeeding(teams: TeamInfo[]): BracketSeeding[] {
    // Sort teams by seed/ranking
    const sortedTeams = [...teams].sort((a, b) => (a.seed || 0) - (b.seed || 0))
    
    // Apply balanced seeding (top vs bottom, etc.)
    const seeded: BracketSeeding[] = []
    const teamCount = sortedTeams.length
    
    for (let i = 0; i < Math.floor(teamCount / 2); i++) {
      seeded.push({ team: sortedTeams[i], seed_number: i + 1 })
      seeded.push({ team: sortedTeams[teamCount - 1 - i], seed_number: i + 2 })
    }
    
    // Handle odd number of teams
    if (teamCount % 2 === 1) {
      seeded.push({ team: sortedTeams[Math.floor(teamCount / 2)], seed_number: teamCount })
    }
    
    return seeded
  }

  private async applySeeding(bracketId: string, seededTeams: BracketSeeding[]): Promise<void> {
    // This would apply seeding to the first round nodes
    // Implementation depends on database structure
  }

  private async createBracketMatches(bracketId: string, nodes: BracketNode[]): Promise<void> {
    // This would create match records for the bracket nodes
    // Implementation depends on database structure
  }

  private async advanceWinner(bracketId: string, nodeId: string, winnerId: string): Promise<void> {
    // Find the next round node for this winner
    // Update the appropriate team slot in the next round
  }

  private async checkAndUpdateBracketStatus(bracketId: string, round: number): Promise<void> {
    // Check if all matches in the round are complete
    // Update bracket current_round if so
  }

  private generateConnections(nodes: BracketNode[]): BracketConnection[] {
    const connections: BracketConnection[] = []
    
    nodes.forEach(node => {
      if (node.left_child_id) {
        connections.push({
          from_node_id: node.id,
          to_node_id: node.left_child_id,
          connection_type: 'winner'
        })
      }
      if (node.right_child_id) {
        connections.push({
          from_node_id: node.id,
          to_node_id: node.right_child_id,
          connection_type: 'winner'
        })
      }
    })
    
    return connections
  }

  private calculateRoundPositions(totalRounds: number): RoundPosition[] {
    const positions: RoundPosition[] = []
    const totalWidth = 1200
    const roundWidth = totalWidth / totalRounds
    
    for (let round = 1; round <= totalRounds; round++) {
      positions.push({
        round,
        x_position: (round - 1) * roundWidth,
        width: roundWidth,
        match_spacing: 60
      })
    }
    
    return positions
  }

  private calculateEliminatedTeams(totalTeams: number, completedMatches: number): number {
    // In single elimination, each completed match eliminates one team
    return Math.min(completedMatches, totalTeams - 1)
  }

  private estimateCompletion(currentRound: number, totalRounds: number): string {
    if (currentRound === 0) return 'Not started'
    if (currentRound >= totalRounds) return 'Completed'
    
    const progress = (currentRound / totalRounds) * 100
    return `${Math.round(progress)}% complete`
  }

  private validateSeeding(seeding: BracketSeeding[]): { isValid: boolean; error?: string } {
    if (seeding.length === 0) {
      return { isValid: false, error: 'No seeding provided' }
    }

    // Check for duplicate seed numbers
    const seedNumbers = seeding.map(s => s.seed_number)
    const uniqueSeeds = new Set(seedNumbers)
    if (seedNumbers.length !== uniqueSeeds.size) {
      return { isValid: false, error: 'Duplicate seed numbers found' }
    }

    // Check for duplicate teams
    const teamIds = seeding.map(s => s.team.id)
    const uniqueTeams = new Set(teamIds)
    if (teamIds.length !== uniqueTeams.size) {
      return { isValid: false, error: 'Duplicate teams found' }
    }

    return { isValid: true }
  }
}

// Export singleton instance
export const tournamentBracketService = new TournamentBracketService(null as any)
