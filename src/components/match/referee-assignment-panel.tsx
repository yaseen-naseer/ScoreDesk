'use client'

import { useState, useEffect } from 'react'
import { UserCheck, Clock, MapPin, AlertCircle, CheckCircle, XCircle, Users, Award } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { refereeService, RefereeAvailability, RefereeAssignment } from '@/lib/services/referee-service'
import { matchService, MatchWithDetails } from '@/lib/services/match-service'

interface RefereeAssignmentPanelProps {
  match: MatchWithDetails
  onAssignmentComplete?: () => void
}

export function RefereeAssignmentPanel({ match, onAssignmentComplete }: RefereeAssignmentPanelProps) {
  const { toast } = useToast()
  const [availableReferees, setAvailableReferees] = useState<RefereeAvailability[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedReferees, setSelectedReferees] = useState<Record<string, string>>({})
  const [assignmentNotes, setAssignmentNotes] = useState<Record<string, string>>({})
  const [isAssigning, setIsAssigning] = useState(false)

  const officialTypes = [
    { key: 'referee', label: 'Referee', required: true },
    { key: 'assistant_referee_1', label: 'Assistant Referee 1', required: true },
    { key: 'assistant_referee_2', label: 'Assistant Referee 2', required: true },
    { key: 'fourth_official', label: 'Fourth Official', required: false },
    { key: 'var_official', label: 'VAR Official', required: false }
  ]

  useEffect(() => {
    loadAvailableReferees()
  }, [match.id])

  const loadAvailableReferees = async () => {
    try {
      setIsLoading(true)
      const referees = await refereeService.getAvailableRefereesForMatch(
        match.id,
        undefined,
        match.venue_id || undefined
      )
      setAvailableReferees(referees)
    } catch (error) {
      console.error('Error loading available referees:', error)
      toast({
        title: 'Error',
        description: 'Failed to load available referees',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefereeSelect = (officialType: string, refereeId: string) => {
    setSelectedReferees(prev => ({
      ...prev,
      [officialType]: refereeId
    }))
  }

  const handleAssignReferees = async () => {
    try {
      setIsAssigning(true)
      
      const assignments: RefereeAssignment[] = []
      
      // Create assignments for selected referees
      for (const [officialType, refereeId] of Object.entries(selectedReferees)) {
        if (refereeId) {
          assignments.push({
            referee_id: refereeId,
            official_type: officialType as any,
            notes: assignmentNotes[officialType] || undefined
          })
        }
      }

      // Assign each referee
      const results = await Promise.all(
        assignments.map(assignment => 
          refereeService.assignRefereeToMatch(match.id, assignment)
        )
      )

      const failedAssignments = results.filter(result => !result.success)
      
      if (failedAssignments.length === 0) {
        toast({
          title: 'Success',
          description: 'All referees assigned successfully'
        })
        onAssignmentComplete?.()
      } else {
        toast({
          title: 'Partial Success',
          description: `${assignments.length - failedAssignments.length} referees assigned successfully. ${failedAssignments.length} assignments failed.`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error assigning referees:', error)
      toast({
        title: 'Error',
        description: 'Failed to assign referees',
        variant: 'destructive'
      })
    } finally {
      setIsAssigning(false)
    }
  }

  const getRefereeAvailabilityStatus = (referee: RefereeAvailability) => {
    if (!referee.is_available) {
      return { status: 'unavailable', color: 'text-red-500', icon: XCircle }
    }
    if (referee.weekly_match_count >= referee.max_weekly_matches) {
      return { status: 'overloaded', color: 'text-orange-500', icon: AlertCircle }
    }
    return { status: 'available', color: 'text-green-500', icon: CheckCircle }
  }

  const getAvailableRefereesForType = (officialType: string) => {
    return availableReferees.filter(referee => {
      // Filter by specialization if needed
      if (officialType === 'referee') {
        return referee.is_available
      }
      return referee.is_available
    })
  }

  const isAssignmentComplete = () => {
    const requiredTypes = officialTypes.filter(type => type.required)
    return requiredTypes.every(type => selectedReferees[type.key])
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading available referees...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <UserCheck className="h-6 w-6 text-blue-600" />
          <span>Referee Assignment</span>
        </CardTitle>
        <CardDescription>
          Assign referees and officials for {match.home_team?.name} vs {match.away_team?.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Match Information */}
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{new Date(match.scheduled_date).toLocaleDateString()} at {new Date(match.scheduled_date).toLocaleTimeString()}</span>
            </div>
            {match.venue_details?.name && (
              <div className="flex items-center space-x-1">
                <MapPin className="h-4 w-4" />
                <span>{match.venue_details.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Referee Assignment */}
        <div className="space-y-4">
          {officialTypes.map((officialType) => {
            const availableForType = getAvailableRefereesForType(officialType.key)
            const selectedRefereeId = selectedReferees[officialType.key]
            
            return (
              <div key={officialType.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    {officialType.label}
                    {officialType.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  <Badge variant="outline" className="text-xs">
                    {availableForType.length} available
                  </Badge>
                </div>

                <Select
                  value={selectedRefereeId || ''}
                  onValueChange={(value) => handleRefereeSelect(officialType.key, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${officialType.label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No assignment</SelectItem>
                    {availableForType.map((referee) => {
                      const { status, color, icon: StatusIcon } = getRefereeAvailabilityStatus(referee)
                      
                      return (
                        <SelectItem key={referee.referee_id} value={referee.referee_id}>
                          <div className="flex items-center space-x-2">
                            <StatusIcon className={`h-4 w-4 ${color}`} />
                            <span>{referee.referee_name}</span>
                            <Badge variant="outline" className="text-xs">
                              {referee.weekly_match_count}/{referee.max_weekly_matches} this week
                            </Badge>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>

                {/* Assignment Notes */}
                {selectedRefereeId && (
                  <Textarea
                    placeholder={`Notes for ${officialType.label}...`}
                    value={assignmentNotes[officialType.key] || ''}
                    onChange={(e) => setAssignmentNotes(prev => ({
                      ...prev,
                      [officialType.key]: e.target.value
                    }))}
                    rows={2}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Availability Summary */}
        {availableReferees.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Referee Availability Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {availableReferees.slice(0, 6).map((referee) => {
                const { status, color, icon: StatusIcon } = getRefereeAvailabilityStatus(referee)
                
                return (
                  <div key={referee.referee_id} className="flex items-center space-x-2 text-sm p-2 bg-muted rounded">
                    <StatusIcon className={`h-4 w-4 ${color}`} />
                    <span className="flex-1">{referee.referee_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {referee.weekly_match_count}/{referee.max_weekly_matches}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Assignment Actions */}
        <div className="flex space-x-4 pt-4 border-t">
          <Button
            onClick={handleAssignReferees}
            disabled={!isAssignmentComplete() || isAssigning}
            className="flex-1"
          >
            {isAssigning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Assigning...
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4 mr-2" />
                Assign Referees
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={loadAvailableReferees}
            disabled={isAssigning}
          >
            Refresh Availability
          </Button>
        </div>

        {/* Assignment Status */}
        {!isAssignmentComplete() && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please assign all required officials (Referee, Assistant Referee 1, Assistant Referee 2) before proceeding.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
