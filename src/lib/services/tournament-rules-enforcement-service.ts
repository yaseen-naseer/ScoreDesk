import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'

type Tournament = Database['public']['Tables']['tournaments']['Row']
type Match = Database['public']['Tables']['matches']['Row']
type Team = Database['public']['Tables']['teams']['Row']
type TournamentTeam = Database['public']['Tables']['tournament_teams']['Row']
type Player = Database['public']['Tables']['players']['Row']
type Referee = Database['public']['Tables']['referees']['Row']
type Venue = Database['public']['Tables']['venues']['Row']

export interface RuleViolation {
  id: string
  rule_type: 'team_size' | 'age_limit' | 'registration_deadline' | 'match_duration' | 'substitution_limit' | 'officials_required' | 'venue_requirements' | 'equipment_requirements' | 'medical_certificate' | 'insurance_requirement' | 'anti_doping' | 'financial' | 'schedule_conflict' | 'player_eligibility' | 'referee_assignment' | 'venue_availability'
  severity: 'critical' | 'warning' | 'info'
  title: string
  description: string
  affected_entity: string
  affected_entity_type: 'tournament' | 'match' | 'team' | 'player' | 'referee' | 'venue'
  resolution_required: boolean
  suggested_actions: string[]
  auto_resolvable: boolean
  metadata?: Record<string, any>
}

export interface RuleEnforcementResult {
  is_compliant: boolean
  compliance_score: number
  violations: RuleViolation[]
  warnings: RuleViolation[]
  suggestions: string[]
  can_proceed: boolean
  blocking_issues: string[]
}

export interface TournamentRuleContext {
  tournament: Tournament
  match?: Match
  teams?: Team[]
  players?: Player[]
  referees?: Referee[]
  venue?: Venue
  tournament_teams?: TournamentTeam[]
}

export class TournamentRulesEnforcementService {
  private supabase = createClientComponentClient<Database>()

  constructor() {}

  public get supabaseClient() { return this.supabase }

  /**
   * Enforce all tournament rules for a given context
   */
  async enforceTournamentRules(context: TournamentRuleContext): Promise<RuleEnforcementResult> {
    const violations: RuleViolation[] = []
    const warnings: RuleViolation[] = []
    const suggestions: string[] = []

    try {
      // Team-related rule enforcement
      if (context.teams && context.tournament_teams) {
        violations.push(...await this.enforceTeamRules(context))
      }

      // Match-related rule enforcement
      if (context.match) {
        violations.push(...await this.enforceMatchRules(context))
      }

      // Player-related rule enforcement
      if (context.players) {
        violations.push(...await this.enforcePlayerRules(context))
      }

      // Referee-related rule enforcement
      if (context.referees) {
        violations.push(...await this.enforceRefereeRules(context))
      }

      // Venue-related rule enforcement
      if (context.venue) {
        violations.push(...await this.enforceVenueRules(context))
      }

      // Tournament-level rule enforcement
      violations.push(...await this.enforceTournamentLevelRules(context))

      // Separate violations by severity
      const criticalViolations = violations.filter(v => v.severity === 'critical')
      const warningViolations = violations.filter(v => v.severity === 'warning')
      const infoViolations = violations.filter(v => v.severity === 'info')

      // Calculate compliance score
      const totalRules = violations.length
      const compliantRules = violations.filter(v => !v.resolution_required).length
      const complianceScore = totalRules > 0 ? Math.round((compliantRules / totalRules) * 100) : 100

      // Determine if can proceed
      const canProceed = criticalViolations.length === 0
      const blockingIssues = criticalViolations.map(v => v.title)

      // Generate suggestions
      suggestions.push(...this.generateSuggestions(violations, context))

      return {
        is_compliant: canProceed,
        compliance_score: complianceScore,
        violations: criticalViolations,
        warnings: [...warningViolations, ...infoViolations],
        suggestions,
        can_proceed: canProceed,
        blocking_issues: blockingIssues
      }

    } catch (error) {
      console.error('Error enforcing tournament rules:', error)
      return {
        is_compliant: false,
        compliance_score: 0,
        violations: [{
          id: 'enforcement_error',
          rule_type: 'team_size',
          severity: 'critical',
          title: 'Rule Enforcement Error',
          description: error instanceof Error ? error.message : 'Unknown error occurred',
          affected_entity: context.tournament.id,
          affected_entity_type: 'tournament',
          resolution_required: true,
          suggested_actions: ['Contact technical support', 'Retry rule enforcement'],
          auto_resolvable: false
        }],
        warnings: [],
        suggestions: [],
        can_proceed: false,
        blocking_issues: ['Rule enforcement system error']
      }
    }
  }

  /**
   * Enforce team-related rules
   */
  private async enforceTeamRules(context: TournamentRuleContext): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = []

    if (!context.teams || !context.tournament_teams || !context.tournament) return violations

    // Check maximum teams limit
    if (context.tournament.max_teams && context.tournament_teams.length > context.tournament.max_teams) {
      violations.push({
        id: 'max_teams_exceeded',
        rule_type: 'team_size',
        severity: 'critical',
        title: 'Maximum Teams Exceeded',
        description: `Tournament allows maximum ${context.tournament.max_teams} teams, but ${context.tournament_teams.length} teams are registered`,
        affected_entity: context.tournament.id,
        affected_entity_type: 'tournament',
        resolution_required: true,
        suggested_actions: [
          'Remove excess teams from tournament',
          'Increase tournament team limit',
          'Create additional tournament brackets'
        ],
        auto_resolvable: false,
        metadata: {
          max_allowed: context.tournament.max_teams,
          current_count: context.tournament_teams.length
        }
      })
    }

    // Check minimum teams requirement
    if (context.tournament.max_teams && context.tournament_teams.length < 2) {
      violations.push({
        id: 'insufficient_teams',
        rule_type: 'team_size',
        severity: 'critical',
        title: 'Insufficient Teams',
        description: 'Tournament requires at least 2 teams to proceed',
        affected_entity: context.tournament.id,
        affected_entity_type: 'tournament',
        resolution_required: true,
        suggested_actions: [
          'Wait for more team registrations',
          'Extend registration deadline',
          'Cancel tournament if deadline passed'
        ],
        auto_resolvable: false,
        metadata: {
          current_count: context.tournament_teams.length,
          minimum_required: 2
        }
      })
    }

    // Check team size requirements for each team
    for (const tournamentTeam of context.tournament_teams) {
      const team = context.teams.find(t => t.id === tournamentTeam.team_id)
      if (!team) continue

      // Get team players
      const { data: players } = await this.supabase
        .from('players')
        .select('*')
        .eq('team_id', team.id)
        .eq('is_active', true)

      if (!players) continue

      // Check minimum team size
      if (context.tournament.min_team_size && players.length < context.tournament.min_team_size) {
        violations.push({
          id: `team_${team.id}_min_size`,
          rule_type: 'team_size',
          severity: 'critical',
          title: `${team.name} - Insufficient Players`,
          description: `Team has ${players.length} players but tournament requires minimum ${context.tournament.min_team_size}`,
          affected_entity: team.id,
          affected_entity_type: 'team',
          resolution_required: true,
          suggested_actions: [
            'Add more players to team',
            'Remove team from tournament',
            'Adjust tournament minimum team size'
          ],
          auto_resolvable: false,
          metadata: {
            current_count: players.length,
            minimum_required: context.tournament.min_team_size
          }
        })
      }

      // Check maximum team size
      if (context.tournament.max_team_size && players.length > context.tournament.max_team_size) {
        violations.push({
          id: `team_${team.id}_max_size`,
          rule_type: 'team_size',
          severity: 'warning',
          title: `${team.name} - Too Many Players`,
          description: `Team has ${players.length} players but tournament allows maximum ${context.tournament.max_team_size}`,
          affected_entity: team.id,
          affected_entity_type: 'team',
          resolution_required: false,
          suggested_actions: [
            'Remove excess players from team',
            'Increase tournament maximum team size',
            'Allow team to proceed with warning'
          ],
          auto_resolvable: true,
          metadata: {
            current_count: players.length,
            maximum_allowed: context.tournament.max_team_size
          }
        })
      }
    }

    return violations
  }

  /**
   * Enforce match-related rules
   */
  private async enforceMatchRules(context: TournamentRuleContext): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = []

    if (!context.match || !context.tournament) return violations

    // Check match duration
    if (context.tournament.match_duration_minutes && 
        context.match.match_duration !== context.tournament.match_duration_minutes) {
      violations.push({
        id: `match_${context.match.id}_duration`,
        rule_type: 'match_duration',
        severity: 'warning',
        title: 'Match Duration Mismatch',
        description: `Match duration (${context.match.match_duration} min) doesn't match tournament requirement (${context.tournament.match_duration_minutes} min)`,
        affected_entity: context.match.id,
        affected_entity_type: 'match',
        resolution_required: false,
        suggested_actions: [
          'Update match duration to match tournament rules',
          'Adjust tournament match duration setting',
          'Allow match to proceed with different duration'
        ],
        auto_resolvable: true,
        metadata: {
          match_duration: context.match.match_duration,
          tournament_requirement: context.tournament.match_duration_minutes
        }
      })
    }

    // Check officials requirement
    if (context.tournament.match_officials_required) {
      const { data: officials } = await this.supabase
        .from('match_officials')
        .select('*')
        .eq('match_id', context.match.id)

      const officialsCount = officials?.length || 0
      if (officialsCount < context.tournament.match_officials_required) {
        violations.push({
          id: `match_${context.match.id}_officials`,
          rule_type: 'officials_required',
          severity: 'critical',
          title: 'Insufficient Match Officials',
          description: `Match has ${officialsCount} officials but tournament requires ${context.tournament.match_officials_required}`,
          affected_entity: context.match.id,
          affected_entity_type: 'match',
          resolution_required: true,
          suggested_actions: [
            'Assign additional officials to match',
            'Reduce tournament officials requirement',
            'Postpone match until officials available'
          ],
          auto_resolvable: false,
          metadata: {
            current_count: officialsCount,
            required_count: context.tournament.match_officials_required
          }
        })
      }
    }

    return violations
  }

  /**
   * Enforce player-related rules
   */
  private async enforcePlayerRules(context: TournamentRuleContext): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = []

    if (!context.players || !context.tournament) return violations

    // Check age requirements
    if (context.tournament.min_player_age || context.tournament.max_player_age) {
      for (const player of context.players) {
        if (!player.birth_date) continue

        const playerAge = this.calculateAge(player.birth_date)
        
        if (context.tournament.min_player_age && playerAge < context.tournament.min_player_age) {
          violations.push({
            id: `player_${player.id}_min_age`,
            rule_type: 'age_limit',
            severity: 'critical',
            title: `${player.full_name} - Too Young`,
            description: `Player is ${playerAge} years old but tournament requires minimum age ${context.tournament.min_player_age}`,
            affected_entity: player.id,
            affected_entity_type: 'player',
            resolution_required: true,
            suggested_actions: [
              'Remove player from tournament',
              'Adjust tournament age requirements',
              'Move player to appropriate age group'
            ],
            auto_resolvable: false,
            metadata: {
              player_age: playerAge,
              minimum_age: context.tournament.min_player_age
            }
          })
        }

        if (context.tournament.max_player_age && playerAge > context.tournament.max_player_age) {
          violations.push({
            id: `player_${player.id}_max_age`,
            rule_type: 'age_limit',
            severity: 'critical',
            title: `${player.full_name} - Too Old`,
            description: `Player is ${playerAge} years old but tournament allows maximum age ${context.tournament.max_player_age}`,
            affected_entity: player.id,
            affected_entity_type: 'player',
            resolution_required: true,
            suggested_actions: [
              'Remove player from tournament',
              'Adjust tournament age requirements',
              'Move player to appropriate age group'
            ],
            auto_resolvable: false,
            metadata: {
              player_age: playerAge,
              maximum_age: context.tournament.max_player_age
            }
          })
        }
      }
    }

    // Check medical certificate requirement
    if (context.tournament.requires_medical_certificate) {
      for (const player of context.players) {
        // This would need to be implemented based on your medical certificate storage
        // For now, we'll create a placeholder violation
        violations.push({
          id: `player_${player.id}_medical_cert`,
          rule_type: 'medical_certificate',
          severity: 'warning',
          title: `${player.full_name} - Medical Certificate`,
          description: 'Medical certificate verification required',
          affected_entity: player.id,
          affected_entity_type: 'player',
          resolution_required: false,
          suggested_actions: [
            'Upload medical certificate',
            'Verify medical certificate status',
            'Contact player for documentation'
          ],
          auto_resolvable: true
        })
      }
    }

    return violations
  }

  /**
   * Enforce referee-related rules
   */
  private async enforceRefereeRules(context: TournamentRuleContext): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = []

    if (!context.referees || !context.match) return violations

    // Check referee availability and assignment
    for (const referee of context.referees) {
      // Check if referee is available for match date
      const { data: availability } = await this.supabase
        .from('official_availability')
        .select('*')
        .eq('referee_id', referee.id)
        .eq('date', new Date(context.match.scheduled_date).toISOString().split('T')[0])
        .single()

      if (!availability || !availability.is_available) {
        violations.push({
          id: `referee_${referee.id}_availability`,
          rule_type: 'referee_assignment',
          severity: 'critical',
          title: `${referee.name} - Not Available`,
          description: `Referee is not available for match on ${new Date(context.match.scheduled_date).toLocaleDateString()}`,
          affected_entity: referee.id,
          affected_entity_type: 'referee',
          resolution_required: true,
          suggested_actions: [
            'Find replacement referee',
            'Reschedule match',
            'Update referee availability'
          ],
          auto_resolvable: false,
          metadata: {
            match_date: context.match.scheduled_date,
            referee_availability: availability?.is_available || false
          }
        })
      }
    }

    return violations
  }

  /**
   * Enforce venue-related rules
   */
  private async enforceVenueRules(context: TournamentRuleContext): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = []

    if (!context.venue || !context.match) return violations

    // Check venue availability
    const { data: venueBookings } = await this.supabase
      .from('matches')
      .select('*')
      .eq('venue_id', context.venue.id)
      .neq('id', context.match.id)
      .gte('scheduled_date', new Date(context.match.scheduled_date).toISOString())
      .lt('scheduled_date', new Date(new Date(context.match.scheduled_date).getTime() + (context.match.match_duration || 90) * 60000).toISOString())

    if (venueBookings && venueBookings.length > 0) {
      violations.push({
        id: `venue_${context.venue.id}_conflict`,
        rule_type: 'venue_availability',
        severity: 'critical',
        title: 'Venue Scheduling Conflict',
        description: `Venue is already booked for another match at the same time`,
        affected_entity: context.venue.id,
        affected_entity_type: 'venue',
        resolution_required: true,
        suggested_actions: [
          'Reschedule match to different time',
          'Change venue for this match',
          'Cancel conflicting match'
        ],
        auto_resolvable: false,
        metadata: {
          conflicting_matches: venueBookings.length,
          venue_id: context.venue.id
        }
      })
    }

    // Check venue requirements
    if (context.tournament.venue_requirements) {
      violations.push({
        id: `venue_${context.venue.id}_requirements`,
        rule_type: 'venue_requirements',
        severity: 'warning',
        title: 'Venue Requirements Check',
        description: 'Venue requirements verification needed',
        affected_entity: context.venue.id,
        affected_entity_type: 'venue',
        resolution_required: false,
        suggested_actions: [
          'Verify venue meets tournament requirements',
          'Update venue specifications',
          'Contact venue manager'
        ],
        auto_resolvable: true,
        metadata: {
          requirements: context.tournament.venue_requirements
        }
      })
    }

    return violations
  }

  /**
   * Enforce tournament-level rules
   */
  private async enforceTournamentLevelRules(context: TournamentRuleContext): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = []

    if (!context.tournament) return violations

    // Check registration deadline
    if (context.tournament.registration_deadline && 
        new Date() > new Date(context.tournament.registration_deadline)) {
      violations.push({
        id: 'registration_deadline_passed',
        rule_type: 'registration_deadline',
        severity: 'warning',
        title: 'Registration Deadline Passed',
        description: `Tournament registration deadline was ${new Date(context.tournament.registration_deadline).toLocaleDateString()}`,
        affected_entity: context.tournament.id,
        affected_entity_type: 'tournament',
        resolution_required: false,
        suggested_actions: [
          'Extend registration deadline',
          'Close tournament registration',
          'Allow late registrations with fee'
        ],
        auto_resolvable: true,
        metadata: {
          deadline: context.tournament.registration_deadline,
          current_date: new Date().toISOString()
        }
      })
    }

    // Check tournament dates
    if (context.tournament.start_date && new Date() > new Date(context.tournament.start_date)) {
      violations.push({
        id: 'tournament_started',
        rule_type: 'schedule_conflict',
        severity: 'info',
        title: 'Tournament Already Started',
        description: 'Tournament start date has passed',
        affected_entity: context.tournament.id,
        affected_entity_type: 'tournament',
        resolution_required: false,
        suggested_actions: [
          'Update tournament status',
          'Adjust tournament dates',
          'Continue with current schedule'
        ],
        auto_resolvable: true,
        metadata: {
          start_date: context.tournament.start_date,
          current_date: new Date().toISOString()
        }
      })
    }

    return violations
  }

  /**
   * Generate suggestions based on violations
   */
  private generateSuggestions(violations: RuleViolation[], context: TournamentRuleContext): string[] {
    const suggestions: string[] = []

    const criticalCount = violations.filter(v => v.severity === 'critical').length
    const warningCount = violations.filter(v => v.severity === 'warning').length

    if (criticalCount > 0) {
      suggestions.push(`Address ${criticalCount} critical rule violation${criticalCount > 1 ? 's' : ''} before proceeding`)
    }

    if (warningCount > 0) {
      suggestions.push(`Review ${warningCount} warning${warningCount > 1 ? 's' : ''} to improve tournament compliance`)
    }

    // Specific suggestions based on violation types
    const violationTypes = new Set(violations.map(v => v.rule_type))
    
    if (violationTypes.has('team_size')) {
      suggestions.push('Review team size requirements and adjust tournament settings if needed')
    }

    if (violationTypes.has('age_limit')) {
      suggestions.push('Verify player age requirements and update tournament age group settings')
    }

    if (violationTypes.has('officials_required')) {
      suggestions.push('Ensure sufficient match officials are assigned to all matches')
    }

    if (violationTypes.has('venue_availability')) {
      suggestions.push('Check venue scheduling and resolve any conflicts')
    }

    return suggestions
  }

  /**
   * Calculate age from birth date
   */
  private calculateAge(birthDate: string): number {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }

  /**
   * Validate tournament creation against rules
   */
  async validateTournamentCreation(tournamentData: Partial<Tournament>): Promise<RuleEnforcementResult> {
    const violations: RuleViolation[] = []

    // Check required fields
    if (!tournamentData.name || tournamentData.name.length < 2) {
      violations.push({
        id: 'tournament_name_invalid',
        rule_type: 'team_size',
        severity: 'critical',
        title: 'Invalid Tournament Name',
        description: 'Tournament name must be at least 2 characters long',
        affected_entity: 'tournament',
        affected_entity_type: 'tournament',
        resolution_required: true,
        suggested_actions: ['Provide a valid tournament name'],
        auto_resolvable: false
      })
    }

    // Check date validity
    if (tournamentData.start_date && tournamentData.end_date) {
      if (new Date(tournamentData.start_date) >= new Date(tournamentData.end_date)) {
        violations.push({
          id: 'tournament_dates_invalid',
          rule_type: 'schedule_conflict',
          severity: 'critical',
          title: 'Invalid Tournament Dates',
          description: 'Tournament end date must be after start date',
          affected_entity: 'tournament',
          affected_entity_type: 'tournament',
          resolution_required: true,
          suggested_actions: ['Adjust tournament start and end dates'],
          auto_resolvable: false
        })
      }
    }

    const criticalCount = violations.filter(v => v.severity === 'critical').length
    const complianceScore = violations.length > 0 ? Math.round(((violations.length - criticalCount) / violations.length) * 100) : 100

    return {
      is_compliant: criticalCount === 0,
      compliance_score: complianceScore,
      violations: violations.filter(v => v.severity === 'critical'),
      warnings: violations.filter(v => v.severity !== 'critical'),
      suggestions: violations.length > 0 ? ['Review and fix all critical issues before creating tournament'] : [],
      can_proceed: criticalCount === 0,
      blocking_issues: violations.filter(v => v.severity === 'critical').map(v => v.title)
    }
  }

  /**
   * Validate match scheduling against tournament rules
   */
  async validateMatchScheduling(matchData: Partial<Match>, tournamentId: string): Promise<RuleEnforcementResult> {
    const violations: RuleViolation[] = []

    // Get tournament details
    const { data: tournament } = await this.supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single()

    if (!tournament) {
      violations.push({
        id: 'tournament_not_found',
        rule_type: 'team_size',
        severity: 'critical',
        title: 'Tournament Not Found',
        description: 'Tournament does not exist',
        affected_entity: tournamentId,
        affected_entity_type: 'tournament',
        resolution_required: true,
        suggested_actions: ['Verify tournament ID'],
        auto_resolvable: false
      })
    } else {
      // Check if match is within tournament dates
      if (matchData.scheduled_date && tournament.start_date && tournament.end_date) {
        const matchDate = new Date(matchData.scheduled_date)
        const startDate = new Date(tournament.start_date)
        const endDate = new Date(tournament.end_date)

        if (matchDate < startDate || matchDate > endDate) {
          violations.push({
            id: 'match_outside_tournament_dates',
            rule_type: 'schedule_conflict',
            severity: 'critical',
            title: 'Match Outside Tournament Dates',
            description: `Match scheduled for ${matchDate.toLocaleDateString()} is outside tournament period (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`,
            affected_entity: matchData.id || 'new_match',
            affected_entity_type: 'match',
            resolution_required: true,
            suggested_actions: [
              'Reschedule match within tournament dates',
              'Extend tournament dates',
              'Cancel match'
            ],
            auto_resolvable: false,
            metadata: {
              match_date: matchData.scheduled_date,
              tournament_start: tournament.start_date,
              tournament_end: tournament.end_date
            }
          })
        }
      }
    }

    const criticalCount = violations.filter(v => v.severity === 'critical').length
    const complianceScore = violations.length > 0 ? Math.round(((violations.length - criticalCount) / violations.length) * 100) : 100

    return {
      is_compliant: criticalCount === 0,
      compliance_score: complianceScore,
      violations: violations.filter(v => v.severity === 'critical'),
      warnings: violations.filter(v => v.severity !== 'critical'),
      suggestions: violations.length > 0 ? ['Review and fix all critical issues before scheduling match'] : [],
      can_proceed: criticalCount === 0,
      blocking_issues: violations.filter(v => v.severity === 'critical').map(v => v.title)
    }
  }
}

export const tournamentRulesEnforcementService = new TournamentRulesEnforcementService()
