export type PrizeType = 'cash' | 'trophy' | 'medal' | 'in_kind' | 'other'

export interface TournamentPrize {
  id: string
  tournament_id: string
  prize_type: PrizeType
  position?: number | null
  title?: string | null
  amount_cents?: number | null
  currency?: string | null
  description?: string | null
  is_team_prize: boolean
  created_at: string
  updated_at: string
}

export interface TournamentAward {
  id: string
  tournament_id: string
  award_key: string
  name: string
  description?: string | null
  selection_method?: 'committee' | 'stats' | 'vote'
  prize_reference?: string | null
  created_at: string
  updated_at: string
}

export class PrizeConfigurationService {
  constructor(private supabase: any) {}

  async getPrizes(tournamentId: string): Promise<TournamentPrize[]> {
    const { data, error } = await this.supabase
      .from('tournament_prizes')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('position', { ascending: true })
    if (error) {
      console.error('Error loading prizes:', error)
      return []
    }
    return data || []
  }

  async addPrize(tournamentId: string, prize: Partial<TournamentPrize>): Promise<boolean> {
    const { error } = await this.supabase
      .from('tournament_prizes')
      .insert({ ...prize, tournament_id: tournamentId })
    if (error) {
      console.error('Error adding prize:', error)
      return false
    }
    return true
  }

  async deletePrize(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('tournament_prizes')
      .delete()
      .eq('id', id)
    if (error) {
      console.error('Error deleting prize:', error)
      return false
    }
    return true
  }

  async getAwards(tournamentId: string): Promise<TournamentAward[]> {
    const { data, error } = await this.supabase
      .from('tournament_awards')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('award_key', { ascending: true })
    if (error) {
      console.error('Error loading awards:', error)
      return []
    }
    return data || []
  }

  async upsertAward(tournamentId: string, award: Partial<TournamentAward>): Promise<boolean> {
    const { error } = await this.supabase
      .from('tournament_awards')
      .upsert({ ...award, tournament_id: tournamentId }, { onConflict: 'tournament_id,award_key' })
    if (error) {
      console.error('Error upserting award:', error)
      return false
    }
    return true
  }
}

export const prizeConfigurationService = new PrizeConfigurationService(null as any)


