'use client'

import { useState, useEffect } from 'react'
import { Trophy, Users, Calendar, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { tournamentRegistrationService } from '@/lib/services/tournament-registration-service'
import { teamService, TeamProfile } from '@/lib/services/team-service'
import { useOrganization } from '@/lib/contexts/organization-context'

interface TournamentTeamRegistrationProps {
  tournamentId: string
  tournamentName: string
  maxTeams?: number
  registrationDeadline?: string
  onRegistrationComplete?: () => void
}

export function TournamentTeamRegistration({ 
  tournamentId, 
  tournamentName, 
  maxTeams,
  registrationDeadline,
  onRegistrationComplete 
}: TournamentTeamRegistrationProps) {
  const { currentOrganization } = useOrganization()
  const { toast } = useToast()
  const [teams, setTeams] = useState<TeamProfile[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [groupName, setGroupName] = useState('')
  const [registrationNotes, setRegistrationNotes] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isRegistering, setIsRegistering] = useState(false)
  const [canRegister, setCanRegister] = useState(false)
  const [registrationStatus, setRegistrationStatus] = useState<'not_registered' | 'pending' | 'approved' | 'rejected'>('not_registered')
  const [existingRegistration, setExistingRegistration] = useState<any>(null)

  useEffect(() => {
    if (currentOrganization) {
      loadTeams()
      checkRegistrationStatus()
    }
  }, [currentOrganization, tournamentId])

  useEffect(() => {
    if (selectedTeamId) {
      checkTeamRegistrationEligibility(selectedTeamId)
    }
  }, [selectedTeamId, tournamentId])

  const loadTeams = async () => {
    try {
      setIsLoading(true)
      if (currentOrganization) {
        const { teams: organizationTeams } = await teamService.getOrganizationTeams(
          currentOrganization.id,
          { status: 'active' }
        )
        setTeams(organizationTeams)
      }
    } catch (error) {
      console.error('Error loading teams:', error)
      toast({
        title: 'Error',
        description: 'Failed to load teams',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const checkRegistrationStatus = async () => {
    try {
      if (currentOrganization) {
        const registrations = await tournamentRegistrationService.getTournamentRegistrations({
          tournament_id: tournamentId,
          team_id: teams.find(t => t.id === selectedTeamId)?.id || ''
        })
        
        if (registrations.length > 0) {
          const registration = registrations[0]
          setExistingRegistration(registration)
          setRegistrationStatus(registration.registration_status as any)
          setGroupName(registration.group_name || '')
          setRegistrationNotes(registration.registration_notes || '')
        } else {
          setRegistrationStatus('not_registered')
          setExistingRegistration(null)
        }
      }
    } catch (error) {
      console.error('Error checking registration status:', error)
    }
  }

  const checkTeamRegistrationEligibility = async (teamId: string) => {
    try {
      const eligibility = await tournamentRegistrationService.canTeamRegister(tournamentId, teamId)
      setCanRegister(eligibility.canRegister)
      
      if (!eligibility.canRegister && eligibility.reason) {
        toast({
          title: 'Registration Not Available',
          description: eligibility.reason,
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error checking eligibility:', error)
      setCanRegister(false)
    }
  }

  const handleRegisterTeam = async () => {
    if (!selectedTeamId) {
      toast({
        title: 'Error',
        description: 'Please select a team to register',
        variant: 'destructive'
      })
      return
    }

    try {
      setIsRegistering(true)
      const result = await tournamentRegistrationService.registerTeamForTournament({
        tournament_id: tournamentId,
        team_id: selectedTeamId,
        group_name: groupName || undefined,
        registration_notes: registrationNotes || undefined
      })

      if (result.success) {
        toast({
          title: 'Success',
          description: `Team "${teams.find(t => t.id === selectedTeamId)?.name}" has been registered for the tournament`
        })
        setRegistrationStatus('pending')
        setExistingRegistration(result.registration)
        onRegistrationComplete?.()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to register team',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error registering team:', error)
      toast({
        title: 'Error',
        description: 'Failed to register team',
        variant: 'destructive'
      })
    } finally {
      setIsRegistering(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'default'
      case 'approved':
        return 'secondary'
      case 'rejected':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const isRegistrationDeadlinePassed = registrationDeadline && new Date(registrationDeadline) < new Date()

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading teams...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Trophy className="h-6 w-6 text-blue-600" />
          <span>Register Team for Tournament</span>
        </CardTitle>
        <CardDescription>
          Register one of your teams for "{tournamentName}"
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Registration Status */}
        {registrationStatus !== 'not_registered' && (
          <Alert>
            {getStatusIcon(registrationStatus)}
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>
                  Team registration status: <strong className="capitalize">{registrationStatus}</strong>
                </span>
                <Badge variant={getStatusColor(registrationStatus)}>
                  {getStatusIcon(registrationStatus)}
                  <span className="ml-1 capitalize">{registrationStatus}</span>
                </Badge>
              </div>
              {existingRegistration?.rejected_reason && (
                <div className="mt-2 text-sm text-red-600">
                  <strong>Rejection Reason:</strong> {existingRegistration.rejected_reason}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Registration Deadline Warning */}
        {isRegistrationDeadlinePassed && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Registration deadline has passed ({new Date(registrationDeadline!).toLocaleDateString()}). 
              Registration is no longer available.
            </AlertDescription>
          </Alert>
        )}

        {/* Tournament Capacity Info */}
        {maxTeams && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Maximum teams: {maxTeams}</span>
          </div>
        )}

        {/* Team Selection */}
        <div className="space-y-2">
          <Label htmlFor="team-select">Select Team</Label>
          <Select 
            value={selectedTeamId} 
            onValueChange={setSelectedTeamId}
            disabled={registrationStatus === 'approved' || isRegistrationDeadlinePassed}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a team to register" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  <div className="flex items-center space-x-2">
                    <span>{team.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {team.category}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Group Selection (if applicable) */}
        {selectedTeamId && (
          <div className="space-y-2">
            <Label htmlFor="group-select">Group (Optional)</Label>
            <Select 
              value={groupName} 
              onValueChange={setGroupName}
              disabled={registrationStatus === 'approved' || isRegistrationDeadlinePassed}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select group (if applicable)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No specific group</SelectItem>
                <SelectItem value="Group A">Group A</SelectItem>
                <SelectItem value="Group B">Group B</SelectItem>
                <SelectItem value="Group C">Group C</SelectItem>
                <SelectItem value="Group D">Group D</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Registration Notes */}
        <div className="space-y-2">
          <Label htmlFor="registration-notes">Registration Notes (Optional)</Label>
          <Textarea
            id="registration-notes"
            placeholder="Add any additional information about your team..."
            value={registrationNotes}
            onChange={(e) => setRegistrationNotes(e.target.value)}
            disabled={registrationStatus === 'approved' || isRegistrationDeadlinePassed}
          />
        </div>

        {/* Registration Button */}
        {registrationStatus === 'not_registered' && !isRegistrationDeadlinePassed && (
          <Button
            onClick={handleRegisterTeam}
            disabled={!selectedTeamId || !canRegister || isRegistering}
            className="w-full"
          >
            {isRegistering ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Registering...
              </>
            ) : (
              <>
                <Trophy className="h-4 w-4 mr-2" />
                Register Team
              </>
            )}
          </Button>
        )}

        {/* Re-registration Button for Rejected Teams */}
        {registrationStatus === 'rejected' && !isRegistrationDeadlinePassed && (
          <Button
            onClick={handleRegisterTeam}
            disabled={!selectedTeamId || !canRegister || isRegistering}
            className="w-full"
          >
            {isRegistering ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Re-registering...
              </>
            ) : (
              <>
                <Trophy className="h-4 w-4 mr-2" />
                Re-register Team
              </>
            )}
          </Button>
        )}

        {/* Success Message */}
        {registrationStatus === 'approved' && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Your team has been approved for this tournament! You can now participate in matches.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
