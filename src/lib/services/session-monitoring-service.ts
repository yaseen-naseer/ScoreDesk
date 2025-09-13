/**
 * Session Monitoring Service
 * Comprehensive monitoring and management tools for match sessions
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'
import { EventEmitter } from 'events'

export interface SessionHealth {
  sessionId: string
  isHealthy: boolean
  issues: SessionIssue[]
  metrics: SessionMetrics
  lastChecked: string
}

export interface SessionIssue {
  type: 'error' | 'warning' | 'info'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  details?: Record<string, any>
  timestamp: string
  resolved: boolean
}

export interface SessionMetrics {
  participantCount: number
  activeParticipants: number
  averageResponseTime: number
  totalActivities: number
  activitiesLastHour: number
  connectionStability: number
  dataIntegrity: number
  performanceScore: number
}

export interface SessionAlert {
  id: string
  sessionId: string
  type: 'performance' | 'security' | 'data' | 'connection' | 'activity'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  details: Record<string, any>
  timestamp: string
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: string
  resolved: boolean
  resolvedAt?: string
}

export interface SessionReport {
  sessionId: string
  period: {
    start: string
    end: string
  }
  summary: {
    totalParticipants: number
    totalActivities: number
    averageSessionTime: number
    issuesCount: number
    alertsCount: number
  }
  participants: ParticipantReport[]
  activities: ActivityReport[]
  issues: SessionIssue[]
  alerts: SessionAlert[]
  recommendations: string[]
}

export interface ParticipantReport {
  userId: string
  userName: string
  role: string
  joinTime: string
  leaveTime?: string
  sessionDuration: number
  activityCount: number
  lastActivity: string
  status: 'active' | 'inactive' | 'disconnected'
}

export interface ActivityReport {
  type: string
  count: number
  percentage: number
  topUsers: Array<{
    userId: string
    userName: string
    count: number
  }>
}

class SessionMonitoringService extends EventEmitter {
  private supabase = createClientComponentClient<Database>()
  private healthChecks = new Map<string, SessionHealth>()
  private alerts = new Map<string, SessionAlert[]>()
  private monitoringInterval: NodeJS.Timeout | null = null
  private readonly CHECK_INTERVAL = 30000 // 30 seconds
  private readonly ALERT_RETENTION_DAYS = 30

  /**
   * Start monitoring a session
   */
  async startMonitoring(sessionId: string): Promise<void> {
    try {
      // Perform initial health check
      await this.performHealthCheck(sessionId)

      // Set up real-time monitoring
      await this.setupRealtimeMonitoring(sessionId)

      console.log(`Started monitoring session: ${sessionId}`)
    } catch (error) {
      console.error('Error starting session monitoring:', error)
    }
  }

  /**
   * Stop monitoring a session
   */
  async stopMonitoring(sessionId: string): Promise<void> {
    try {
      // Clear health checks
      this.healthChecks.delete(sessionId)
      this.alerts.delete(sessionId)

      console.log(`Stopped monitoring session: ${sessionId}`)
    } catch (error) {
      console.error('Error stopping session monitoring:', error)
    }
  }

  /**
   * Get session health status
   */
  async getSessionHealth(sessionId: string): Promise<SessionHealth | null> {
    try {
      // Check cache first
      const cached = this.healthChecks.get(sessionId)
      if (cached && this.isRecentCheck(cached.lastChecked)) {
        return cached
      }

      // Perform fresh health check
      return await this.performHealthCheck(sessionId)
    } catch (error) {
      console.error('Error getting session health:', error)
      return null
    }
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(sessionId: string): Promise<SessionHealth> {
    try {
      const issues: SessionIssue[] = []
      const metrics = await this.calculateSessionMetrics(sessionId)

      // Check participant count
      if (metrics.participantCount === 0) {
        issues.push({
          type: 'warning',
          severity: 'medium',
          message: 'No active participants in session',
          timestamp: new Date().toISOString(),
          resolved: false
        })
      }

      // Check response time
      if (metrics.averageResponseTime > 5000) { // 5 seconds
        issues.push({
          type: 'warning',
          severity: 'high',
          message: 'High response time detected',
          details: { responseTime: metrics.averageResponseTime },
          timestamp: new Date().toISOString(),
          resolved: false
        })
      }

      // Check connection stability
      if (metrics.connectionStability < 0.8) {
        issues.push({
          type: 'error',
          severity: 'medium',
          message: 'Poor connection stability',
          details: { stability: metrics.connectionStability },
          timestamp: new Date().toISOString(),
          resolved: false
        })
      }

      // Check data integrity
      if (metrics.dataIntegrity < 0.95) {
        issues.push({
          type: 'error',
          severity: 'high',
          message: 'Data integrity issues detected',
          details: { integrity: metrics.dataIntegrity },
          timestamp: new Date().toISOString(),
          resolved: false
        })
      }

      // Check for inactive participants
      const inactiveThreshold = 10 * 60 * 1000 // 10 minutes
      if (metrics.activeParticipants < metrics.participantCount) {
        issues.push({
          type: 'info',
          severity: 'low',
          message: `${metrics.participantCount - metrics.activeParticipants} inactive participants`,
          timestamp: new Date().toISOString(),
          resolved: false
        })
      }

      const isHealthy = issues.filter(i => i.severity === 'critical' || i.severity === 'high').length === 0

      const health: SessionHealth = {
        sessionId,
        isHealthy,
        issues,
        metrics,
        lastChecked: new Date().toISOString()
      }

      // Cache the result
      this.healthChecks.set(sessionId, health)

      // Emit health update
      this.emit('healthUpdate', health)

      // Create alerts for critical issues
      for (const issue of issues) {
        if (issue.severity === 'critical' || issue.severity === 'high') {
          await this.createAlert(sessionId, issue)
        }
      }

      return health
    } catch (error) {
      console.error('Error performing health check:', error)
      return {
        sessionId,
        isHealthy: false,
        issues: [{
          type: 'error',
          severity: 'critical',
          message: 'Health check failed',
          details: { error: error.message },
          timestamp: new Date().toISOString(),
          resolved: false
        }],
        metrics: {
          participantCount: 0,
          activeParticipants: 0,
          averageResponseTime: 0,
          totalActivities: 0,
          activitiesLastHour: 0,
          connectionStability: 0,
          dataIntegrity: 0,
          performanceScore: 0
        },
        lastChecked: new Date().toISOString()
      }
    }
  }

  /**
   * Calculate session metrics
   */
  private async calculateSessionMetrics(sessionId: string): Promise<SessionMetrics> {
    try {
      // Get participant count
      const { count: participantCount } = await this.supabase
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

      // Get total activities
      const { count: totalActivities } = await this.supabase
        .from('session_activities')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId)

      // Get activities in last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const { count: activitiesLastHour } = await this.supabase
        .from('session_activities')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .gte('timestamp', oneHourAgo)

      // Calculate connection stability (placeholder)
      const connectionStability = 0.95 // TODO: Calculate based on real metrics

      // Calculate data integrity (placeholder)
      const dataIntegrity = 0.98 // TODO: Calculate based on data validation

      // Calculate average response time (placeholder)
      const averageResponseTime = 1200 // TODO: Calculate from actual response times

      // Calculate performance score
      const performanceScore = Math.round(
        (connectionStability * 0.3 + 
         dataIntegrity * 0.3 + 
         (averageResponseTime < 2000 ? 1 : 0.5) * 0.4) * 100
      )

      return {
        participantCount: participantCount || 0,
        activeParticipants: activeParticipants || 0,
        averageResponseTime,
        totalActivities: totalActivities || 0,
        activitiesLastHour: activitiesLastHour || 0,
        connectionStability,
        dataIntegrity,
        performanceScore
      }
    } catch (error) {
      console.error('Error calculating session metrics:', error)
      return {
        participantCount: 0,
        activeParticipants: 0,
        averageResponseTime: 0,
        totalActivities: 0,
        activitiesLastHour: 0,
        connectionStability: 0,
        dataIntegrity: 0,
        performanceScore: 0
      }
    }
  }

  /**
   * Create alert for session issue
   */
  private async createAlert(sessionId: string, issue: SessionIssue): Promise<void> {
    try {
      const alert: SessionAlert = {
        id: `alert-${sessionId}-${Date.now()}`,
        sessionId,
        type: this.mapIssueToAlertType(issue),
        severity: issue.severity,
        title: issue.message,
        message: issue.message,
        details: issue.details || {},
        timestamp: issue.timestamp,
        acknowledged: false,
        resolved: false
      }

      // Store alert
      const sessionAlerts = this.alerts.get(sessionId) || []
      sessionAlerts.push(alert)
      this.alerts.set(sessionId, sessionAlerts)

      // Emit alert
      this.emit('alert', alert)

      // TODO: Store in database for persistence
    } catch (error) {
      console.error('Error creating alert:', error)
    }
  }

  /**
   * Map issue type to alert type
   */
  private mapIssueToAlertType(issue: SessionIssue): SessionAlert['type'] {
    if (issue.message.includes('response time') || issue.message.includes('performance')) {
      return 'performance'
    }
    if (issue.message.includes('connection') || issue.message.includes('stability')) {
      return 'connection'
    }
    if (issue.message.includes('data') || issue.message.includes('integrity')) {
      return 'data'
    }
    if (issue.message.includes('participant') || issue.message.includes('activity')) {
      return 'activity'
    }
    return 'performance'
  }

  /**
   * Get alerts for session
   */
  async getSessionAlerts(sessionId: string): Promise<SessionAlert[]> {
    try {
      const alerts = this.alerts.get(sessionId) || []
      return alerts.filter(alert => !alert.resolved)
    } catch (error) {
      console.error('Error getting session alerts:', error)
      return []
    }
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(
    sessionId: string,
    alertId: string,
    acknowledgedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const alerts = this.alerts.get(sessionId) || []
      const alert = alerts.find(a => a.id === alertId)

      if (!alert) {
        return { success: false, error: 'Alert not found' }
      }

      alert.acknowledged = true
      alert.acknowledgedBy = acknowledgedBy
      alert.acknowledgedAt = new Date().toISOString()

      this.emit('alertAcknowledged', alert)

      return { success: true }
    } catch (error) {
      console.error('Error acknowledging alert:', error)
      return { success: false, error: 'Failed to acknowledge alert' }
    }
  }

  /**
   * Resolve alert
   */
  async resolveAlert(
    sessionId: string,
    alertId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const alerts = this.alerts.get(sessionId) || []
      const alert = alerts.find(a => a.id === alertId)

      if (!alert) {
        return { success: false, error: 'Alert not found' }
      }

      alert.resolved = true
      alert.resolvedAt = new Date().toISOString()

      this.emit('alertResolved', alert)

      return { success: true }
    } catch (error) {
      console.error('Error resolving alert:', error)
      return { success: false, error: 'Failed to resolve alert' }
    }
  }

  /**
   * Generate session report
   */
  async generateSessionReport(
    sessionId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SessionReport> {
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
        .order('timestamp', { ascending: false })

      // Calculate summary
      const totalParticipants = participants?.length || 0
      const totalActivities = activities?.length || 0
      const averageSessionTime = this.calculateAverageSessionTime(participants || [])
      const issuesCount = this.healthChecks.get(sessionId)?.issues.length || 0
      const alertsCount = this.alerts.get(sessionId)?.length || 0

      // Generate participant reports
      const participantReports: ParticipantReport[] = (participants || []).map(p => ({
        userId: p.user_id,
        userName: p.user_profiles?.full_name || p.user_profiles?.email || 'Unknown',
        role: p.role,
        joinTime: p.joined_at,
        leaveTime: p.is_active ? undefined : p.last_activity,
        sessionDuration: this.calculateSessionDuration(p.joined_at, p.last_activity),
        activityCount: activities?.filter(a => a.user_id === p.user_id).length || 0,
        lastActivity: p.last_activity || p.joined_at,
        status: this.getParticipantStatus(p.last_activity)
      }))

      // Generate activity reports
      const activityReports = this.generateActivityReports(activities || [])

      // Get issues and alerts
      const issues = this.healthChecks.get(sessionId)?.issues || []
      const alerts = this.alerts.get(sessionId) || []

      // Generate recommendations
      const recommendations = this.generateRecommendations(issues, alerts, metrics)

      return {
        sessionId,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        summary: {
          totalParticipants,
          totalActivities,
          averageSessionTime,
          issuesCount,
          alertsCount
        },
        participants: participantReports,
        activities: activityReports,
        issues,
        alerts,
        recommendations
      }
    } catch (error) {
      console.error('Error generating session report:', error)
      throw error
    }
  }

  /**
   * Setup real-time monitoring
   */
  private async setupRealtimeMonitoring(sessionId: string): Promise<void> {
    try {
      // Subscribe to session activities
      const activitiesChannel = this.supabase
        .channel(`session-activities-${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'session_activities',
            filter: `session_id=eq.${sessionId}`
          },
          (payload) => {
            this.emit('activityUpdate', payload)
            // Trigger health check on significant activity
            this.scheduleHealthCheck(sessionId)
          }
        )
        .subscribe()

      // Subscribe to participant changes
      const participantsChannel = this.supabase
        .channel(`session-participants-${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'match_session_participants',
            filter: `session_id=eq.${sessionId}`
          },
          (payload) => {
            this.emit('participantUpdate', payload)
            // Trigger health check on participant changes
            this.scheduleHealthCheck(sessionId)
          }
        )
        .subscribe()

      console.log(`Real-time monitoring setup for session: ${sessionId}`)
    } catch (error) {
      console.error('Error setting up real-time monitoring:', error)
    }
  }

  /**
   * Schedule health check
   */
  private scheduleHealthCheck(sessionId: string): void {
    // Debounce health checks to avoid excessive calls
    setTimeout(async () => {
      await this.performHealthCheck(sessionId)
    }, 5000) // 5 second delay
  }

  /**
   * Check if health check is recent
   */
  private isRecentCheck(lastChecked: string): boolean {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    return new Date(lastChecked) > fiveMinutesAgo
  }

  /**
   * Calculate average session time
   */
  private calculateAverageSessionTime(participants: any[]): number {
    if (participants.length === 0) return 0

    const totalTime = participants.reduce((sum, p) => {
      const start = new Date(p.joined_at).getTime()
      const end = p.last_activity ? new Date(p.last_activity).getTime() : Date.now()
      return sum + (end - start)
    }, 0)

    return totalTime / participants.length / (1000 * 60) // Convert to minutes
  }

  /**
   * Calculate session duration
   */
  private calculateSessionDuration(joinTime: string, lastActivity?: string): number {
    const start = new Date(joinTime).getTime()
    const end = lastActivity ? new Date(lastActivity).getTime() : Date.now()
    return Math.round((end - start) / (1000 * 60)) // Convert to minutes
  }

  /**
   * Get participant status
   */
  private getParticipantStatus(lastActivity?: string): 'active' | 'inactive' | 'disconnected' {
    if (!lastActivity) return 'disconnected'

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const lastActivityDate = new Date(lastActivity)

    if (lastActivityDate > fiveMinutesAgo) {
      return 'active'
    } else {
      return 'inactive'
    }
  }

  /**
   * Generate activity reports
   */
  private generateActivityReports(activities: any[]): ActivityReport[] {
    const activityTypes = [...new Set(activities.map(a => a.action))]
    
    return activityTypes.map(type => {
      const typeActivities = activities.filter(a => a.action === type)
      const userCounts = new Map<string, number>()
      
      typeActivities.forEach(activity => {
        const count = userCounts.get(activity.user_id) || 0
        userCounts.set(activity.user_id, count + 1)
      })

      const topUsers = Array.from(userCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([userId, count]) => ({
          userId,
          userName: `User ${userId.slice(0, 8)}`, // TODO: Get actual user names
          count
        }))

      return {
        type,
        count: typeActivities.length,
        percentage: Math.round((typeActivities.length / activities.length) * 100),
        topUsers
      }
    })
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    issues: SessionIssue[],
    alerts: SessionAlert[],
    metrics: SessionMetrics
  ): string[] {
    const recommendations: string[] = []

    // Performance recommendations
    if (metrics.averageResponseTime > 3000) {
      recommendations.push('Consider optimizing database queries to improve response times')
    }

    if (metrics.connectionStability < 0.9) {
      recommendations.push('Check network connectivity and consider implementing connection retry logic')
    }

    // Activity recommendations
    if (metrics.activitiesLastHour < 10) {
      recommendations.push('Low activity detected - consider engaging participants or checking session relevance')
    }

    // Participant recommendations
    if (metrics.activeParticipants < metrics.participantCount * 0.5) {
      recommendations.push('High number of inactive participants - consider sending reminders or removing inactive users')
    }

    // Issue-based recommendations
    const criticalIssues = issues.filter(i => i.severity === 'critical')
    if (criticalIssues.length > 0) {
      recommendations.push('Address critical issues immediately to maintain session stability')
    }

    return recommendations
  }
}

// Export singleton instance
export const sessionMonitoringService = new SessionMonitoringService()

// Export types
export type {
  SessionHealth,
  SessionIssue,
  SessionMetrics,
  SessionAlert,
  SessionReport,
  ParticipantReport,
  ActivityReport
}
