import { Database } from '@/lib/supabase/types'

export type TournamentStatus = 'draft' | 'registration' | 'active' | 'completed' | 'cancelled'
export type WorkflowAction = 'start_registration' | 'close_registration' | 'start_tournament' | 'complete_tournament' | 'cancel_tournament'

export interface TournamentWorkflowState {
  current_status: TournamentStatus
  can_perform_actions: WorkflowAction[]
  requirements_met: boolean
  missing_requirements: string[]
  next_status: TournamentStatus | null
  estimated_completion_date?: string
}

export interface WorkflowTransition {
  from_status: TournamentStatus
  to_status: TournamentStatus
  action: WorkflowAction
  requirements: string[]
  automatic: boolean
  description: string
}

export interface TournamentWorkflowLog {
  id: string
  tournament_id: string
  from_status: TournamentStatus
  to_status: TournamentStatus
  action: WorkflowAction
  performed_by: string
  performed_at: string
  notes?: string
  automatic: boolean
}

export class TournamentWorkflowService {
  private readonly workflowTransitions: WorkflowTransition[] = [
    {
      from_status: 'draft',
      to_status: 'registration',
      action: 'start_registration',
      requirements: ['has_name', 'has_dates', 'has_format', 'has_max_teams'],
      automatic: false,
      description: 'Open tournament for team registration'
    },
    {
      from_status: 'registration',
      to_status: 'active',
      action: 'close_registration',
      requirements: ['has_minimum_teams', 'registration_deadline_passed', 'has_schedule'],
      automatic: true,
      description: 'Close registration and start tournament'
    },
    {
      from_status: 'registration',
      to_status: 'active',
      action: 'start_tournament',
      requirements: ['has_minimum_teams', 'has_schedule'],
      automatic: false,
      description: 'Manually start tournament before registration deadline'
    },
    {
      from_status: 'active',
      to_status: 'completed',
      action: 'complete_tournament',
      requirements: ['all_matches_completed', 'standings_finalized'],
      automatic: true,
      description: 'Complete tournament when all matches are finished'
    },
    {
      from_status: 'draft',
      to_status: 'cancelled',
      action: 'cancel_tournament',
      requirements: [],
      automatic: false,
      description: 'Cancel tournament'
    },
    {
      from_status: 'registration',
      to_status: 'cancelled',
      action: 'cancel_tournament',
      requirements: [],
      automatic: false,
      description: 'Cancel tournament during registration'
    },
    {
      from_status: 'active',
      to_status: 'cancelled',
      action: 'cancel_tournament',
      requirements: [],
      automatic: false,
      description: 'Cancel active tournament'
    }
  ]

  constructor(private supabase: any) {}

  /**
   * Get current workflow state for a tournament
   */
  async getTournamentWorkflowState(tournamentId: string): Promise<TournamentWorkflowState> {
    const tournament = await this.getTournament(tournamentId)
    if (!tournament) {
      throw new Error('Tournament not found')
    }

    const currentStatus = tournament.tournament_status as TournamentStatus
    const availableTransitions = this.workflowTransitions.filter(t => t.from_status === currentStatus)
    
    const canPerformActions: WorkflowAction[] = []
    const missingRequirements: string[] = []

    for (const transition of availableTransitions) {
      const requirementsMet = await this.checkTransitionRequirements(tournamentId, transition)
      if (requirementsMet.met) {
        canPerformActions.push(transition.action)
      } else {
        missingRequirements.push(...requirementsMet.missing)
      }
    }

    const nextStatus = availableTransitions.find(t => t.automatic)?.to_status || null
    const estimatedCompletionDate = await this.estimateCompletionDate(tournamentId, currentStatus)

    return {
      current_status: currentStatus,
      can_perform_actions: canPerformActions,
      requirements_met: missingRequirements.length === 0,
      missing_requirements: [...new Set(missingRequirements)],
      next_status: nextStatus,
      estimated_completion_date: estimatedCompletionDate
    }
  }

  /**
   * Perform a workflow action
   */
  async performWorkflowAction(
    tournamentId: string, 
    action: WorkflowAction, 
    performedBy: string,
    notes?: string
  ): Promise<boolean> {
    const tournament = await this.getTournament(tournamentId)
    if (!tournament) {
      throw new Error('Tournament not found')
    }

    const currentStatus = tournament.tournament_status as TournamentStatus
    const transition = this.workflowTransitions.find(
      t => t.from_status === currentStatus && t.action === action
    )

    if (!transition) {
      throw new Error(`Invalid action ${action} for status ${currentStatus}`)
    }

    // Check requirements
    const requirementsCheck = await this.checkTransitionRequirements(tournamentId, transition)
    if (!requirementsCheck.met) {
      throw new Error(`Requirements not met: ${requirementsCheck.missing.join(', ')}`)
    }

    // Perform the transition
    const success = await this.transitionTournamentStatus(
      tournamentId,
      transition.to_status,
      action,
      performedBy,
      notes
    )

    if (success) {
      // Log the workflow action
      await this.logWorkflowAction({
        tournament_id: tournamentId,
        from_status: currentStatus,
        to_status: transition.to_status,
        action,
        performed_by: performedBy,
        performed_at: new Date().toISOString(),
        notes,
        automatic: false
      })

      // Trigger post-transition actions
      await this.handlePostTransitionActions(tournamentId, transition.to_status)
    }

    return success
  }

  /**
   * Check if tournament meets requirements for a transition
   */
  private async checkTransitionRequirements(
    tournamentId: string, 
    transition: WorkflowTransition
  ): Promise<{ met: boolean; missing: string[] }> {
    const tournament = await this.getTournament(tournamentId)
    if (!tournament) {
      return { met: false, missing: ['tournament_not_found'] }
    }

    const missing: string[] = []

    for (const requirement of transition.requirements) {
      const met = await this.checkRequirement(tournamentId, requirement, tournament)
      if (!met) {
        missing.push(requirement)
      }
    }

    return { met: missing.length === 0, missing }
  }

  /**
   * Check individual requirement
   */
  private async checkRequirement(tournamentId: string, requirement: string, tournament: any): Promise<boolean> {
    switch (requirement) {
      case 'has_name':
        return !!tournament.name && tournament.name.length >= 2

      case 'has_dates':
        return !!tournament.start_date && !!tournament.end_date

      case 'has_format':
        return !!tournament.format

      case 'has_max_teams':
        return !!tournament.max_teams && tournament.max_teams >= 2

      case 'has_minimum_teams':
        const registeredTeams = await this.getRegisteredTeamCount(tournamentId)
        return registeredTeams >= 2

      case 'registration_deadline_passed':
        return tournament.registration_deadline 
          ? new Date() > new Date(tournament.registration_deadline)
          : false

      case 'has_schedule':
        const matchCount = await this.getScheduledMatchCount(tournamentId)
        return matchCount > 0

      case 'all_matches_completed':
        const { completed, total } = await this.getMatchCompletionStatus(tournamentId)
        return completed === total && total > 0

      case 'standings_finalized':
        // For now, assume standings are automatically calculated
        return true

      default:
        return false
    }
  }

  /**
   * Transition tournament status
   */
  private async transitionTournamentStatus(
    tournamentId: string,
    newStatus: TournamentStatus,
    action: WorkflowAction,
    performedBy: string,
    notes?: string
  ): Promise<boolean> {
    const { error } = await this.supabase
      .from('tournaments')
      .update({ 
        tournament_status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', tournamentId)

    if (error) {
      console.error('Error updating tournament status:', error)
      return false
    }

    return true
  }

  /**
   * Handle post-transition actions
   */
  private async handlePostTransitionActions(tournamentId: string, newStatus: TournamentStatus): Promise<void> {
    switch (newStatus) {
      case 'registration':
        await this.notifyTeamsRegistrationOpened(tournamentId)
        break

      case 'active':
        await this.notifyTeamsTournamentStarted(tournamentId)
        await this.generateInitialStandings(tournamentId)
        break

      case 'completed':
        await this.finalizeTournamentResults(tournamentId)
        await this.notifyTeamsTournamentCompleted(tournamentId)
        break

      case 'cancelled':
        await this.notifyTeamsTournamentCancelled(tournamentId)
        break
    }
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
   * Get registered team count
   */
  private async getRegisteredTeamCount(tournamentId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('tournament_teams')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId)
      .eq('registration_status', 'approved')

    return error ? 0 : (count || 0)
  }

  /**
   * Get scheduled match count
   */
  private async getScheduledMatchCount(tournamentId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId)

    return error ? 0 : (count || 0)
  }

  /**
   * Get match completion status
   */
  private async getMatchCompletionStatus(tournamentId: string): Promise<{ completed: number; total: number }> {
    const { data, error } = await this.supabase
      .from('matches')
      .select('status')
      .eq('tournament_id', tournamentId)

    if (error) {
      return { completed: 0, total: 0 }
    }

    const total = data.length
    const completed = data.filter(match => match.status === 'completed').length

    return { completed, total }
  }

  /**
   * Estimate completion date
   */
  private async estimateCompletionDate(tournamentId: string, currentStatus: TournamentStatus): Promise<string | undefined> {
    const tournament = await this.getTournament(tournamentId)
    if (!tournament) return undefined

    switch (currentStatus) {
      case 'draft':
        return tournament.registration_deadline
      case 'registration':
        return tournament.start_date
      case 'active':
        return tournament.end_date
      default:
        return undefined
    }
  }

  /**
   * Log workflow action
   */
  private async logWorkflowAction(log: Omit<TournamentWorkflowLog, 'id'>): Promise<void> {
    const { error } = await this.supabase
      .from('tournament_workflow_logs')
      .insert(log)

    if (error) {
      console.error('Error logging workflow action:', error)
    }
  }

  /**
   * Notification methods (placeholder implementations)
   */
  private async notifyTeamsRegistrationOpened(tournamentId: string): Promise<void> {
    // Implementation would send notifications to teams
    console.log(`Registration opened for tournament ${tournamentId}`)
  }

  private async notifyTeamsTournamentStarted(tournamentId: string): Promise<void> {
    // Implementation would send notifications to teams
    console.log(`Tournament started: ${tournamentId}`)
  }

  private async notifyTeamsTournamentCompleted(tournamentId: string): Promise<void> {
    // Implementation would send notifications to teams
    console.log(`Tournament completed: ${tournamentId}`)
  }

  private async notifyTeamsTournamentCancelled(tournamentId: string): Promise<void> {
    // Implementation would send notifications to teams
    console.log(`Tournament cancelled: ${tournamentId}`)
  }

  /**
   * Generate initial standings
   */
  private async generateInitialStandings(tournamentId: string): Promise<void> {
    // Implementation would generate initial standings for all teams
    console.log(`Generating initial standings for tournament ${tournamentId}`)
  }

  /**
   * Finalize tournament results
   */
  private async finalizeTournamentResults(tournamentId: string): Promise<void> {
    // Implementation would finalize all results and standings
    console.log(`Finalizing results for tournament ${tournamentId}`)
  }

  /**
   * Get workflow history for a tournament
   */
  async getWorkflowHistory(tournamentId: string): Promise<TournamentWorkflowLog[]> {
    const { data, error } = await this.supabase
      .from('tournament_workflow_logs')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('performed_at', { ascending: false })

    if (error) {
      console.error('Error fetching workflow history:', error)
      return []
    }

    return data || []
  }

  /**
   * Auto-transition tournaments based on conditions
   */
  async processAutomaticTransitions(): Promise<void> {
    const tournaments = await this.getTournamentsNeedingAutoTransition()
    
    for (const tournament of tournaments) {
      try {
        const state = await this.getTournamentWorkflowState(tournament.id)
        const automaticTransitions = this.workflowTransitions.filter(
          t => t.from_status === state.current_status && t.automatic
        )

        for (const transition of automaticTransitions) {
          const requirementsCheck = await this.checkTransitionRequirements(tournament.id, transition)
          if (requirementsCheck.met) {
            await this.performWorkflowAction(
              tournament.id,
              transition.action,
              'system',
              'Automatic transition triggered'
            )
          }
        }
      } catch (error) {
        console.error(`Error processing auto-transition for tournament ${tournament.id}:`, error)
      }
    }
  }

  /**
   * Get tournaments that might need automatic transitions
   */
  private async getTournamentsNeedingAutoTransition(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('tournaments')
      .select('*')
      .in('tournament_status', ['registration', 'active'])
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching tournaments for auto-transition:', error)
      return []
    }

    return data || []
  }
}

// Export singleton instance
export const tournamentWorkflowService = new TournamentWorkflowService(null as any)
