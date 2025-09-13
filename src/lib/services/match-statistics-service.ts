import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'

export interface TeamMatchStats {
  team_id: string
  possession_percentage: number | null
  shots_total: number
  shots_on_target: number
  shots_off_target: number
  corners: number
  fouls: number
  yellow_cards: number
  red_cards: number
  offside: number
  passes_total: number
  passes_completed: number
  crosses_total: number
  crosses_completed: number
  tackles_total: number
  tackles_successful: number
  saves: number
  goals_conceded: number
}

export interface PlayerMatchStats {
  player_id: string
  minutes_played: number
  goals: number
  assists: number
  shots_total: number
  shots_on_target: number
  passes_total: number
  passes_completed: number
  tackles_total: number
  tackles_successful: number
  fouls_committed: number
  fouls_suffered: number
  yellow_cards: number
  red_cards: number
  saves: number
  goals_conceded: number
  rating?: number | null
}

class MatchStatisticsService {
  private supabase = createClientComponentClient<Database>()

  async getTeamStats(matchId: string): Promise<TeamMatchStats[]> {
    const { data, error } = await this.supabase
      .from('match_statistics')
      .select('*')
      .eq('match_id', matchId)

    if (error || !data) return []

    return data.map(s => ({
      team_id: s.team_id,
      possession_percentage: s.possession_percentage ?? null,
      shots_total: s.shots_total ?? 0,
      shots_on_target: s.shots_on_target ?? 0,
      shots_off_target: s.shots_off_target ?? 0,
      corners: s.corners ?? 0,
      fouls: s.fouls ?? 0,
      yellow_cards: s.yellow_cards ?? 0,
      red_cards: s.red_cards ?? 0,
      offside: s.offside ?? 0,
      passes_total: s.passes_total ?? 0,
      passes_completed: s.passes_completed ?? 0,
      crosses_total: s.crosses_total ?? 0,
      crosses_completed: s.crosses_completed ?? 0,
      tackles_total: s.tackles_total ?? 0,
      tackles_successful: s.tackles_successful ?? 0,
      saves: s.saves ?? 0,
      goals_conceded: s.goals_conceded ?? 0,
    }))
  }

  async getPlayerStats(matchId: string, teamId?: string): Promise<PlayerMatchStats[]> {
    let query = this.supabase
      .from('player_statistics')
      .select('*')
      .eq('match_id', matchId)

    if (teamId) {
      // join with players to filter by team
      const { data, error } = await this.supabase
        .from('player_statistics')
        .select('*, players!inner(team_id)')
        .eq('match_id', matchId)
        .eq('players.team_id', teamId)

      if (error || !data) return []
      return data.map(this.mapPlayerStats)
    }

    const { data, error } = await query
    if (error || !data) return []
    return data.map(this.mapPlayerStats)
  }

  private mapPlayerStats = (p: any): PlayerMatchStats => ({
    player_id: p.player_id,
    minutes_played: p.minutes_played ?? 0,
    goals: p.goals ?? 0,
    assists: p.assists ?? 0,
    shots_total: p.shots_total ?? 0,
    shots_on_target: p.shots_on_target ?? 0,
    passes_total: p.passes_total ?? 0,
    passes_completed: p.passes_completed ?? 0,
    tackles_total: p.tackles_total ?? 0,
    tackles_successful: p.tackles_successful ?? 0,
    fouls_committed: p.fouls_committed ?? 0,
    fouls_suffered: p.fouls_suffered ?? 0,
    yellow_cards: p.yellow_cards ?? 0,
    red_cards: p.red_cards ?? 0,
    saves: p.saves ?? 0,
    goals_conceded: p.goals_conceded ?? 0,
    rating: p.rating ?? null,
  })
}

export const matchStatisticsService = new MatchStatisticsService()


