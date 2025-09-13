import { Database } from '@/lib/supabase/types'

export type TeamSheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'final'
export type PlayerPosition = 'GK' | 'CB' | 'LB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LM' | 'RM' | 'LW' | 'RW' | 'ST' | 'SUB'
export type FormationType = '4-4-2' | '4-3-3' | '3-5-2' | '4-2-3-1' | '3-4-3' | '5-3-2' | '4-5-1' | '3-4-2-1' | '4-1-4-1' | '3-3-3-1'

export interface TeamSheetPlayer {
  id: string
  player_id: string
  player_name: string
  jersey_number: number
  position: PlayerPosition
  is_starter: boolean
  is_captain: boolean
  is_vice_captain: boolean
  substitution_order?: number
  notes?: string
}

export interface TeamSheet {
  id: string
  match_id: string
  team_id: string
  team_name: string
  status: TeamSheetStatus
  formation: FormationType
  players: TeamSheetPlayer[]
  submitted_by: string
  submitted_at?: string
  approved_by?: string
  approved_at?: string
  rejected_reason?: string
  deadline: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface TeamSheetSubmission {
  match_id: string
  team_id: string
  formation: FormationType
  players: Omit<TeamSheetPlayer, 'id'>[]
  notes?: string
}

export interface TeamSheetValidationResult {
  is_valid: boolean
  errors: string[]
  warnings: string[]
  player_eligibility: {
    player_id: string
    player_name: string
    is_eligible: boolean
    reason?: string
  }[]
}

export interface TeamSheetDeadlineStatus {
  can_submit: boolean
  deadline_passed: boolean
  hours_until_deadline: number
  deadline: string
  is_late_submission: boolean
  late_penalty_applied: boolean
}

export class TeamSheetService {
  constructor(private supabase: any) {}

  /**
   * Create or update team sheet
   */
  async submitTeamSheet(
    submission: TeamSheetSubmission,
    submittedBy: string
  ): Promise<{ success: boolean; teamSheet?: TeamSheet; error?: string }> {
    try {
      // Validate submission
      const validation = await this.validateTeamSheet(submission)
      if (!validation.is_valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`
        }
      }

      // Check deadline
      const deadlineStatus = await this.getTeamSheetDeadlineStatus(submission.match_id)
      if (!deadlineStatus.can_submit && !deadlineStatus.is_late_submission) {
        return {
          success: false,
          error: 'Team sheet submission deadline has passed'
        }
      }

      // Get or create team sheet
      const existingTeamSheet = await this.getTeamSheet(submission.match_id, submission.team_id)
      
      const teamSheetData = {
        match_id: submission.match_id,
        team_id: submission.team_id,
        formation: submission.formation,
        players: submission.players,
        submitted_by: submittedBy,
        submitted_at: new Date().toISOString(),
        status: deadlineStatus.is_late_submission ? 'submitted' : 'submitted',
        notes: submission.notes,
        updated_at: new Date().toISOString()
      }

      let teamSheet: TeamSheet

      if (existingTeamSheet) {
        // Update existing team sheet
        const { data, error } = await this.supabase
          .from('team_sheets')
          .update(teamSheetData)
          .eq('match_id', submission.match_id)
          .eq('team_id', submission.team_id)
          .select()
          .single()

        if (error) {
          console.error('Error updating team sheet:', error)
          return { success: false, error: 'Failed to update team sheet' }
        }

        teamSheet = data
      } else {
        // Create new team sheet
        const { data, error } = await this.supabase
          .from('team_sheets')
          .insert(teamSheetData)
          .select()
          .single()

        if (error) {
          console.error('Error creating team sheet:', error)
          return { success: false, error: 'Failed to create team sheet' }
        }

        teamSheet = data
      }

      // Log submission
      await this.logTeamSheetAction(teamSheet.id, 'submitted', submittedBy, 'Team sheet submitted')

      return { success: true, teamSheet }
    } catch (error) {
      console.error('Error submitting team sheet:', error)
      return { success: false, error: 'Failed to submit team sheet' }
    }
  }

  /**
   * Get team sheet for a match and team
   */
  async getTeamSheet(matchId: string, teamId: string): Promise<TeamSheet | null> {
    const { data, error } = await this.supabase
      .from('team_sheets')
      .select(`
        *,
        players:team_sheet_players(*)
      `)
      .eq('match_id', matchId)
      .eq('team_id', teamId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // No team sheet found
      }
      console.error('Error fetching team sheet:', error)
      return null
    }

    return data
  }

  /**
   * Get all team sheets for a match
   */
  async getMatchTeamSheets(matchId: string): Promise<TeamSheet[]> {
    const { data, error } = await this.supabase
      .from('team_sheets')
      .select(`
        *,
        players:team_sheet_players(*),
        team:teams(name)
      `)
      .eq('match_id', matchId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching match team sheets:', error)
      return []
    }

    return data || []
  }

  /**
   * Approve team sheet
   */
  async approveTeamSheet(
    matchId: string,
    teamId: string,
    approvedBy: string,
    notes?: string
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('team_sheets')
        .update({
          status: 'approved',
          approved_by: approvedBy,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('match_id', matchId)
        .eq('team_id', teamId)

      if (error) {
        console.error('Error approving team sheet:', error)
        return false
      }

      // Log approval
      const teamSheet = await this.getTeamSheet(matchId, teamId)
      if (teamSheet) {
        await this.logTeamSheetAction(teamSheet.id, 'approved', approvedBy, notes || 'Team sheet approved')
      }

      return true
    } catch (error) {
      console.error('Error approving team sheet:', error)
      return false
    }
  }

  /**
   * Reject team sheet
   */
  async rejectTeamSheet(
    matchId: string,
    teamId: string,
    rejectedBy: string,
    reason: string
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('team_sheets')
        .update({
          status: 'rejected',
          rejected_reason: reason,
          approved_by: rejectedBy,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('match_id', matchId)
        .eq('team_id', teamId)

      if (error) {
        console.error('Error rejecting team sheet:', error)
        return false
      }

      // Log rejection
      const teamSheet = await this.getTeamSheet(matchId, teamId)
      if (teamSheet) {
        await this.logTeamSheetAction(teamSheet.id, 'rejected', rejectedBy, reason)
      }

      return true
    } catch (error) {
      console.error('Error rejecting team sheet:', error)
      return false
    }
  }

  /**
   * Validate team sheet submission
   */
  async validateTeamSheet(submission: TeamSheetSubmission): Promise<TeamSheetValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    const playerEligibility: TeamSheetValidationResult['player_eligibility'] = []

    // Check minimum players
    if (submission.players.length < 11) {
      errors.push('Team sheet must have at least 11 players')
    }

    // Check maximum players
    if (submission.players.length > 25) {
      errors.push('Team sheet cannot have more than 25 players')
    }

    // Check starting XI
    const starters = submission.players.filter(p => p.is_starter)
    if (starters.length !== 11) {
      errors.push('Team sheet must have exactly 11 starting players')
    }

    // Check substitutes
    const substitutes = submission.players.filter(p => !p.is_starter)
    if (substitutes.length > 12) {
      errors.push('Team sheet cannot have more than 12 substitutes')
    }

    // Check captain
    const captains = submission.players.filter(p => p.is_captain)
    if (captains.length !== 1) {
      errors.push('Team sheet must have exactly one captain')
    }

    // Check vice-captain
    const viceCaptains = submission.players.filter(p => p.is_vice_captain)
    if (viceCaptains.length > 1) {
      errors.push('Team sheet cannot have more than one vice-captain')
    }

    // Check goalkeeper
    const goalkeepers = starters.filter(p => p.position === 'GK')
    if (goalkeepers.length !== 1) {
      errors.push('Team sheet must have exactly one goalkeeper in starting XI')
    }

    // Check jersey numbers
    const jerseyNumbers = submission.players.map(p => p.jersey_number)
    const uniqueJerseyNumbers = new Set(jerseyNumbers)
    if (uniqueJerseyNumbers.size !== jerseyNumbers.length) {
      errors.push('All jersey numbers must be unique')
    }

    // Validate formation
    if (!this.isValidFormation(submission.formation, starters)) {
      errors.push(`Invalid formation ${submission.formation} for selected players`)
    }

    // Check player eligibility
    for (const player of submission.players) {
      const eligibility = await this.checkPlayerEligibility(player.player_id, submission.match_id)
      playerEligibility.push({
        player_id: player.player_id,
        player_name: player.player_name,
        is_eligible: eligibility.is_eligible,
        reason: eligibility.reason
      })

      if (!eligibility.is_eligible) {
        errors.push(`Player ${player.player_name} is not eligible: ${eligibility.reason}`)
      }
    }

    // Check for warnings
    if (substitutes.length < 7) {
      warnings.push('Consider having at least 7 substitutes for tactical flexibility')
    }

    if (!captains.some(c => c.is_starter)) {
      warnings.push('Captain should typically be in the starting XI')
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      player_eligibility: playerEligibility
    }
  }

  /**
   * Check player eligibility for match
   */
  private async checkPlayerEligibility(
    playerId: string,
    matchId: string
  ): Promise<{ is_eligible: boolean; reason?: string }> {
    try {
      // Get match details
      const { data: match } = await this.supabase
        .from('matches')
        .select('tournament_id, scheduled_date')
        .eq('id', matchId)
        .single()

      if (!match) {
        return { is_eligible: false, reason: 'Match not found' }
      }

      // Check if player is registered for tournament
      const { data: registration } = await this.supabase
        .from('tournament_players')
        .select('*')
        .eq('player_id', playerId)
        .eq('tournament_id', match.tournament_id)
        .single()

      if (!registration) {
        return { is_eligible: false, reason: 'Player not registered for tournament' }
      }

      // Check if player is suspended
      const { data: suspension } = await this.supabase
        .from('player_suspensions')
        .select('*')
        .eq('player_id', playerId)
        .lte('suspension_start', match.scheduled_date)
        .gte('suspension_end', match.scheduled_date)
        .single()

      if (suspension) {
        return { is_eligible: false, reason: 'Player is suspended' }
      }

      // Check if player is injured (if injury tracking is enabled)
      const { data: injury } = await this.supabase
        .from('player_injuries')
        .select('*')
        .eq('player_id', playerId)
        .eq('is_active', true)
        .single()

      if (injury) {
        return { is_eligible: false, reason: 'Player is injured' }
      }

      return { is_eligible: true }
    } catch (error) {
      console.error('Error checking player eligibility:', error)
      return { is_eligible: false, reason: 'Error checking eligibility' }
    }
  }

  /**
   * Validate formation against starting players
   */
  private isValidFormation(formation: FormationType, starters: TeamSheetPlayer[]): boolean {
    // Basic formation validation logic
    // This would be more sophisticated in a real implementation
    const formationPatterns = {
      '4-4-2': { defenders: 4, midfielders: 4, forwards: 2 },
      '4-3-3': { defenders: 4, midfielders: 3, forwards: 3 },
      '3-5-2': { defenders: 3, midfielders: 5, forwards: 2 },
      '4-2-3-1': { defenders: 4, midfielders: 5, forwards: 1 },
      '3-4-3': { defenders: 3, midfielders: 4, forwards: 3 },
      '5-3-2': { defenders: 5, midfielders: 3, forwards: 2 },
      '4-5-1': { defenders: 4, midfielders: 5, forwards: 1 },
      '3-4-2-1': { defenders: 3, midfielders: 6, forwards: 1 },
      '4-1-4-1': { defenders: 4, midfielders: 5, forwards: 1 },
      '3-3-3-1': { defenders: 3, midfielders: 6, forwards: 1 }
    }

    const pattern = formationPatterns[formation]
    if (!pattern) return false

    const defenders = starters.filter(p => ['CB', 'LB', 'RB'].includes(p.position)).length
    const midfielders = starters.filter(p => ['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(p.position)).length
    const forwards = starters.filter(p => ['LW', 'RW', 'ST'].includes(p.position)).length

    return defenders === pattern.defenders && 
           midfielders === pattern.midfielders && 
           forwards === pattern.forwards
  }

  /**
   * Get team sheet deadline status
   */
  async getTeamSheetDeadlineStatus(matchId: string): Promise<TeamSheetDeadlineStatus> {
    try {
      const { data: match } = await this.supabase
        .from('matches')
        .select('scheduled_date, tournament_id')
        .eq('id', matchId)
        .single()

      if (!match) {
        return {
          can_submit: false,
          deadline_passed: true,
          hours_until_deadline: 0,
          deadline: '',
          is_late_submission: false,
          late_penalty_applied: false
        }
      }

      // Get tournament team sheet deadline settings
      const { data: tournament } = await this.supabase
        .from('tournaments')
        .select('team_sheet_deadline_hours')
        .eq('id', match.tournament_id)
        .single()

      const deadlineHours = tournament?.team_sheet_deadline_hours || 2 // Default 2 hours before match
      const matchTime = new Date(match.scheduled_date)
      const deadline = new Date(matchTime.getTime() - deadlineHours * 60 * 60 * 1000)
      const now = new Date()

      const hoursUntilDeadline = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60))
      const deadlinePassed = now > deadline
      const canSubmit = deadlinePassed ? false : true
      const isLateSubmission = deadlinePassed && now <= matchTime

      return {
        can_submit: canSubmit,
        deadline_passed: deadlinePassed,
        hours_until_deadline: Math.max(0, hoursUntilDeadline),
        deadline: deadline.toISOString(),
        is_late_submission: isLateSubmission,
        late_penalty_applied: isLateSubmission
      }
    } catch (error) {
      console.error('Error getting team sheet deadline status:', error)
      return {
        can_submit: false,
        deadline_passed: true,
        hours_until_deadline: 0,
        deadline: '',
        is_late_submission: false,
        late_penalty_applied: false
      }
    }
  }

  /**
   * Get available players for team
   */
  async getAvailablePlayers(teamId: string, matchId: string): Promise<any[]> {
    try {
      const { data: players, error } = await this.supabase
        .from('players')
        .select(`
          *,
          team_memberships!inner(team_id),
          tournament_players(tournament_id)
        `)
        .eq('team_memberships.team_id', teamId)
        .eq('is_active', true)

      if (error) {
        console.error('Error fetching available players:', error)
        return []
      }

      // Filter eligible players
      const eligiblePlayers = []
      for (const player of players || []) {
        const eligibility = await this.checkPlayerEligibility(player.id, matchId)
        if (eligibility.is_eligible) {
          eligiblePlayers.push(player)
        }
      }

      return eligiblePlayers
    } catch (error) {
      console.error('Error getting available players:', error)
      return []
    }
  }

  /**
   * Log team sheet action
   */
  private async logTeamSheetAction(
    teamSheetId: string,
    action: string,
    performedBy: string,
    notes?: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('team_sheet_actions')
      .insert({
        team_sheet_id: teamSheetId,
        action,
        performed_by: performedBy,
        notes,
        performed_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error logging team sheet action:', error)
    }
  }

  /**
   * Get team sheet action history
   */
  async getTeamSheetActionHistory(teamSheetId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('team_sheet_actions')
      .select('*')
      .eq('team_sheet_id', teamSheetId)
      .order('performed_at', { ascending: false })

    if (error) {
      console.error('Error fetching team sheet action history:', error)
      return []
    }

    return data || []
  }

  /**
   * Finalize team sheets (lock them for match)
   */
  async finalizeTeamSheets(matchId: string, finalizedBy: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('team_sheets')
        .update({
          status: 'final',
          updated_at: new Date().toISOString()
        })
        .eq('match_id', matchId)
        .eq('status', 'approved')

      if (error) {
        console.error('Error finalizing team sheets:', error)
        return false
      }

      // Log finalization
      const teamSheets = await this.getMatchTeamSheets(matchId)
      for (const teamSheet of teamSheets) {
        await this.logTeamSheetAction(teamSheet.id, 'finalized', finalizedBy, 'Team sheets finalized for match')
      }

      return true
    } catch (error) {
      console.error('Error finalizing team sheets:', error)
      return false
    }
  }

  /**
   * Get team sheet statistics
   */
  async getTeamSheetStatistics(matchId: string): Promise<{
    total_team_sheets: number
    submitted_team_sheets: number
    approved_team_sheets: number
    pending_team_sheets: number
    rejected_team_sheets: number
  }> {
    const { data, error } = await this.supabase
      .from('team_sheets')
      .select('status')
      .eq('match_id', matchId)

    if (error) {
      console.error('Error fetching team sheet statistics:', error)
      return {
        total_team_sheets: 0,
        submitted_team_sheets: 0,
        approved_team_sheets: 0,
        pending_team_sheets: 0,
        rejected_team_sheets: 0
      }
    }

    const stats = {
      total_team_sheets: data.length,
      submitted_team_sheets: data.filter(ts => ts.status === 'submitted').length,
      approved_team_sheets: data.filter(ts => ts.status === 'approved').length,
      pending_team_sheets: data.filter(ts => ts.status === 'draft').length,
      rejected_team_sheets: data.filter(ts => ts.status === 'rejected').length
    }

    return stats
  }
}

// Export singleton instance
export const teamSheetService = new TeamSheetService(null as any)
