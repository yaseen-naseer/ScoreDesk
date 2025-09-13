import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/lib/supabase/types'

// Services should receive supabase client as parameter to avoid multiple instances

type TournamentTeam = Database['public']['Tables']['tournament_teams']['Row']
type TournamentTeamInsert = Database['public']['Tables']['tournament_teams']['Insert']
type TournamentTeamUpdate = Database['public']['Tables']['tournament_teams']['Update']
type Team = Database['public']['Tables']['teams']['Row']
type Tournament = Database['public']['Tables']['tournaments']['Row']

export interface TournamentRegistration {
  id: string
  tournament_id: string
  team_id: string
  group_name?: string
  seed_number?: number
  registration_date: string
  registration_status: 'pending' | 'approved' | 'rejected'
  registration_notes?: string
  approved_by?: string
  approved_at?: string
  rejected_reason?: string
  is_active: boolean
  created_at: string
  updated_at: string
  team?: Team
  tournament?: Tournament
}

export interface TournamentRegistrationData {
  tournament_id: string
  team_id: string
  group_name?: string
  registration_notes?: string
}

export interface RegistrationApprovalData {
  registration_id: string
  status: 'approved' | 'rejected'
  notes?: string
  rejected_reason?: string
}

export interface TournamentRegistrationFilters {
  tournament_id?: string
  team_id?: string
  registration_status?: 'pending' | 'approved' | 'rejected'
  group_name?: string
}

export class TournamentRegistrationService {
  private supabase = createClientComponentClient<Database>()

  /**
   * Register a team for a tournament
   */
  async registerTeamForTournament(data: TournamentRegistrationData): Promise<{ success: boolean; registration?: TournamentRegistration; error?: string }> {
    try {
      // Check if team is already registered
      const { data: existingRegistration } = await this.supabase
        .from('tournament_teams')
        .select('id')
        .eq('tournament_id', data.tournament_id)
        .eq('team_id', data.team_id)
        .single()

      if (existingRegistration) {
        return {
          success: false,
          error: 'Team is already registered for this tournament'
        }
      }

      // Check tournament capacity
      const { data: tournament } = await this.supabase
        .from('tournaments')
        .select('max_teams, name')
        .eq('id', data.tournament_id)
        .single()

      if (tournament?.max_teams) {
        const { count: currentRegistrations } = await this.supabase
          .from('tournament_teams')
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', data.tournament_id)
          .eq('registration_status', 'approved')

        if (currentRegistrations && currentRegistrations >= tournament.max_teams) {
          return {
            success: false,
            error: `Tournament "${tournament.name}" is full (${tournament.max_teams} teams)`
          }
        }
      }

      // Register team
      const { data: registration, error } = await this.supabase
        .from('tournament_teams')
        .insert({
          tournament_id: data.tournament_id,
          team_id: data.team_id,
          group_name: data.group_name,
          registration_notes: data.registration_notes,
          registration_date: new Date().toISOString(),
          registration_status: 'pending',
          is_active: true
        })
        .select(`
          *,
          team:teams(*),
          tournament:tournaments(*)
        `)
        .single()

      if (error) {
        console.error('Error registering team:', error)
        return {
          success: false,
          error: 'Failed to register team for tournament'
        }
      }

      return {
        success: true,
        registration: registration as TournamentRegistration
      }
    } catch (error) {
      console.error('Error in registerTeamForTournament:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
    }
  }

  /**
   * Get tournament registrations with filters
   */
  async getTournamentRegistrations(filters: TournamentRegistrationFilters): Promise<TournamentRegistration[]> {
    try {
      let query = this.supabase
        .from('tournament_teams')
        .select(`
          *,
          team:teams(*),
          tournament:tournaments(*)
        `)

      if (filters.tournament_id) {
        query = query.eq('tournament_id', filters.tournament_id)
      }
      if (filters.team_id) {
        query = query.eq('team_id', filters.team_id)
      }
      if (filters.registration_status) {
        query = query.eq('registration_status', filters.registration_status)
      }
      if (filters.group_name) {
        query = query.eq('group_name', filters.group_name)
      }

      const { data: registrations, error } = await query
        .order('registration_date', { ascending: false })

      if (error) {
        throw error
      }

      return registrations as TournamentRegistration[]
    } catch (error) {
      console.error('Error getting tournament registrations:', error)
      return []
    }
  }

  /**
   * Get pending registrations for a tournament
   */
  async getPendingRegistrations(tournamentId: string): Promise<TournamentRegistration[]> {
    return this.getTournamentRegistrations({
      tournament_id: tournamentId,
      registration_status: 'pending'
    })
  }

  /**
   * Get approved registrations for a tournament
   */
  async getApprovedRegistrations(tournamentId: string): Promise<TournamentRegistration[]> {
    return this.getTournamentRegistrations({
      tournament_id: tournamentId,
      registration_status: 'approved'
    })
  }

  /**
   * Approve or reject a tournament registration
   */
  async approveRejectRegistration(data: RegistrationApprovalData): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: TournamentTeamUpdate = {
        registration_status: data.status,
        updated_at: new Date().toISOString()
      }

      if (data.status === 'approved') {
        updateData.approved_by = (await supabase.auth.getUser()).data.user?.id
        updateData.approved_at = new Date().toISOString()
        updateData.registration_notes = data.notes
      } else {
        updateData.rejected_reason = data.rejected_reason
      }

      const { error } = await supabase
        .from('tournament_teams')
        .update(updateData)
        .eq('id', data.registration_id)

      if (error) {
        console.error('Error approving/rejecting registration:', error)
        return {
          success: false,
          error: 'Failed to update registration status'
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Error in approveRejectRegistration:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
    }
  }

  /**
   * Remove team from tournament
   */
  async removeTeamFromTournament(registrationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('tournament_teams')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', registrationId)

      if (error) {
        console.error('Error removing team from tournament:', error)
        return {
          success: false,
          error: 'Failed to remove team from tournament'
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Error in removeTeamFromTournament:', error)
      return {
        success: false,
        error: 'An unexpected error occurred'
      }
    }
  }

  /**
   * Get registration statistics for a tournament
   */
  async getTournamentRegistrationStats(tournamentId: string): Promise<{
    total_registrations: number
    pending_registrations: number
    approved_registrations: number
    rejected_registrations: number
    available_slots: number
  }> {
    try {
      const [total, pending, approved, rejected, tournament] = await Promise.all([
        this.supabase
          .from('tournament_teams')
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', tournamentId),
        this.supabase
          .from('tournament_teams')
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', tournamentId)
          .eq('registration_status', 'pending'),
        this.supabase
          .from('tournament_teams')
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', tournamentId)
          .eq('registration_status', 'approved'),
        this.supabase
          .from('tournament_teams')
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', tournamentId)
          .eq('registration_status', 'rejected'),
        this.supabase
          .from('tournaments')
          .select('max_teams')
          .eq('id', tournamentId)
          .single()
      ])

      const maxTeams = tournament.data?.max_teams || 0
      const approvedCount = approved.count || 0

      return {
        total_registrations: total.count || 0,
        pending_registrations: pending.count || 0,
        approved_registrations: approvedCount,
        rejected_registrations: rejected.count || 0,
        available_slots: maxTeams > 0 ? Math.max(0, maxTeams - approvedCount) : 0
      }
    } catch (error) {
      console.error('Error getting tournament registration stats:', error)
      return {
        total_registrations: 0,
        pending_registrations: 0,
        approved_registrations: 0,
        rejected_registrations: 0,
        available_slots: 0
      }
    }
  }

  /**
   * Check if team can register for tournament
   */
  async canTeamRegister(tournamentId: string, teamId: string): Promise<{ canRegister: boolean; reason?: string }> {
    try {
      // Check if already registered
      const { data: existingRegistration } = await this.supabase
        .from('tournament_teams')
        .select('id, registration_status')
        .eq('tournament_id', tournamentId)
        .eq('team_id', teamId)
        .single()

      if (existingRegistration) {
        if (existingRegistration.registration_status === 'pending') {
          return { canRegister: false, reason: 'Team registration is pending approval' }
        }
        if (existingRegistration.registration_status === 'approved') {
          return { canRegister: false, reason: 'Team is already registered and approved' }
        }
        if (existingRegistration.registration_status === 'rejected') {
          return { canRegister: true, reason: 'Team can re-register after previous rejection' }
        }
      }

      // Check tournament capacity
      const { data: tournament } = await this.supabase
        .from('tournaments')
        .select('max_teams, registration_deadline, start_date')
        .eq('id', tournamentId)
        .single()

      if (tournament?.max_teams) {
        const { count: approvedRegistrations } = await this.supabase
          .from('tournament_teams')
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', tournamentId)
          .eq('registration_status', 'approved')

        if (approvedRegistrations && approvedRegistrations >= tournament.max_teams) {
          return { canRegister: false, reason: 'Tournament is full' }
        }
      }

      // Check registration deadline
      if (tournament?.registration_deadline) {
        const deadline = new Date(tournament.registration_deadline)
        if (new Date() > deadline) {
          return { canRegister: false, reason: 'Registration deadline has passed' }
        }
      }

      return { canRegister: true }
    } catch (error) {
      console.error('Error checking team registration eligibility:', error)
      return { canRegister: false, reason: 'Unable to verify registration eligibility' }
    }
  }
}

export const tournamentRegistrationService = new TournamentRegistrationService()
