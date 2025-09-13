/**
 * Collaboration Analytics Service
 * Comprehensive analytics and reporting for collaborative match sessions
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'
import { EventEmitter } from 'events'

export interface CollaborationMetrics {
  sessionId: string
  totalParticipants: number
  activeParticipants: number
  totalActions: number
  actionsPerMinute: number
  averageResponseTime: number
  collaborationScore: number
  conflictCount: number
  resolutionTime: number
  communicationLevel: number
  productivityScore: number
  engagementLevel: number
  timestamp: number
}

export interface UserCollaborationStats {
  userId: string
  userName: string
  sessionDuration: number
  actionsPerformed: number
  messagesSent: number
  conflictsInvolved: number
  conflictsResolved: number
  responseTime: number
  engagementScore: number
  productivityScore: number
  collaborationContribution: number
}

export interface SessionCollaborationReport {
  sessionId: string
  sessionName: string
  period: {
    start: string
    end: string
  }
  summary: {
    totalDuration: number
    totalParticipants: number
    totalActions: number
    totalMessages: number
    totalConflicts: number
    averageCollaborationScore: number
  }
  participants: UserCollaborationStats[]
  metrics: CollaborationMetrics[]
  insights: CollaborationInsight[]
  recommendations: string[]
}

export interface CollaborationInsight {
  type: 'performance' | 'engagement' | 'conflict' | 'communication' | 'productivity'
  severity: 'low' | 'medium' | 'high'
  title: string
  description: string
  impact: string
  suggestions: string[]
  data: Record<string, any>
}

export interface AnalyticsFilter {
  sessionIds?: string[]
  userIds?: string[]
  timeRange?: {
    start: number
    end: number
  }
  metrics?: string[]
  aggregation?: 'hour' | 'day' | 'week' | 'month'
}

export interface CollaborationTrend {
  period: string
  collaborationScore: number
  activeUsers: number
  totalActions: number
  conflicts: number
  resolutionTime: number
}

class CollaborationAnalyticsService extends EventEmitter {
  private supabase = createClientComponentClient<Database>()
  private metricsCache = new Map<string, CollaborationMetrics[]>()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  /**
   * Start analytics collection for a session
   */
  async startAnalytics(sessionId: string): Promise<void> {
    try {
      // Initialize metrics cache
      this.metricsCache.set(sessionId, [])

      // Start collecting metrics
      await this.collectInitialMetrics(sessionId)

      console.log(`Started collaboration analytics for session: ${sessionId}`)
    } catch (error) {
      console.error('Error starting analytics:', error)
    }
  }

  /**
   * Stop analytics collection for a session
   */
  async stopAnalytics(sessionId: string): Promise<void> {
    try {
      // Clear cache
      this.metricsCache.delete(sessionId)

      console.log(`Stopped collaboration analytics for session: ${sessionId}`)
    } catch (error) {
      console.error('Error stopping analytics:', error)
    }
  }

  /**
   * Collect real-time collaboration metrics
   */
  async collectMetrics(sessionId: string): Promise<CollaborationMetrics | null> {
    try {
      // Get cached metrics if recent
      const cached = this.metricsCache.get(sessionId)
      if (cached && cached.length > 0) {
        const lastMetric = cached[cached.length - 1]
        if (Date.now() - lastMetric.timestamp < this.CACHE_DURATION) {
          return lastMetric
        }
      }

      // Collect fresh metrics
      const metrics = await this.calculateMetrics(sessionId)
      
      if (metrics) {
        // Cache the metrics
        const metricsList = this.metricsCache.get(sessionId) || []
        metricsList.push(metrics)
        
        // Keep only last 100 metrics
        if (metricsList.length > 100) {
          metricsList.splice(0, metricsList.length - 100)
        }
        
        this.metricsCache.set(sessionId, metricsList)

        // Emit metrics update
        this.emit('metricsUpdated', { sessionId, metrics })
      }

      return metrics
    } catch (error) {
      console.error('Error collecting metrics:', error)
      return null
    }
  }

  /**
   * Get collaboration report for a session
   */
  async generateCollaborationReport(
    sessionId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SessionCollaborationReport> {
    try {
      // Get session data
      const { data: session } = await this.supabase
        .from('match_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (!session) {
        throw new Error('Session not found')
      }

      // Get participants
      const { data: participants } = await this.supabase
        .from('match_session_participants')
        .select(`
          *,
          user_profiles!inner(full_name, email)
        `)
        .eq('session_id', sessionId)

      // Get activities
      const { data: activities } = await this.supabase
        .from('session_activities')
        .select('*')
        .eq('session_id', sessionId)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())

      // Get communications
      const { data: communications } = await this.supabase
        .from('session_communications')
        .select('*')
        .eq('session_id', sessionId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      // Calculate metrics
      const metrics = await this.getMetricsForPeriod(sessionId, startDate, endDate)

      // Calculate participant stats
      const participantStats = this.calculateParticipantStats(
        participants || [],
        activities || [],
        communications || [],
        startDate,
        endDate
      )

      // Generate insights
      const insights = this.generateInsights(metrics, participantStats)

      // Generate recommendations
      const recommendations = this.generateRecommendations(insights, participantStats)

      // Calculate summary
      const totalDuration = endDate.getTime() - startDate.getTime()
      const totalParticipants = participants?.length || 0
      const totalActions = activities?.length || 0
      const totalMessages = communications?.length || 0
      const totalConflicts = this.countConflicts(activities || [])
      const averageCollaborationScore = metrics.length > 0 ? 
        metrics.reduce((sum, m) => sum + m.collaborationScore, 0) / metrics.length : 0

      return {
        sessionId,
        sessionName: session.session_name,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        summary: {
          totalDuration,
          totalParticipants,
          totalActions,
          totalMessages,
          totalConflicts,
          averageCollaborationScore: Math.round(averageCollaborationScore * 100) / 100
        },
        participants: participantStats,
        metrics,
        insights,
        recommendations
      }
    } catch (error) {
      console.error('Error generating collaboration report:', error)
      throw error
    }
  }

  /**
   * Get collaboration trends
   */
  async getCollaborationTrends(
    filter: AnalyticsFilter
  ): Promise<CollaborationTrend[]> {
    try {
      const trends: CollaborationTrend[] = []
      
      // TODO: Implement trend calculation based on historical data
      // For now, return empty array
      
      return trends
    } catch (error) {
      console.error('Error getting collaboration trends:', error)
      return []
    }
  }

  /**
   * Get user collaboration statistics
   */
  async getUserCollaborationStats(
    userId: string,
    sessionId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<UserCollaborationStats[]> {
    try {
      let query = this.supabase
        .from('match_session_participants')
        .select(`
          *,
          match_sessions!inner(*),
          user_profiles!inner(full_name, email)
        `)
        .eq('user_id', userId)
        .eq('is_active', true)

      if (sessionId) {
        query = query.eq('session_id', sessionId)
      }

      const { data: participations, error } = await query

      if (error) {
        console.error('Error getting user participation:', error)
        return []
      }

      const stats: UserCollaborationStats[] = []

      for (const participation of participations || []) {
        const sessionStats = await this.calculateUserSessionStats(
          participation.session_id,
          userId,
          participation.joined_at,
          participation.last_activity
        )

        stats.push(sessionStats)
      }

      return stats
    } catch (error) {
      console.error('Error getting user collaboration stats:', error)
      return []
    }
  }

  /**
   * Calculate collaboration metrics
   */
  private async calculateMetrics(sessionId: string): Promise<CollaborationMetrics | null> {
    try {
      // Get participant count
      const { count: totalParticipants } = await this.supabase
        .from('match_session_participants')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .eq('is_active', true)

      // Get active participants (last activity within 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const { count: activeParticipants } = await this.supabase
        .from('match_session_participants')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .gte('last_activity', fiveMinutesAgo)

      // Get total actions in last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const { count: totalActions } = await this.supabase
        .from('session_activities')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .gte('timestamp', oneHourAgo)

      // Calculate actions per minute
      const actionsPerMinute = Math.round((totalActions || 0) / 60 * 100) / 100

      // Calculate collaboration score (0-100)
      const collaborationScore = this.calculateCollaborationScore(
        totalParticipants || 0,
        activeParticipants || 0,
        actionsPerMinute
      )

      // Calculate communication level
      const { count: messagesCount } = await this.supabase
        .from('session_communications')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .gte('created_at', oneHourAgo)

      const communicationLevel = Math.min((messagesCount || 0) / 10 * 100, 100)

      // Calculate productivity score
      const productivityScore = this.calculateProductivityScore(
        actionsPerMinute,
        activeParticipants || 0,
        totalParticipants || 0
      )

      // Calculate engagement level
      const engagementLevel = this.calculateEngagementLevel(
        activeParticipants || 0,
        totalParticipants || 0,
        actionsPerMinute
      )

      return {
        sessionId,
        totalParticipants: totalParticipants || 0,
        activeParticipants: activeParticipants || 0,
        totalActions: totalActions || 0,
        actionsPerMinute,
        averageResponseTime: 1200, // TODO: Calculate from actual response times
        collaborationScore,
        conflictCount: 0, // TODO: Calculate from conflict data
        resolutionTime: 0, // TODO: Calculate from conflict resolution data
        communicationLevel,
        productivityScore,
        engagementLevel,
        timestamp: Date.now()
      }
    } catch (error) {
      console.error('Error calculating metrics:', error)
      return null
    }
  }

  /**
   * Calculate collaboration score
   */
  private calculateCollaborationScore(
    totalParticipants: number,
    activeParticipants: number,
    actionsPerMinute: number
  ): number {
    if (totalParticipants === 0) return 0

    const participationRate = activeParticipants / totalParticipants
    const activityLevel = Math.min(actionsPerMinute / 10, 1) // Normalize to 0-1
    
    return Math.round((participationRate * 0.6 + activityLevel * 0.4) * 100)
  }

  /**
   * Calculate productivity score
   */
  private calculateProductivityScore(
    actionsPerMinute: number,
    activeParticipants: number,
    totalParticipants: number
  ): number {
    if (totalParticipants === 0) return 0

    const efficiency = actionsPerMinute / Math.max(activeParticipants, 1)
    const participationRate = activeParticipants / totalParticipants
    
    return Math.round((efficiency * 0.7 + participationRate * 0.3) * 100)
  }

  /**
   * Calculate engagement level
   */
  private calculateEngagementLevel(
    activeParticipants: number,
    totalParticipants: number,
    actionsPerMinute: number
  ): number {
    if (totalParticipants === 0) return 0

    const participationRate = activeParticipants / totalParticipants
    const activityRate = Math.min(actionsPerMinute / 5, 1) // Normalize to 0-1
    
    return Math.round((participationRate * 0.5 + activityRate * 0.5) * 100)
  }

  /**
   * Calculate participant stats
   */
  private calculateParticipantStats(
    participants: any[],
    activities: any[],
    communications: any[],
    startDate: Date,
    endDate: Date
  ): UserCollaborationStats[] {
    return participants.map(participant => {
      const userActivities = activities.filter(a => a.user_id === participant.user_id)
      const userCommunications = communications.filter(c => c.sender_id === participant.user_id)
      
      const sessionDuration = this.calculateSessionDuration(
        participant.joined_at,
        participant.last_activity || endDate.toISOString()
      )

      const actionsPerformed = userActivities.length
      const messagesSent = userCommunications.length
      const conflictsInvolved = userActivities.filter(a => 
        a.action.includes('conflict') || a.action.includes('dispute')
      ).length

      const engagementScore = this.calculateUserEngagementScore(
        actionsPerformed,
        messagesSent,
        sessionDuration
      )

      const productivityScore = this.calculateUserProductivityScore(
        actionsPerformed,
        sessionDuration
      )

      const collaborationContribution = this.calculateCollaborationContribution(
        actionsPerformed,
        messagesSent,
        conflictsInvolved,
        sessionDuration
      )

      return {
        userId: participant.user_id,
        userName: participant.user_profiles?.full_name || participant.user_profiles?.email || 'Unknown',
        sessionDuration,
        actionsPerformed,
        messagesSent,
        conflictsInvolved,
        conflictsResolved: 0, // TODO: Calculate from conflict resolution data
        responseTime: 1200, // TODO: Calculate from actual response times
        engagementScore,
        productivityScore,
        collaborationContribution
      }
    })
  }

  /**
   * Calculate session duration in minutes
   */
  private calculateSessionDuration(startTime: string, endTime: string): number {
    const start = new Date(startTime).getTime()
    const end = new Date(endTime).getTime()
    return Math.round((end - start) / (1000 * 60))
  }

  /**
   * Calculate user engagement score
   */
  private calculateUserEngagementScore(
    actionsPerformed: number,
    messagesSent: number,
    sessionDuration: number
  ): number {
    if (sessionDuration === 0) return 0

    const actionRate = actionsPerformed / sessionDuration
    const messageRate = messagesSent / sessionDuration
    
    return Math.round(Math.min((actionRate * 0.7 + messageRate * 0.3) * 100, 100))
  }

  /**
   * Calculate user productivity score
   */
  private calculateUserProductivityScore(
    actionsPerformed: number,
    sessionDuration: number
  ): number {
    if (sessionDuration === 0) return 0

    const productivity = actionsPerformed / sessionDuration
    return Math.round(Math.min(productivity * 100, 100))
  }

  /**
   * Calculate collaboration contribution
   */
  private calculateCollaborationContribution(
    actionsPerformed: number,
    messagesSent: number,
    conflictsInvolved: number,
    sessionDuration: number
  ): number {
    if (sessionDuration === 0) return 0

    const positiveContributions = actionsPerformed + messagesSent
    const negativeContributions = conflictsInvolved * 2 // Conflicts have higher negative impact
    
    const netContribution = positiveContributions - negativeContributions
    return Math.round(Math.max(netContribution / sessionDuration * 10, 0))
  }

  /**
   * Generate insights
   */
  private generateInsights(
    metrics: CollaborationMetrics[],
    participantStats: UserCollaborationStats[]
  ): CollaborationInsight[] {
    const insights: CollaborationInsight[] = []

    if (metrics.length === 0) return insights

    const latestMetric = metrics[metrics.length - 1]

    // Performance insights
    if (latestMetric.collaborationScore < 50) {
      insights.push({
        type: 'performance',
        severity: 'high',
        title: 'Low Collaboration Score',
        description: `Collaboration score is ${latestMetric.collaborationScore}/100`,
        impact: 'Reduced team efficiency and coordination',
        suggestions: [
          'Increase communication frequency',
          'Encourage more active participation',
          'Review session structure and goals'
        ],
        data: { score: latestMetric.collaborationScore }
      })
    }

    // Engagement insights
    if (latestMetric.engagementLevel < 60) {
      insights.push({
        type: 'engagement',
        severity: 'medium',
        title: 'Low Engagement Level',
        description: `Only ${latestMetric.activeParticipants}/${latestMetric.totalParticipants} participants are active`,
        impact: 'Reduced session effectiveness',
        suggestions: [
          'Send engagement reminders',
          'Encourage inactive participants',
          'Review session relevance'
        ],
        data: { 
          activeParticipants: latestMetric.activeParticipants,
          totalParticipants: latestMetric.totalParticipants
        }
      })
    }

    // Communication insights
    if (latestMetric.communicationLevel < 30) {
      insights.push({
        type: 'communication',
        severity: 'medium',
        title: 'Low Communication Level',
        description: 'Limited communication activity detected',
        impact: 'Potential coordination issues',
        suggestions: [
          'Encourage more messaging',
          'Use communication prompts',
          'Review communication channels'
        ],
        data: { communicationLevel: latestMetric.communicationLevel }
      })
    }

    // Productivity insights
    if (latestMetric.productivityScore > 80) {
      insights.push({
        type: 'productivity',
        severity: 'low',
        title: 'High Productivity',
        description: `Productivity score is ${latestMetric.productivityScore}/100`,
        impact: 'Excellent team performance',
        suggestions: [
          'Maintain current practices',
          'Document successful patterns',
          'Share best practices'
        ],
        data: { productivityScore: latestMetric.productivityScore }
      })
    }

    return insights
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    insights: CollaborationInsight[],
    participantStats: UserCollaborationStats[]
  ): string[] {
    const recommendations: string[] = []

    // Based on insights
    insights.forEach(insight => {
      if (insight.severity === 'high') {
        recommendations.push(`Priority: ${insight.title} - ${insight.suggestions[0]}`)
      }
    })

    // Based on participant stats
    const lowEngagementUsers = participantStats.filter(p => p.engagementScore < 50)
    if (lowEngagementUsers.length > 0) {
      recommendations.push(`Consider reaching out to ${lowEngagementUsers.length} participants with low engagement`)
    }

    const highProductivityUsers = participantStats.filter(p => p.productivityScore > 80)
    if (highProductivityUsers.length > 0) {
      recommendations.push(`Leverage high-performing participants for mentoring others`)
    }

    return recommendations
  }

  /**
   * Count conflicts in activities
   */
  private countConflicts(activities: any[]): number {
    return activities.filter(activity => 
      activity.action.includes('conflict') || 
      activity.action.includes('dispute') ||
      activity.action.includes('error')
    ).length
  }

  /**
   * Get metrics for period
   */
  private async getMetricsForPeriod(
    sessionId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CollaborationMetrics[]> {
    // For now, return cached metrics if available
    const cached = this.metricsCache.get(sessionId) || []
    
    return cached.filter(metric => {
      const metricDate = new Date(metric.timestamp)
      return metricDate >= startDate && metricDate <= endDate
    })
  }

  /**
   * Calculate user session stats
   */
  private async calculateUserSessionStats(
    sessionId: string,
    userId: string,
    joinedAt: string,
    lastActivity?: string
  ): Promise<UserCollaborationStats> {
    // Get user activities
    const { data: activities } = await this.supabase
      .from('session_activities')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)

    // Get user communications
    const { data: communications } = await this.supabase
      .from('session_communications')
      .select('*')
      .eq('session_id', sessionId)
      .eq('sender_id', userId)

    const sessionDuration = this.calculateSessionDuration(
      joinedAt,
      lastActivity || new Date().toISOString()
    )

    const actionsPerformed = activities?.length || 0
    const messagesSent = communications?.length || 0
    const conflictsInvolved = activities?.filter(a => 
      a.action.includes('conflict') || a.action.includes('dispute')
    ).length || 0

    return {
      userId,
      userName: 'Unknown', // TODO: Get from user profile
      sessionDuration,
      actionsPerformed,
      messagesSent,
      conflictsInvolved,
      conflictsResolved: 0,
      responseTime: 1200,
      engagementScore: this.calculateUserEngagementScore(actionsPerformed, messagesSent, sessionDuration),
      productivityScore: this.calculateUserProductivityScore(actionsPerformed, sessionDuration),
      collaborationContribution: this.calculateCollaborationContribution(
        actionsPerformed,
        messagesSent,
        conflictsInvolved,
        sessionDuration
      )
    }
  }

  /**
   * Collect initial metrics
   */
  private async collectInitialMetrics(sessionId: string): Promise<void> {
    try {
      await this.collectMetrics(sessionId)
    } catch (error) {
      console.error('Error collecting initial metrics:', error)
    }
  }
}

// Export singleton instance
export const collaborationAnalyticsService = new CollaborationAnalyticsService()

// Export types
export type {
  CollaborationMetrics,
  UserCollaborationStats,
  SessionCollaborationReport,
  CollaborationInsight,
  AnalyticsFilter,
  CollaborationTrend
}
