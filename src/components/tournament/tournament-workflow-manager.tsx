'use client'

import { useState, useEffect } from 'react'
import { Play, Pause, CheckCircle, XCircle, Clock, AlertTriangle, History } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { TournamentWorkflowService, TournamentWorkflowState, TournamentWorkflowLog, WorkflowAction } from '@/lib/services/tournament-workflow-service'

interface TournamentWorkflowManagerProps {
  tournamentId: string
  tournamentName: string
  onStatusChange?: (newStatus: string) => void
}

export function TournamentWorkflowManager({ 
  tournamentId, 
  tournamentName,
  onStatusChange 
}: TournamentWorkflowManagerProps) {
  const { toast } = useToast()
  const [workflowState, setWorkflowState] = useState<TournamentWorkflowState | null>(null)
  const [workflowHistory, setWorkflowHistory] = useState<TournamentWorkflowLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    loadWorkflowData()
  }, [tournamentId])

  const loadWorkflowData = async () => {
    try {
      setIsLoading(true)
      const [state, history] = await Promise.all([
        tournamentWorkflowService.getTournamentWorkflowState(tournamentId),
        tournamentWorkflowService.getWorkflowHistory(tournamentId)
      ])
      setWorkflowState(state)
      setWorkflowHistory(history)
    } catch (error) {
      console.error('Error loading workflow data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load tournament workflow data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleWorkflowAction = async (action: WorkflowAction) => {
    try {
      setIsProcessing(true)
      const success = await tournamentWorkflowService.performWorkflowAction(
        tournamentId,
        action,
        'current-user-id', // This should come from auth context
        `Workflow action performed on ${tournamentName}`
      )

      if (success) {
        toast({
          title: 'Success',
          description: 'Tournament status updated successfully'
        })
        await loadWorkflowData()
        onStatusChange?.(workflowState?.next_status || '')
      } else {
        throw new Error('Failed to update tournament status')
      }
    } catch (error) {
      console.error('Error performing workflow action:', error)
      toast({
        title: 'Error',
        description: 'Failed to update tournament status',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Clock className="h-4 w-4" />
      case 'registration':
        return <Play className="h-4 w-4" />
      case 'active':
        return <CheckCircle className="h-4 w-4" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'cancelled':
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'secondary'
      case 'registration':
        return 'default'
      case 'active':
        return 'destructive'
      case 'completed':
        return 'outline'
      case 'cancelled':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  const getActionButtonText = (action: WorkflowAction) => {
    switch (action) {
      case 'start_registration':
        return 'Open Registration'
      case 'close_registration':
        return 'Close Registration'
      case 'start_tournament':
        return 'Start Tournament'
      case 'complete_tournament':
        return 'Complete Tournament'
      case 'cancel_tournament':
        return 'Cancel Tournament'
      default:
        return action
    }
  }

  const getActionIcon = (action: WorkflowAction) => {
    switch (action) {
      case 'start_registration':
        return <Play className="h-4 w-4" />
      case 'close_registration':
        return <Pause className="h-4 w-4" />
      case 'start_tournament':
        return <Play className="h-4 w-4" />
      case 'complete_tournament':
        return <CheckCircle className="h-4 w-4" />
      case 'cancel_tournament':
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tournament Workflow</CardTitle>
          <CardDescription>Loading workflow status...</CardDescription>
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
          <CardTitle>Tournament Workflow</CardTitle>
          <CardDescription>Unable to load workflow status</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load tournament workflow data. Please try again.
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
            <span>Tournament Workflow</span>
            {getStatusIcon(workflowState.current_status)}
          </CardTitle>
          <CardDescription>
            Manage tournament status and workflow transitions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Current Status:</span>
              <Badge variant={getStatusColor(workflowState.current_status)}>
                {workflowState.current_status}
              </Badge>
            </div>
            {workflowState.next_status && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Next:</span>
                <Badge variant="outline">
                  {workflowState.next_status}
                </Badge>
              </div>
            )}
          </div>

          {workflowState.estimated_completion_date && (
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Estimated completion: {new Date(workflowState.estimated_completion_date).toLocaleDateString()}
              </span>
            </div>
          )}

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
                    variant={action === 'cancel_tournament' ? 'destructive' : 'default'}
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
        </CardContent>
      </Card>

      {/* Workflow History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="h-4 w-4" />
            <span>Workflow History</span>
          </CardTitle>
          <CardDescription>
            History of tournament status changes and workflow actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {workflowHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
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
                          {log.to_status}
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
