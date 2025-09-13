import { Database } from '@/lib/supabase/types'

export type PerformanceRating = 1 | 2 | 3 | 4 | 5
export type PerformanceCategory = 'overall' | 'decision_making' | 'fitness' | 'communication' | 'game_management' | 'fairness'
export type MatchLevel = 'international' | 'national' | 'regional' | 'local'
export type TournamentType = 'league' | 'knockout' | 'group_stage' | 'friendly'

export interface RefereePerformanceMetrics {
  referee_id: string
  referee_name: string
  total_matches: number
  total_assignments: number
  confirmed_assignments: number
  declined_assignments: number
  replacement_rate: number
  average_rating: number
  rating_distribution: {
    '5': number
    '4': number
    '3': number
    '2': number
    '1': number
  }
  performance_by_category: Record<PerformanceCategory, {
    average_rating: number
    total_ratings: number
    trend: 'improving' | 'stable' | 'declining'
  }>
  performance_by_match_level: Record<MatchLevel, {
    matches: number
    average_rating: number
  }>
  performance_by_tournament_type: Record<TournamentType, {
    matches: number
    average_rating: number
  }>
  recent_performance_trend: {
    period: string
    rating: number
  }[]
  specialization_performance: Record<string, {
    matches: number
    average_rating: number
  }>
  career_milestones: {
    first_match_date: string
    total_years_active: number
    highest_rated_match: {
      match_id: string
      rating: number
      date: string
    }
    most_active_month: string
    most_active_year: string
  }
  workload_analytics: {
    matches_per_month: Record<string, number>
    matches_per_year: Record<string, number>
    busiest_months: string[]
    average_matches_per_month: number
    peak_performance_period: string
  }
}

export interface MatchPerformanceRecord {
  id: string
  match_id: string
  referee_id: string
  official_role: string
  match_date: string
  tournament_name: string
  tournament_type: string
  match_level: string
  home_team: string
  away_team: string
  venue_name: string
  overall_rating: PerformanceRating
  category_ratings: Record<PerformanceCategory, PerformanceRating>
  performance_notes: string
  evaluated_by: string
  evaluated_at: string
  feedback_sources: {
    teams: boolean
    organizers: boolean
    observers: boolean
  }
  key_decisions: {
    cards_issued: number
    penalties_awarded: number
    offside_decisions: number
    var_interventions: number
    controversial_decisions: number
  }
  match_statistics: {
    match_duration: number
    stoppage_time: number
    substitutions: number
    goals_scored: number
    attendance: number
  }
}

export interface PerformanceComparison {
  referee_id: string
  referee_name: string
  comparison_period: string
  current_performance: {
    average_rating: number
    total_matches: number
  }
  previous_performance: {
    average_rating: number
    total_matches: number
  }
  improvement_percentage: number
  ranking_position: number
  total_referees: number
  percentile: number
}

export interface PerformanceReport {
  report_id: string
  referee_id: string
  referee_name: string
  report_period: {
    start_date: string
    end_date: string
  }
  generated_at: string
  generated_by: string
  executive_summary: {
    overall_performance: 'excellent' | 'good' | 'satisfactory' | 'needs_improvement' | 'poor'
    key_strengths: string[]
    areas_for_improvement: string[]
    recommendations: string[]
    next_review_date: string
  }
  detailed_metrics: RefereePerformanceMetrics
  performance_history: MatchPerformanceRecord[]
  peer_comparison: PerformanceComparison[]
  development_plan: {
    focus_areas: string[]
    training_recommendations: string[]
    mentoring_suggestions: string[]
    certification_progression: string[]
  }
}

export interface RefereeRanking {
  rank: number
  referee_id: string
  referee_name: string
  organization_name: string
  specialization: string
  license_level: string
  average_rating: number
  total_matches: number
  performance_score: number
  trend: 'up' | 'down' | 'stable'
  last_updated: string
}

export class RefereePerformanceService {
  constructor(private supabase: any) {}

  /**
   * Get comprehensive performance metrics for a referee
   */
  async getRefereePerformanceMetrics(
    refereeId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<RefereePerformanceMetrics | null> {
    try {
      // Get referee basic info
      const { data: referee } = await this.supabase
        .from('referees')
        .select('name')
        .eq('id', refereeId)
        .single()

      if (!referee) {
        return null
      }

      // Get performance records
      const { data: performances } = await this.supabase
        .from('official_performance')
        .select(`
          *,
          match:matches(
            scheduled_date,
            tournament:tournaments(name, type),
            home_team:teams!matches_home_team_id_fkey(name),
            away_team:teams!matches_away_team_id_fkey(name),
            venue:venues(name)
          )
        `)
        .eq('referee_id', refereeId)
        .gte('evaluated_at', dateFrom || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
        .lte('evaluated_at', dateTo || new Date().toISOString())
        .order('evaluated_at', { ascending: false })

      if (!performances || performances.length === 0) {
        return this.getEmptyMetrics(refereeId, referee.name)
      }

      // Get assignment statistics
      const { data: assignments } = await this.supabase
        .from('match_official_assignments')
        .select('status, assigned_at')
        .eq('referee_id', refereeId)
        .gte('assigned_at', dateFrom || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
        .lte('assigned_at', dateTo || new Date().toISOString())

      return this.calculatePerformanceMetrics(refereeId, referee.name, performances, assignments)
    } catch (error) {
      console.error('Error getting referee performance metrics:', error)
      return null
    }
  }

  /**
   * Get match performance history for a referee
   */
  async getMatchPerformanceHistory(
    refereeId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<MatchPerformanceRecord[]> {
    try {
      const { data: performances } = await this.supabase
        .from('official_performance')
        .select(`
          *,
          match:matches(
            id,
            scheduled_date,
            tournament:tournaments(name, type),
            home_team:teams!matches_home_team_id_fkey(name),
            away_team:teams!matches_away_team_id_fkey(name),
            venue:venues(name)
          )
        `)
        .eq('referee_id', refereeId)
        .order('evaluated_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (!performances) {
        return []
      }

      return performances.map(perf => this.transformToMatchPerformanceRecord(perf))
    } catch (error) {
      console.error('Error getting match performance history:', error)
      return []
    }
  }

  /**
   * Submit performance evaluation for a match
   */
  async submitPerformanceEvaluation(
    assignmentId: string,
    evaluation: {
      overall_rating: PerformanceRating
      category_ratings: Record<PerformanceCategory, PerformanceRating>
      performance_notes: string
      evaluated_by: string
      key_decisions?: Record<string, number>
      match_statistics?: Record<string, number>
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get assignment details
      const { data: assignment } = await this.supabase
        .from('match_official_assignments')
        .select('*')
        .eq('id', assignmentId)
        .single()

      if (!assignment) {
        return { success: false, error: 'Assignment not found' }
      }

      // Check if evaluation already exists
      const { data: existingEvaluation } = await this.supabase
        .from('official_performance')
        .select('id')
        .eq('assignment_id', assignmentId)
        .single()

      if (existingEvaluation) {
        return { success: false, error: 'Performance evaluation already exists for this assignment' }
      }

      // Calculate overall rating from category ratings
      const categoryValues = Object.values(evaluation.category_ratings)
      const calculatedOverallRating = Math.round(
        categoryValues.reduce((sum, rating) => sum + rating, 0) / categoryValues.length
      ) as PerformanceRating

      // Use provided overall rating or calculated one
      const finalOverallRating = evaluation.overall_rating || calculatedOverallRating

      // Insert performance evaluation
      const { error } = await this.supabase
        .from('official_performance')
        .insert({
          assignment_id: assignmentId,
          referee_id: assignment.referee_id,
          match_id: assignment.match_id,
          official_role: assignment.official_role,
          rating: finalOverallRating,
          performance_notes: evaluation.performance_notes,
          evaluated_by: evaluation.evaluated_by,
          evaluated_at: new Date().toISOString(),
          category_ratings: evaluation.category_ratings,
          key_decisions: evaluation.key_decisions || {},
          match_statistics: evaluation.match_statistics || {}
        })

      if (error) {
        console.error('Error submitting performance evaluation:', error)
        return { success: false, error: 'Failed to submit performance evaluation' }
      }

      return { success: true }
    } catch (error) {
      console.error('Error submitting performance evaluation:', error)
      return { success: false, error: 'Failed to submit performance evaluation' }
    }
  }

  /**
   * Get referee rankings
   */
  async getRefereeRankings(
    organizationId?: string,
    specialization?: string,
    limit: number = 50
  ): Promise<RefereeRanking[]> {
    try {
      let query = this.supabase
        .from('referees')
        .select(`
          id,
          name,
          specialization,
          license_level,
          organization_id,
          organization:organizations(name)
        `)

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      if (specialization) {
        query = query.eq('specialization', specialization)
      }

      const { data: referees } = await query

      if (!referees) {
        return []
      }

      const rankings: RefereeRanking[] = []

      for (const referee of referees) {
        const metrics = await this.getRefereePerformanceMetrics(referee.id)
        if (metrics) {
          rankings.push({
            rank: 0, // Will be set after sorting
            referee_id: referee.id,
            referee_name: referee.name,
            organization_name: referee.organization?.name || 'Unknown',
            specialization: referee.specialization,
            license_level: referee.license_level,
            average_rating: metrics.average_rating,
            total_matches: metrics.total_matches,
            performance_score: this.calculatePerformanceScore(metrics),
            trend: this.calculateTrend(metrics),
            last_updated: new Date().toISOString()
          })
        }
      }

      // Sort by performance score and assign ranks
      rankings.sort((a, b) => b.performance_score - a.performance_score)
      rankings.forEach((ranking, index) => {
        ranking.rank = index + 1
      })

      return rankings.slice(0, limit)
    } catch (error) {
      console.error('Error getting referee rankings:', error)
      return []
    }
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(
    refereeId: string,
    generatedBy: string,
    reportPeriod: { startDate: string; endDate: string }
  ): Promise<{ success: boolean; report?: PerformanceReport; error?: string }> {
    try {
      const metrics = await this.getRefereePerformanceMetrics(refereeId, reportPeriod.startDate, reportPeriod.endDate)
      if (!metrics) {
        return { success: false, error: 'Referee not found or no performance data' }
      }

      const performanceHistory = await this.getMatchPerformanceHistory(refereeId, 100, 0)
      const peerComparison = await this.getPeerComparison(refereeId, reportPeriod.startDate, reportPeriod.endDate)

      const report: PerformanceReport = {
        report_id: `report_${refereeId}_${Date.now()}`,
        referee_id: refereeId,
        referee_name: metrics.referee_name,
        report_period: {
          start_date: reportPeriod.startDate,
          end_date: reportPeriod.endDate
        },
        generated_at: new Date().toISOString(),
        generated_by: generatedBy,
        executive_summary: this.generateExecutiveSummary(metrics),
        detailed_metrics: metrics,
        performance_history: performanceHistory,
        peer_comparison: peerComparison,
        development_plan: this.generateDevelopmentPlan(metrics)
      }

      return { success: true, report }
    } catch (error) {
      console.error('Error generating performance report:', error)
      return { success: false, error: 'Failed to generate performance report' }
    }
  }

  /**
   * Get performance comparison with peers
   */
  async getPeerComparison(
    refereeId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<PerformanceComparison[]> {
    try {
      const currentMetrics = await this.getRefereePerformanceMetrics(refereeId, dateFrom, dateTo)
      if (!currentMetrics) {
        return []
      }

      // Get previous period metrics
      const periodDays = Math.floor(
        (new Date(dateTo || new Date()).getTime() - new Date(dateFrom || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)).getTime()) / (1000 * 60 * 60 * 24)
      )

      const previousDateFrom = new Date(new Date(dateFrom || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)).getTime() - periodDays * 24 * 60 * 60 * 1000).toISOString()
      const previousDateTo = dateFrom || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()

      const previousMetrics = await this.getRefereePerformanceMetrics(refereeId, previousDateFrom, previousDateTo)

      const comparison: PerformanceComparison = {
        referee_id: refereeId,
        referee_name: currentMetrics.referee_name,
        comparison_period: `${previousDateFrom} to ${previousDateTo}`,
        current_performance: {
          average_rating: currentMetrics.average_rating,
          total_matches: currentMetrics.total_matches
        },
        previous_performance: {
          average_rating: previousMetrics?.average_rating || 0,
          total_matches: previousMetrics?.total_matches || 0
        },
        improvement_percentage: this.calculateImprovementPercentage(
          previousMetrics?.average_rating || 0,
          currentMetrics.average_rating
        ),
        ranking_position: 0, // Would be calculated against all referees
        total_referees: 0,
        percentile: 0
      }

      return [comparison]
    } catch (error) {
      console.error('Error getting peer comparison:', error)
      return []
    }
  }

  /**
   * Private helper methods
   */
  private getEmptyMetrics(refereeId: string, refereeName: string): RefereePerformanceMetrics {
    return {
      referee_id: refereeId,
      referee_name: refereeName,
      total_matches: 0,
      total_assignments: 0,
      confirmed_assignments: 0,
      declined_assignments: 0,
      replacement_rate: 0,
      average_rating: 0,
      rating_distribution: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 },
      performance_by_category: {} as any,
      performance_by_match_level: {} as any,
      performance_by_tournament_type: {} as any,
      recent_performance_trend: [],
      specialization_performance: {},
      career_milestones: {
        first_match_date: '',
        total_years_active: 0,
        highest_rated_match: { match_id: '', rating: 0, date: '' },
        most_active_month: '',
        most_active_year: ''
      },
      workload_analytics: {
        matches_per_month: {},
        matches_per_year: {},
        busiest_months: [],
        average_matches_per_month: 0,
        peak_performance_period: ''
      }
    }
  }

  private calculatePerformanceMetrics(
    refereeId: string,
    refereeName: string,
    performances: any[],
    assignments: any[]
  ): RefereePerformanceMetrics {
    // Calculate basic metrics
    const totalMatches = performances.length
    const totalAssignments = assignments.length
    const confirmedAssignments = assignments.filter(a => a.status === 'confirmed').length
    const declinedAssignments = assignments.filter(a => a.status === 'declined').length
    const replacementRate = totalAssignments > 0 ? (assignments.filter(a => a.status === 'replaced').length / totalAssignments) * 100 : 0

    // Calculate ratings
    const ratings = performances.map(p => p.rating).filter(r => r)
    const averageRating = ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0

    // Calculate rating distribution
    const ratingDistribution = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 }
    ratings.forEach(rating => {
      ratingDistribution[rating.toString() as keyof typeof ratingDistribution]++
    })

    // Calculate performance by category
    const performanceByCategory: Record<string, any> = {}
    const categoryKeys: PerformanceCategory[] = ['overall', 'decision_making', 'fitness', 'communication', 'game_management', 'fairness']
    
    categoryKeys.forEach(category => {
      const categoryRatings = performances
        .map(p => p.category_ratings?.[category])
        .filter(r => r !== undefined)
      
      if (categoryRatings.length > 0) {
        performanceByCategory[category] = {
          average_rating: categoryRatings.reduce((sum, rating) => sum + rating, 0) / categoryRatings.length,
          total_ratings: categoryRatings.length,
          trend: 'stable' // Would be calculated based on historical data
        }
      }
    })

    // Calculate career milestones
    const careerMilestones = this.calculateCareerMilestones(performances, assignments)

    // Calculate workload analytics
    const workloadAnalytics = this.calculateWorkloadAnalytics(assignments, performances)

    return {
      referee_id: refereeId,
      referee_name: refereeName,
      total_matches: totalMatches,
      total_assignments: totalAssignments,
      confirmed_assignments: confirmedAssignments,
      declined_assignments: declinedAssignments,
      replacement_rate: replacementRate,
      average_rating: averageRating,
      rating_distribution: ratingDistribution,
      performance_by_category: performanceByCategory,
      performance_by_match_level: {} as any,
      performance_by_tournament_type: {} as any,
      recent_performance_trend: [],
      specialization_performance: {},
      career_milestones: careerMilestones,
      workload_analytics: workloadAnalytics
    }
  }

  private calculateCareerMilestones(performances: any[], assignments: any[]): any {
    const matchDates = [...performances.map(p => p.match?.scheduled_date), ...assignments.map(a => a.assigned_at)]
      .filter(date => date)
      .map(date => new Date(date))
      .sort((a, b) => a.getTime() - b.getTime())

    const firstMatchDate = matchDates[0]?.toISOString() || ''
    const totalYearsActive = matchDates.length > 0 ? 
      (new Date().getTime() - matchDates[0].getTime()) / (1000 * 60 * 60 * 24 * 365) : 0

    const highestRatedMatch = performances.reduce((best, current) => {
      return (current.rating || 0) > (best.rating || 0) ? current : best
    }, performances[0] || {})

    return {
      first_match_date: firstMatchDate,
      total_years_active: Math.round(totalYearsActive * 10) / 10,
      highest_rated_match: {
        match_id: highestRatedMatch?.match_id || '',
        rating: highestRatedMatch?.rating || 0,
        date: highestRatedMatch?.evaluated_at || ''
      },
      most_active_month: this.getMostActiveMonth(assignments),
      most_active_year: this.getMostActiveYear(assignments)
    }
  }

  private calculateWorkloadAnalytics(assignments: any[], performances: any[]): any {
    const matchesPerMonth: Record<string, number> = {}
    const matchesPerYear: Record<string, number> = {}

    assignments.forEach(assignment => {
      const date = new Date(assignment.assigned_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const yearKey = date.getFullYear().toString()

      matchesPerMonth[monthKey] = (matchesPerMonth[monthKey] || 0) + 1
      matchesPerYear[yearKey] = (matchesPerYear[yearKey] || 0) + 1
    })

    const busiestMonths = Object.entries(matchesPerMonth)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([month]) => month)

    const totalMonths = Object.keys(matchesPerMonth).length
    const averageMatchesPerMonth = totalMonths > 0 ? 
      Object.values(matchesPerMonth).reduce((sum, count) => sum + count, 0) / totalMonths : 0

    return {
      matches_per_month: matchesPerMonth,
      matches_per_year: matchesPerYear,
      busiest_months: busiestMonths,
      average_matches_per_month: Math.round(averageMatchesPerMonth * 10) / 10,
      peak_performance_period: this.getPeakPerformancePeriod(performances)
    }
  }

  private getMostActiveMonth(assignments: any[]): string {
    const monthCounts: Record<string, number> = {}
    assignments.forEach(assignment => {
      const date = new Date(assignment.assigned_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1
    })

    return Object.entries(monthCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || ''
  }

  private getMostActiveYear(assignments: any[]): string {
    const yearCounts: Record<string, number> = {}
    assignments.forEach(assignment => {
      const year = new Date(assignment.assigned_at).getFullYear().toString()
      yearCounts[year] = (yearCounts[year] || 0) + 1
    })

    return Object.entries(yearCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || ''
  }

  private getPeakPerformancePeriod(performances: any[]): string {
    // This would analyze performance trends to find peak periods
    return 'Recent 3 months'
  }

  private transformToMatchPerformanceRecord(performance: any): MatchPerformanceRecord {
    return {
      id: performance.id,
      match_id: performance.match_id,
      referee_id: performance.referee_id,
      official_role: performance.official_role,
      match_date: performance.match?.scheduled_date || '',
      tournament_name: performance.match?.tournament?.name || '',
      tournament_type: performance.match?.tournament?.type || '',
      match_level: 'local', // Would be determined from tournament level
      home_team: performance.match?.home_team?.name || '',
      away_team: performance.match?.away_team?.name || '',
      venue_name: performance.match?.venue?.name || '',
      overall_rating: performance.rating,
      category_ratings: performance.category_ratings || {},
      performance_notes: performance.performance_notes || '',
      evaluated_by: performance.evaluated_by || '',
      evaluated_at: performance.evaluated_at || '',
      feedback_sources: {
        teams: true,
        organizers: true,
        observers: false
      },
      key_decisions: performance.key_decisions || {},
      match_statistics: performance.match_statistics || {}
    }
  }

  private calculatePerformanceScore(metrics: RefereePerformanceMetrics): number {
    // Weighted scoring algorithm
    const ratingWeight = 0.4
    const matchCountWeight = 0.3
    const consistencyWeight = 0.2
    const availabilityWeight = 0.1

    const ratingScore = (metrics.average_rating / 5) * 100
    const matchCountScore = Math.min((metrics.total_matches / 50) * 100, 100) // Cap at 50 matches
    const consistencyScore = this.calculateConsistencyScore(metrics.rating_distribution)
    const availabilityScore = metrics.confirmed_assignments > 0 ? 
      (metrics.confirmed_assignments / (metrics.confirmed_assignments + metrics.declined_assignments)) * 100 : 0

    return Math.round(
      ratingScore * ratingWeight +
      matchCountScore * matchCountWeight +
      consistencyScore * consistencyWeight +
      availabilityScore * availabilityWeight
    )
  }

  private calculateConsistencyScore(ratingDistribution: Record<string, number>): number {
    const total = Object.values(ratingDistribution).reduce((sum, count) => sum + count, 0)
    if (total === 0) return 0

    // Higher score for more consistent ratings (less variation)
    const variance = this.calculateVariance(ratingDistribution, total)
    return Math.max(0, 100 - variance * 20) // Scale variance to 0-100
  }

  private calculateVariance(ratingDistribution: Record<string, number>, total: number): number {
    const mean = Object.entries(ratingDistribution).reduce((sum, [rating, count]) => {
      return sum + (parseInt(rating) * count / total)
    }, 0)

    const variance = Object.entries(ratingDistribution).reduce((sum, [rating, count]) => {
      const deviation = parseInt(rating) - mean
      return sum + (deviation * deviation * count / total)
    }, 0)

    return variance
  }

  private calculateTrend(metrics: RefereePerformanceMetrics): 'up' | 'down' | 'stable' {
    // This would analyze recent performance trends
    return 'stable'
  }

  private calculateImprovementPercentage(previousRating: number, currentRating: number): number {
    if (previousRating === 0) return 0
    return Math.round(((currentRating - previousRating) / previousRating) * 100)
  }

  private generateExecutiveSummary(metrics: RefereePerformanceMetrics): any {
    const overallPerformance = metrics.average_rating >= 4.5 ? 'excellent' :
                              metrics.average_rating >= 3.5 ? 'good' :
                              metrics.average_rating >= 2.5 ? 'satisfactory' :
                              metrics.average_rating >= 1.5 ? 'needs_improvement' : 'poor'

    return {
      overall_performance: overallPerformance,
      key_strengths: this.identifyStrengths(metrics),
      areas_for_improvement: this.identifyImprovementAreas(metrics),
      recommendations: this.generateRecommendations(metrics),
      next_review_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    }
  }

  private identifyStrengths(metrics: RefereePerformanceMetrics): string[] {
    const strengths: string[] = []
    
    if (metrics.average_rating >= 4.0) {
      strengths.push('High overall performance rating')
    }
    
    if (metrics.confirmed_assignments > metrics.declined_assignments * 2) {
      strengths.push('Excellent availability and reliability')
    }
    
    if (metrics.total_matches >= 20) {
      strengths.push('Experienced with significant match volume')
    }

    return strengths
  }

  private identifyImprovementAreas(metrics: RefereePerformanceMetrics): string[] {
    const areas: string[] = []
    
    if (metrics.average_rating < 3.0) {
      areas.push('Overall performance rating needs improvement')
    }
    
    if (metrics.declined_assignments > metrics.confirmed_assignments) {
      areas.push('Availability and commitment to assignments')
    }
    
    if (metrics.replacement_rate > 20) {
      areas.push('Assignment replacement rate is high')
    }

    return areas
  }

  private generateRecommendations(metrics: RefereePerformanceMetrics): string[] {
    const recommendations: string[] = []
    
    if (metrics.average_rating < 3.5) {
      recommendations.push('Consider additional training and mentoring')
    }
    
    if (metrics.total_matches < 10) {
      recommendations.push('Increase match assignments to gain experience')
    }
    
    recommendations.push('Regular performance reviews and feedback sessions')
    recommendations.push('Participation in referee development programs')

    return recommendations
  }

  private generateDevelopmentPlan(metrics: RefereePerformanceMetrics): any {
    return {
      focus_areas: this.identifyImprovementAreas(metrics),
      training_recommendations: [
        'Advanced decision-making workshop',
        'Communication skills training',
        'Fitness and positioning seminar'
      ],
      mentoring_suggestions: [
        'Pair with experienced senior referee',
        'Regular performance discussions',
        'Shadow high-level matches'
      ],
      certification_progression: [
        'Maintain current license level',
        'Consider advancement to next level',
        'Complete required continuing education'
      ]
    }
  }
}

// Export singleton instance
export const refereePerformanceService = new RefereePerformanceService(null as any)
