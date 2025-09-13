import { Database } from '@/lib/supabase/types'

export type MatchStatus = 'scheduled' | 'live' | 'paused' | 'half_time' | 'second_half' | 'completed' | 'cancelled' | 'postponed'
export type MatchPhase = 'pre_match' | 'first_half' | 'half_time' | 'second_half' | 'post_match' | 'extra_time' | 'penalties'
export type WorkflowAction = 'start_match' | 'pause_match' | 'resume_match' | 'end_half' | 'start_second_half' | 'end_match' | 'cancel_match' | 'postpone_match'

export interface MatchWorkflowState {
  match_id: string
  current_status: MatchStatus
  current_phase: MatchPhase
  can_perform_actions: WorkflowAction[]
  match_time: {
    elapsed_minutes: number
    total_minutes: number
    is_running: boolean
    current_half: number
    added_time: number
  }
  requirements_met: boolean
  missing_requirements: string[]
  next_status: MatchStatus | null
  estimated_completion_time?: string
}

export interface MatchWorkflowTransition {
  from_status: MatchStatus
  to_status: MatchStatus
  from_phase: MatchPhase
  to_phase: MatchPhase
  action: WorkflowAction
  requirements: string[]
  automatic: boolean
  description: string
  duration_minutes?: number
}

export interface MatchWorkflowLog {
  id: string
  match_id: string
  from_status: MatchStatus
  to_status: MatchStatus
  from_phase: MatchPhase
  to_phase: MatchPhase
  action: WorkflowAction
  performed_by: string
  performed_at: string
  notes?: string
  automatic: boolean
  match_time_elapsed?: number
}

export interface MatchTimerState {
  match_id: string
  is_running: boolean
  current_half: number
  elapsed_minutes: number
  total_minutes: number
  added_time: number
  start_time?: string
  pause_time?: string
  total_pause_duration: number
}

export interface MatchEventData {
  event_type: 'goal' | 'own_goal' | 'penalty_goal' | 'yellow_card' | 'red_card' | 'second_yellow_card' | 'substitution' | 'corner' | 'free_kick' | 'penalty_miss' | 'offside' | 'foul'
  minute: number
  second_minute?: number
  team_id: string
  player_id?: string
  assist_player_id?: string
  substituted_player_id?: string
  description?: string
}

export class MatchWorkflowService {
  private readonly workflowTransitions: MatchWorkflowTransition[] = [
    {
      from_status: 'scheduled',
      to_status: 'live',
      from_phase: 'pre_match',
      to_phase: 'first_half',
      action: 'start_match',
      requirements: ['teams_confirmed', 'officials_assigned', 'venue_available'],
      automatic: false,
      description: 'Start the match',
      duration_minutes: 0
    },
    {
      from_status: 'live',
      to_status: 'paused',
      from_phase: 'first_half',
      to_phase: 'first_half',
      action: 'pause_match',
      requirements: [],
      automatic: false,
      description: 'Pause the match'
    },
    {
      from_status: 'paused',
      to_status: 'live',
      from_phase: 'first_half',
      to_phase: 'first_half',
      action: 'resume_match',
      requirements: [],
      automatic: false,
      description: 'Resume the match'
    },
    {
      from_status: 'live',
      to_status: 'half_time',
      from_phase: 'first_half',
      to_phase: 'half_time',
      action: 'end_half',
      requirements: ['half_time_reached'],
      automatic: true,
      description: 'End of first half',
      duration_minutes: 45
    },
    {
      from_status: 'half_time',
      to_status: 'live',
      from_phase: 'half_time',
      to_phase: 'second_half',
      action: 'start_second_half',
      requirements: ['half_time_break_completed'],
      automatic: false,
      description: 'Start second half'
    },
    {
      from_status: 'live',
      to_status: 'completed',
      from_phase: 'second_half',
      to_phase: 'post_match',
      action: 'end_match',
      requirements: ['full_time_reached'],
      automatic: true,
      description: 'End of match',
      duration_minutes: 90
    },
    {
      from_status: 'scheduled',
      to_status: 'cancelled',
      from_phase: 'pre_match',
      to_phase: 'pre_match',
      action: 'cancel_match',
      requirements: [],
      automatic: false,
      description: 'Cancel the match'
    },
    {
      from_status: 'scheduled',
      to_status: 'postponed',
      from_phase: 'pre_match',
      to_phase: 'pre_match',
      action: 'postpone_match',
      requirements: [],
      automatic: false,
      description: 'Postpone the match'
    }
  ]

  constructor(private supabase: any) {}

  /**
   * Get current workflow state for a match
   */
  async getMatchWorkflowState(matchId: string): Promise<MatchWorkflowState> {
    const match = await this.getMatch(matchId)
    if (!match) {
      throw new Error('Match not found')
    }

    const currentStatus = match.status as MatchStatus
    const currentPhase = this.determineMatchPhase(currentStatus, match)
    const availableTransitions = this.workflowTransitions.filter(t => t.from_status === currentStatus)
    
    const canPerformActions: WorkflowAction[] = []
    const missingRequirements: string[] = []

    for (const transition of availableTransitions) {
      const requirementsMet = await this.checkTransitionRequirements(matchId, transition)
      if (requirementsMet.met) {
        canPerformActions.push(transition.action)
      } else {
        missingRequirements.push(...requirementsMet.missing)
      }
    }

    const nextStatus = availableTransitions.find(t => t.automatic)?.to_status || null
    const matchTime = await this.getMatchTimerState(matchId)
    const estimatedCompletionTime = this.calculateEstimatedCompletionTime(match, matchTime)

    return {
      match_id: matchId,
      current_status: currentStatus,
      current_phase: currentPhase,
      can_perform_actions: canPerformActions,
      match_time: matchTime,
      requirements_met: missingRequirements.length === 0,
      missing_requirements: Array.from(new Set(missingRequirements)),
      next_status: nextStatus,
      estimated_completion_time: estimatedCompletionTime
    }
  }

  /**
   * Perform a workflow action
   */
  async performWorkflowAction(
    matchId: string,
    action: WorkflowAction,
    performedBy: string,
    notes?: string
  ): Promise<boolean> {
    const match = await this.getMatch(matchId)
    if (!match) {
      throw new Error('Match not found')
    }

    const currentStatus = match.status as MatchStatus
    const currentPhase = this.determineMatchPhase(currentStatus, match)
    const transition = this.workflowTransitions.find(
      t => t.from_status === currentStatus && t.action === action
    )

    if (!transition) {
      throw new Error(`Invalid action ${action} for status ${currentStatus}`)
    }

    // Check requirements
    const requirementsCheck = await this.checkTransitionRequirements(matchId, transition)
    if (!requirementsCheck.met) {
      throw new Error(`Requirements not met: ${requirementsCheck.missing.join(', ')}`)
    }

    // Perform the transition
    const success = await this.transitionMatchStatus(
      matchId,
      transition.to_status,
      transition.to_phase,
      action,
      performedBy,
      notes
    )

    if (success) {
      // Log the workflow action
      await this.logWorkflowAction({
        match_id: matchId,
        from_status: currentStatus,
        to_status: transition.to_status,
        from_phase: currentPhase,
        to_phase: transition.to_phase,
        action,
        performed_by: performedBy,
        performed_at: new Date().toISOString(),
        notes,
        automatic: false
      })

      // Handle post-transition actions
      await this.handlePostTransitionActions(matchId, transition.to_status, transition.to_phase)
    }

    return success
  }

  /**
   * Start match timer
   */
  async startMatchTimer(matchId: string): Promise<boolean> {
    const now = new Date().toISOString()
    
    const { error } = await this.supabase
      .from('matches')
      .update({
        actual_start_time: now,
        status: 'live',
        updated_at: now
      })
      .eq('id', matchId)

    if (error) {
      console.error('Error starting match timer:', error)
      return false
    }

    // Initialize match timer state
    await this.initializeMatchTimer(matchId)
    
    return true
  }

  /**
   * Pause match timer
   */
  async pauseMatchTimer(matchId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('matches')
      .update({
        status: 'paused',
        updated_at: new Date().toISOString()
      })
      .eq('id', matchId)

    if (error) {
      console.error('Error pausing match timer:', error)
      return false
    }

    // Update timer state
    await this.updateMatchTimerState(matchId, { is_running: false, pause_time: new Date().toISOString() })
    
    return true
  }

  /**
   * Resume match timer
   */
  async resumeMatchTimer(matchId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('matches')
      .update({
        status: 'live',
        updated_at: new Date().toISOString()
      })
      .eq('id', matchId)

    if (error) {
      console.error('Error resuming match timer:', error)
      return false
    }

    // Update timer state
    await this.updateMatchTimerState(matchId, { is_running: true, pause_time: undefined })
    
    return true
  }

  /**
   * End match timer
   */
  async endMatchTimer(matchId: string): Promise<boolean> {
    const now = new Date().toISOString()
    
    const { error } = await this.supabase
      .from('matches')
      .update({
        status: 'completed',
        actual_end_time: now,
        updated_at: now
      })
      .eq('id', matchId)

    if (error) {
      console.error('Error ending match timer:', error)
      return false
    }

    // Finalize match timer state
    await this.finalizeMatchTimer(matchId)
    
    return true
  }

  /**
   * Add match event
   */
  async addMatchEvent(matchId: string, eventData: MatchEventData): Promise<boolean> {
    const match = await this.getMatch(matchId)
    if (!match) {
      throw new Error('Match not found')
    }

    // Validate match is live
    if (match.status !== 'live') {
      throw new Error('Cannot add events to a non-live match')
    }

    const { error } = await this.supabase
      .from('match_events')
      .insert({
        match_id: matchId,
        player_id: eventData.player_id,
        team_id: eventData.team_id,
        event_type: eventData.event_type,
        minute: eventData.minute,
        second_minute: eventData.second_minute,
        description: eventData.description,
        assist_player_id: eventData.assist_player_id,
        substituted_player_id: eventData.substituted_player_id
      })

    if (error) {
      console.error('Error adding match event:', error)
      return false
    }

    // Update match statistics if needed
    await this.updateMatchStatistics(matchId, eventData)

    return true
  }

  /**
   * Get match timer state
   */
  async getMatchTimerState(matchId: string): Promise<MatchWorkflowState['match_time']> {
    // This would typically be stored in a separate match_timer table
    // For now, we'll calculate based on match data
    const match = await this.getMatch(matchId)
    if (!match) {
      return {
        elapsed_minutes: 0,
        total_minutes: 90,
        is_running: false,
        current_half: 1,
        added_time: 0
      }
    }

    let elapsedMinutes = 0
    let isRunning = false
    let currentHalf = 1

    if (match.actual_start_time) {
      const startTime = new Date(match.actual_start_time)
      const now = new Date()
      const diffMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60))
      
      // Determine current half and elapsed time
      if (match.status === 'live' || match.status === 'paused') {
        isRunning = match.status === 'live'
        
        if (diffMinutes <= 45) {
          currentHalf = 1
          elapsedMinutes = diffMinutes
        } else if (diffMinutes <= 90) {
          currentHalf = 2
          elapsedMinutes = diffMinutes - 45
        } else {
          currentHalf = 2
          elapsedMinutes = 45 // End of second half
        }
      }
    }

    return {
      elapsed_minutes: elapsedMinutes,
      total_minutes: 90,
      is_running: isRunning,
      current_half: currentHalf,
      added_time: 0 // This would be calculated based on stoppage time
    }
  }

  /**
   * Determine match phase based on status and match data
   */
  private determineMatchPhase(status: MatchStatus, match: any): MatchPhase {
    switch (status) {
      case 'scheduled':
        return 'pre_match'
      case 'live':
        const matchTime = this.calculateMatchTime(match)
        if (matchTime <= 45) return 'first_half'
        if (matchTime <= 90) return 'second_half'
        return 'extra_time'
      case 'paused':
        const pausedTime = this.calculateMatchTime(match)
        if (pausedTime <= 45) return 'first_half'
        return 'second_half'
      case 'half_time':
        return 'half_time'
      case 'completed':
        return 'post_match'
      case 'cancelled':
      case 'postponed':
        return 'pre_match'
      default:
        return 'pre_match'
    }
  }

  /**
   * Calculate match time based on match data
   */
  private calculateMatchTime(match: any): number {
    if (!match.actual_start_time) return 0
    
    const startTime = new Date(match.actual_start_time)
    const now = new Date()
    return Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60))
  }

  /**
   * Check if match meets requirements for a transition
   */
  private async checkTransitionRequirements(
    matchId: string,
    transition: MatchWorkflowTransition
  ): Promise<{ met: boolean; missing: string[] }> {
    const match = await this.getMatch(matchId)
    if (!match) {
      return { met: false, missing: ['match_not_found'] }
    }

    const missing: string[] = []

    for (const requirement of transition.requirements) {
      const met = await this.checkRequirement(matchId, requirement, match)
      if (!met) {
        missing.push(requirement)
      }
    }

    return { met: missing.length === 0, missing }
  }

  /**
   * Check individual requirement
   */
  private async checkRequirement(matchId: string, requirement: string, match: any): Promise<boolean> {
    switch (requirement) {
      case 'teams_confirmed':
        return !!match.home_team_id && !!match.away_team_id

      case 'officials_assigned':
        // Check if at least one official is assigned
        const { data: officials } = await this.supabase
          .from('match_officials')
          .select('id')
          .eq('match_id', matchId)
        return officials && officials.length > 0

      case 'venue_available':
        // Check venue availability (simplified)
        return !!match.venue_id || !!match.venue

      case 'half_time_reached':
        const matchTime = this.calculateMatchTime(match)
        return matchTime >= 45

      case 'full_time_reached':
        const fullMatchTime = this.calculateMatchTime(match)
        return fullMatchTime >= 90

      case 'half_time_break_completed':
        // For now, assume half-time break is always completed
        return true

      default:
        return false
    }
  }

  /**
   * Transition match status
   */
  private async transitionMatchStatus(
    matchId: string,
    newStatus: MatchStatus,
    newPhase: MatchPhase,
    action: WorkflowAction,
    performedBy: string,
    notes?: string
  ): Promise<boolean> {
    const updateData: any = {
      status: newStatus,
      updated_at: new Date().toISOString()
    }

    // Set specific timestamps based on action
    switch (action) {
      case 'start_match':
        updateData.actual_start_time = new Date().toISOString()
        break
      case 'end_match':
        updateData.actual_end_time = new Date().toISOString()
        break
    }

    const { error } = await this.supabase
      .from('matches')
      .update(updateData)
      .eq('id', matchId)

    if (error) {
      console.error('Error updating match status:', error)
      return false
    }

    return true
  }

  /**
   * Handle post-transition actions
   */
  private async handlePostTransitionActions(matchId: string, newStatus: MatchStatus, newPhase: MatchPhase): Promise<void> {
    switch (newStatus) {
      case 'live':
        if (newPhase === 'first_half') {
          await this.notifyMatchStarted(matchId)
        } else if (newPhase === 'second_half') {
          await this.notifySecondHalfStarted(matchId)
        }
        break

      case 'half_time':
        await this.notifyHalfTime(matchId)
        break

      case 'completed':
        await this.finalizeMatchResults(matchId)
        await this.notifyMatchCompleted(matchId)
        break

      case 'cancelled':
        await this.notifyMatchCancelled(matchId)
        break

      case 'postponed':
        await this.notifyMatchPostponed(matchId)
        break
    }
  }

  /**
   * Get match by ID
   */
  private async getMatch(matchId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single()

    if (error) {
      console.error('Error fetching match:', error)
      return null
    }

    return data
  }

  /**
   * Log workflow action
   */
  private async logWorkflowAction(log: Omit<MatchWorkflowLog, 'id'>): Promise<void> {
    const { error } = await this.supabase
      .from('match_workflow_logs')
      .insert(log)

    if (error) {
      console.error('Error logging workflow action:', error)
    }
  }

  /**
   * Initialize match timer
   */
  private async initializeMatchTimer(matchId: string): Promise<void> {
    try {
      // Check if timer state already exists
      const { data: existingState, error: fetchError } = await this.supabase
        .from('match_timer_states')
        .select('*')
        .eq('match_id', matchId)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking existing timer state:', fetchError)
        return
      }

      if (!existingState) {
        // Create new timer state
        const newState: MatchTimerInsert = {
          match_id: matchId,
          is_running: false,
          current_half: 1,
          elapsed_minutes: 0,
          total_minutes: 90,
          added_time: 0,
          total_pause_duration: 0
        }

        const { error: insertError } = await this.supabase
          .from('match_timer_states')
          .insert(newState)

        if (insertError) {
          console.error('Error creating timer state:', insertError)
        } else {
          console.log(`Timer state initialized for match ${matchId}`)
        }
      }
    } catch (error) {
      console.error('Error initializing match timer:', error)
    }
  }

  /**
   * Update match timer state
   */
  private async updateMatchTimerState(matchId: string, updates: Partial<MatchTimerState>): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('match_timer_states')
        .update({
          ...updates,
          last_updated: new Date().toISOString()
        })
        .eq('match_id', matchId)

      if (error) {
        console.error('Error updating timer state:', error)
      }
    } catch (error) {
      console.error('Error in updateMatchTimerState:', error)
    }
  }

  /**
   * Finalize match timer
   */
  private async finalizeMatchTimer(matchId: string): Promise<void> {
    try {
      // Get current timer state
      const { data: currentState, error: fetchError } = await this.supabase
        .from('match_timer_states')
        .select('*')
        .eq('match_id', matchId)
        .single()

      if (fetchError) {
        console.error('Error fetching timer state for finalization:', fetchError)
        return
      }

      if (currentState) {
        // Finalize timer state
        const { error } = await this.supabase
          .from('match_timer_states')
          .update({
            is_running: false,
            last_updated: new Date().toISOString()
          })
          .eq('match_id', matchId)

        if (error) {
          console.error('Error finalizing timer state:', error)
        } else {
          console.log(`Timer state finalized for match ${matchId}`)
        }
      }
    } catch (error) {
      console.error('Error finalizing match timer:', error)
    }
  }

  /**
   * Update match statistics
   */
  private async updateMatchStatistics(matchId: string, eventData: MatchEventData): Promise<void> {
    // Implementation would update match statistics based on event
    console.log(`Updating match statistics for match ${matchId}:`, eventData)
  }

  /**
   * Calculate estimated completion time
   */
  private calculateEstimatedCompletionTime(match: any, matchTime: MatchWorkflowState['match_time']): string | undefined {
    if (match.status === 'completed') return undefined
    
    const remainingMinutes = matchTime.total_minutes - matchTime.elapsed_minutes
    const estimatedCompletion = new Date(Date.now() + remainingMinutes * 60 * 1000)
    
    return estimatedCompletion.toISOString()
  }

  /**
   * Notification methods (placeholder implementations)
   */
  private async notifyMatchStarted(matchId: string): Promise<void> {
    console.log(`Match started: ${matchId}`)
  }

  private async notifySecondHalfStarted(matchId: string): Promise<void> {
    console.log(`Second half started: ${matchId}`)
  }

  private async notifyHalfTime(matchId: string): Promise<void> {
    console.log(`Half time: ${matchId}`)
  }

  private async notifyMatchCompleted(matchId: string): Promise<void> {
    console.log(`Match completed: ${matchId}`)
  }

  private async notifyMatchCancelled(matchId: string): Promise<void> {
    console.log(`Match cancelled: ${matchId}`)
  }

  private async notifyMatchPostponed(matchId: string): Promise<void> {
    console.log(`Match postponed: ${matchId}`)
  }

  /**
   * Finalize match results
   */
  private async finalizeMatchResults(matchId: string): Promise<void> {
    // Implementation would finalize all results and statistics
    console.log(`Finalizing match results for ${matchId}`)
  }

  /**
   * Get workflow history for a match
   */
  async getWorkflowHistory(matchId: string): Promise<MatchWorkflowLog[]> {
    const { data, error } = await this.supabase
      .from('match_workflow_logs')
      .select('*')
      .eq('match_id', matchId)
      .order('performed_at', { ascending: false })

    if (error) {
      console.error('Error fetching workflow history:', error)
      return []
    }

    return data || []
  }

  /**
   * Auto-transition matches based on conditions
   */
  async processAutomaticTransitions(): Promise<void> {
    const matches = await this.getMatchesNeedingAutoTransition()
    
    for (const match of matches) {
      try {
        const state = await this.getMatchWorkflowState(match.id)
        const automaticTransitions = this.workflowTransitions.filter(
          t => t.from_status === state.current_status && t.automatic
        )

        for (const transition of automaticTransitions) {
          const requirementsCheck = await this.checkTransitionRequirements(match.id, transition)
          if (requirementsCheck.met) {
            await this.performWorkflowAction(
              match.id,
              transition.action,
              'system',
              'Automatic transition triggered'
            )
          }
        }
      } catch (error) {
        console.error(`Error processing auto-transition for match ${match.id}:`, error)
      }
    }
  }

  /**
   * Get matches that might need automatic transitions
   */
  private async getMatchesNeedingAutoTransition(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('matches')
      .select('*')
      .in('status', ['live', 'half_time'])
      .not('actual_start_time', 'is', null)

    if (error) {
      console.error('Error fetching matches for auto-transition:', error)
      return []
    }

    return data || []
  }
}

// Export singleton instance
export const matchWorkflowService = new MatchWorkflowService(null as any)
