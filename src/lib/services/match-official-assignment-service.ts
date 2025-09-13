import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/lib/supabase/types'

export type OfficialRole = 'referee' | 'assistant_referee_1' | 'assistant_referee_2' | 'fourth_official' | 'var_official'
export type AssignmentStatus = 'pending' | 'assigned' | 'confirmed' | 'declined' | 'replaced'
export type AssignmentPriority = 'low' | 'medium' | 'high' | 'critical'

export interface MatchOfficialAssignment {
  id: string
  match_id: string
  referee_id: string
  official_role: OfficialRole
  status: AssignmentStatus
  priority: AssignmentPriority
  assigned_by: string
  assigned_at: string
  confirmed_at?: string
  declined_at?: string
  replacement_reason?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface OfficialAssignmentRequest {
  match_id: string
  referee_id: string
  official_role: OfficialRole
  priority: AssignmentPriority
  assigned_by: string
  notes?: string
}

export interface OfficialAvailability {
  referee_id: string
  referee_name: string
  is_available: boolean
  availability_reason?: string
  conflicts?: {
    match_id: string
    match_date: string
    official_role: OfficialRole
  }[]
  workload_stats: {
    matches_this_week: number
    matches_this_month: number
    max_matches_per_week: number
    max_matches_per_month: number
  }
  specialization_match: boolean
  distance_from_venue: number
  travel_time_minutes: number
}

export interface AssignmentConflict {
  type: 'double_booking' | 'overwork' | 'distance' | 'specialization' | 'availability'
  severity: 'warning' | 'error'
  description: string
  suggested_alternatives?: string[]
}

export interface AssignmentValidationResult {
  is_valid: boolean
  conflicts: AssignmentConflict[]
  warnings: string[]
  recommendations: string[]
}

export interface MatchOfficialRequirements {
  match_id: string
  tournament_id: string
  match_level: 'international' | 'national' | 'regional' | 'local'
  venue_id?: string
  required_officials: {
    referee: boolean
    assistant_referee_1: boolean
    assistant_referee_2: boolean
    fourth_official: boolean
    var_official: boolean
  }
  minimum_license_level: 'fifa' | 'continental' | 'national' | 'regional' | 'local'
  special_requirements?: string[]
}

export interface AssignmentStatistics {
  total_assignments: number
  pending_assignments: number
  confirmed_assignments: number
  declined_assignments: number
  replacement_rate: number
  average_confirmation_time: number
  official_utilization: {
    referee_id: string
    referee_name: string
    assignments_this_week: number
    assignments_this_month: number
    utilization_percentage: number
  }[]
}

export class MatchOfficialAssignmentService {
  private supabase = createClientComponentClient<Database>()
  constructor() {}

  /**
   * Assign official to match
   */
  async assignOfficial(
    request: OfficialAssignmentRequest
  ): Promise<{ success: boolean; assignment?: MatchOfficialAssignment; error?: string }> {
    try {
      // Validate assignment
      const validation = await this.validateAssignment(request)
      if (!validation.is_valid) {
        return {
          success: false,
          error: `Assignment validation failed: ${validation.conflicts.map(c => c.description).join(', ')}`
        }
      }

      // Check if role is already assigned
      const existingAssignment = await this.getOfficialAssignment(request.match_id, request.official_role)
      if (existingAssignment) {
        return {
          success: false,
          error: `${request.official_role} is already assigned to this match`
        }
      }

      // Create assignment
      const { data, error } = await this.supabase
        .from('match_official_assignments')
        .insert({
          match_id: request.match_id,
          referee_id: request.referee_id,
          official_role: request.official_role,
          status: 'pending',
          priority: request.priority,
          assigned_by: request.assigned_by,
          notes: request.notes,
          assigned_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Error assigning official:', error)
        return { success: false, error: 'Failed to assign official' }
      }

      // Log assignment action
      await this.logAssignmentAction(data.id, 'assigned', request.assigned_by, 'Official assigned to match')

      // Send notification to official
      await this.notifyOfficialAssignment(data)

      return { success: true, assignment: data }
    } catch (error) {
      console.error('Error assigning official:', error)
      return { success: false, error: 'Failed to assign official' }
    }
  }

  /**
   * Get official assignment for specific match and role
   */
  async getOfficialAssignment(matchId: string, officialRole: OfficialRole): Promise<MatchOfficialAssignment | null> {
    const { data, error } = await this.supabase
      .from('match_official_assignments')
      .select('*')
      .eq('match_id', matchId)
      .eq('official_role', officialRole)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // No assignment found
      }
      console.error('Error fetching official assignment:', error)
      return null
    }

    return data
  }

  /**
   * Get all official assignments for a match
   */
  async getMatchOfficialAssignments(matchId: string): Promise<MatchOfficialAssignment[]> {
    const { data, error } = await this.supabase
      .from('match_official_assignments')
      .select(`
        *,
        referee:referees(*)
      `)
      .eq('match_id', matchId)
      .order('official_role', { ascending: true })

    if (error) {
      console.error('Error fetching match official assignments:', error)
      return []
    }

    return data || []
  }

  /**
   * Confirm assignment
   */
  async confirmAssignment(
    assignmentId: string,
    confirmedBy: string
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('match_official_assignments')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId)

      if (error) {
        console.error('Error confirming assignment:', error)
        return false
      }

      // Log confirmation action
      await this.logAssignmentAction(assignmentId, 'confirmed', confirmedBy, 'Assignment confirmed by official')

      return true
    } catch (error) {
      console.error('Error confirming assignment:', error)
      return false
    }
  }

  /**
   * Decline assignment
   */
  async declineAssignment(
    assignmentId: string,
    declinedBy: string,
    reason?: string
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('match_official_assignments')
        .update({
          status: 'declined',
          declined_at: new Date().toISOString(),
          notes: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId)

      if (error) {
        console.error('Error declining assignment:', error)
        return false
      }

      // Log decline action
      await this.logAssignmentAction(assignmentId, 'declined', declinedBy, reason || 'Assignment declined')

      // Notify organizers of the decline
      await this.notifyAssignmentDecline(assignmentId, reason)

      return true
    } catch (error) {
      console.error('Error declining assignment:', error)
      return false
    }
  }

  /**
   * Replace assignment
   */
  async replaceAssignment(
    assignmentId: string,
    newRefereeId: string,
    replacedBy: string,
    reason: string
  ): Promise<{ success: boolean; newAssignment?: MatchOfficialAssignment; error?: string }> {
    try {
      // Get current assignment
      const currentAssignment = await this.getAssignmentById(assignmentId)
      if (!currentAssignment) {
        return { success: false, error: 'Assignment not found' }
      }

      // Validate new assignment
      const newAssignmentRequest: OfficialAssignmentRequest = {
        match_id: currentAssignment.match_id,
        referee_id: newRefereeId,
        official_role: currentAssignment.official_role,
        priority: currentAssignment.priority,
        assigned_by: replacedBy,
        notes: reason
      }

      const validation = await this.validateAssignment(newAssignmentRequest)
      if (!validation.is_valid) {
        return {
          success: false,
          error: `New assignment validation failed: ${validation.conflicts.map(c => c.description).join(', ')}`
        }
      }

      // Update current assignment to replaced
      await this.supabase
        .from('match_official_assignments')
        .update({
          status: 'replaced',
          replacement_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId)

      // Create new assignment
      const result = await this.assignOfficial(newAssignmentRequest)
      if (result.success) {
        // Log replacement action
        await this.logAssignmentAction(assignmentId, 'replaced', replacedBy, reason)
        return { success: true, newAssignment: result.assignment }
      }

      return result
    } catch (error) {
      console.error('Error replacing assignment:', error)
      return { success: false, error: 'Failed to replace assignment' }
    }
  }

  /**
   * Get available officials for assignment
   */
  async getAvailableOfficials(
    matchId: string,
    officialRole: OfficialRole,
    venueId?: string
  ): Promise<OfficialAvailability[]> {
    try {
      // Get match details
      const { data: match } = await this.supabase
        .from('matches')
        .select('scheduled_date, tournament_id, venue_id')
        .eq('id', matchId)
        .single()

      if (!match) {
        return []
      }

      // Get officials with required specialization
      const { data: officials } = await this.supabase
        .from('referees')
        .select('*')
        .eq('specialization', this.getSpecializationForRole(officialRole))
        .eq('is_active', true)

      if (!officials) {
        return []
      }

      const availabilities: OfficialAvailability[] = []

      for (const official of officials) {
        const availability = await this.checkOfficialAvailability(
          official.id,
          match.scheduled_date,
          venueId || match.venue_id,
          officialRole
        )

        availabilities.push({
          referee_id: official.id,
          referee_name: official.name,
          is_available: availability.is_available,
          availability_reason: availability.reason,
          conflicts: availability.conflicts,
          workload_stats: availability.workload_stats,
          specialization_match: true,
          distance_from_venue: availability.distance_km,
          travel_time_minutes: availability.travel_time_minutes
        })
      }

      // Sort by availability and suitability
      return availabilities.sort((a, b) => {
        if (a.is_available !== b.is_available) {
          return a.is_available ? -1 : 1
        }
        return a.travel_time_minutes - b.travel_time_minutes
      })
    } catch (error) {
      console.error('Error getting available officials:', error)
      return []
    }
  }

  /**
   * Validate assignment
   */
  async validateAssignment(request: OfficialAssignmentRequest): Promise<AssignmentValidationResult> {
    const conflicts: AssignmentConflict[] = []
    const warnings: string[] = []
    const recommendations: string[] = []

    try {
      // Check official availability
      const availability = await this.checkOfficialAvailability(
        request.referee_id,
        null, // Will be fetched from match
        null, // Will be fetched from match
        request.official_role
      )

      if (!availability.is_available) {
        conflicts.push({
          type: 'availability',
          severity: 'error',
          description: `Official is not available: ${availability.reason}`,
          suggested_alternatives: availability.suggested_alternatives
        })
      }

      // Check workload limits
      if (availability.workload_stats.matches_this_week >= availability.workload_stats.max_matches_per_week) {
        conflicts.push({
          type: 'overwork',
          severity: 'error',
          description: 'Official has reached maximum matches per week'
        })
      } else if (availability.workload_stats.matches_this_week >= availability.workload_stats.max_matches_per_week - 1) {
        warnings.push('Official is close to maximum matches per week')
      }

      // Check specialization match
      if (!availability.specialization_match) {
        warnings.push('Official specialization does not perfectly match role requirements')
      }

      // Check distance constraints
      if (availability.distance_km > 100) { // Assuming 100km as reasonable limit
        warnings.push(`Official is ${availability.distance_km}km from venue`)
      }

      // Check for double booking
      if (availability.conflicts && availability.conflicts.length > 0) {
        conflicts.push({
          type: 'double_booking',
          severity: 'error',
          description: 'Official has conflicting assignments'
        })
      }

      // Generate recommendations
      if (availability.workload_stats.matches_this_month < 5) {
        recommendations.push('Official has low workload this month - good for assignment')
      }

      if (availability.distance_km < 20) {
        recommendations.push('Official is local to venue - ideal for assignment')
      }

      return {
        is_valid: conflicts.length === 0,
        conflicts,
        warnings,
        recommendations
      }
    } catch (error) {
      console.error('Error validating assignment:', error)
      return {
        is_valid: false,
        conflicts: [{
          type: 'availability',
          severity: 'error',
          description: 'Error validating assignment'
        }],
        warnings: [],
        recommendations: []
      }
    }
  }

  /**
   * Get match official requirements
   */
  async getMatchOfficialRequirements(matchId: string): Promise<MatchOfficialRequirements | null> {
    try {
      const { data: match } = await this.supabase
        .from('matches')
        .select(`
          *,
          tournament:tournaments(*)
        `)
        .eq('id', matchId)
        .single()

      if (!match) {
        return null
      }

      // Determine match level based on tournament
      const matchLevel = this.determineMatchLevel(match.tournament)
      const minimumLicenseLevel = this.getMinimumLicenseLevel(matchLevel)

      return {
        match_id: matchId,
        tournament_id: match.tournament_id,
        match_level: matchLevel,
        venue_id: match.venue_id,
        required_officials: {
          referee: true,
          assistant_referee_1: true,
          assistant_referee_2: matchLevel !== 'local', // Local matches might not require 2 ARs
          fourth_official: matchLevel === 'international' || matchLevel === 'national',
          var_official: matchLevel === 'international' // VAR typically for international matches
        },
        minimum_license_level: minimumLicenseLevel,
        special_requirements: this.getSpecialRequirements(matchLevel)
      }
    } catch (error) {
      console.error('Error getting match official requirements:', error)
      return null
    }
  }

  /**
   * Get assignment statistics
   */
  async getAssignmentStatistics(
    dateFrom?: string,
    dateTo?: string
  ): Promise<AssignmentStatistics> {
    try {
      const { data: assignments } = await this.supabase
        .from('match_official_assignments')
        .select(`
          *,
          referee:referees(*),
          match:matches(*)
        `)
        .gte('assigned_at', dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .lte('assigned_at', dateTo || new Date().toISOString())

      if (!assignments) {
        return {
          total_assignments: 0,
          pending_assignments: 0,
          confirmed_assignments: 0,
          declined_assignments: 0,
          replacement_rate: 0,
          average_confirmation_time: 0,
          official_utilization: []
        }
      }

      const stats = {
        total_assignments: assignments.length,
        pending_assignments: assignments.filter(a => a.status === 'pending').length,
        confirmed_assignments: assignments.filter(a => a.status === 'confirmed').length,
        declined_assignments: assignments.filter(a => a.status === 'declined').length,
        replacement_rate: assignments.filter(a => a.status === 'replaced').length / assignments.length,
        average_confirmation_time: this.calculateAverageConfirmationTime(assignments),
        official_utilization: this.calculateOfficialUtilization(assignments)
      }

      return stats
    } catch (error) {
      console.error('Error getting assignment statistics:', error)
      return {
        total_assignments: 0,
        pending_assignments: 0,
        confirmed_assignments: 0,
        declined_assignments: 0,
        replacement_rate: 0,
        average_confirmation_time: 0,
        official_utilization: []
      }
    }
  }

  /**
   * Private helper methods
   */
  private async checkOfficialAvailability(
    refereeId: string,
    matchDate: string | null,
    venueId: string | null,
    officialRole: OfficialRole
  ): Promise<{
    is_available: boolean
    reason?: string
    conflicts?: any[]
    workload_stats: any
    specialization_match: boolean
    distance_km: number
    travel_time_minutes: number
    suggested_alternatives?: string[]
  }> {
    // This would implement comprehensive availability checking
    // For now, returning a simplified version
    return {
      is_available: true,
      workload_stats: {
        matches_this_week: 0,
        matches_this_month: 0,
        max_matches_per_week: 5,
        max_matches_per_month: 20
      },
      specialization_match: true,
      distance_km: 0,
      travel_time_minutes: 0
    }
  }

  private getSpecializationForRole(role: OfficialRole): string {
    switch (role) {
      case 'referee':
        return 'referee'
      case 'assistant_referee_1':
      case 'assistant_referee_2':
        return 'assistant_referee'
      case 'fourth_official':
        return 'fourth_official'
      case 'var_official':
        return 'var_official'
      default:
        return 'referee'
    }
  }

  private determineMatchLevel(tournament: any): 'international' | 'national' | 'regional' | 'local' {
    // This would be determined by tournament level or configuration
    return 'local'
  }

  private getMinimumLicenseLevel(matchLevel: string): 'fifa' | 'continental' | 'national' | 'regional' | 'local' {
    switch (matchLevel) {
      case 'international':
        return 'fifa'
      case 'national':
        return 'national'
      case 'regional':
        return 'regional'
      case 'local':
        return 'local'
      default:
        return 'local'
    }
  }

  private getSpecialRequirements(matchLevel: string): string[] {
    switch (matchLevel) {
      case 'international':
        return ['FIFA certified', 'VAR trained']
      case 'national':
        return ['National license', 'VAR trained']
      case 'regional':
        return ['Regional license']
      case 'local':
        return ['Local license']
      default:
        return []
    }
  }

  private calculateAverageConfirmationTime(assignments: any[]): number {
    const confirmedAssignments = assignments.filter(a => a.status === 'confirmed' && a.confirmed_at)
    if (confirmedAssignments.length === 0) return 0

    const totalTime = confirmedAssignments.reduce((sum, assignment) => {
      const assignedTime = new Date(assignment.assigned_at).getTime()
      const confirmedTime = new Date(assignment.confirmed_at).getTime()
      return sum + (confirmedTime - assignedTime)
    }, 0)

    return totalTime / confirmedAssignments.length / (1000 * 60 * 60) // Convert to hours
  }

  private calculateOfficialUtilization(assignments: any[]): any[] {
    const officialStats = new Map<string, any>()

    assignments.forEach(assignment => {
      const refereeId = assignment.referee_id
      const refereeName = assignment.referee?.name || 'Unknown'

      if (!officialStats.has(refereeId)) {
        officialStats.set(refereeId, {
          referee_id: refereeId,
          referee_name: refereeName,
          assignments_this_week: 0,
          assignments_this_month: 0,
          utilization_percentage: 0
        })
      }

      const stats = officialStats.get(refereeId)
      const assignmentDate = new Date(assignment.assigned_at)
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      if (assignmentDate >= weekAgo) {
        stats.assignments_this_week++
      }
      if (assignmentDate >= monthAgo) {
        stats.assignments_this_month++
      }
    })

    return Array.from(officialStats.values())
  }

  private async getAssignmentById(assignmentId: string): Promise<MatchOfficialAssignment | null> {
    const { data, error } = await this.supabase
      .from('match_official_assignments')
      .select('*')
      .eq('id', assignmentId)
      .single()

    if (error) {
      console.error('Error fetching assignment:', error)
      return null
    }

    return data
  }

  private async logAssignmentAction(
    assignmentId: string,
    action: string,
    performedBy: string,
    notes?: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('match_official_assignment_logs')
      .insert({
        assignment_id: assignmentId,
        action,
        performed_by: performedBy,
        notes,
        performed_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error logging assignment action:', error)
    }
  }

  private async notifyOfficialAssignment(assignment: MatchOfficialAssignment): Promise<void> {
    // Implementation would send notification to official
    console.log(`Notifying official ${assignment.referee_id} of assignment ${assignment.id}`)
  }

  private async notifyAssignmentDecline(assignmentId: string, reason?: string): Promise<void> {
    // Implementation would notify organizers of assignment decline
    console.log(`Notifying organizers of assignment decline: ${assignmentId}, reason: ${reason}`)
  }
}

// Export singleton instance
export const matchOfficialAssignmentService = new MatchOfficialAssignmentService()
