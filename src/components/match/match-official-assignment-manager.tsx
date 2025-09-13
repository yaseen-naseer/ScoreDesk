'use client'

import { useState, useEffect } from 'react'
import { Users, Clock, AlertTriangle, CheckCircle, XCircle, Plus, RotateCcw, Star, MapPin, UserCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { 
  MatchOfficialAssignmentService, 
  MatchOfficialAssignment, 
  OfficialRole, 
  AssignmentStatus, 
  AssignmentPriority,
  OfficialAvailability,
  AssignmentValidationResult,
  matchOfficialAssignmentService 
} from '@/lib/services/match-official-assignment-service'

interface MatchOfficialAssignmentManagerProps {
  matchId: string
  matchName: string
  onAssignmentsUpdate?: () => void
}

export function MatchOfficialAssignmentManager({ 
  matchId, 
  matchName,
  onAssignmentsUpdate 
}: MatchOfficialAssignmentManagerProps) {
  const { toast } = useToast()
  const [assignments, setAssignments] = useState<MatchOfficialAssignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAssigning, setIsAssigning] = useState(false)
  const [selectedRole, setSelectedRole] = useState<OfficialRole | null>(null)
  const [availableOfficials, setAvailableOfficials] = useState<OfficialAvailability[]>([])
  const [isLoadingOfficials, setIsLoadingOfficials] = useState(false)

  useEffect(() => {
    loadAssignments()
  }, [matchId])

  const loadAssignments = async () => {
    try {
      setIsLoading(true)
      const data = await matchOfficialAssignmentService.getMatchOfficialAssignments(matchId)
      setAssignments(data)
    } catch (error) {
      console.error('Error loading assignments:', error)
      toast({
        title: 'Error',
        description: 'Failed to load official assignments',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadAvailableOfficials = async (role: OfficialRole) => {
    try {
      setIsLoadingOfficials(true)
      const data = await matchOfficialAssignmentService.getAvailableOfficials(matchId, role)
      setAvailableOfficials(data)
    } catch (error) {
      console.error('Error loading available officials:', error)
      toast({
        title: 'Error',
        description: 'Failed to load available officials',
        variant: 'destructive'
      })
    } finally {
      setIsLoadingOfficials(false)
    }
  }

  const handleAssignOfficial = async (
    refereeId: string, 
    role: OfficialRole, 
    priority: AssignmentPriority = 'medium'
  ) => {
    try {
      setIsAssigning(true)
      const result = await matchOfficialAssignmentService.assignOfficial({
        match_id: matchId,
        referee_id: refereeId,
        official_role: role,
        priority,
        assigned_by: 'current-user-id' // This should come from auth context
      })

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Official assigned successfully'
        })
        await loadAssignments()
        onAssignmentsUpdate?.()
      } else {
        throw new Error(result.error || 'Failed to assign official')
      }
    } catch (error) {
      console.error('Error assigning official:', error)
      toast({
        title: 'Error',
        description: 'Failed to assign official',
        variant: 'destructive'
      })
    } finally {
      setIsAssigning(false)
    }
  }

  const handleConfirmAssignment = async (assignmentId: string) => {
    try {
      const success = await matchOfficialAssignmentService.confirmAssignment(assignmentId, 'current-user-id')
      if (success) {
        toast({
          title: 'Success',
          description: 'Assignment confirmed'
        })
        await loadAssignments()
        onAssignmentsUpdate?.()
      }
    } catch (error) {
      console.error('Error confirming assignment:', error)
      toast({
        title: 'Error',
        description: 'Failed to confirm assignment',
        variant: 'destructive'
      })
    }
  }

  const handleDeclineAssignment = async (assignmentId: string, reason: string) => {
    try {
      const success = await matchOfficialAssignmentService.declineAssignment(assignmentId, 'current-user-id', reason)
      if (success) {
        toast({
          title: 'Success',
          description: 'Assignment declined'
        })
        await loadAssignments()
        onAssignmentsUpdate?.()
      }
    } catch (error) {
      console.error('Error declining assignment:', error)
      toast({
        title: 'Error',
        description: 'Failed to decline assignment',
        variant: 'destructive'
      })
    }
  }

  const getStatusIcon = (status: AssignmentStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'assigned':
        return <UserCheck className="h-4 w-4 text-blue-600" />
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'declined':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'replaced':
        return <RotateCcw className="h-4 w-4 text-orange-600" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: AssignmentStatus) => {
    switch (status) {
      case 'pending':
        return 'secondary'
      case 'assigned':
        return 'default'
      case 'confirmed':
        return 'default'
      case 'declined':
        return 'destructive'
      case 'replaced':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const getPriorityColor = (priority: AssignmentPriority) => {
    switch (priority) {
      case 'low':
        return 'secondary'
      case 'medium':
        return 'default'
      case 'high':
        return 'outline'
      case 'critical':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const getRoleDisplayName = (role: OfficialRole) => {
    switch (role) {
      case 'referee':
        return 'Referee'
      case 'assistant_referee_1':
        return 'Assistant Referee 1'
      case 'assistant_referee_2':
        return 'Assistant Referee 2'
      case 'fourth_official':
        return 'Fourth Official'
      case 'var_official':
        return 'VAR Official'
      default:
        return role
    }
  }

  const getRequiredRoles = (): OfficialRole[] => {
    return ['referee', 'assistant_referee_1', 'assistant_referee_2', 'fourth_official', 'var_official']
  }

  const isRoleAssigned = (role: OfficialRole) => {
    return assignments.some(a => a.official_role === role && a.status !== 'declined')
  }

  const getAssignmentForRole = (role: OfficialRole) => {
    return assignments.find(a => a.official_role === role)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Match Officials</CardTitle>
          <CardDescription>Loading official assignments...</CardDescription>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Match Officials</span>
          </CardTitle>
          <CardDescription>
            Assign and manage officials for {matchName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {assignments.filter(a => a.status === 'confirmed').length}
              </div>
              <div className="text-sm text-muted-foreground">Confirmed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {assignments.filter(a => a.status === 'pending' || a.status === 'assigned').length}
              </div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {assignments.filter(a => a.status === 'declined').length}
              </div>
              <div className="text-sm text-muted-foreground">Declined</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Official Roles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {getRequiredRoles().map((role) => {
          const assignment = getAssignmentForRole(role)
          const isAssigned = isRoleAssigned(role)

          return (
            <Card key={role}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    {getStatusIcon(assignment?.status || 'pending')}
                    <span>{getRoleDisplayName(role)}</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    {assignment?.priority && (
                      <Badge variant={getPriorityColor(assignment.priority)}>
                        {assignment.priority}
                      </Badge>
                    )}
                    <Badge variant={getStatusColor(assignment?.status || 'pending')}>
                      {assignment?.status || 'Not Assigned'}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {assignment ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{assignment.referee_id}</div>
                        <div className="text-sm text-muted-foreground">
                          Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {assignment.notes && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-muted-foreground mb-1">Notes</div>
                        <p className="text-sm">{assignment.notes}</p>
                      </div>
                    )}

                    {assignment.status === 'assigned' && (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleConfirmAssignment(assignment.id)}
                        >
                          Confirm
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              Decline
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Decline Assignment</DialogTitle>
                              <DialogDescription>
                                Please provide a reason for declining this assignment.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Textarea
                                placeholder="Reason for declining..."
                                id="decline-reason"
                              />
                              <Button
                                onClick={() => {
                                  const reason = (document.getElementById('decline-reason') as HTMLTextAreaElement)?.value
                                  if (reason) {
                                    handleDeclineAssignment(assignment.id, reason)
                                  }
                                }}
                              >
                                Submit Decline
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-4">No official assigned</p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedRole(role)
                            loadAvailableOfficials(role)
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Assign Official
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>Assign {getRoleDisplayName(role)}</DialogTitle>
                          <DialogDescription>
                            Select an available official for this role
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          {isLoadingOfficials ? (
                            <div className="text-center py-8">
                              <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
                              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4 mx-auto" />
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                              {availableOfficials.map((official) => (
                                <div
                                  key={official.referee_id}
                                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                                  onClick={() => handleAssignOfficial(official.referee_id, role)}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="font-medium">{official.referee_name}</div>
                                    <Badge variant={official.is_available ? 'default' : 'destructive'}>
                                      {official.is_available ? 'Available' : 'Unavailable'}
                                    </Badge>
                                  </div>
                                  
                                  <div className="space-y-1 text-sm text-muted-foreground">
                                    <div className="flex items-center space-x-1">
                                      <Star className="h-3 w-3" />
                                      <span>Specialization: {official.specialization_match ? 'Match' : 'No Match'}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <MapPin className="h-3 w-3" />
                                      <span>Distance: {official.distance_from_venue}km</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <Clock className="h-3 w-3" />
                                      <span>Travel: {official.travel_time_minutes}min</span>
                                    </div>
                                  </div>

                                  {official.workload_stats && (
                                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                                      <div>This Week: {official.workload_stats.matches_this_week}/{official.workload_stats.max_matches_per_week}</div>
                                      <div>This Month: {official.workload_stats.matches_this_month}/{official.workload_stats.max_matches_per_month}</div>
                                    </div>
                                  )}

                                  {!official.is_available && official.availability_reason && (
                                    <Alert className="mt-2">
                                      <AlertTriangle className="h-4 w-4" />
                                      <AlertDescription className="text-xs">
                                        {official.availability_reason}
                                      </AlertDescription>
                                    </Alert>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Assignment History */}
      {assignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Assignment History</CardTitle>
            <CardDescription>
              History of all official assignments for this match
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(assignment.status)}
                      <span className="font-medium">{getRoleDisplayName(assignment.official_role)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getPriorityColor(assignment.priority)}>
                        {assignment.priority}
                      </Badge>
                      <Badge variant={getStatusColor(assignment.status)}>
                        {assignment.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>Official: {assignment.referee_id}</div>
                    <div>Assigned: {new Date(assignment.assigned_at).toLocaleString()}</div>
                    {assignment.confirmed_at && (
                      <div>Confirmed: {new Date(assignment.confirmed_at).toLocaleString()}</div>
                    )}
                    {assignment.declined_at && (
                      <div>Declined: {new Date(assignment.declined_at).toLocaleString()}</div>
                    )}
                    {assignment.notes && (
                      <div>Notes: {assignment.notes}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
