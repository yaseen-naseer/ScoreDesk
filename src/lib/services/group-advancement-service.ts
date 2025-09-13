import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'

type TournamentGroup = Database['public']['Tables']['tournament_groups']['Row']
type TournamentTeam = Database['public']['Tables']['tournament_teams']['Row']
type Match = Database['public']['Tables']['matches']['Row']

export interface GroupStandings {
  team_id: string
  team_name: string
  played: number
  wins: number
  draws: number
  losses: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
  form: string[]
}

export interface AdvancementRule {
  id: string
  tournament_id: string
  group_id: string
  rule_type: 'points' | 'goal_difference' | 'head_to_head' | 'goals_scored' | 'goals_conceded' | 'random'
  priority: number
  is_active: boolean
}

export interface TiebreakerRule {
  id: string
  tournament_id: string
  group_id: string
  rule_type: 'head_to_head' | 'goal_difference' | 'goals_scored' | 'goals_conceded' | 'random'
  priority: number
  is_active: boolean
}

export interface GroupAdvancementResult {
  group_id: string
  group_name: string
  advancing_teams: {
    team_id: string
    team_name: string
    position: number
    reason: string
  }[]
  eliminated_teams: {
    team_id: string
    team_name: string
    position: number
    reason: string
  }[]
  standings: GroupStandings[]
}

export class GroupAdvancementService {
  private supabase = createClientComponentClient<Database>()

  constructor() {}

  /**
   * Calculate group standings based on match results
   */
  async calculateGroupStandings(
    tournamentId: string,
    groupId: string
  ): Promise<GroupStandings[]> {
    // Get all teams in the group
    const { data: groupTeams, error: teamsError } = await this.supabase
      .from('tournament_teams')
      .select(`
        team_id,
        team:teams(name)
      `)
      .eq('tournament_id', tournamentId)
      .eq('group_name', groupId)

    if (teamsError || !groupTeams) {
      throw new Error('Failed to fetch group teams')
    }

    // Get all matches for teams in this group
    const teamIds = groupTeams.map(gt => gt.team_id)
    const { data: matches, error: matchesError } = await this.supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .in('home_team_id', teamIds)
      .in('away_team_id', teamIds)
      .eq('status', 'completed')

    if (matchesError) {
      throw new Error('Failed to fetch group matches')
    }

    // Calculate standings for each team
    const standings: GroupStandings[] = groupTeams.map(gt => {
      const teamMatches = matches?.filter(m => 
        m.home_team_id === gt.team_id || m.away_team_id === gt.team_id
      ) || []

      let played = 0
      let wins = 0
      let draws = 0
      let losses = 0
      let goalsFor = 0
      let goalsAgainst = 0
      const form: string[] = []

      teamMatches.forEach(match => {
        if (match.home_score !== null && match.away_score !== null) {
          played++
          
          const isHome = match.home_team_id === gt.team_id
          const teamScore = isHome ? match.home_score : match.away_score
          const opponentScore = isHome ? match.away_score : match.home_score
          
          goalsFor += teamScore
          goalsAgainst += opponentScore

          if (teamScore > opponentScore) {
            wins++
            form.push('W')
          } else if (teamScore === opponentScore) {
            draws++
            form.push('D')
          } else {
            losses++
            form.push('L')
          }
        }
      })

      const points = wins * 3 + draws
      const goalDifference = goalsFor - goalsAgainst

      return {
        team_id: gt.team_id,
        team_name: gt.team?.name || 'Unknown Team',
        played,
        wins,
        draws,
        losses,
        goals_for: goalsFor,
        goals_against: goalsAgainst,
        goal_difference: goalDifference,
        points,
        form: form.slice(-5) // Last 5 matches
      }
    })

    return standings
  }

  /**
   * Determine advancing teams based on group standings and rules
   */
  async determineAdvancingTeams(
    tournamentId: string,
    groupId: string,
    standings: GroupStandings[]
  ): Promise<GroupAdvancementResult> {
    // Get group info
    const { data: group, error: groupError } = await this.supabase
      .from('tournament_groups')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('id', groupId)
      .single()

    if (groupError || !group) {
      throw new Error('Failed to fetch group information')
    }

    // Get advancement rules
    const advancementRules = await this.getAdvancementRules(tournamentId, groupId)
    const tiebreakerRules = await this.getTiebreakerRules(tournamentId, groupId)

    // Sort standings based on rules
    const sortedStandings = this.sortStandingsByRules(standings, advancementRules, tiebreakerRules)

    // Determine advancing teams
    const advancingTeams = sortedStandings
      .slice(0, group.advance_teams)
      .map((team, index) => ({
        team_id: team.team_id,
        team_name: team.team_name,
        position: index + 1,
        reason: this.getAdvancementReason(team, index + 1, advancementRules)
      }))

    const eliminatedTeams = sortedStandings
      .slice(group.advance_teams)
      .map((team, index) => ({
        team_id: team.team_id,
        team_name: team.team_name,
        position: group.advance_teams + index + 1,
        reason: 'Eliminated from group stage'
      }))

    return {
      group_id: groupId,
      group_name: group.name,
      advancing_teams: advancingTeams,
      eliminated_teams: eliminatedTeams,
      standings: sortedStandings
    }
  }

  /**
   * Get advancement rules for a group
   */
  private async getAdvancementRules(tournamentId: string, groupId: string): Promise<AdvancementRule[]> {
    // For now, return default rules
    // In a real implementation, these would be stored in the database
    return [
      {
        id: 'points',
        tournament_id: tournamentId,
        group_id: groupId,
        rule_type: 'points',
        priority: 1,
        is_active: true
      },
      {
        id: 'goal_difference',
        tournament_id: tournamentId,
        group_id: groupId,
        rule_type: 'goal_difference',
        priority: 2,
        is_active: true
      },
      {
        id: 'goals_scored',
        tournament_id: tournamentId,
        group_id: groupId,
        rule_type: 'goals_scored',
        priority: 3,
        is_active: true
      }
    ]
  }

  /**
   * Get tiebreaker rules for a group
   */
  private async getTiebreakerRules(tournamentId: string, groupId: string): Promise<TiebreakerRule[]> {
    // For now, return default tiebreaker rules
    return [
      {
        id: 'head_to_head',
        tournament_id: tournamentId,
        group_id: groupId,
        rule_type: 'head_to_head',
        priority: 1,
        is_active: true
      },
      {
        id: 'goal_difference',
        tournament_id: tournamentId,
        group_id: groupId,
        rule_type: 'goal_difference',
        priority: 2,
        is_active: true
      },
      {
        id: 'goals_scored',
        tournament_id: tournamentId,
        group_id: groupId,
        rule_type: 'goals_scored',
        priority: 3,
        is_active: true
      },
      {
        id: 'random',
        tournament_id: tournamentId,
        group_id: groupId,
        rule_type: 'random',
        priority: 4,
        is_active: true
      }
    ]
  }

  /**
   * Sort standings based on advancement and tiebreaker rules
   */
  private sortStandingsByRules(
    standings: GroupStandings[],
    advancementRules: AdvancementRule[],
    tiebreakerRules: TiebreakerRule[]
  ): GroupStandings[] {
    return standings.sort((a, b) => {
      // Apply advancement rules in priority order
      for (const rule of advancementRules.sort((r1, r2) => r1.priority - r2.priority)) {
        if (!rule.is_active) continue

        const comparison = this.compareByRule(a, b, rule.rule_type)
        if (comparison !== 0) {
          return comparison
        }
      }

      // Apply tiebreaker rules if teams are still tied
      for (const rule of tiebreakerRules.sort((r1, r2) => r1.priority - r2.priority)) {
        if (!rule.is_active) continue

        const comparison = this.compareByRule(a, b, rule.rule_type)
        if (comparison !== 0) {
          return comparison
        }
      }

      return 0
    })
  }

  /**
   * Compare two teams based on a specific rule
   */
  private compareByRule(a: GroupStandings, b: GroupStandings, ruleType: string): number {
    switch (ruleType) {
      case 'points':
        return b.points - a.points
      case 'goal_difference':
        return b.goal_difference - a.goal_difference
      case 'goals_scored':
        return b.goals_for - a.goals_for
      case 'goals_conceded':
        return a.goals_against - b.goals_against
      case 'head_to_head':
        // This would require additional match data analysis
        // For now, return 0 to continue to next rule
        return 0
      case 'random':
        return Math.random() - 0.5
      default:
        return 0
    }
  }

  /**
   * Get advancement reason for a team
   */
  private getAdvancementReason(
    team: GroupStandings,
    position: number,
    rules: AdvancementRule[]
  ): string {
    const activeRules = rules.filter(r => r.is_active).sort((r1, r2) => r1.priority - r2.priority)
    
    if (activeRules.length > 0) {
      const primaryRule = activeRules[0]
      switch (primaryRule.rule_type) {
        case 'points':
          return `Advanced on points (${team.points} pts)`
        case 'goal_difference':
          return `Advanced on goal difference (${team.goal_difference})`
        case 'goals_scored':
          return `Advanced on goals scored (${team.goals_for})`
        default:
          return `Advanced in position ${position}`
      }
    }
    
    return `Advanced in position ${position}`
  }

  /**
   * Create advancement rules for a group
   */
  async createAdvancementRules(
    tournamentId: string,
    groupId: string,
    rules: Omit<AdvancementRule, 'id' | 'tournament_id' | 'group_id'>[]
  ): Promise<void> {
    const ruleData = rules.map(rule => ({
      tournament_id: tournamentId,
      group_id: groupId,
      ...rule
    }))

    const { error } = await this.supabase
      .from('tournament_advancement_rules')
      .insert(ruleData)

    if (error) {
      throw new Error(`Failed to create advancement rules: ${error.message}`)
    }
  }

  /**
   * Create tiebreaker rules for a group
   */
  async createTiebreakerRules(
    tournamentId: string,
    groupId: string,
    rules: Omit<TiebreakerRule, 'id' | 'tournament_id' | 'group_id'>[]
  ): Promise<void> {
    const ruleData = rules.map(rule => ({
      tournament_id: tournamentId,
      group_id: groupId,
      ...rule
    }))

    const { error } = await this.supabase
      .from('tournament_tiebreaker_rules')
      .insert(ruleData)

    if (error) {
      throw new Error(`Failed to create tiebreaker rules: ${error.message}`)
    }
  }
}

export const groupAdvancementService = new GroupAdvancementService()
