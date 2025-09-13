import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'

type Match = Database['public']['Tables']['matches']['Row']
type Tournament = Database['public']['Tables']['tournaments']['Row']
type Team = Database['public']['Tables']['teams']['Row']
type Venue = Database['public']['Tables']['venues']['Row']
type Referee = Database['public']['Tables']['referees']['Row']

export interface PostponementRequest {
  match_id: string
  reason: PostponementReason
  reason_description: string
  requested_by: string
  requested_at: string
  new_scheduled_date?: string
  new_venue_id?: string
  alternative_venues?: string[]
  affected_parties: AffectedParty[]
  urgency_level: 'low' | 'medium' | 'high' | 'critical'
  estimated_resolution_time?: string
  additional_notes?: string
}

export interface CancellationRequest {
  match_id: string
  reason: CancellationReason
  reason_description: string
  requested_by: string
  requested_at: string
  affected_parties: AffectedParty[]
  urgency_level: 'low' | 'medium' | 'high' | 'critical'
  refund_required: boolean
  refund_amount?: number
  additional_notes?: string
}

export interface AffectedParty {
  type: 'team' | 'referee' | 'venue' | 'spectator' | 'broadcaster'
  entity_id: string
  entity_name: string
  notification_sent: boolean
  response_required: boolean
  response_deadline?: string
  response_received?: boolean
}

export type PostponementReason = 
  | 'weather_conditions'
  | 'venue_unavailable'
  | 'referee_unavailable'
  | 'team_unavailable'
  | 'security_concerns'
  | 'technical_issues'
  | 'force_majeure'
  | 'scheduling_conflict'
  | 'other'

export type CancellationReason = 
  | 'weather_conditions'
  | 'venue_damage'
  | 'team_withdrawal'
  | 'referee_unavailable'
  | 'security_incident'
  | 'force_majeure'
  | 'tournament_cancellation'
  | 'other'

export interface PostponementWorkflow {
  id: string
  match_id: string
  status: 'pending' | 'approved' | 'rejected' | 'rescheduled' | 'cancelled'
  current_step: number
  total_steps: number
  steps: WorkflowStep[]
  created_at: string
  updated_at: string
  completed_at?: string
}

export interface WorkflowStep {
  step_number: number
  step_name: string
  description: string
  required_approvals: string[]
  approvals_received: Approval[]
  status: 'pending' | 'in_progress' | 'completed' | 'rejected'
  deadline?: string
  auto_approve_after?: string
}

export interface Approval {
  approver_id: string
  approver_name: string
  approver_role: string
  status: 'pending' | 'approved' | 'rejected'
  comments?: string
  approved_at?: string
  rejected_at?: string
}

export interface MatchReschedule {
  match_id: string
  original_scheduled_date: string
  new_scheduled_date: string
  original_venue_id?: string
  new_venue_id?: string
  reschedule_reason: string
  approved_by: string
  approved_at: string
  notification_sent: boolean
  affected_parties_notified: string[]
}

export interface PostponementImpact {
  match_id: string
  tournament_impact: {
    tournament_delay: boolean
    subsequent_matches_affected: number
    tournament_completion_delay: number
  }
  venue_impact: {
    venue_conflicts: string[]
    alternative_venues_available: string[]
    venue_availability_score: number
  }
  team_impact: {
    team_rest_periods: { [team_id: string]: number }
    team_travel_impact: { [team_id: string]: number }
    team_availability: { [team_id: string]: boolean }
  }
  referee_impact: {
    referee_availability: { [referee_id: string]: boolean }
    referee_workload_impact: { [referee_id: string]: number }
    alternative_referees: { [referee_id: string]: string[] }
  }
  financial_impact: {
    estimated_cost: number
    refund_required: boolean
    additional_costs: number
  }
}

export class MatchPostponementService {
  private supabase = createClientComponentClient<Database>()

  constructor() {}

  /**
   * Create a postponement request
   */
  async createPostponementRequest(request: Omit<PostponementRequest, 'requested_at'>): Promise<PostponementRequest> {
    try {
      const postponementRequest: PostponementRequest = {
        ...request,
        requested_at: new Date().toISOString()
      }

      // Save postponement request
      const { data, error } = await this.supabase
        .from('match_postponements')
        .insert([postponementRequest])
        .select()
        .single()

      if (error) throw error

      // Create workflow
      await this.createPostponementWorkflow(data.id, request.match_id)

      // Notify affected parties
      await this.notifyAffectedParties(request.affected_parties, 'postponement_request', request.match_id)

      // Update match status
      await this.updateMatchStatus(request.match_id, 'postponement_requested')

      return data

    } catch (error) {
      console.error('Error creating postponement request:', error)
      throw error
    }
  }

  /**
   * Create a cancellation request
   */
  async createCancellationRequest(request: Omit<CancellationRequest, 'requested_at'>): Promise<CancellationRequest> {
    try {
      const cancellationRequest: CancellationRequest = {
        ...request,
        requested_at: new Date().toISOString()
      }

      // Save cancellation request
      const { data, error } = await this.supabase
        .from('match_cancellations')
        .insert([cancellationRequest])
        .select()
        .single()

      if (error) throw error

      // Create workflow
      await this.createCancellationWorkflow(data.id, request.match_id)

      // Notify affected parties
      await this.notifyAffectedParties(request.affected_parties, 'cancellation_request', request.match_id)

      // Update match status
      await this.updateMatchStatus(request.match_id, 'cancellation_requested')

      return data

    } catch (error) {
      console.error('Error creating cancellation request:', error)
      throw error
    }
  }

  /**
   * Approve postponement request
   */
  async approvePostponementRequest(
    requestId: string, 
    approverId: string, 
    comments?: string,
    newSchedule?: { scheduled_date: string; venue_id?: string }
  ): Promise<boolean> {
    try {
      // Get postponement request
      const { data: request } = await this.supabase
        .from('match_postponements')
        .select('*')
        .eq('id', requestId)
        .single()

      if (!request) throw new Error('Postponement request not found')

      // Update workflow step
      await this.updateWorkflowStep(request.workflow_id, approverId, 'approved', comments)

      // Check if all approvals received
      const workflow = await this.getWorkflow(request.workflow_id)
      const allApproved = workflow.steps.every(step => 
        step.required_approvals.length === step.approvals_received.filter(a => a.status === 'approved').length
      )

      if (allApproved) {
        // Execute postponement
        await this.executePostponement(request.match_id, newSchedule)
        
        // Update workflow status
        await this.completeWorkflow(request.workflow_id)
        
        return true
      }

      return false

    } catch (error) {
      console.error('Error approving postponement request:', error)
      throw error
    }
  }

  /**
   * Reject postponement request
   */
  async rejectPostponementRequest(
    requestId: string, 
    approverId: string, 
    reason: string
  ): Promise<boolean> {
    try {
      // Get postponement request
      const { data: request } = await this.supabase
        .from('match_postponements')
        .select('*')
        .eq('id', requestId)
        .single()

      if (!request) throw new Error('Postponement request not found')

      // Update workflow step
      await this.updateWorkflowStep(request.workflow_id, approverId, 'rejected', reason)

      // Reject workflow
      await this.rejectWorkflow(request.workflow_id)

      // Update match status
      await this.updateMatchStatus(request.match_id, 'postponement_rejected')

      // Notify affected parties
      await this.notifyAffectedParties(request.affected_parties, 'postponement_rejected', request.match_id)

      return true

    } catch (error) {
      console.error('Error rejecting postponement request:', error)
      throw error
    }
  }

  /**
   * Execute postponement (reschedule match)
   */
  async executePostponement(
    matchId: string, 
    newSchedule?: { scheduled_date: string; venue_id?: string }
  ): Promise<MatchReschedule> {
    try {
      // Get match details
      const { data: match } = await this.supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single()

      if (!match) throw new Error('Match not found')

      // Create reschedule record
      const reschedule: MatchReschedule = {
        match_id: matchId,
        original_scheduled_date: match.scheduled_date,
        new_scheduled_date: newSchedule?.scheduled_date || match.scheduled_date,
        original_venue_id: match.venue_id || undefined,
        new_venue_id: newSchedule?.venue_id || match.venue_id || undefined,
        reschedule_reason: 'Postponement approved',
        approved_by: 'system',
        approved_at: new Date().toISOString(),
        notification_sent: false,
        affected_parties_notified: []
      }

      // Save reschedule record
      const { data: rescheduleData } = await this.supabase
        .from('match_reschedules')
        .insert([reschedule])
        .select()
        .single()

      // Update match
      await this.supabase
        .from('matches')
        .update({
          scheduled_date: reschedule.new_scheduled_date,
          venue_id: reschedule.new_venue_id,
          status: 'scheduled',
          updated_at: new Date().toISOString()
        })
        .eq('id', matchId)

      // Update match status
      await this.updateMatchStatus(matchId, 'rescheduled')

      // Notify affected parties
      await this.notifyMatchReschedule(matchId, reschedule)

      return rescheduleData

    } catch (error) {
      console.error('Error executing postponement:', error)
      throw error
    }
  }

  /**
   * Analyze postponement impact
   */
  async analyzePostponementImpact(matchId: string): Promise<PostponementImpact> {
    try {
      // Get match details
      const { data: match } = await this.supabase
        .from('matches')
        .select(`
          *,
          tournament:tournaments(*),
          home_team:teams!matches_home_team_id_fkey(*),
          away_team:teams!matches_away_team_id_fkey(*),
          venue:venues(*)
        `)
        .eq('id', matchId)
        .single()

      if (!match) throw new Error('Match not found')

      // Analyze tournament impact
      const tournamentImpact = await this.analyzeTournamentImpact(match.tournament_id, matchId)

      // Analyze venue impact
      const venueImpact = await this.analyzeVenueImpact(match.venue_id, match.scheduled_date)

      // Analyze team impact
      const teamImpact = await this.analyzeTeamImpact(match.home_team_id, match.away_team_id, match.scheduled_date)

      // Analyze referee impact
      const refereeImpact = await this.analyzeRefereeImpact(matchId, match.scheduled_date)

      // Analyze financial impact
      const financialImpact = await this.analyzeFinancialImpact(match)

      return {
        match_id: matchId,
        tournament_impact: tournamentImpact,
        venue_impact: venueImpact,
        team_impact: teamImpact,
        referee_impact: refereeImpact,
        financial_impact: financialImpact
      }

    } catch (error) {
      console.error('Error analyzing postponement impact:', error)
      throw error
    }
  }

  /**
   * Get postponement requests for a tournament
   */
  async getPostponementRequests(tournamentId: string): Promise<PostponementRequest[]> {
    try {
      const { data } = await this.supabase
        .from('match_postponements')
        .select(`
          *,
          match:matches!inner(*)
        `)
        .eq('match.tournament_id', tournamentId)
        .order('requested_at', { ascending: false })

      return data || []

    } catch (error) {
      console.error('Error getting postponement requests:', error)
      return []
    }
  }

  /**
   * Get cancellation requests for a tournament
   */
  async getCancellationRequests(tournamentId: string): Promise<CancellationRequest[]> {
    try {
      const { data } = await this.supabase
        .from('match_cancellations')
        .select(`
          *,
          match:matches!inner(*)
        `)
        .eq('match.tournament_id', tournamentId)
        .order('requested_at', { ascending: false })

      return data || []

    } catch (error) {
      console.error('Error getting cancellation requests:', error)
      return []
    }
  }

  /**
   * Get match reschedule history
   */
  async getMatchRescheduleHistory(matchId: string): Promise<MatchReschedule[]> {
    try {
      const { data } = await this.supabase
        .from('match_reschedules')
        .select('*')
        .eq('match_id', matchId)
        .order('approved_at', { ascending: false })

      return data || []

    } catch (error) {
      console.error('Error getting reschedule history:', error)
      return []
    }
  }

  /**
   * Private helper methods
   */
  private async createPostponementWorkflow(requestId: string, matchId: string): Promise<void> {
    const workflow: PostponementWorkflow = {
      id: `postponement_${requestId}`,
      match_id: matchId,
      status: 'pending',
      current_step: 1,
      total_steps: 3,
      steps: [
        {
          step_number: 1,
          step_name: 'Tournament Manager Review',
          description: 'Tournament manager reviews the postponement request',
          required_approvals: ['tournament_manager'],
          approvals_received: [],
          status: 'pending',
          deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        },
        {
          step_number: 2,
          step_name: 'Venue Coordinator Approval',
          description: 'Venue coordinator confirms venue availability',
          required_approvals: ['venue_coordinator'],
          approvals_received: [],
          status: 'pending',
          deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48 hours
        },
        {
          step_number: 3,
          step_name: 'Final Approval',
          description: 'Final approval from tournament director',
          required_approvals: ['tournament_director'],
          approvals_received: [],
          status: 'pending',
          deadline: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() // 72 hours
        }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    await this.supabase
      .from('postponement_workflows')
      .insert([workflow])

    // Update postponement request with workflow ID
    await this.supabase
      .from('match_postponements')
      .update({ workflow_id: workflow.id })
      .eq('id', requestId)
  }

  private async createCancellationWorkflow(requestId: string, matchId: string): Promise<void> {
    const workflow: PostponementWorkflow = {
      id: `cancellation_${requestId}`,
      match_id: matchId,
      status: 'pending',
      current_step: 1,
      total_steps: 2,
      steps: [
        {
          step_number: 1,
          step_name: 'Tournament Manager Review',
          description: 'Tournament manager reviews the cancellation request',
          required_approvals: ['tournament_manager'],
          approvals_received: [],
          status: 'pending',
          deadline: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString() // 12 hours
        },
        {
          step_number: 2,
          step_name: 'Financial Review',
          description: 'Financial team reviews refund requirements',
          required_approvals: ['financial_manager'],
          approvals_received: [],
          status: 'pending',
          deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    await this.supabase
      .from('cancellation_workflows')
      .insert([workflow])

    // Update cancellation request with workflow ID
    await this.supabase
      .from('match_cancellations')
      .update({ workflow_id: workflow.id })
      .eq('id', requestId)
  }

  private async updateWorkflowStep(
    workflowId: string, 
    approverId: string, 
    status: 'approved' | 'rejected', 
    comments?: string
  ): Promise<void> {
    // This would update the workflow step with the approval
    // Implementation depends on workflow table structure
  }

  private async getWorkflow(workflowId: string): Promise<PostponementWorkflow> {
    const { data } = await this.supabase
      .from('postponement_workflows')
      .select('*')
      .eq('id', workflowId)
      .single()

    return data
  }

  private async completeWorkflow(workflowId: string): Promise<void> {
    await this.supabase
      .from('postponement_workflows')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', workflowId)
  }

  private async rejectWorkflow(workflowId: string): Promise<void> {
    await this.supabase
      .from('postponement_workflows')
      .update({ 
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', workflowId)
  }

  private async updateMatchStatus(matchId: string, status: string): Promise<void> {
    await this.supabase
      .from('matches')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', matchId)
  }

  private async notifyAffectedParties(
    affectedParties: AffectedParty[], 
    notificationType: string, 
    matchId: string
  ): Promise<void> {
    // Implementation would send notifications to affected parties
    console.log(`Notifying ${affectedParties.length} parties about ${notificationType} for match ${matchId}`)
  }

  private async notifyMatchReschedule(matchId: string, reschedule: MatchReschedule): Promise<void> {
    // Implementation would send reschedule notifications
    console.log(`Notifying parties about reschedule for match ${matchId}`)
  }

  private async analyzeTournamentImpact(tournamentId: string, matchId: string): Promise<any> {
    // Analyze how postponement affects tournament schedule
    return {
      tournament_delay: false,
      subsequent_matches_affected: 0,
      tournament_completion_delay: 0
    }
  }

  private async analyzeVenueImpact(venueId: string | null, scheduledDate: string): Promise<any> {
    // Analyze venue availability and conflicts
    return {
      venue_conflicts: [],
      alternative_venues_available: [],
      venue_availability_score: 85
    }
  }

  private async analyzeTeamImpact(homeTeamId: string, awayTeamId: string, scheduledDate: string): Promise<any> {
    // Analyze team availability and rest periods
    return {
      team_rest_periods: { [homeTeamId]: 48, [awayTeamId]: 48 },
      team_travel_impact: { [homeTeamId]: 0, [awayTeamId]: 0 },
      team_availability: { [homeTeamId]: true, [awayTeamId]: true }
    }
  }

  private async analyzeRefereeImpact(matchId: string, scheduledDate: string): Promise<any> {
    // Analyze referee availability
    return {
      referee_availability: {},
      referee_workload_impact: {},
      alternative_referees: {}
    }
  }

  private async analyzeFinancialImpact(match: any): Promise<any> {
    // Analyze financial impact of postponement
    return {
      estimated_cost: 500,
      refund_required: false,
      additional_costs: 200
    }
  }
}
