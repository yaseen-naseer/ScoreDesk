export interface EntryRequirementsSettings {
  max_teams?: number
  min_players_per_team?: number
  max_players_per_team?: number
  require_team_documents?: boolean
  required_documents?: string[]
  require_team_approval?: boolean
  allow_waitlist?: boolean
  waitlist_limit?: number | null
  require_coach_license?: boolean
  min_player_age?: number | null
  max_player_age?: number | null
  duplicate_player_policy?: 'disallow' | 'warn' | 'allow'
  entry_rules_notes?: string | null
}

export class EntryRequirementsService {
  constructor(private supabase: any) {}

  async getSettings(tournamentId: string): Promise<EntryRequirementsSettings | null> {
    const { data, error } = await this.supabase
      .from('tournaments')
      .select(`
        max_teams, min_players_per_team, max_players_per_team,
        require_team_documents, required_documents, require_team_approval,
        allow_waitlist, waitlist_limit, require_coach_license,
        min_player_age, max_player_age, duplicate_player_policy, entry_rules_notes
      `)
      .eq('id', tournamentId)
      .single()

    if (error) {
      console.error('Error loading entry requirements:', error)
      return null
    }

    return data as EntryRequirementsSettings
  }

  async updateSettings(tournamentId: string, updates: EntryRequirementsSettings): Promise<boolean> {
    const { error } = await this.supabase
      .from('tournaments')
      .update(updates)
      .eq('id', tournamentId)

    if (error) {
      console.error('Error updating entry requirements:', error)
      return false
    }
    return true
  }
}

export const entryRequirementsService = new EntryRequirementsService(null as any)


