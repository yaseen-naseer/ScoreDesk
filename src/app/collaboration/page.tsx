/**
 * Collaboration Dashboard Page
 * Real-time collaboration dashboard with comprehensive status monitoring
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Users, 
  Activity, 
  MessageSquare, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  BarChart3,
  Eye,
  Settings,
  RefreshCw
} from 'lucide-react'
import { MatchSessionManager } from '@/components/collaboration/match-session-manager'
import { collaborationAnalyticsService, type CollaborationMetrics } from '@/lib/services/collaboration-analytics-service'
import { sessionMonitoringService, type SessionHealth } from '@/lib/services/session-monitoring-service'
import { actionBroadcastingService, type ActionStats } from '@/lib/services/action-broadcasting-service'
import { userCommunicationService, type CommunicationStats } from '@/lib/services/user-communication-service'
import { collaborativeCursorsService, type CursorStats } from '@/lib/services/collaborative-cursors-service'
import { undoRedoService, type UndoRedoStats } from '@/lib/services/undo-redo-service'

export default function CollaborationDashboard() {
  const [activeSession, setActiveSession] = useState<string | null>(null)
  const [collaborationMetrics, setCollaborationMetrics] = useState<CollaborationMetrics | null>(null)
  const [sessionHealth, setSessionHealth] = useState<SessionHealth | null>(null)
  const [actionStats, setActionStats] = useState<ActionStats | null>(null)
  const [communicationStats, setCommunicationStats] = useState<CommunicationStats | null>(null)
  const [cursorStats, setCursorStats] = useState<CursorStats | null>(null)
  const [undoRedoStats, setUndoRedoStats] = useState<UndoRedoStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  useEffect(() => {
    if (activeSession) {
      loadDashboardData()
      startRealTimeUpdates()
    }

    return () => {
      if (activeSession) {
        stopRealTimeUpdates()
      }
    }
  }, [activeSession])

  const loadDashboardData = async () => {
    if (!activeSession) return

    try {
      setLoading(true)
      
      const [
        metrics,
        health,
        actions,
        communication,
        cursors,
        undoRedo
      ] = await Promise.all([
        collaborationAnalyticsService.collectMetrics(activeSession),
        sessionMonitoringService.getSessionHealth(activeSession),
        actionBroadcastingService.getActionStats(activeSession),
        userCommunicationService.getCommunicationStats(activeSession, 'current-user'), // TODO: Get actual user ID
        Promise.resolve(collaborativeCursorsService.getCursorStats(activeSession)),
        Promise.resolve(undoRedoService.getStats(activeSession))
      ])

      setCollaborationMetrics(metrics)
      setSessionHealth(health)
      setActionStats(actions)
      setCommunicationStats(communication)
      setCursorStats(cursors)
      setUndoRedoStats(undoRedo)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const startRealTimeUpdates = () => {
    if (!activeSession) return

    // Listen for metrics updates
    collaborationAnalyticsService.on('metricsUpdated', (data) => {
      if (data.sessionId === activeSession) {
        setCollaborationMetrics(data.metrics)
        setLastUpdated(new Date())
      }
    })

    // Listen for health updates
    sessionMonitoringService.on('healthUpdate', (health: SessionHealth) => {
      if (health.sessionId === activeSession) {
        setSessionHealth(health)
        setLastUpdated(new Date())
      }
    })

    // Listen for action updates
    actionBroadcastingService.on('actionBroadcasted', (action) => {
      if (action.sessionId === activeSession) {
        loadDashboardData() // Refresh action stats
      }
    })

    // Listen for communication updates
    userCommunicationService.on('messageSent', () => {
      loadDashboardData() // Refresh communication stats
    })
  }

  const stopRealTimeUpdates = () => {
    // Remove all event listeners
    collaborationAnalyticsService.removeAllListeners()
    sessionMonitoringService.removeAllListeners()
    actionBroadcastingService.removeAllListeners()
    userCommunicationService.removeAllListeners()
  }

  const refreshDashboard = () => {
    loadDashboardData()
  }

  const getHealthStatusColor = (health: SessionHealth | null) => {
    if (!health) return 'text-gray-500'
    if (health.isHealthy) return 'text-green-500'
    return 'text-red-500'
  }

  const getHealthStatusIcon = (health: SessionHealth | null) => {
    if (!health) return <Activity className="h-4 w-4" />
    if (health.isHealthy) return <CheckCircle className="h-4 w-4" />
    return <AlertTriangle className="h-4 w-4" />
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100'
    if (score >= 60) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Collaboration Dashboard</h1>
          <p className="text-gray-600">
            Real-time collaboration monitoring and analytics
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {lastUpdated && (
            <span className="text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={refreshDashboard}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Session Manager */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Session Management</span>
          </CardTitle>
          <CardDescription>
            Create and manage collaboration sessions for matches
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MatchSessionManager
            matchId="current-match-id" // TODO: Get actual match ID
            currentUserId="current-user-id" // TODO: Get actual user ID
            currentUserName="Current User" // TODO: Get actual user name
            onSessionChange={(session) => {
              setActiveSession(session?.id || null)
            }}
          />
        </CardContent>
      </Card>

      {/* Real-time Metrics */}
      {activeSession && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="communication">Communication</TabsTrigger>
            <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Collaboration Score */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Collaboration Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getScoreColor(collaborationMetrics?.collaborationScore || 0)}`}>
                    {collaborationMetrics?.collaborationScore || 0}%
                  </div>
                  <Progress 
                    value={collaborationMetrics?.collaborationScore || 0} 
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              {/* Active Participants */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Active Participants
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {sessionHealth?.metrics.activeParticipants || 0}
                  </div>
                  <p className="text-sm text-gray-600">
                    of {sessionHealth?.metrics.totalParticipants || 0} total
                  </p>
                </CardContent>
              </Card>

              {/* Session Health */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Session Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <div className={getHealthStatusColor(sessionHealth)}>
                      {getHealthStatusIcon(sessionHealth)}
                    </div>
                    <span className="text-lg font-bold">
                      {sessionHealth?.isHealthy ? 'Healthy' : 'Issues'}
                    </span>
                  </div>
                  {sessionHealth && sessionHealth.issues.length > 0 && (
                    <p className="text-sm text-red-600 mt-1">
                      {sessionHealth.issues.length} issues
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Actions Per Minute */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Activity Level
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {collaborationMetrics?.actionsPerMinute || 0}
                  </div>
                  <p className="text-sm text-gray-600">actions/min</p>
                </CardContent>
              </Card>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Productivity Score */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Productivity</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getScoreColor(collaborationMetrics?.productivityScore || 0)}`}>
                    {collaborationMetrics?.productivityScore || 0}%
                  </div>
                  <Progress 
                    value={collaborationMetrics?.productivityScore || 0} 
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    Based on actions and participation
                  </p>
                </CardContent>
              </Card>

              {/* Engagement Level */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5" />
                    <span>Engagement</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getScoreColor(collaborationMetrics?.engagementLevel || 0)}`}>
                    {collaborationMetrics?.engagementLevel || 0}%
                  </div>
                  <Progress 
                    value={collaborationMetrics?.engagementLevel || 0} 
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    User participation and activity
                  </p>
                </CardContent>
              </Card>

              {/* Communication Level */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5" />
                    <span>Communication</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getScoreColor(collaborationMetrics?.communicationLevel || 0)}`}>
                    {collaborationMetrics?.communicationLevel || 0}%
                  </div>
                  <Progress 
                    value={collaborationMetrics?.communicationLevel || 0} 
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    Message frequency and interaction
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Action Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Action Statistics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Actions</p>
                      <p className="text-2xl font-bold">{actionStats?.totalActions || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Per Minute</p>
                      <p className="text-2xl font-bold">{actionStats?.averageActionsPerMinute || 0}</p>
                    </div>
                  </div>
                  
                  {actionStats?.actionsByCategory && (
                    <div>
                      <h4 className="font-medium mb-2">Actions by Category</h4>
                      <div className="space-y-2">
                        {Object.entries(actionStats.actionsByCategory).map(([category, count]) => (
                          <div key={category} className="flex justify-between">
                            <span className="capitalize">{category}</span>
                            <span className="font-medium">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Undo/Redo Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="h-5 w-5" />
                    <span>Undo/Redo Activity</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Undoable</p>
                      <p className="text-2xl font-bold">{undoRedoStats?.undoableActions || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Redoable</p>
                      <p className="text-2xl font-bold">{undoRedoStats?.redoableActions || 0}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Total Actions</p>
                    <p className="text-xl font-bold">{undoRedoStats?.totalActions || 0}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Communication Tab */}
          <TabsContent value="communication" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Communication Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5" />
                    <span>Messages</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Messages</p>
                    <p className="text-2xl font-bold">{communicationStats?.totalMessages || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Unread</p>
                    <p className="text-xl font-bold">{communicationStats?.unreadMessages || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Today</p>
                    <p className="text-xl font-bold">{communicationStats?.messagesToday || 0}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Communication Level */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Communication Level</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getScoreColor(communicationStats?.communicationLevel || 0)}`}>
                    {communicationStats?.communicationLevel || 0}%
                  </div>
                  <Progress 
                    value={communicationStats?.communicationLevel || 0} 
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    Activity and engagement
                  </p>
                </CardContent>
              </Card>

              {/* Response Time */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>Response Time</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {communicationStats?.averageResponseTime || 0}s
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Average response time
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Collaboration Tab */}
          <TabsContent value="collaboration" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cursor Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Eye className="h-5 w-5" />
                    <span>Cursor Activity</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Active Cursors</p>
                      <p className="text-2xl font-bold">{cursorStats?.activeCursors || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Cursors</p>
                      <p className="text-2xl font-bold">{cursorStats?.totalCursors || 0}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Collaboration Level</p>
                    <div className={`text-xl font-bold ${getScoreColor(cursorStats?.collaborationLevel || 0)}`}>
                      {cursorStats?.collaborationLevel || 0}%
                    </div>
                    <Progress 
                      value={cursorStats?.collaborationLevel || 0} 
                      className="mt-1"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Session Health Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5" />
                    <span>Session Health</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sessionHealth ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Status</span>
                        <Badge variant={sessionHealth.isHealthy ? 'default' : 'destructive'}>
                          {sessionHealth.isHealthy ? 'Healthy' : 'Issues'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Participants</p>
                          <p className="text-xl font-bold">{sessionHealth.metrics.participantCount}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Active</p>
                          <p className="text-xl font-bold">{sessionHealth.metrics.activeParticipants}</p>
                        </div>
                      </div>

                      {sessionHealth.issues.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Issues</h4>
                          <div className="space-y-1">
                            {sessionHealth.issues.slice(0, 3).map((issue, index) => (
                              <Alert key={index} variant={issue.severity === 'critical' ? 'destructive' : 'default'}>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription className="text-sm">
                                  {issue.message}
                                </AlertDescription>
                              </Alert>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-500">No health data available</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* No Active Session */}
      {!activeSession && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Active Session</h3>
            <p className="text-gray-600 mb-6">
              Create or join a collaboration session to view real-time metrics and analytics.
            </p>
            <div className="flex justify-center space-x-4">
              <Button>
                <Users className="h-4 w-4 mr-2" />
                Create Session
              </Button>
              <Button variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                View All Sessions
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
