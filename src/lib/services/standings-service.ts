import { Database } from '@/lib/supabase/types'

export type TournamentType = 'league' | 'group' | 'knockout' | 'round_robin'

export interface TeamStandingsRow {
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
  position?: number
  group_id?: string
  group_name?: string
}

export interface StandingsConfig {
  points_win?: number
  points_draw?: number
  points_loss?: number
  use_goal_difference?: boolean
  use_head_to_head?: boolean
}

export class StandingsService {
  constructor(private supabase: any) {}

  async getStandings(
    tournamentId: string,
    options: { groupId?: string } = {}
  ): Promise<TeamStandingsRow[]> {
    // Load teams in the tournament (optionally by group)
    const teams = await this.getTournamentTeams(tournamentId, options.groupId)
    if (teams.length === 0) return []

    // Load completed matches in the tournament
    const matches = await this.getTournamentMatches(tournamentId, options.groupId)

    // Load scoring rules from tournament settings
    const rules = await this.getTournamentPointsRules(tournamentId)

    // Aggregate
    const table = new Map<string, TeamStandingsRow>()
    for (const team of teams) {
      table.set(team.id, {
        team_id: team.id,
        team_name: team.name,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goals_for: 0,
        goals_against: 0,
        goal_difference: 0,
        points: 0,
        form: [],
        group_id: team.group_id,
        group_name: team.group_name,
      })
    }

    for (const match of matches) {
      if (match.home_team_id && match.away_team_id && match.status === 'completed') {
        const home = table.get(match.home_team_id)
        const away = table.get(match.away_team_id)
        if (!home || !away) continue

        const homeGoals = match.home_goals || match.score?.home || 0
        const awayGoals = match.away_goals || match.score?.away || 0

        home.played += 1
        away.played += 1
        home.goals_for += homeGoals
        home.goals_against += awayGoals
        away.goals_for += awayGoals
        away.goals_against += homeGoals

        if (homeGoals > awayGoals) {
          home.wins += 1
          away.losses += 1
          home.points += rules.points_win
          away.points += rules.points_loss
          home.form.unshift('W')
          away.form.unshift('L')
        } else if (homeGoals < awayGoals) {
          away.wins += 1
          home.losses += 1
          away.points += rules.points_win
          home.points += rules.points_loss
          away.form.unshift('W')
          home.form.unshift('L')
        } else {
          // draw
          home.draws += 1
          away.draws += 1
          home.points += rules.points_draw
          away.points += rules.points_draw
          home.form.unshift('D')
          away.form.unshift('D')
        }

        home.goal_difference = home.goals_for - home.goals_against
        away.goal_difference = away.goals_for - away.goals_against
      }
    }

    // Sort with standard criteria: points desc, GD desc, GF desc, name asc
    const rows = Array.from(table.values())
    rows.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference
      if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for
      return a.team_name.localeCompare(b.team_name)
    })

    // Assign position
    rows.forEach((row, idx) => (row.position = idx + 1))

    return rows
  }

  private async getTournamentTeams(tournamentId: string, groupId?: string): Promise<Array<{ id: string; name: string; group_id?: string; group_name?: string }>> {
    // Try from a likely tournament_teams view/table, fallback to teams joined via registrations
    let query = this.supabase
      .from('teams')
      .select('id, name')
      .eq('tournament_id', tournamentId)

    const { data, error } = await query
    if (error) {
      // Fallback: via registrations
      const alt = await this.supabase
        .from('tournament_registrations')
        .select('team:teams(id,name)')
        .eq('tournament_id', tournamentId)
      if (alt.data) {
        return alt.data.map((r: any) => ({ id: r.team.id, name: r.team.name }))
      }
      return []
    }
    return (data || []).map((t: any) => ({ id: t.id, name: t.name }))
  }

  private async getTournamentMatches(tournamentId: string, groupId?: string): Promise<any[]> {
    const { data } = await this.supabase
      .from('matches')
      .select('id, status, home_team_id, away_team_id, score, home_goals, away_goals, group_id')
      .eq('tournament_id', tournamentId)
    const matches = (data || []) as any[]
    return groupId ? matches.filter(m => m.group_id === groupId) : matches
  }

  private async getTournamentPointsRules(tournamentId: string): Promise<{ points_win: number; points_draw: number; points_loss: number }> {
    const { data } = await this.supabase
      .from('tournaments')
      .select('points_win, points_draw, points_loss')
      .eq('id', tournamentId)
      .single()

    return {
      points_win: data?.points_win ?? 3,
      points_draw: data?.points_draw ?? 1,
      points_loss: data?.points_loss ?? 0,
    }
  }
}

export const standingsService = new StandingsService(null as any)


