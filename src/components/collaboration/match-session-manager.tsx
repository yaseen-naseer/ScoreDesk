/**
 * Match Session Manager Component
 * Comprehensive UI for managing match collaboration sessions
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Users, 
  Plus, 
  Settings, 
  Activity, 
  MessageSquare, 
  UserPlus, 
  MoreVertical,
  Play,
  Pause,
  Square,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { matchSessionService, type MatchSession, type SessionParticipant } from '@/lib/services/match-session-service'
import { sessionInvitationService, type SessionInvitation } from '@/lib/services/session-invitation-service'
import { sessionPermissionsService, type SessionAccessControl } from '@/lib/services/session-permissions-service'
import { sessionMonitoringService, type SessionHealth } from '@/lib/services/session-monitoring-service'
import { formatDistanceToNow } from 'date-fns'

interface MatchSessionManagerProps {
  matchId: string
  currentUserId: string
  currentUserName: string
  onSessionChange?: (session: MatchSession | null) => void
}

export function MatchSessionManager({
  matchId,
  currentUserId,
  currentUserName,
  onSessionChange
}: MatchSessionManagerProps) {
  const [sessions, setSessions] = useState<MatchSession[]>([])
  const [currentSession, setCurrentSession] = useState<MatchSession | null>(null)
  const [participants, setParticipants] = useState<SessionParticipant[]>([])
  const [invitations, setInvitations] = useState<SessionInvitation[]>([])
  const [sessionHealth, setSessionHealth] = useState<SessionHealth | null>(null)
  const [accessControl, setAccessControl] = useState<SessionAccessControl | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)

  // Form states
  const [newSessionName, setNewSessionName] = useState('')
  const [inviteUserId, setInviteUserId] = useState('')
  const [inviteRole, setInviteRole] = useState('stats_operator')
  const [inviteMessage, setInviteMessage] = useState('')

  useEffect(() => {
    loadSessions()
    loadUserInvitations()
  }, [matchId, currentUserId])

  useEffect(() => {
    if (currentSession) {
      loadSessionData(currentSession.id)
      startSessionMonitoring(currentSession.id)
    }
  }, [currentSession])

  const loadSessions = async () => {
    try {
      setLoading(true)
      const sessionList = await matchSessionService.getSessions({ matchId })
      setSessions(sessionList)
      
      // Find active session for current user
      const activeSession = sessionList.find(s => s.is_active)
      if (activeSession) {
        setCurrentSession(activeSession)
        onSessionChange?.(activeSession)
      }
    } catch (err) {
      setError('Failed to load sessions')
      console.error('Error loading sessions:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadSessionData = async (sessionId: string) => {
    try {
      const [participantsList, accessControlData] = await Promise.all([
        matchSessionService.getActiveParticipants(sessionId),
        sessionPermissionsService.getSessionAccessControl(sessionId, currentUserId)
      ])
      
      setParticipants(participantsList)
      setAccessControl(accessControlData)
    } catch (err) {
      console.error('Error loading session data:', err)
    }
  }

  const loadUserInvitations = async () => {
    try {
      const userInvitations = await sessionInvitationService.getUserInvitations(currentUserId)
      setInvitations(userInvitations.filter(inv => inv.status === 'pending'))
    } catch (err) {
      console.error('Error loading invitations:', err)
    }
  }

  const startSessionMonitoring = async (sessionId: string) => {
    try {
      await sessionMonitoringService.startMonitoring(sessionId)
      
      // Listen for health updates
      sessionMonitoringService.on('healthUpdate', (health: SessionHealth) => {
        if (health.sessionId === sessionId) {
          setSessionHealth(health)
        }
      })
    } catch (err) {
      console.error('Error starting session monitoring:', err)
    }
  }

  const createSession = async () => {
    if (!newSessionName.trim()) return

    try {
      setLoading(true)
      const result = await matchSessionService.createSession(
        matchId,
        newSessionName.trim(),
        currentUserId
      )

      if (result.success && result.session) {
        setSessions(prev => [result.session!, ...prev])
        setCurrentSession(result.session)
        onSessionChange?.(result.session)
        setShowCreateDialog(false)
        setNewSessionName('')
      } else {
        setError(result.error || 'Failed to create session')
      }
    } catch (err) {
      setError('Failed to create session')
      console.error('Error creating session:', err)
    } finally {
      setLoading(false)
    }
  }

  const joinSession = async (sessionId: string) => {
    try {
      setLoading(true)
      const result = await matchSessionService.joinSession(
        sessionId,
        currentUserId,
        'stats_operator' // Default role
      )

      if (result.success) {
        await loadSessions()
      } else {
        setError(result.error || 'Failed to join session')
      }
    } catch (err) {
      setError('Failed to join session')
      console.error('Error joining session:', err)
    } finally {
      setLoading(false)
    }
  }

  const leaveSession = async () => {
    if (!currentSession) return

    try {
      setLoading(true)
      const result = await matchSessionService.leaveSession(currentSession.id, currentUserId)

      if (result.success) {
        setCurrentSession(null)
        setParticipants([])
        setSessionHealth(null)
        onSessionChange?.(null)
        await loadSessions()
      } else {
        setError(result.error || 'Failed to leave session')
      }
    } catch (err) {
      setError('Failed to leave session')
      console.error('Error leaving session:', err)
    } finally {
      setLoading(false)
    }
  }

  const endSession = async () => {
    if (!currentSession) return

    try {
      setLoading(true)
      const result = await matchSessionService.endSession(currentSession.id, currentUserId)

      if (result.success) {
        setCurrentSession(null)
        setParticipants([])
        setSessionHealth(null)
        onSessionChange?.(null)
        await loadSessions()
      } else {
        setError(result.error || 'Failed to end session')
      }
    } catch (err) {
      setError('Failed to end session')
      console.error('Error ending session:', err)
    } finally {
      setLoading(false)
    }
  }

  const sendInvitation = async () => {
    if (!currentSession || !inviteUserId.trim()) return

    try {
      setLoading(true)
      const result = await sessionInvitationService.sendInvitation(
        {
          sessionId: currentSession.id,
          invitedUserId: inviteUserId.trim(),
          role: inviteRole as any,
          message: inviteMessage.trim() || undefined
        },
        currentUserId
      )

      if (result.success) {
        setShowInviteDialog(false)
        setInviteUserId('')
        setInviteMessage('')
      } else {
        setError(result.error || 'Failed to send invitation')
      }
    } catch (err) {
      setError('Failed to send invitation')
      console.error('Error sending invitation:', err)
    } finally {
      setLoading(false)
    }
  }

  const acceptInvitation = async (invitationId: string) => {
    try {
      setLoading(true)
      const result = await sessionInvitationService.acceptInvitation(invitationId, currentUserId)

      if (result.success) {
        await loadSessions()
        await loadUserInvitations()
      } else {
        setError(result.error || 'Failed to accept invitation')
      }
    } catch (err) {
      setError('Failed to accept invitation')
      console.error('Error accepting invitation:', err)
    } finally {
      setLoading(false)
    }
  }

  const declineInvitation = async (invitationId: string) => {
    try {
      const result = await sessionInvitationService.declineInvitation(invitationId, currentUserId)
      if (result.success) {
        await loadUserInvitations()
      }
    } catch (err) {
      console.error('Error declining invitation:', err)
    }
  }

  const getSessionStatusColor = (session: MatchSession) => {
    if (!session.is_active) return 'bg-gray-100 text-gray-800'
    return 'bg-green-100 text-green-800'
  }

  const getSessionStatusIcon = (session: MatchSession) => {
    if (!session.is_active) return <XCircle className="h-4 w-4" />
    return <CheckCircle className="h-4 w-4" />
  }

  const getHealthStatusColor = (health: SessionHealth | null) => {
    if (!health) return 'text-gray-500'
    if (health.isHealthy) return 'text-green-500'
    return 'text-red-500'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Match Sessions</h2>
          <p className="text-gray-600">Manage collaboration sessions for this match</p>
        </div>
        {accessControl?.canStartSession && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Session
          </Button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="participants">Participants</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
        </TabsList>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <div className="grid gap-4">
            {sessions.map((session) => (
              <Card key={session.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge className={getSessionStatusColor(session)}>
                        {getSessionStatusIcon(session)}
                        <span className="ml-1">
                          {session.is_active ? 'Active' : 'Ended'}
                        </span>
                      </Badge>
                      <div>
                        <CardTitle className="text-lg">{session.session_name}</CardTitle>
                        <CardDescription>
                          Created {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {session.is_active && !currentSession && (
                        <Button
                          size="sm"
                          onClick={() => joinSession(session.id)}
                          disabled={loading}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Join
                        </Button>
                      )}
                      {currentSession?.id === session.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={leaveSession}
                          disabled={loading}
                        >
                          <Square className="h-4 w-4 mr-1" />
                          Leave
                        </Button>
                      )}
                      {currentSession?.id === session.id && accessControl?.canEndSession && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={endSession}
                          disabled={loading}
                        >
                          End Session
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
            
            {sessions.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center">
                  <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions found</h3>
                  <p className="text-gray-600 mb-4">
                    Create a new session to start collaborating on this match.
                  </p>
                  {accessControl?.canStartSession && (
                    <Button onClick={() => setShowCreateDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Session
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Participants Tab */}
        <TabsContent value="participants" className="space-y-4">
          {currentSession ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Session Participants</h3>
                {accessControl?.canInviteUsers && (
                  <Button onClick={() => setShowInviteDialog(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite User
                  </Button>
                )}
              </div>
              
              <div className="grid gap-3">
                {participants.map((participant) => (
                  <Card key={participant.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {participant.user_id.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">User {participant.user_id.slice(0, 8)}</p>
                            <p className="text-sm text-gray-600 capitalize">{participant.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">
                            <Activity className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                          {participant.last_activity && (
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(participant.last_activity), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No active session</h3>
                <p className="text-gray-600">Join or create a session to view participants.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Invitations Tab */}
        <TabsContent value="invitations" className="space-y-4">
          <div className="space-y-4">
            {invitations.map((invitation) => (
              <Card key={invitation.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Session Invitation</h4>
                      <p className="text-sm text-gray-600">
                        You've been invited to join a match session as {invitation.role}
                      </p>
                      {invitation.message && (
                        <p className="text-sm text-gray-500 mt-1">"{invitation.message}"</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        onClick={() => acceptInvitation(invitation.id)}
                        disabled={loading}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => declineInvitation(invitation.id)}
                        disabled={loading}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {invitations.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No pending invitations</h3>
                  <p className="text-gray-600">You don't have any pending session invitations.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Health Tab */}
        <TabsContent value="health" className="space-y-4">
          {currentSession && sessionHealth ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className={`h-5 w-5 ${getHealthStatusColor(sessionHealth)}`} />
                    <span>Session Health</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{sessionHealth.metrics.participantCount}</p>
                      <p className="text-sm text-gray-600">Participants</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{sessionHealth.metrics.activeParticipants}</p>
                      <p className="text-sm text-gray-600">Active</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{sessionHealth.metrics.totalActivities}</p>
                      <p className="text-sm text-gray-600">Activities</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{sessionHealth.metrics.collaborationScore}%</p>
                      <p className="text-sm text-gray-600">Score</p>
                    </div>
                  </div>
                  
                  {sessionHealth.issues.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Issues</h4>
                      {sessionHealth.issues.map((issue, index) => (
                        <Alert key={index} variant={issue.severity === 'critical' ? 'destructive' : 'default'}>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>{issue.message}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Activity className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No health data</h3>
                <p className="text-gray-600">Join or create a session to view health metrics.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Session Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Session</DialogTitle>
            <DialogDescription>
              Create a new collaboration session for this match.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sessionName">Session Name</Label>
              <Input
                id="sessionName"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder="Enter session name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createSession} disabled={loading || !newSessionName.trim()}>
              Create Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Send an invitation to join this session.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="inviteUserId">User ID</Label>
              <Input
                id="inviteUserId"
                value={inviteUserId}
                onChange={(e) => setInviteUserId(e.target.value)}
                placeholder="Enter user ID"
              />
            </div>
            <div>
              <Label htmlFor="inviteRole">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stats_operator">Stats Operator</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="inviteMessage">Message (Optional)</Label>
              <Textarea
                id="inviteMessage"
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                placeholder="Optional message for the invitation"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={sendInvitation} disabled={loading || !inviteUserId.trim()}>
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
