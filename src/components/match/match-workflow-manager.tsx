'use client'

import { useState, useEffect } from 'react'
import { Play, Pause, Square, Clock, AlertTriangle, CheckCircle, XCircle, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { MatchWorkflowService, MatchWorkflowState, MatchWorkflowLog, WorkflowAction, matchWorkflowService } from '@/lib/services/match-workflow-service'

interface MatchWorkflowManagerProps {
  matchId: string
  matchName: string
  onStatusChange?: (newStatus: string) => void
}

export function MatchWorkflowManager({ 
  matchId, 
  matchName,
  onStatusChange 
}: MatchWorkflowManagerProps) {
  const { toast } = useToast()
  const [workflowState, setWorkflowState] = useState<MatchWorkflowState | null>(null)
  const [workflowHistory, setWorkflowHistory] = useState<MatchWorkflowLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    loadWorkflowData()
    
    // Set up real-time updates for match timer
    const interval = setInterval(() => {
      if (workflowState?.match_time.is_running) {
        loadWorkflowData()
      }
    }, 1000) // Update every second when match is running

    return () => clearInterval(interval)
  }, [matchId, workflowState?.match_time.is_running])

  const loadWorkflowData = async () => {
    try {
      setIsLoading(true)
      const [state, history] = await Promise.all([
        matchWorkflowService.getMatchWorkflowState(matchId),
        matchWorkflowService.getWorkflowHistory(matchId)
      ])
      setWorkflowState(state)
      setWorkflowHistory(history)
    } catch (error) {
      console.error('Error loading workflow data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load match workflow data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleWorkflowAction = async (action: WorkflowAction) => {
    try {
      setIsProcessing(true)
      const success = await matchWorkflowService.performWorkflowAction(
        matchId,
        action,
        'current-user-id', // This should come from auth context
        `Workflow action performed on ${matchName}`
      )

      if (success) {
        toast({
          title: 'Success',
          description: 'Match status updated successfully'
        })
        await loadWorkflowData()
        onStatusChange?.(workflowState?.next_status || '')
      } else {
        throw new Error('Failed to update match status')
      }
    } catch (error) {
      console.error('Error performing workflow action:', error)
      toast({
        title: 'Error',
        description: 'Failed to update match status',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'live':
        return <Play className="h-4 w-4 text-green-600" />
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-600" />
      case 'half_time':
        return <RotateCcw className="h-4 w-4 text-orange-600" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'postponed':
        return <Clock className="h-4 w-4 text-gray-600" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'secondary'
      case 'live':
        return 'default'
      case 'paused':
        return 'secondary'
      case 'half_time':
        return 'outline'
      case 'completed':
        return 'default'
      case 'cancelled':
        return 'destructive'
      case 'postponed':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const getActionButtonText = (action: WorkflowAction) => {
    switch (action) {
      case 'start_match':
        return 'Start Match'
      case 'pause_match':
        return 'Pause Match'
      case 'resume_match':
        return 'Resume Match'
      case 'end_half':
        return 'End Half'
      case 'start_second_half':
        return 'Start Second Half'
      case 'end_match':
        return 'End Match'
      case 'cancel_match':
        return 'Cancel Match'
      case 'postpone_match':
        return 'Postpone Match'
      default:
        return action
    }
  }

  const getActionIcon = (action: WorkflowAction) => {
    switch (action) {
      case 'start_match':
        return <Play className="h-4 w-4" />
      case 'pause_match':
        return <Pause className="h-4 w-4" />
      case 'resume_match':
        return <Play className="h-4 w-4" />
      case 'end_half':
        return <RotateCcw className="h-4 w-4" />
      case 'start_second_half':
        return <Play className="h-4 w-4" />
      case 'end_match':
        return <Square className="h-4 w-4" />
      case 'cancel_match':
        return <XCircle className="h-4 w-4" />
      case 'postpone_match':
        return <Clock className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const formatTime = (minutes: number) => {
    const mins = Math.floor(minutes)
    const secs = Math.floor((minutes - mins) * 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Match Workflow</CardTitle>
          <CardDescription>Loading match status...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!workflowState) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Match Workflow</CardTitle>
          <CardDescription>Unable to load match status</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load match workflow data. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>Match Workflow</span>
            {getStatusIcon(workflowState.current_status)}
          </CardTitle>
          <CardDescription>
            Manage match status and workflow transitions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant={getStatusColor(workflowState.current_status)}>
                  {workflowState.current_status.replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Phase:</span>
                <Badge variant="outline">
                  {workflowState.current_phase.replace('_', ' ')}
                </Badge>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Match Time:</span>
                <span className="font-mono text-lg">
                  {formatTime(workflowState.match_time.elapsed_minutes)}
                </span>
                {workflowState.match_time.is_running && (
                  <Badge variant="default" className="animate-pulse">
                    LIVE
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Half:</span>
                <Badge variant="outline">
                  {workflowState.match_time.current_half}
                </Badge>
              </div>
            </div>
          </div>

          {/* Match Timer Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {workflowState.match_time.elapsed_minutes}
                </div>
                <div className="text-xs text-muted-foreground">Minutes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {workflowState.match_time.current_half}
                </div>
                <div className="text-xs text-muted-foreground">Half</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {workflowState.match_time.total_minutes}
                </div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {workflowState.match_time.added_time}
                </div>
                <div className="text-xs text-muted-foreground">Added</div>
              </div>
            </div>
          </div>

          {/* Requirements Status */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Requirements:</span>
              <Badge variant={workflowState.requirements_met ? 'default' : 'destructive'}>
                {workflowState.requirements_met ? 'Met' : 'Not Met'}
              </Badge>
            </div>
            
            {workflowState.missing_requirements.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <span className="font-medium">Missing requirements:</span>
                    <ul className="list-disc list-inside text-sm">
                      {workflowState.missing_requirements.map((req, index) => (
                        <li key={index}>{req.replace(/_/g, ' ')}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Action Buttons */}
          {workflowState.can_perform_actions.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Available Actions:</span>
              <div className="flex flex-wrap gap-2">
                {workflowState.can_perform_actions.map((action) => (
                  <Button
                    key={action}
                    variant={action === 'cancel_match' ? 'destructive' : 'default'}
                    size="sm"
                    onClick={() => handleWorkflowAction(action)}
                    disabled={isProcessing}
                    className="flex items-center space-x-1"
                  >
                    {getActionIcon(action)}
                    <span>{getActionButtonText(action)}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Next Status */}
          {workflowState.next_status && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>Next Status:</strong> {workflowState.next_status.replace('_', ' ')} 
                {workflowState.estimated_completion_time && (
                  <span className="ml-2">
                    (Est. {new Date(workflowState.estimated_completion_time).toLocaleTimeString()})
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Workflow History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Workflow History</span>
          </CardTitle>
          <CardDescription>
            History of match status changes and workflow actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {workflowHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No workflow history available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {workflowHistory.map((log, index) => (
                <div key={log.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(log.to_status)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant={getStatusColor(log.to_status)}>
                          {log.to_status.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline">
                          {log.to_phase.replace('_', ' ')}
                        </Badge>
                        {log.automatic && (
                          <Badge variant="outline" className="text-xs">
                            Auto
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.performed_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {log.action.replace(/_/g, ' ')} - {log.from_status} → {log.to_status}
                    </p>
                    {log.notes && (
                      <p className="text-xs text-muted-foreground italic">
                        {log.notes}
                      </p>
                    )}
                    {log.match_time_elapsed !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        Match time: {formatTime(log.match_time_elapsed)}
                      </p>
                    )}
                    {index < workflowHistory.length - 1 && (
                      <Separator className="mt-3" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
