import { Database } from '@/lib/supabase/types'

type Match = Database['public']['Tables']['matches']['Row']
type Team = Database['public']['Tables']['teams']['Row']
type Venue = Database['public']['Tables']['venues']['Row']
type Referee = Database['public']['Tables']['referees']['Row']
type MatchOfficial = Database['public']['Tables']['match_officials']['Row']
type TeamSheet = Database['public']['Tables']['team_sheets']['Row']

export interface ValidationResult {
  is_valid: boolean
  validation_score: number
  completed_checks: number
  total_checks: number
  checklist: ValidationCheck[]
  critical_issues: ValidationIssue[]
  warnings: ValidationIssue[]
  suggestions: ValidationSuggestion[]
}

export interface ValidationCheck {
  id: string
  category: 'teams' | 'venue' | 'officials' | 'equipment' | 'safety' | 'compliance' | 'logistics'
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'
  required: boolean
  weight: number
  details?: string
  completed_by?: string
  completed_at?: string
  evidence?: ValidationEvidence[]
}

export interface ValidationIssue {
  id: string
  check_id: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  description: string
  resolution_required: boolean
  suggested_actions: string[]
  auto_resolvable: boolean
}

export interface ValidationSuggestion {
  id: string
  check_id: string
  title: string
  description: string
  benefit: string
  implementation_effort: 'low' | 'medium' | 'high'
  priority: 'low' | 'medium' | 'high'
}

export interface ValidationEvidence {
  id: string
  type: 'document' | 'photo' | 'signature' | 'confirmation'
  title: string
  description: string
  file_url?: string
  uploaded_by: string
  uploaded_at: string
  verified: boolean
}

export interface PreMatchValidationData {
  match_id: string
  home_team_id: string
  away_team_id: string
  venue_id?: string
  scheduled_date: string
  match_duration: number
  tournament_id: string
  weather_conditions?: Record<string, any>
  field_conditions?: Record<string, any>
}

export class PreMatchValidationService {
  constructor(private supabase: any) {}

  /**
   * Run comprehensive pre-match validation
   */
  async validateMatch(data: PreMatchValidationData): Promise<ValidationResult> {
    try {
      const checklist = await this.generateValidationChecklist(data)
      const completedChecks = await this.loadCompletedChecks(data.match_id)
      
      // Merge completed checks with checklist
      const mergedChecklist = checklist.map(check => {
        const completed = completedChecks.find(c => c.check_id === check.id)
        return {
          ...check,
          status: completed?.status || 'pending',
          details: completed?.details,
          completed_by: completed?.completed_by,
          completed_at: completed?.completed_at,
          evidence: completed?.evidence || []
        }
      })

      // Analyze validation results
      const criticalIssues = this.extractCriticalIssues(mergedChecklist)
      const warnings = this.extractWarnings(mergedChecklist)
      const suggestions = await this.generateSuggestions(mergedChecklist, data)
      
      const completedCount = mergedChecklist.filter(c => c.status === 'completed').length
      const totalCount = mergedChecklist.filter(c => c.required).length
      const validationScore = totalCount > 0 ? (completedCount / totalCount) * 100 : 100
      
      const is_valid = criticalIssues.length === 0 && validationScore >= 90

      return {
        is_valid,
        validation_score: Math.round(validationScore),
        completed_checks: completedCount,
        total_checks: totalCount,
        checklist: mergedChecklist,
        critical_issues: criticalIssues,
        warnings,
        suggestions
      }

    } catch (error) {
      console.error('Error validating match:', error)
      return {
        is_valid: false,
        validation_score: 0,
        completed_checks: 0,
        total_checks: 0,
        checklist: [],
        critical_issues: [{
          id: 'validation_error',
          check_id: 'system',
          severity: 'critical',
          title: 'Validation System Error',
          description: error instanceof Error ? error.message : 'Unknown error occurred',
          resolution_required: true,
          suggested_actions: ['Contact technical support', 'Retry validation'],
          auto_resolvable: false
        }],
        warnings: [],
        suggestions: []
      }
    }
  }

  /**
   * Generate comprehensive validation checklist
   */
  private async generateValidationChecklist(data: PreMatchValidationData): Promise<ValidationCheck[]> {
    const checklist: ValidationCheck[] = []

    // Team validation checks
    checklist.push(...await this.generateTeamValidationChecks(data))
    
    // Venue validation checks
    checklist.push(...await this.generateVenueValidationChecks(data))
    
    // Officials validation checks
    checklist.push(...await this.generateOfficialsValidationChecks(data))
    
    // Equipment validation checks
    checklist.push(...await this.generateEquipmentValidationChecks(data))
    
    // Safety validation checks
    checklist.push(...await this.generateSafetyValidationChecks(data))
    
    // Compliance validation checks
    checklist.push(...await this.generateComplianceValidationChecks(data))
    
    // Logistics validation checks
    checklist.push(...await this.generateLogisticsValidationChecks(data))

    return checklist
  }

  /**
   * Generate team validation checks
   */
  private async generateTeamValidationChecks(data: PreMatchValidationData): Promise<ValidationCheck[]> {
    const checks: ValidationCheck[] = []

    // Get team details
    const [homeTeam, awayTeam] = await Promise.all([
      this.supabase.from('teams').select('*').eq('id', data.home_team_id).single(),
      this.supabase.from('teams').select('*').eq('id', data.away_team_id).single()
    ])

    // Team sheet submission
    checks.push({
      id: 'home_team_sheet',
      category: 'teams',
      title: 'Home Team Sheet Submitted',
      description: 'Home team has submitted their team sheet with starting lineup and substitutes',
      status: 'pending',
      required: true,
      weight: 10
    })

    checks.push({
      id: 'away_team_sheet',
      category: 'teams',
      title: 'Away Team Sheet Submitted',
      description: 'Away team has submitted their team sheet with starting lineup and substitutes',
      status: 'pending',
      required: true,
      weight: 10
    })

    // Minimum players
    checks.push({
      id: 'home_team_minimum_players',
      category: 'teams',
      title: 'Home Team Minimum Players',
      description: 'Home team has minimum required players available',
      status: 'pending',
      required: true,
      weight: 8
    })

    checks.push({
      id: 'away_team_minimum_players',
      category: 'teams',
      title: 'Away Team Minimum Players',
      description: 'Away team has minimum required players available',
      status: 'pending',
      required: true,
      weight: 8
    })

    // Player eligibility
    checks.push({
      id: 'player_eligibility',
      category: 'teams',
      title: 'Player Eligibility Verified',
      description: 'All players are eligible to participate in this match',
      status: 'pending',
      required: true,
      weight: 9
    })

    // Medical certificates (if required)
    checks.push({
      id: 'medical_certificates',
      category: 'teams',
      title: 'Medical Certificates',
      description: 'All players have valid medical certificates (if required by tournament)',
      status: 'pending',
      required: false,
      weight: 5
    })

    return checks
  }

  /**
   * Generate venue validation checks
   */
  private async generateVenueValidationChecks(data: PreMatchValidationData): Promise<ValidationCheck[]> {
    const checks: ValidationCheck[] = []

    if (data.venue_id) {
      const { data: venue } = await this.supabase
        .from('venues')
        .select('*')
        .eq('id', data.venue_id)
        .single()

      // Venue availability
      checks.push({
        id: 'venue_availability',
        category: 'venue',
        title: 'Venue Availability Confirmed',
        description: 'Venue is available and ready for the match',
        status: 'pending',
        required: true,
        weight: 10
      })

      // Field condition
      checks.push({
        id: 'field_condition',
        category: 'venue',
        title: 'Field Condition Check',
        description: 'Playing field is in suitable condition for the match',
        status: 'pending',
        required: true,
        weight: 9
      })

      // Weather suitability
      checks.push({
        id: 'weather_conditions',
        category: 'venue',
        title: 'Weather Conditions Suitable',
        description: 'Weather conditions are suitable for play',
        status: 'pending',
        required: true,
        weight: 8
      })

      // Safety equipment
      checks.push({
        id: 'safety_equipment',
        category: 'venue',
        title: 'Safety Equipment Available',
        description: 'All required safety equipment is available and functional',
        status: 'pending',
        required: true,
        weight: 9
      })

      // Emergency access
      checks.push({
        id: 'emergency_access',
        category: 'venue',
        title: 'Emergency Access Clear',
        description: 'Emergency vehicle access routes are clear and accessible',
        status: 'pending',
        required: true,
        weight: 8
      })
    }

    return checks
  }

  /**
   * Generate officials validation checks
   */
  private async generateOfficialsValidationChecks(data: PreMatchValidationData): Promise<ValidationCheck[]> {
    const checks: ValidationCheck[] = []

    // Get match officials
    const { data: officials } = await this.supabase
      .from('match_officials')
      .select(`
        *,
        referees (*)
      `)
      .eq('match_id', data.match_id)

    // Referee assignment
    checks.push({
      id: 'referee_assigned',
      category: 'officials',
      title: 'Main Referee Assigned',
      description: 'Main referee has been assigned and confirmed attendance',
      status: 'pending',
      required: true,
      weight: 10
    })

    // Assistant referees
    checks.push({
      id: 'assistant_referees',
      category: 'officials',
      title: 'Assistant Referees Assigned',
      description: 'Assistant referees have been assigned and confirmed attendance',
      status: 'pending',
      required: true,
      weight: 8
    })

    // Fourth official (if required)
    checks.push({
      id: 'fourth_official',
      category: 'officials',
      title: 'Fourth Official Assigned',
      description: 'Fourth official has been assigned (if required by tournament)',
      status: 'pending',
      required: false,
      weight: 6
    })

    // Officials arrival
    checks.push({
      id: 'officials_arrival',
      category: 'officials',
      title: 'Officials Arrived on Time',
      description: 'All match officials have arrived at the venue on time',
      status: 'pending',
      required: true,
      weight: 9
    })

    // Officials equipment
    checks.push({
      id: 'officials_equipment',
      category: 'officials',
      title: 'Officials Equipment Check',
      description: 'All officials have required equipment (whistles, cards, etc.)',
      status: 'pending',
      required: true,
      weight: 7
    })

    return checks
  }

  /**
   * Generate equipment validation checks
   */
  private async generateEquipmentValidationChecks(data: PreMatchValidationData): Promise<ValidationCheck[]> {
    const checks: ValidationCheck[] = []

    // Match balls
    checks.push({
      id: 'match_balls',
      category: 'equipment',
      title: 'Match Balls Available',
      description: 'Sufficient match balls are available and meet tournament standards',
      status: 'pending',
      required: true,
      weight: 9
    })

    // Goal nets
    checks.push({
      id: 'goal_nets',
      category: 'equipment',
      title: 'Goal Nets Secured',
      description: 'Goal nets are properly secured and in good condition',
      status: 'pending',
      required: true,
      weight: 8
    })

    // Corner flags
    checks.push({
      id: 'corner_flags',
      category: 'equipment',
      title: 'Corner Flags Available',
      description: 'Corner flags are in place and properly positioned',
      status: 'pending',
      required: true,
      weight: 6
    })

    // Electronic equipment
    checks.push({
      id: 'electronic_equipment',
      category: 'equipment',
      title: 'Electronic Equipment Ready',
      description: 'Scoreboard, timing equipment, and communication devices are functional',
      status: 'pending',
      required: true,
      weight: 7
    })

    // VAR equipment (if applicable)
    checks.push({
      id: 'var_equipment',
      category: 'equipment',
      title: 'VAR Equipment Ready',
      description: 'Video Assistant Referee equipment is operational (if applicable)',
      status: 'pending',
      required: false,
      weight: 5
    })

    return checks
  }

  /**
   * Generate safety validation checks
   */
  private async generateSafetyValidationChecks(data: PreMatchValidationData): Promise<ValidationCheck[]> {
    const checks: ValidationCheck[] = []

    // Medical staff
    checks.push({
      id: 'medical_staff',
      category: 'safety',
      title: 'Medical Staff Present',
      description: 'Qualified medical staff are present and ready',
      status: 'pending',
      required: true,
      weight: 10
    })

    // First aid equipment
    checks.push({
      id: 'first_aid_equipment',
      category: 'safety',
      title: 'First Aid Equipment Available',
      description: 'First aid equipment and supplies are available and accessible',
      status: 'pending',
      required: true,
      weight: 9
    })

    // Emergency procedures
    checks.push({
      id: 'emergency_procedures',
      category: 'safety',
      title: 'Emergency Procedures Briefing',
      description: 'Emergency procedures have been briefed to all staff and officials',
      status: 'pending',
      required: true,
      weight: 8
    })

    // Crowd control
    checks.push({
      id: 'crowd_control',
      category: 'safety',
      title: 'Crowd Control Measures',
      description: 'Appropriate crowd control measures are in place',
      status: 'pending',
      required: true,
      weight: 7
    })

    // Security
    checks.push({
      id: 'security_personnel',
      category: 'safety',
      title: 'Security Personnel Present',
      description: 'Security personnel are present and positioned appropriately',
      status: 'pending',
      required: false,
      weight: 6
    })

    return checks
  }

  /**
   * Generate compliance validation checks
   */
  private async generateComplianceValidationChecks(data: PreMatchValidationData): Promise<ValidationCheck[]> {
    const checks: ValidationCheck[] = []

    // Tournament rules compliance
    checks.push({
      id: 'tournament_rules',
      category: 'compliance',
      title: 'Tournament Rules Compliance',
      description: 'Match setup complies with all tournament rules and regulations',
      status: 'pending',
      required: true,
      weight: 9
    })

    // Anti-doping compliance
    checks.push({
      id: 'anti_doping',
      category: 'compliance',
      title: 'Anti-Doping Compliance',
      description: 'Anti-doping procedures are in place (if applicable)',
      status: 'pending',
      required: false,
      weight: 5
    })

    // Insurance coverage
    checks.push({
      id: 'insurance_coverage',
      category: 'compliance',
      title: 'Insurance Coverage Verified',
      description: 'Appropriate insurance coverage is in place',
      status: 'pending',
      required: true,
      weight: 8
    })

    // Data privacy compliance
    checks.push({
      id: 'data_privacy',
      category: 'compliance',
      title: 'Data Privacy Compliance',
      description: 'Data collection and privacy procedures are compliant',
      status: 'pending',
      required: false,
      weight: 4
    })

    return checks
  }

  /**
   * Generate logistics validation checks
   */
  private async generateLogisticsValidationChecks(data: PreMatchValidationData): Promise<ValidationCheck[]> {
    const checks: ValidationCheck[] = []

    // Team arrival
    checks.push({
      id: 'team_arrival',
      category: 'logistics',
      title: 'Teams Arrived on Time',
      description: 'Both teams have arrived at the venue on time',
      status: 'pending',
      required: true,
      weight: 8
    })

    // Dressing rooms
    checks.push({
      id: 'dressing_rooms',
      category: 'logistics',
      title: 'Dressing Rooms Ready',
      description: 'Dressing rooms are clean and ready for teams',
      status: 'pending',
      required: true,
      weight: 6
    })

    // Water and refreshments
    checks.push({
      id: 'refreshments',
      category: 'logistics',
      title: 'Water and Refreshments Available',
      description: 'Adequate water and refreshments are available for teams and officials',
      status: 'pending',
      required: true,
      weight: 7
    })

    // Media arrangements
    checks.push({
      id: 'media_arrangements',
      category: 'logistics',
      title: 'Media Arrangements',
      description: 'Media arrangements are in place (if applicable)',
      status: 'pending',
      required: false,
      weight: 4
    })

    // Transportation
    checks.push({
      id: 'transportation',
      category: 'logistics',
      title: 'Transportation Arrangements',
      description: 'Transportation arrangements for teams and officials are confirmed',
      status: 'pending',
      required: false,
      weight: 5
    })

    return checks
  }

  /**
   * Load completed validation checks from database
   */
  private async loadCompletedChecks(matchId: string): Promise<ValidationCheck[]> {
    try {
      const { data } = await this.supabase
        .from('match_validation_checks')
        .select('*')
        .eq('match_id', matchId)

      return data || []
    } catch (error) {
      console.error('Error loading completed checks:', error)
      return []
    }
  }

  /**
   * Extract critical issues from checklist
   */
  private extractCriticalIssues(checklist: ValidationCheck[]): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    checklist.forEach(check => {
      if (check.status === 'failed' && check.required) {
        issues.push({
          id: `issue_${check.id}`,
          check_id: check.id,
          severity: 'critical',
          title: `${check.title} - Failed`,
          description: check.details || `Critical validation check failed: ${check.description}`,
          resolution_required: true,
          suggested_actions: this.getSuggestedActions(check),
          auto_resolvable: false
        })
      }
    })

    return issues
  }

  /**
   * Extract warnings from checklist
   */
  private extractWarnings(checklist: ValidationCheck[]): ValidationIssue[] {
    const warnings: ValidationIssue[] = []

    checklist.forEach(check => {
      if (check.status === 'failed' && !check.required) {
        warnings.push({
          id: `warning_${check.id}`,
          check_id: check.id,
          severity: 'warning',
          title: `${check.title} - Warning`,
          description: check.details || `Optional validation check failed: ${check.description}`,
          resolution_required: false,
          suggested_actions: this.getSuggestedActions(check),
          auto_resolvable: true
        })
      }
    })

    return warnings
  }

  /**
   * Generate suggestions for optimization
   */
  private async generateSuggestions(checklist: ValidationCheck[], data: PreMatchValidationData): Promise<ValidationSuggestion[]> {
    const suggestions: ValidationSuggestion[] = []

    // Analyze pending checks
    const pendingChecks = checklist.filter(c => c.status === 'pending')
    
    if (pendingChecks.length > 0) {
      suggestions.push({
        id: 'complete_pending_checks',
        check_id: 'system',
        title: 'Complete Pending Validation Checks',
        description: `${pendingChecks.length} validation checks are still pending`,
        benefit: 'Ensures match can proceed without issues',
        implementation_effort: 'medium',
        priority: 'high'
      })
    }

    // Suggest early completion
    const inProgressChecks = checklist.filter(c => c.status === 'in_progress')
    if (inProgressChecks.length > 0) {
      suggestions.push({
        id: 'complete_in_progress',
        check_id: 'system',
        title: 'Complete In-Progress Checks',
        description: `${inProgressChecks.length} validation checks are in progress`,
        benefit: 'Reduces risk of last-minute issues',
        implementation_effort: 'low',
        priority: 'medium'
      })
    }

    return suggestions
  }

  /**
   * Get suggested actions for a failed check
   */
  private getSuggestedActions(check: ValidationCheck): string[] {
    const actions: string[] = []

    switch (check.category) {
      case 'teams':
        actions.push('Contact team manager', 'Verify player availability', 'Check team sheet submission')
        break
      case 'venue':
        actions.push('Contact venue manager', 'Check venue availability', 'Verify field conditions')
        break
      case 'officials':
        actions.push('Contact referee coordinator', 'Find replacement officials', 'Verify official assignments')
        break
      case 'equipment':
        actions.push('Check equipment inventory', 'Arrange equipment delivery', 'Verify equipment standards')
        break
      case 'safety':
        actions.push('Contact safety coordinator', 'Arrange emergency services', 'Verify safety protocols')
        break
      case 'compliance':
        actions.push('Review tournament rules', 'Contact compliance officer', 'Verify documentation')
        break
      case 'logistics':
        actions.push('Contact logistics coordinator', 'Verify arrangements', 'Check timing')
        break
      default:
        actions.push('Review requirements', 'Contact relevant personnel', 'Verify compliance')
    }

    return actions
  }

  /**
   * Mark a validation check as completed
   */
  async completeValidationCheck(
    matchId: string,
    checkId: string,
    completedBy: string,
    details?: string,
    evidence?: ValidationEvidence[]
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('match_validation_checks')
        .upsert({
          match_id: matchId,
          check_id: checkId,
          status: 'completed',
          completed_by: completedBy,
          completed_at: new Date().toISOString(),
          details,
          evidence
        })

      return !error
    } catch (error) {
      console.error('Error completing validation check:', error)
      return false
    }
  }

  /**
   * Mark a validation check as failed
   */
  async failValidationCheck(
    matchId: string,
    checkId: string,
    completedBy: string,
    details?: string,
    evidence?: ValidationEvidence[]
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('match_validation_checks')
        .upsert({
          match_id: matchId,
          check_id: checkId,
          status: 'failed',
          completed_by: completedBy,
          completed_at: new Date().toISOString(),
          details,
          evidence
        })

      return !error
    } catch (error) {
      console.error('Error failing validation check:', error)
      return false
    }
  }

  /**
   * Get validation summary for a match
   */
  async getValidationSummary(matchId: string): Promise<ValidationResult | null> {
    try {
      const { data: match } = await this.supabase
        .from('matches')
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(*),
          away_team:teams!matches_away_team_id_fkey(*),
          tournament:tournaments(*)
        `)
        .eq('id', matchId)
        .single()

      if (!match) return null

      return await this.validateMatch({
        match_id: matchId,
        home_team_id: match.home_team_id,
        away_team_id: match.away_team_id,
        venue_id: match.venue_id,
        scheduled_date: match.scheduled_date,
        match_duration: match.match_duration || 90,
        tournament_id: match.tournament_id,
        weather_conditions: match.weather_conditions,
        field_conditions: match.field_conditions
      })
    } catch (error) {
      console.error('Error getting validation summary:', error)
      return null
    }
  }
}
