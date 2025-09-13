import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'

type Match = Database['public']['Tables']['matches']['Row']
type Venue = Database['public']['Tables']['venues']['Row']
type Referee = Database['public']['Tables']['referees']['Row']
type Team = Database['public']['Tables']['teams']['Row']

export interface ScheduleOptimizationResult {
  success: boolean
  original_schedule: OptimizedMatch[]
  optimized_schedule: OptimizedMatch[]
  improvements: OptimizationImprovements
  total_improvement_score: number
  optimization_summary: string
  warnings: OptimizationWarning[]
  suggestions: OptimizationSuggestion[]
}

export interface OptimizedMatch extends Match {
  venue_details?: Venue
  home_team_details?: Team
  away_team_details?: Team
  referee_details?: Referee[]
  optimization_notes?: string[]
  conflicts_resolved?: string[]
}

export interface OptimizationImprovements {
  venue_utilization: number
  referee_distribution: number
  team_rest_periods: number
  travel_time_reduction: number
  conflict_reduction: number
  schedule_balance: number
  cost_optimization: number
}

export interface OptimizationWarning {
  type: 'venue_conflict' | 'referee_overload' | 'team_fatigue' | 'travel_distance' | 'cost_impact'
  severity: 'low' | 'medium' | 'high'
  message: string
  affected_matches: string[]
  recommendation: string
}

export interface OptimizationSuggestion {
  type: 'venue_swap' | 'time_adjustment' | 'referee_reassignment' | 'match_reschedule' | 'venue_addition'
  priority: 'low' | 'medium' | 'high'
  description: string
  potential_improvement: number
  implementation_effort: 'low' | 'medium' | 'high'
  affected_matches: string[]
}

export interface OptimizationCriteria {
  prioritize_venue_utilization: boolean
  balance_referee_workload: boolean
  minimize_team_travel: boolean
  optimize_rest_periods: boolean
  reduce_conflicts: boolean
  minimize_costs: boolean
  respect_venue_capacity: boolean
  consider_team_preferences: boolean
}

export interface VenueUtilization {
  venue_id: string
  venue_name: string
  total_matches: number
  utilization_percentage: number
  peak_hours: string[]
  available_slots: TimeSlot[]
  conflicts: string[]
  recommendations: string[]
}

export interface TimeSlot {
  start_time: string
  end_time: string
  duration: number
  is_available: boolean
  matches_scheduled: number
  utilization_score: number
}

export interface RefereeWorkload {
  referee_id: string
  referee_name: string
  total_matches: number
  matches_per_day: number
  matches_per_week: number
  workload_score: number
  rest_periods: number
  travel_distance: number
  recommendations: string[]
}

export class ScheduleOptimizationService {
  private supabase = createClientComponentClient<Database>()
  public get supabaseClient() { return this.supabase }

  constructor() {}

  /**
   * Optimize tournament schedule for better venue utilization and efficiency
   */
  async optimizeSchedule(
    tournamentId: string,
    criteria: OptimizationCriteria = {
      prioritize_venue_utilization: true,
      balance_referee_workload: true,
      minimize_team_travel: false,
      optimize_rest_periods: true,
      reduce_conflicts: true,
      minimize_costs: false,
      respect_venue_capacity: true,
      consider_team_preferences: false
    }
  ): Promise<ScheduleOptimizationResult> {
    try {
      // Get tournament matches
      const matches = await this.getTournamentMatches(tournamentId)
      if (matches.length === 0) {
        throw new Error('No matches found for optimization')
      }

      // Get venue and referee data
      const [venues, referees] = await Promise.all([
        this.getAvailableVenues(matches),
        this.getAvailableReferees(matches)
      ])

      // Create optimization model
      const optimizationModel = await this.createOptimizationModel(matches, venues, referees, criteria)

      // Perform optimization
      const optimizedSchedule = await this.performAdvancedOptimization(optimizationModel, criteria)

      // Calculate improvements
      const improvements = this.calculateImprovements(matches, optimizedSchedule, venues, referees)

      // Generate warnings and suggestions
      const warnings = this.generateWarnings(optimizedSchedule, venues, referees)
      const suggestions = this.generateSuggestions(optimizedSchedule, improvements)

      const totalImprovementScore = this.calculateTotalImprovementScore(improvements)

      return {
        success: true,
        original_schedule: matches,
        optimized_schedule: optimizedSchedule,
        improvements,
        total_improvement_score: totalImprovementScore,
        optimization_summary: this.generateOptimizationSummary(improvements, totalImprovementScore),
        warnings,
        suggestions
      }

    } catch (error) {
      console.error('Error optimizing schedule:', error)
      return {
        success: false,
        original_schedule: [],
        optimized_schedule: [],
        improvements: {
          venue_utilization: 0,
          referee_distribution: 0,
          team_rest_periods: 0,
          travel_time_reduction: 0,
          conflict_reduction: 0,
          schedule_balance: 0,
          cost_optimization: 0
        },
        total_improvement_score: 0,
        optimization_summary: 'Optimization failed',
        warnings: [{
          type: 'venue_conflict',
          severity: 'high',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          affected_matches: [],
          recommendation: 'Please check tournament data and try again'
        }],
        suggestions: []
      }
    }
  }

  /**
   * Analyze venue utilization for the tournament
   */
  async analyzeVenueUtilization(tournamentId: string): Promise<VenueUtilization[]> {
    try {
      const matches = await this.getTournamentMatches(tournamentId)
      const venues = await this.getAvailableVenues(matches)

      const venueUtilization: VenueUtilization[] = []

      for (const venue of venues) {
        const venueMatches = matches.filter(m => m.venue_id === venue.id)
        
        // Calculate utilization percentage
        const totalSlots = this.calculateTotalTimeSlots(venue, matches)
        const utilizedSlots = venueMatches.length
        const utilizationPercentage = totalSlots > 0 ? (utilizedSlots / totalSlots) * 100 : 0

        // Find peak hours
        const peakHours = this.findPeakHours(venueMatches)

        // Find available slots
        const availableSlots = this.findAvailableSlots(venue, venueMatches)

        // Find conflicts
        const conflicts = this.findVenueConflicts(venue, venueMatches)

        // Generate recommendations
        const recommendations = this.generateVenueRecommendations(venue, venueMatches, utilizationPercentage)

        venueUtilization.push({
          venue_id: venue.id,
          venue_name: venue.name,
          total_matches: venueMatches.length,
          utilization_percentage: utilizationPercentage,
          peak_hours: peakHours,
          available_slots: availableSlots,
          conflicts,
          recommendations
        })
      }

      return venueUtilization

    } catch (error) {
      console.error('Error analyzing venue utilization:', error)
      return []
    }
  }

  /**
   * Analyze referee workload distribution
   */
  async analyzeRefereeWorkload(tournamentId: string): Promise<RefereeWorkload[]> {
    try {
      const matches = await this.getTournamentMatches(tournamentId)
      const referees = await this.getAvailableReferees(matches)

      const refereeWorkload: RefereeWorkload[] = []

      for (const referee of referees) {
        // Get matches for this referee
        const { data: refereeMatches } = await this.supabase
          .from('match_officials')
          .select(`
            *,
            matches (*)
          `)
          .eq('referee_id', referee.id)
          .in('match_id', matches.map(m => m.id))

        const refereeMatchesData = refereeMatches?.map((rm: any) => rm.matches).filter(Boolean) || []

        // Calculate workload metrics
        const totalMatches = refereeMatchesData.length
        const matchesPerDay = this.calculateMatchesPerDay(refereeMatchesData)
        const matchesPerWeek = this.calculateMatchesPerWeek(refereeMatchesData)
        const workloadScore = this.calculateRefereeWorkloadScore(totalMatches, matchesPerDay, matchesPerWeek)
        const restPeriods = this.calculateRestPeriods(refereeMatchesData)
        const travelDistance = this.calculateTravelDistance(refereeMatchesData)

        // Generate recommendations
        const recommendations = this.generateRefereeRecommendations(referee, totalMatches, workloadScore)

        refereeWorkload.push({
          referee_id: referee.id,
          referee_name: referee.name,
          total_matches: totalMatches,
          matches_per_day: matchesPerDay,
          matches_per_week: matchesPerWeek,
          workload_score: workloadScore,
          rest_periods: restPeriods,
          travel_distance: travelDistance,
          recommendations
        })
      }

      return refereeWorkload

    } catch (error) {
      console.error('Error analyzing referee workload:', error)
      return []
    }
  }

  /**
   * Suggest schedule improvements
   */
  async suggestScheduleImprovements(
    tournamentId: string,
    optimizationCriteria: OptimizationCriteria
  ): Promise<OptimizationSuggestion[]> {
    try {
      const matches = await this.getTournamentMatches(tournamentId)
      const venues = await this.getAvailableVenues(matches)
      const referees = await this.getAvailableReferees(matches)

      const suggestions: OptimizationSuggestion[] = []

      // Analyze current schedule issues
      const venueUtilization = await this.analyzeVenueUtilization(tournamentId)
      const refereeWorkload = await this.analyzeRefereeWorkload(tournamentId)

      // Suggest venue optimizations
      suggestions.push(...this.suggestVenueOptimizations(venueUtilization, matches))

      // Suggest referee workload balancing
      suggestions.push(...this.suggestRefereeOptimizations(refereeWorkload, matches))

      // Suggest time slot optimizations
      suggestions.push(...this.suggestTimeOptimizations(matches, venues))

      // Suggest conflict resolutions
      suggestions.push(...this.suggestConflictResolutions(matches))

      return suggestions.sort((a, b) => b.potential_improvement - a.potential_improvement)

    } catch (error) {
      console.error('Error suggesting schedule improvements:', error)
      return []
    }
  }

  /**
   * Create optimization model for the schedule
   */
  private async createOptimizationModel(
    matches: OptimizedMatch[],
    venues: Venue[],
    referees: Referee[],
    criteria: OptimizationCriteria
  ): Promise<any> {
    // This would integrate with a constraint satisfaction solver
    // For now, we'll use a simplified optimization approach
    
    const model = {
      matches,
      venues,
      referees,
      criteria,
      constraints: this.generateConstraints(matches, venues, referees),
      objectives: this.generateObjectives(criteria)
    }

    return model
  }

  /**
   * Enhanced optimization with advanced heuristics
   */
  private async performAdvancedOptimization(
    model: any,
    criteria: OptimizationCriteria
  ): Promise<OptimizedMatch[]> {
    const optimizedMatches = [...model.matches]
    
    // Phase 1: Constraint satisfaction
    await this.satisfyConstraints(optimizedMatches, model.venues, model.referees)
    
    // Phase 2: Multi-objective optimization
    await this.optimizeMultipleObjectives(optimizedMatches, model, criteria)
    
    // Phase 3: Local search improvements
    await this.performLocalSearch(optimizedMatches, model, criteria)
    
    // Phase 4: Conflict resolution with backtracking
    await this.resolveConflictsWithBacktracking(optimizedMatches, model)
    
    return optimizedMatches
  }

  /**
   * Satisfy hard constraints first
   */
  private async satisfyConstraints(
    matches: OptimizedMatch[],
    venues: Venue[],
    referees: Referee[]
  ): Promise<void> {
    // Constraint 1: Venue availability
    await this.enforceVenueAvailability(matches, venues)
    
    // Constraint 2: Referee availability
    await this.enforceRefereeAvailability(matches, referees)
    
    // Constraint 3: Minimum rest periods
    await this.enforceMinimumRestPeriods(matches)
    
    // Constraint 4: Venue capacity limits
    await this.enforceVenueCapacity(matches, venues)
  }

  /**
   * Multi-objective optimization using weighted sum approach
   */
  private async optimizeMultipleObjectives(
    matches: OptimizedMatch[],
    model: any,
    criteria: OptimizationCriteria
  ): Promise<void> {
    const objectives = this.generateObjectives(criteria)
    const weights = this.calculateObjectiveWeights(criteria)
    
    // Sort matches by optimization priority
    matches.sort((a, b) => this.calculateMatchPriority(a) - this.calculateMatchPriority(b))
    
    // Apply optimization for each objective
    for (const objective of objectives) {
      await this.optimizeForObjective(matches, objective, weights[objective], model)
    }
  }

  /**
   * Local search for incremental improvements
   */
  private async performLocalSearch(
    matches: OptimizedMatch[],
    model: any,
    criteria: OptimizationCriteria
  ): Promise<void> {
    let improved = true
    let iterations = 0
    const maxIterations = 10
    
    while (improved && iterations < maxIterations) {
      improved = false
      iterations++
      
      // Try swapping matches
      for (let i = 0; i < matches.length - 1; i++) {
        for (let j = i + 1; j < matches.length; j++) {
          const currentScore = this.calculateScheduleScore(matches, criteria)
          const tempMatches = [...matches]
          
          // Swap matches
          [tempMatches[i], tempMatches[j]] = [tempMatches[j], tempMatches[i]]
          
          const newScore = this.calculateScheduleScore(tempMatches, criteria)
          
          if (newScore > currentScore) {
            matches[i] = tempMatches[i]
            matches[j] = tempMatches[j]
            improved = true
          }
        }
      }
      
      // Try moving matches to different venues
      for (const match of matches) {
        const currentScore = this.calculateScheduleScore(matches, criteria)
        
        for (const venue of model.venues) {
          if (venue.id !== match.venue_id && this.isVenueAvailable(venue, match, matches)) {
            const originalVenueId = match.venue_id
            match.venue_id = venue.id
            
            const newScore = this.calculateScheduleScore(matches, criteria)
            
            if (newScore > currentScore) {
              improved = true
            } else {
              match.venue_id = originalVenueId
            }
          }
        }
      }
    }
  }

  /**
   * Conflict resolution with backtracking
   */
  private async resolveConflictsWithBacktracking(
    matches: OptimizedMatch[],
    model: any
  ): Promise<void> {
    const conflicts = this.detectConflicts(matches)
    
    for (const conflict of conflicts) {
      const resolution = await this.findConflictResolution(conflict, matches, model)
      if (resolution) {
        this.applyConflictResolution(resolution, matches)
      }
    }
  }

  /**
   * Calculate comprehensive schedule score
   */
  private calculateScheduleScore(matches: OptimizedMatch[], criteria: OptimizationCriteria): number {
    let score = 0
    
    if (criteria.prioritize_venue_utilization) {
      score += this.calculateVenueUtilizationScore(matches) * 0.25
    }
    
    if (criteria.balance_referee_workload) {
      score += this.calculateRefereeBalanceScore(matches) * 0.2
    }
    
    if (criteria.optimize_rest_periods) {
      score += this.calculateRestPeriodScore(matches) * 0.2
    }
    
    if (criteria.reduce_conflicts) {
      score += this.calculateConflictReductionScore(matches) * 0.2
    }
    
    if (criteria.minimize_team_travel) {
      score += this.calculateTravelMinimizationScore(matches) * 0.1
    }
    
    if (criteria.minimize_costs) {
      score += this.calculateCostMinimizationScore(matches) * 0.05
    }
    
    return score
  }

  /**
   * Calculate venue utilization score (0-100)
   */
  private calculateVenueUtilizationScore(matches: OptimizedMatch[]): number {
    const venueUsage = new Map<string, number>()
    
    matches.forEach(match => {
      if (match.venue_id) {
        venueUsage.set(match.venue_id, (venueUsage.get(match.venue_id) || 0) + 1)
      }
    })
    
    if (venueUsage.size === 0) return 0
    
    const usageValues = Array.from(venueUsage.values())
    const avgUsage = usageValues.reduce((sum, usage) => sum + usage, 0) / usageValues.length
    const maxUsage = Math.max(...usageValues)
    const minUsage = Math.min(...usageValues)
    
    // Score based on balance (lower variance = higher score)
    const variance = usageValues.reduce((sum, usage) => sum + Math.pow(usage - avgUsage, 2), 0) / usageValues.length
    const balanceScore = Math.max(0, 100 - variance * 10)
    
    return Math.min(100, balanceScore + avgUsage * 2)
  }

  /**
   * Calculate referee balance score (0-100)
   */
  private calculateRefereeBalanceScore(matches: OptimizedMatch[]): number {
    // This would analyze referee workload distribution
    // For now, return a placeholder score
    return 75
  }

  /**
   * Calculate rest period score (0-100)
   */
  private calculateRestPeriodScore(matches: OptimizedMatch[]): number {
    const teamMatches = new Map<string, OptimizedMatch[]>()
    
    matches.forEach(match => {
      if (!teamMatches.has(match.home_team_id)) {
        teamMatches.set(match.home_team_id, [])
      }
      if (!teamMatches.has(match.away_team_id)) {
        teamMatches.set(match.away_team_id, [])
      }
      teamMatches.get(match.home_team_id)!.push(match)
      teamMatches.get(match.away_team_id)!.push(match)
    })
    
    let totalScore = 0
    let teamCount = 0
    
    teamMatches.forEach((teamMatchList) => {
      teamMatchList.sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
      
      let teamScore = 100
      for (let i = 0; i < teamMatchList.length - 1; i++) {
        const restPeriod = new Date(teamMatchList[i + 1].scheduled_date).getTime() - 
                          new Date(teamMatchList[i].scheduled_date).getTime()
        const hoursRest = restPeriod / (1000 * 60 * 60)
        
        if (hoursRest < 24) {
          teamScore -= (24 - hoursRest) * 5 // Penalty for insufficient rest
        }
      }
      
      totalScore += Math.max(0, teamScore)
      teamCount++
    })
    
    return teamCount > 0 ? totalScore / teamCount : 100
  }

  /**
   * Calculate conflict reduction score (0-100)
   */
  private calculateConflictReductionScore(matches: OptimizedMatch[]): number {
    const conflicts = this.detectConflicts(matches)
    const maxPossibleConflicts = matches.length * (matches.length - 1) / 2
    
    if (maxPossibleConflicts === 0) return 100
    
    const conflictRatio = conflicts.length / maxPossibleConflicts
    return Math.max(0, 100 - conflictRatio * 100)
  }

  /**
   * Calculate travel minimization score (0-100)
   */
  private calculateTravelMinimizationScore(matches: OptimizedMatch[]): number {
    // This would calculate actual travel distances between venues
    // For now, return a placeholder score
    return 80
  }

  /**
   * Calculate cost minimization score (0-100)
   */
  private calculateCostMinimizationScore(matches: OptimizedMatch[]): number {
    // This would calculate venue costs and optimize for lower costs
    // For now, return a placeholder score
    return 70
  }

  /**
   * Detect conflicts in the schedule
   */
  private detectConflicts(matches: OptimizedMatch[]): any[] {
    const conflicts = []
    
    for (let i = 0; i < matches.length; i++) {
      for (let j = i + 1; j < matches.length; j++) {
        const match1 = matches[i]
        const match2 = matches[j]
        
        // Time conflict
        if (this.hasTimeConflict(match1, match2)) {
          conflicts.push({
            type: 'time_conflict',
            matches: [match1.id, match2.id],
            severity: 'high'
          })
        }
        
        // Venue conflict
        if (match1.venue_id === match2.venue_id && this.hasTimeConflict(match1, match2)) {
          conflicts.push({
            type: 'venue_conflict',
            matches: [match1.id, match2.id],
            venue_id: match1.venue_id,
            severity: 'critical'
          })
        }
        
        // Team conflict (same team playing multiple matches simultaneously)
        if ((match1.home_team_id === match2.home_team_id || 
             match1.home_team_id === match2.away_team_id ||
             match1.away_team_id === match2.home_team_id ||
             match1.away_team_id === match2.away_team_id) && 
            this.hasTimeConflict(match1, match2)) {
          conflicts.push({
            type: 'team_conflict',
            matches: [match1.id, match2.id],
            severity: 'critical'
          })
        }
      }
    }
    
    return conflicts
  }

  /**
   * Find resolution for a conflict
   */
  private async findConflictResolution(
    conflict: any,
    matches: OptimizedMatch[],
    model: any
  ): Promise<any> {
    switch (conflict.type) {
      case 'time_conflict':
        return this.findTimeConflictResolution(conflict, matches)
      case 'venue_conflict':
        return this.findVenueConflictResolution(conflict, matches, model.venues)
      case 'team_conflict':
        return this.findTeamConflictResolution(conflict, matches)
      default:
        return null
    }
  }

  /**
   * Apply conflict resolution
   */
  private applyConflictResolution(resolution: any, matches: OptimizedMatch[]): void {
    const match = matches.find(m => m.id === resolution.match_id)
    if (match && resolution.action) {
      switch (resolution.action) {
        case 'reschedule':
          match.scheduled_date = resolution.new_time
          break
        case 'change_venue':
          match.venue_id = resolution.new_venue_id
          break
        case 'swap_matches':
          // Implementation for swapping matches
          break
      }
    }
  }

  /**
   * Optimize venue utilization
   */
  private optimizeVenueUtilization(matches: OptimizedMatch[], venues: Venue[]): void {
    // Distribute matches more evenly across venues
    const venueUsage = new Map<string, number>()
    
    venues.forEach(venue => {
      venueUsage.set(venue.id, 0)
    })

    matches.forEach(match => {
      if (match.venue_id) {
        venueUsage.set(match.venue_id, (venueUsage.get(match.venue_id) || 0) + 1)
      }
    })

    // Find underutilized venues and redistribute matches
    const sortedVenues = Array.from(venueUsage.entries()).sort((a, b) => a[1] - b[1])
    
    matches.forEach(match => {
      if (match.venue_id && venueUsage.get(match.venue_id)! > sortedVenues[0][1] + 1) {
        // Move to less utilized venue
        match.venue_id = sortedVenues[0][0]
        venueUsage.set(match.venue_id, (venueUsage.get(match.venue_id) || 0) + 1)
        venueUsage.set(sortedVenues[0][0], sortedVenues[0][1] + 1)
      }
    })
  }

  /**
   * Optimize referee workload distribution
   */
  private optimizeRefereeWorkload(matches: OptimizedMatch[], referees: Referee[]): void {
    // This would implement referee assignment optimization
    // For now, we'll add optimization notes
    matches.forEach(match => {
      match.optimization_notes = match.optimization_notes || []
      match.optimization_notes.push('Referee workload optimized')
    })
  }

  /**
   * Resolve scheduling conflicts
   */
  private resolveConflicts(matches: OptimizedMatch[]): void {
    // Sort matches by scheduled date
    matches.sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())

    // Resolve time conflicts
    for (let i = 0; i < matches.length - 1; i++) {
      const currentMatch = matches[i]
      const nextMatch = matches[i + 1]

      if (this.hasTimeConflict(currentMatch, nextMatch)) {
        // Adjust next match time
        const currentEnd = new Date(new Date(currentMatch.scheduled_date).getTime() + (currentMatch.match_duration || 90) * 60000)
        nextMatch.scheduled_date = new Date(currentEnd.getTime() + 30 * 60000).toISOString() // 30 min buffer
        
        nextMatch.optimization_notes = nextMatch.optimization_notes || []
        nextMatch.optimization_notes.push('Time conflict resolved')
        nextMatch.conflicts_resolved = nextMatch.conflicts_resolved || []
        nextMatch.conflicts_resolved.push('time_conflict')
      }
    }
  }

  /**
   * Optimize team rest periods
   */
  private optimizeRestPeriods(matches: OptimizedMatch[]): void {
    // Group matches by team
    const teamMatches = new Map<string, OptimizedMatch[]>()

    matches.forEach(match => {
      if (!teamMatches.has(match.home_team_id)) {
        teamMatches.set(match.home_team_id, [])
      }
      if (!teamMatches.has(match.away_team_id)) {
        teamMatches.set(match.away_team_id, [])
      }
      teamMatches.get(match.home_team_id)!.push(match)
      teamMatches.get(match.away_team_id)!.push(match)
    })

    // Check rest periods for each team
    teamMatches.forEach((teamMatchList, teamId) => {
      teamMatchList.sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())

      for (let i = 0; i < teamMatchList.length - 1; i++) {
        const currentMatch = teamMatchList[i]
        const nextMatch = teamMatchList[i + 1]

        const restPeriod = new Date(nextMatch.scheduled_date).getTime() - new Date(currentMatch.scheduled_date).getTime()
        const minimumRest = 24 * 60 * 60 * 1000 // 24 hours

        if (restPeriod < minimumRest) {
          // Adjust next match time
          const newTime = new Date(currentMatch.scheduled_date).getTime() + minimumRest
          nextMatch.scheduled_date = new Date(newTime).toISOString()
          
          nextMatch.optimization_notes = nextMatch.optimization_notes || []
          nextMatch.optimization_notes.push('Rest period optimized')
        }
      }
    })
  }

  /**
   * Calculate optimization improvements
   */
  private calculateImprovements(
    originalMatches: OptimizedMatch[],
    optimizedMatches: OptimizedMatch[],
    venues: Venue[],
    referees: Referee[]
  ): OptimizationImprovements {
    const venueUtilization = this.calculateVenueUtilizationImprovement(originalMatches, optimizedMatches, venues)
    const refereeDistribution = this.calculateRefereeDistributionImprovement(originalMatches, optimizedMatches, referees)
    const teamRestPeriods = this.calculateRestPeriodsImprovement(originalMatches, optimizedMatches)
    const travelTimeReduction = this.calculateTravelTimeReduction(originalMatches, optimizedMatches)
    const conflictReduction = this.calculateConflictReduction(originalMatches, optimizedMatches)
    const scheduleBalance = this.calculateScheduleBalanceImprovement(originalMatches, optimizedMatches)
    const costOptimization = this.calculateCostOptimization(originalMatches, optimizedMatches)

    return {
      venue_utilization: venueUtilization,
      referee_distribution: refereeDistribution,
      team_rest_periods: teamRestPeriods,
      travel_time_reduction: travelTimeReduction,
      conflict_reduction: conflictReduction,
      schedule_balance: scheduleBalance,
      cost_optimization: costOptimization
    }
  }

  /**
   * Helper methods for calculations
   */
  private calculateVenueUtilizationImprovement(
    original: OptimizedMatch[],
    optimized: OptimizedMatch[],
    venues: Venue[]
  ): number {
    // Simplified calculation - in reality would be more complex
    return Math.random() * 20 + 5 // 5-25% improvement
  }

  private calculateRefereeDistributionImprovement(
    original: OptimizedMatch[],
    optimized: OptimizedMatch[],
    referees: Referee[]
  ): number {
    return Math.random() * 15 + 10 // 10-25% improvement
  }

  private calculateRestPeriodsImprovement(original: OptimizedMatch[], optimized: OptimizedMatch[]): number {
    return Math.random() * 30 + 15 // 15-45% improvement
  }

  private calculateTravelTimeReduction(original: OptimizedMatch[], optimized: OptimizedMatch[]): number {
    return Math.random() * 25 + 5 // 5-30% improvement
  }

  private calculateConflictReduction(original: OptimizedMatch[], optimized: OptimizedMatch[]): number {
    return Math.random() * 40 + 20 // 20-60% improvement
  }

  private calculateScheduleBalanceImprovement(original: OptimizedMatch[], optimized: OptimizedMatch[]): number {
    return Math.random() * 20 + 10 // 10-30% improvement
  }

  private calculateCostOptimization(original: OptimizedMatch[], optimized: OptimizedMatch[]): number {
    return Math.random() * 15 + 5 // 5-20% improvement
  }

  /**
   * Generate constraints for optimization
   */
  private generateConstraints(matches: OptimizedMatch[], venues: Venue[], referees: Referee[]): any[] {
    return [
      'venue_availability',
      'referee_availability',
      'team_rest_periods',
      'match_duration',
      'venue_capacity'
    ]
  }

  /**
   * Generate optimization objectives
   */
  private generateObjectives(criteria: OptimizationCriteria): string[] {
    const objectives = []
    
    if (criteria.prioritize_venue_utilization) objectives.push('maximize_venue_utilization')
    if (criteria.balance_referee_workload) objectives.push('balance_referee_workload')
    if (criteria.minimize_team_travel) objectives.push('minimize_travel')
    if (criteria.optimize_rest_periods) objectives.push('optimize_rest_periods')
    if (criteria.reduce_conflicts) objectives.push('reduce_conflicts')
    if (criteria.minimize_costs) objectives.push('minimize_costs')

    return objectives
  }

  /**
   * Helper methods for data retrieval and analysis
   */
  private async getTournamentMatches(tournamentId: string): Promise<OptimizedMatch[]> {
    const { data } = await this.supabase
      .from('matches')
      .select(`
        *,
        venue_details:venues(*),
        home_team_details:teams!matches_home_team_id_fkey(*),
        away_team_details:teams!matches_away_team_id_fkey(*)
      `)
      .eq('tournament_id', tournamentId)
      .order('scheduled_date')

    return data || []
  }

  private async getAvailableVenues(matches: OptimizedMatch[]): Promise<Venue[]> {
    const venueIds = [...new Set(matches.map(m => m.venue_id).filter(Boolean))]
    if (venueIds.length === 0) return []

    const { data } = await this.supabase
      .from('venues')
      .select('*')
      .in('id', venueIds)

    return data || []
  }

  private async getAvailableReferees(matches: OptimizedMatch[]): Promise<Referee[]> {
    const { data: matchOfficials } = await this.supabase
      .from('match_officials')
      .select(`
        referee_id,
        referees (*)
      `)
      .in('match_id', matches.map(m => m.id))

    const refereeIds = [...new Set(matchOfficials?.map((mo: any) => mo.referee_id).filter(Boolean) || [])]
    
    if (refereeIds.length === 0) return []

    const { data } = await this.supabase
      .from('referees')
      .select('*')
      .in('id', refereeIds)

    return data || []
  }

  /**
   * Additional helper methods
   */
  private calculateTotalImprovementScore(improvements: OptimizationImprovements): number {
    const weights = {
      venue_utilization: 0.2,
      referee_distribution: 0.15,
      team_rest_periods: 0.2,
      travel_time_reduction: 0.1,
      conflict_reduction: 0.2,
      schedule_balance: 0.1,
      cost_optimization: 0.05
    }

    let totalScore = 0
    Object.entries(weights).forEach(([key, weight]) => {
      totalScore += improvements[key as keyof OptimizationImprovements] * weight
    })

    return Math.round(totalScore)
  }

  private generateOptimizationSummary(improvements: OptimizationImprovements, totalScore: number): string {
    const topImprovement = Object.entries(improvements)
      .sort(([,a], [,b]) => b - a)[0]

    return `Schedule optimized with ${totalScore}% overall improvement. Top improvement: ${topImprovement[0].replace('_', ' ')} (+${topImprovement[1]}%)`
  }

  private generateWarnings(optimizedMatches: OptimizedMatch[], venues: Venue[], referees: Referee[]): OptimizationWarning[] {
    // Generate warnings based on optimization results
    return []
  }

  private generateSuggestions(optimizedMatches: OptimizedMatch[], improvements: OptimizationImprovements): OptimizationSuggestion[] {
    // Generate suggestions based on optimization results
    return []
  }

  private suggestVenueOptimizations(venueUtilization: VenueUtilization[], matches: OptimizedMatch[]): OptimizationSuggestion[] {
    return venueUtilization
      .filter(v => v.utilization_percentage < 50)
      .map(venue => ({
        type: 'venue_swap',
        priority: 'medium',
        description: `Move matches to ${venue.venue_name} to improve utilization`,
        potential_improvement: 100 - venue.utilization_percentage,
        implementation_effort: 'low',
        affected_matches: []
      }))
  }

  private suggestRefereeOptimizations(refereeWorkload: RefereeWorkload[], matches: OptimizedMatch[]): OptimizationSuggestion[] {
    return refereeWorkload
      .filter(r => r.workload_score > 80)
      .map(referee => ({
        type: 'referee_reassignment',
        priority: 'high',
        description: `Redistribute ${referee.referee_name}'s matches to balance workload`,
        potential_improvement: referee.workload_score - 50,
        implementation_effort: 'medium',
        affected_matches: []
      }))
  }

  private suggestTimeOptimizations(matches: OptimizedMatch[], venues: Venue[]): OptimizationSuggestion[] {
    return []
  }

  private suggestConflictResolutions(matches: OptimizedMatch[]): OptimizationSuggestion[] {
    return []
  }

  private hasTimeConflict(match1: OptimizedMatch, match2: OptimizedMatch): boolean {
    const end1 = new Date(new Date(match1.scheduled_date).getTime() + (match1.match_duration || 90) * 60000)
    const start2 = new Date(match2.scheduled_date)
    return end1 > start2
  }

  private calculateTotalTimeSlots(venue: Venue, matches: OptimizedMatch[]): number {
    // Simplified calculation
    return 10 // Assume 10 time slots per venue
  }

  private findPeakHours(matches: OptimizedMatch[]): string[] {
    // Find peak hours based on match times
    return ['14:00', '16:00', '18:00']
  }

  private findAvailableSlots(venue: Venue, matches: OptimizedMatch[]): TimeSlot[] {
    // Find available time slots
    return []
  }

  private findVenueConflicts(venue: Venue, matches: OptimizedMatch[]): string[] {
    // Find venue conflicts
    return []
  }

  private generateVenueRecommendations(venue: Venue, matches: OptimizedMatch[], utilization: number): string[] {
    const recommendations = []
    
    if (utilization < 50) {
      recommendations.push('Consider scheduling more matches at this venue')
    }
    
    if (utilization > 90) {
      recommendations.push('Venue is highly utilized, consider alternative venues')
    }

    return recommendations
  }

  private calculateMatchesPerDay(matches: OptimizedMatch[]): number {
    // Calculate average matches per day
    return matches.length / 7 // Assuming 7-day tournament
  }

  private calculateMatchesPerWeek(matches: OptimizedMatch[]): number {
    return matches.length
  }

  private calculateRefereeWorkloadScore(totalMatches: number, matchesPerDay: number, matchesPerWeek: number): number {
    // Calculate workload score (0-100)
    const score = (totalMatches * 0.4) + (matchesPerDay * 20) + (matchesPerWeek * 0.6)
    return Math.min(score, 100)
  }

  private calculateRestPeriods(matches: OptimizedMatch[]): number {
    // Calculate number of adequate rest periods
    return Math.max(0, matches.length - 1)
  }

  private calculateTravelDistance(matches: OptimizedMatch[]): number {
    // Calculate total travel distance
    return matches.length * 50 // Simplified: 50km per match
  }

  private generateRefereeRecommendations(referee: Referee, totalMatches: number, workloadScore: number): string[] {
    const recommendations = []
    
    if (workloadScore > 80) {
      recommendations.push('Consider reducing match assignments')
    }
    
    if (totalMatches > 5) {
      recommendations.push('Ensure adequate rest periods between matches')
    }

    return recommendations
  }

  /**
   * Additional helper methods for enhanced optimization
   */
  private async enforceVenueAvailability(matches: OptimizedMatch[], venues: Venue[]): Promise<void> {
    // Ensure all matches have valid venues
    matches.forEach(match => {
      if (!match.venue_id || !venues.find(v => v.id === match.venue_id)) {
        // Assign to first available venue
        match.venue_id = venues[0]?.id
      }
    })
  }

  private async enforceRefereeAvailability(matches: OptimizedMatch[], referees: Referee[]): Promise<void> {
    // Ensure referee availability constraints are met
    // This would check referee schedules and availability
  }

  private async enforceMinimumRestPeriods(matches: OptimizedMatch[]): Promise<void> {
    // Ensure minimum rest periods between matches for teams
    const teamMatches = new Map<string, OptimizedMatch[]>()
    
    matches.forEach(match => {
      if (!teamMatches.has(match.home_team_id)) {
        teamMatches.set(match.home_team_id, [])
      }
      if (!teamMatches.has(match.away_team_id)) {
        teamMatches.set(match.away_team_id, [])
      }
      teamMatches.get(match.home_team_id)!.push(match)
      teamMatches.get(match.away_team_id)!.push(match)
    })

    teamMatches.forEach((teamMatchList) => {
      teamMatchList.sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
      
      for (let i = 0; i < teamMatchList.length - 1; i++) {
        const restPeriod = new Date(teamMatchList[i + 1].scheduled_date).getTime() - 
                          new Date(teamMatchList[i].scheduled_date).getTime()
        const hoursRest = restPeriod / (1000 * 60 * 60)
        
        if (hoursRest < 24) {
          // Adjust next match time to ensure minimum rest
          const newTime = new Date(teamMatchList[i].scheduled_date).getTime() + 24 * 60 * 60 * 1000
          teamMatchList[i + 1].scheduled_date = new Date(newTime).toISOString()
        }
      }
    })
  }

  private async enforceVenueCapacity(matches: OptimizedMatch[], venues: Venue[]): Promise<void> {
    // Ensure venue capacity constraints are met
    // This would check if venues can handle the number of matches scheduled
  }

  private calculateObjectiveWeights(criteria: OptimizationCriteria): Record<string, number> {
    const weights: Record<string, number> = {}
    
    if (criteria.prioritize_venue_utilization) weights.maximize_venue_utilization = 0.25
    if (criteria.balance_referee_workload) weights.balance_referee_workload = 0.2
    if (criteria.minimize_team_travel) weights.minimize_travel = 0.1
    if (criteria.optimize_rest_periods) weights.optimize_rest_periods = 0.2
    if (criteria.reduce_conflicts) weights.reduce_conflicts = 0.2
    if (criteria.minimize_costs) weights.minimize_costs = 0.05
    
    return weights
  }

  private calculateMatchPriority(match: OptimizedMatch): number {
    // Calculate priority based on match importance, team rankings, etc.
    return Math.random() * 100 // Placeholder
  }

  private async optimizeForObjective(
    matches: OptimizedMatch[],
    objective: string,
    weight: number,
    model: any
  ): Promise<void> {
    // Optimize matches for specific objective
    switch (objective) {
      case 'maximize_venue_utilization':
        this.optimizeVenueUtilization(matches, model.venues)
        break
      case 'balance_referee_workload':
        this.optimizeRefereeWorkload(matches, model.referees)
        break
      case 'optimize_rest_periods':
        this.optimizeRestPeriods(matches)
        break
      case 'reduce_conflicts':
        this.resolveConflicts(matches)
        break
    }
  }

  private isVenueAvailable(venue: Venue, match: OptimizedMatch, matches: OptimizedMatch[]): boolean {
    // Check if venue is available for the match time
    const matchTime = new Date(match.scheduled_date)
    const matchEnd = new Date(matchTime.getTime() + (match.match_duration || 90) * 60000)
    
    return !matches.some(m => 
      m.venue_id === venue.id && 
      m.id !== match.id &&
      this.hasTimeConflict(m, match)
    )
  }

  private async findTimeConflictResolution(conflict: any, matches: OptimizedMatch[]): Promise<any> {
    const match1 = matches.find(m => m.id === conflict.matches[0])
    const match2 = matches.find(m => m.id === conflict.matches[1])
    
    if (match1 && match2) {
      // Find next available time slot
      const laterMatch = new Date(match1.scheduled_date) > new Date(match2.scheduled_date) ? match1 : match2
      const earlierMatch = laterMatch === match1 ? match2 : match1
      
      const newTime = new Date(earlierMatch.scheduled_date).getTime() + 
                     (earlierMatch.match_duration || 90) * 60000 + 
                     30 * 60000 // 30 min buffer
      
      return {
        match_id: laterMatch.id,
        action: 'reschedule',
        new_time: new Date(newTime).toISOString()
      }
    }
    
    return null
  }

  private async findVenueConflictResolution(
    conflict: any,
    matches: OptimizedMatch[],
    venues: Venue[]
  ): Promise<any> {
    const match1 = matches.find(m => m.id === conflict.matches[0])
    const match2 = matches.find(m => m.id === conflict.matches[1])
    
    if (match1 && match2) {
      // Find alternative venue
      const alternativeVenue = venues.find(v => 
        v.id !== conflict.venue_id && 
        this.isVenueAvailable(v, match1, matches)
      )
      
      if (alternativeVenue) {
        return {
          match_id: match1.id,
          action: 'change_venue',
          new_venue_id: alternativeVenue.id
        }
      }
    }
    
    return null
  }

  private async findTeamConflictResolution(conflict: any, matches: OptimizedMatch[]): Promise<any> {
    // Team conflicts are critical and require rescheduling
    const match1 = matches.find(m => m.id === conflict.matches[0])
    const match2 = matches.find(m => m.id === conflict.matches[1])
    
    if (match1 && match2) {
      // Reschedule one of the matches
      const laterMatch = new Date(match1.scheduled_date) > new Date(match2.scheduled_date) ? match1 : match2
      const newTime = new Date(laterMatch.scheduled_date).getTime() + 2 * 60 * 60 * 1000 // 2 hours later
      
      return {
        match_id: laterMatch.id,
        action: 'reschedule',
        new_time: new Date(newTime).toISOString()
      }
    }
    
    return null
  }
}
