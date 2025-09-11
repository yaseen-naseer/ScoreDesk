'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, Users, Calendar, AlertCircle, Trophy, UserCheck, UserX } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { tournamentRegistrationService, TournamentRegistration } from '@/lib/services/tournament-registration-service'
import { teamService } from '@/lib/services/team-service'
import { useOrganization } from '@/lib/contexts/organization-context'

interface TournamentRegistrationManagerProps {
  tournamentId: string
  tournamentName: string
  maxTeams?: number
}

export function TournamentRegistrationManager({ 
  tournamentId, 
  tournamentName, 
  maxTeams 
}: TournamentRegistrationManagerProps) {
  const { currentOrganization } = useOrganization()
  const { toast } = useToast()
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([])
  const [pendingRegistrations, setPendingRegistrations] = useState<TournamentRegistration[]>([])
  const [approvedRegistrations, setApprovedRegistrations] = useState<TournamentRegistration[]>([])
  const [rejectedRegistrations, setRejectedRegistrations] = useState<TournamentRegistration[]>([])
  const [stats, setStats] = useState({
    total_registrations: 0,
    pending_registrations: 0,
    approved_registrations: 0,
    rejected_registrations: 0,
    available_slots: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRegistration, setSelectedRegistration] = useState<TournamentRegistration | null>(null)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (currentOrganization) {
      loadRegistrations()
      loadStats()
    }
  }, [currentOrganization, tournamentId])

  const loadRegistrations = async () => {
    try {
      setIsLoading(true)
      const [allRegistrations, pending, approved, rejected] = await Promise.all([
        tournamentRegistrationService.getTournamentRegistrations({ tournament_id: tournamentId }),
        tournamentRegistrationService.getPendingRegistrations(tournamentId),
        tournamentRegistrationService.getApprovedRegistrations(tournamentId),
        tournamentRegistrationService.getTournamentRegistrations({ 
          tournament_id: tournamentId, 
          registration_status: 'rejected' 
        })
      ])

      setRegistrations(allRegistrations)
      setPendingRegistrations(pending)
      setApprovedRegistrations(approved)
      setRejectedRegistrations(rejected)
    } catch (error) {
      console.error('Error loading registrations:', error)
      toast({
        title: 'Error',
        description: 'Failed to load tournament registrations',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const registrationStats = await tournamentRegistrationService.getTournamentRegistrationStats(tournamentId)
      setStats(registrationStats)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleApproveRegistration = async (registration: TournamentRegistration) => {
    try {
      setIsProcessing(true)
      const result = await tournamentRegistrationService.approveRejectRegistration({
        registration_id: registration.id,
        status: 'approved',
        notes: approvalNotes
      })

      if (result.success) {
        toast({
          title: 'Success',
          description: `Team "${registration.team?.name}" has been approved for the tournament`
        })
        setSelectedRegistration(null)
        setApprovalNotes('')
        loadRegistrations()
        loadStats()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to approve registration',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error approving registration:', error)
      toast({
        title: 'Error',
        description: 'Failed to approve registration',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRejectRegistration = async (registration: TournamentRegistration) => {
    try {
      setIsProcessing(true)
      const result = await tournamentRegistrationService.approveRejectRegistration({
        registration_id: registration.id,
        status: 'rejected',
        rejected_reason: rejectionReason
      })

      if (result.success) {
        toast({
          title: 'Success',
          description: `Team "${registration.team?.name}" registration has been rejected`
        })
        setSelectedRegistration(null)
        setRejectionReason('')
        loadRegistrations()
        loadStats()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to reject registration',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error rejecting registration:', error)
      toast({
        title: 'Error',
        description: 'Failed to reject registration',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
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
        return <AlertCircle className="h-4 w-4 text-gray-500" />
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

  const RegistrationCard = ({ registration }: { registration: TournamentRegistration }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-blue-600" />
              <span>{registration.team?.name}</span>
            </CardTitle>
            <CardDescription className="flex items-center space-x-2">
              <span className="capitalize">{registration.team?.category}</span>
              <span>•</span>
              <span className="capitalize">{registration.team?.team_type}</span>
              {registration.group_name && (
                <>
                  <span>•</span>
                  <span>Group: {registration.group_name}</span>
                </>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={getStatusColor(registration.registration_status)}>
              {getStatusIcon(registration.registration_status)}
              <span className="ml-1 capitalize">{registration.registration_status}</span>
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Registered: {new Date(registration.registration_date).toLocaleDateString()}</span>
          </div>
          
          {registration.registration_notes && (
            <div className="bg-muted p-2 rounded text-sm">
              <strong>Notes:</strong> {registration.registration_notes}
            </div>
          )}

          {registration.rejected_reason && (
            <div className="bg-red-50 border border-red-200 p-2 rounded text-sm text-red-700">
              <strong>Rejection Reason:</strong> {registration.rejected_reason}
            </div>
          )}
        </div>

        {registration.registration_status === 'pending' && (
          <div className="flex space-x-2 pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedRegistration(registration)}
              className="flex-1"
            >
              <UserCheck className="h-4 w-4 mr-1" />
              Review
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading registrations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total_registrations}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending_registrations}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.approved_registrations}</div>
            <div className="text-sm text-muted-foreground">Approved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.rejected_registrations}</div>
            <div className="text-sm text-muted-foreground">Rejected</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.available_slots}</div>
            <div className="text-sm text-muted-foreground">Available</div>
          </CardContent>
        </Card>
      </div>

      {/* Capacity Warning */}
      {maxTeams && stats.approved_registrations >= maxTeams && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Tournament is at full capacity ({maxTeams} teams). No more registrations can be approved.
          </AlertDescription>
        </Alert>
      )}

      {/* Registration Management Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Pending ({pendingRegistrations.length})</span>
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>Approved ({approvedRegistrations.length})</span>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center space-x-2">
            <XCircle className="h-4 w-4" />
            <span>Rejected ({rejectedRegistrations.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingRegistrations.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No pending registrations</h3>
                <p className="text-muted-foreground">
                  All registrations have been processed
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingRegistrations.map((registration) => (
                <RegistrationCard key={registration.id} registration={registration} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {approvedRegistrations.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No approved registrations</h3>
                <p className="text-muted-foreground">
                  No teams have been approved yet
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {approvedRegistrations.map((registration) => (
                <RegistrationCard key={registration.id} registration={registration} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {rejectedRegistrations.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No rejected registrations</h3>
                <p className="text-muted-foreground">
                  No registrations have been rejected
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rejectedRegistrations.map((registration) => (
                <RegistrationCard key={registration.id} registration={registration} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Approval/Rejection Modal */}
      {selectedRegistration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Review Team Registration</CardTitle>
              <CardDescription>
                Review registration for {selectedRegistration.team?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="approval-notes">Approval Notes (Optional)</Label>
                <Textarea
                  id="approval-notes"
                  placeholder="Add any notes about the approval..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rejection-reason">Rejection Reason (Required for rejection)</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Explain why the registration is being rejected..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>

              <div className="flex space-x-2 pt-4">
                <Button
                  onClick={() => handleApproveRegistration(selectedRegistration)}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  <UserCheck className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleRejectRegistration(selectedRegistration)}
                  disabled={isProcessing || !rejectionReason.trim()}
                  className="flex-1"
                >
                  <UserX className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
              
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedRegistration(null)
                  setApprovalNotes('')
                  setRejectionReason('')
                }}
                className="w-full"
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
