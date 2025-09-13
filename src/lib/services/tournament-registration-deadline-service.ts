import { Database } from '@/lib/supabase/types'

export type RegistrationStatus = 'open' | 'closed' | 'extended' | 'cancelled'
export type FeeType = 'entry_fee' | 'late_fee' | 'early_bird_discount' | 'team_fee' | 'player_fee'
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'cancelled'

export interface RegistrationDeadlineConfig {
  tournament_id: string
  registration_start_date: string
  registration_deadline: string
  late_registration_deadline?: string
  early_bird_deadline?: string
  max_teams?: number
  max_players_per_team?: number
  allow_late_registration: boolean
  allow_early_bird_discount: boolean
  auto_close_on_deadline: boolean
  grace_period_hours?: number
}

export interface FeeStructure {
  entry_fee: number
  currency: string
  early_bird_discount_amount?: number
  early_bird_discount_percentage?: number
  late_registration_fee?: number
  late_registration_fee_percentage?: number
  refund_policy: {
    full_refund_before: string
    partial_refund_before: string
    no_refund_after: string
    refund_percentage?: number
  }
}

export interface RegistrationPayment {
  id: string
  tournament_id: string
  team_id: string
  amount: number
  currency: string
  fee_type: FeeType
  payment_status: PaymentStatus
  payment_method?: string
  transaction_id?: string
  paid_at?: string
  refunded_at?: string
  refund_amount?: number
  refund_reason?: string
  created_at: string
  updated_at: string
}

export interface RegistrationDeadlineStatus {
  current_status: RegistrationStatus
  days_until_deadline: number
  days_until_early_bird_ends?: number
  days_until_late_registration_ends?: number
  can_register: boolean
  can_register_late: boolean
  can_get_early_bird: boolean
  registration_count: number
  max_registrations?: number
  is_full: boolean
  fee_structure: FeeStructure
  next_deadline?: string
  grace_period_active: boolean
}

export interface DeadlineExtension {
  id: string
  tournament_id: string
  extended_by: string
  original_deadline: string
  new_deadline: string
  extension_reason: string
  extension_duration_hours: number
  created_at: string
}

export class TournamentRegistrationDeadlineService {
  constructor(private supabase: any) {}

  /**
   * Get current registration deadline status for a tournament
   */
  async getRegistrationDeadlineStatus(tournamentId: string): Promise<RegistrationDeadlineStatus> {
    const tournament = await this.getTournament(tournamentId)
    if (!tournament) {
      throw new Error('Tournament not found')
    }

    const now = new Date()
    const registrationStart = new Date(tournament.registration_start_date || tournament.created_at)
    const deadline = new Date(tournament.registration_deadline || tournament.start_date)
    const earlyBirdDeadline = tournament.early_bird_deadline ? new Date(tournament.early_bird_deadline) : null
    const lateDeadline = tournament.late_registration_deadline ? new Date(tournament.late_registration_deadline) : null

    const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const daysUntilEarlyBirdEnds = earlyBirdDeadline ? Math.ceil((earlyBirdDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : undefined
    const daysUntilLateEnds = lateDeadline ? Math.ceil((lateDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 60 * 24)) : undefined

    // Get registration count
    const registrationCount = await this.getRegistrationCount(tournamentId)
    const maxRegistrations = tournament.max_teams || undefined
    const isFull = maxRegistrations ? registrationCount >= maxRegistrations : false

    // Determine current status
    let currentStatus: RegistrationStatus = 'closed'
    let canRegister = false
    let canRegisterLate = false
    let canGetEarlyBird = false
    let gracePeriodActive = false

    if (now < registrationStart) {
      currentStatus = 'closed'
    } else if (now <= deadline) {
      currentStatus = 'open'
      canRegister = !isFull
      canGetEarlyBird = earlyBirdDeadline ? now <= earlyBirdDeadline : false
    } else if (tournament.allow_registration && lateDeadline && now <= lateDeadline) {
      currentStatus = 'extended'
      canRegisterLate = !isFull
      gracePeriodActive = true
    } else {
      currentStatus = 'closed'
    }

    const feeStructure: FeeStructure = {
      entry_fee: tournament.entry_fee || 0,
      currency: tournament.currency || 'USD',
      early_bird_discount_amount: tournament.early_bird_discount || 0,
      late_registration_fee: tournament.late_registration_fee || 0,
      refund_policy: {
        full_refund_before: tournament.refund_policy || 'No refund policy specified',
        partial_refund_before: 'Partial refund policy',
        no_refund_after: 'No refund after tournament start',
        refund_percentage: 0
      }
    }

    const nextDeadline = this.getNextDeadline(now, deadline, earlyBirdDeadline, lateDeadline)

    return {
      current_status: currentStatus,
      days_until_deadline: daysUntilDeadline,
      days_until_early_bird_ends: daysUntilEarlyBirdEnds,
      days_until_late_registration_ends: daysUntilLateEnds,
      can_register: canRegister,
      can_register_late: canRegisterLate,
      can_get_early_bird: canGetEarlyBird,
      registration_count: registrationCount,
      max_registrations: maxRegistrations,
      is_full: isFull,
      fee_structure: feeStructure,
      next_deadline: nextDeadline?.toISOString(),
      grace_period_active: gracePeriodActive
    }
  }

  /**
   * Extend registration deadline
   */
  async extendRegistrationDeadline(
    tournamentId: string,
    newDeadline: string,
    extensionReason: string,
    extendedBy: string,
    extensionDurationHours: number = 24
  ): Promise<boolean> {
    const tournament = await this.getTournament(tournamentId)
    if (!tournament) {
      throw new Error('Tournament not found')
    }

    const originalDeadline = tournament.registration_deadline
    const newDeadlineDate = new Date(newDeadline)

    // Validate extension
    if (newDeadlineDate <= new Date(tournament.registration_deadline)) {
      throw new Error('New deadline must be after current deadline')
    }

    // Update tournament deadline
    const { error: updateError } = await this.supabase
      .from('tournaments')
      .update({
        registration_deadline: newDeadline,
        late_registration_deadline: newDeadline,
        updated_at: new Date().toISOString()
      })
      .eq('id', tournamentId)

    if (updateError) {
      console.error('Error updating tournament deadline:', updateError)
      return false
    }

    // Log the extension
    const { error: logError } = await this.supabase
      .from('registration_deadline_extensions')
      .insert({
        tournament_id: tournamentId,
        extended_by: extendedBy,
        original_deadline: originalDeadline,
        new_deadline: newDeadline,
        extension_reason: extensionReason,
        extension_duration_hours: extensionDurationHours
      })

    if (logError) {
      console.error('Error logging deadline extension:', logError)
    }

    // Notify registered teams about the extension
    await this.notifyTeamsAboutDeadlineExtension(tournamentId, newDeadline, extensionReason)

    return true
  }

  /**
   * Process registration payment
   */
  async processRegistrationPayment(
    tournamentId: string,
    teamId: string,
    amount: number,
    feeType: FeeType,
    paymentMethod: string,
    transactionId?: string
  ): Promise<RegistrationPayment> {
    const tournament = await this.getTournament(tournamentId)
    if (!tournament) {
      throw new Error('Tournament not found')
    }

    const deadlineStatus = await this.getRegistrationDeadlineStatus(tournamentId)
    
    // Validate payment timing
    if (!deadlineStatus.can_register && !deadlineStatus.can_register_late) {
      throw new Error('Registration is closed')
    }

    // Calculate final amount based on timing and discounts
    const finalAmount = this.calculateRegistrationFee(amount, feeType, deadlineStatus)

    // Create payment record
    const { data: payment, error } = await this.supabase
      .from('registration_payments')
      .insert({
        tournament_id: tournamentId,
        team_id: teamId,
        amount: finalAmount,
        currency: tournament.currency || 'USD',
        fee_type: feeType,
        payment_status: 'paid',
        payment_method: paymentMethod,
        transaction_id: transactionId,
        paid_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating payment record:', error)
      throw new Error('Failed to process payment')
    }

    return payment
  }

  /**
   * Calculate registration fee based on timing and discounts
   */
  private calculateRegistrationFee(amount: number, feeType: FeeType, deadlineStatus: RegistrationDeadlineStatus): number {
    let finalAmount = amount

    // Apply early bird discount
    if (deadlineStatus.can_get_early_bird && feeType === 'entry_fee') {
      const discount = deadlineStatus.fee_structure.early_bird_discount_amount || 0
      finalAmount = Math.max(0, finalAmount - discount)
    }

    // Apply late registration fee
    if (deadlineStatus.can_register_late && feeType === 'entry_fee') {
      const lateFee = deadlineStatus.fee_structure.late_registration_fee || 0
      finalAmount += lateFee
    }

    return finalAmount
  }

  /**
   * Get next important deadline
   */
  private getNextDeadline(
    now: Date,
    deadline: Date,
    earlyBirdDeadline: Date | null,
    lateDeadline: Date | null
  ): Date | null {
    const deadlines = [deadline]
    if (earlyBirdDeadline) deadlines.push(earlyBirdDeadline)
    if (lateDeadline) deadlines.push(lateDeadline)

    const futureDeadlines = deadlines.filter(d => d > now)
    if (futureDeadlines.length === 0) return null

    return futureDeadlines.reduce((earliest, current) => 
      current < earliest ? current : earliest
    )
  }

  /**
   * Get registration count for tournament
   */
  private async getRegistrationCount(tournamentId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('tournament_teams')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId)
      .eq('registration_status', 'approved')

    return error ? 0 : (count || 0)
  }

  /**
   * Get tournament by ID
   */
  private async getTournament(tournamentId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single()

    if (error) {
      console.error('Error fetching tournament:', error)
      return null
    }

    return data
  }

  /**
   * Notify teams about deadline extension
   */
  private async notifyTeamsAboutDeadlineExtension(
    tournamentId: string,
    newDeadline: string,
    reason: string
  ): Promise<void> {
    // Implementation would send notifications to registered teams
    console.log(`Notifying teams about deadline extension for tournament ${tournamentId}`)
  }

  /**
   * Get deadline extension history
   */
  async getDeadlineExtensionHistory(tournamentId: string): Promise<DeadlineExtension[]> {
    const { data, error } = await this.supabase
      .from('registration_deadline_extensions')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching deadline extensions:', error)
      return []
    }

    return data || []
  }

  /**
   * Get payment history for a tournament
   */
  async getPaymentHistory(tournamentId: string): Promise<RegistrationPayment[]> {
    const { data, error } = await this.supabase
      .from('registration_payments')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching payment history:', error)
      return []
    }

    return data || []
  }

  /**
   * Process refund
   */
  async processRefund(
    paymentId: string,
    refundAmount: number,
    refundReason: string,
    processedBy: string
  ): Promise<boolean> {
    const { error } = await this.supabase
      .from('registration_payments')
      .update({
        payment_status: 'refunded',
        refund_amount: refundAmount,
        refund_reason: refundReason,
        refunded_at: new Date().toISOString()
      })
      .eq('id', paymentId)

    if (error) {
      console.error('Error processing refund:', error)
      return false
    }

    return true
  }

  /**
   * Check if registration is allowed
   */
  async canRegisterTeam(tournamentId: string, teamId: string): Promise<{ allowed: boolean; reason?: string }> {
    const deadlineStatus = await this.getRegistrationDeadlineStatus(tournamentId)

    if (!deadlineStatus.can_register && !deadlineStatus.can_register_late) {
      return { allowed: false, reason: 'Registration is closed' }
    }

    if (deadlineStatus.is_full) {
      return { allowed: false, reason: 'Tournament is full' }
    }

    // Check if team is already registered
    const { data: existingRegistration } = await this.supabase
      .from('tournament_teams')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('team_id', teamId)
      .single()

    if (existingRegistration) {
      return { allowed: false, reason: 'Team is already registered' }
    }

    return { allowed: true }
  }

  /**
   * Auto-close registration when deadline passes
   */
  async processDeadlineExpirations(): Promise<void> {
    const now = new Date()
    
    // Find tournaments with expired deadlines that should auto-close
    const { data: expiredTournaments, error } = await this.supabase
      .from('tournaments')
      .select('id, name, registration_deadline')
      .eq('tournament_status', 'registration')
      .eq('is_active', true)
      .not('registration_deadline', 'is', null)
      .lt('registration_deadline', now.toISOString())

    if (error) {
      console.error('Error fetching expired tournaments:', error)
      return
    }

    for (const tournament of expiredTournaments || []) {
      try {
        // Check if tournament has minimum teams registered
        const registrationCount = await this.getRegistrationCount(tournament.id)
        
        if (registrationCount >= 2) {
          // Auto-transition to active status
          await this.supabase
            .from('tournaments')
            .update({
              tournament_status: 'active',
              updated_at: now.toISOString()
            })
            .eq('id', tournament.id)

          console.log(`Auto-closed registration for tournament ${tournament.name} (${tournament.id})`)
        } else {
          console.log(`Tournament ${tournament.name} deadline expired but insufficient teams registered`)
        }
      } catch (error) {
        console.error(`Error processing deadline expiration for tournament ${tournament.id}:`, error)
      }
    }
  }
}

// Export singleton instance
export const tournamentRegistrationDeadlineService = new TournamentRegistrationDeadlineService(null as any)
