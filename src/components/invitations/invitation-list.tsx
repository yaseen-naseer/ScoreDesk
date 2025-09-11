'use client'

/**
 * Invitation List Component
 * Displays and manages organization invitations
 */

import React, { useState, useEffect } from 'react'
import { format, isAfter } from 'date-fns'
import { 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  MoreHorizontal,
  RefreshCw,
  Trash2,
  Send
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { invitationService, type InvitationDetails, type InvitationStats } from '@/lib/services/invitation-service'
import { useOrganization } from '@/lib/contexts/organization-context'
import { useToast } from '@/hooks/use-toast'

interface InvitationListProps {
  onInvitationUpdate?: () => void
  className?: string
}

const statusConfig = {
  pending: {
    label: 'Pending',
    icon: Clock,
    variant: 'secondary' as const,
    color: 'text-yellow-600'
  },
  accepted: {
    label: 'Accepted',
    icon: CheckCircle,
    variant: 'default' as const,
    color: 'text-green-600'
  },
  expired: {
    label: 'Expired',
    icon: AlertCircle,
    variant: 'destructive' as const,
    color: 'text-red-600'
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    variant: 'outline' as const,
    color: 'text-gray-600'
  }
}

const roleLabels: Record<string, string> = {
  owner: 'Owner',
  admin: 'Administrator',
  manager: 'Manager',
  referee: 'Referee',
  stats_operator: 'Stats Operator',
  viewer: 'Viewer'
}

export function InvitationList({ onInvitationUpdate, className }: InvitationListProps) {
  const { currentOrganization } = useOrganization()
  const { toast } = useToast()
  const [invitations, setInvitations] = useState<InvitationDetails[]>([])
  const [stats, setStats] = useState<InvitationStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadInvitations = async () => {
    if (!currentOrganization) return

    setIsLoading(true)
    setError(null)

    try {
      const [invitationsData, statsData] = await Promise.all([
        invitationService.getOrganizationInvitations(currentOrganization.id),
        invitationService.getInvitationStats(currentOrganization.id)
      ])

      setInvitations(invitationsData)
      setStats(statsData)
    } catch (err) {
      console.error('Error loading invitations:', err)
      setError('Failed to load invitations')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadInvitations()
  }, [currentOrganization])

  const handleResendInvitation = async (invitation: InvitationDetails) => {
    setActionLoading(invitation.id)
    try {
      const result = await invitationService.resendInvitation(invitation.id)
      
      if (result.success) {
        toast({
          title: 'Invitation Resent',
          description: `Invitation has been resent to ${invitation.email}`,
        })
        loadInvitations()
        onInvitationUpdate?.()
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to resend invitation',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancelInvitation = async (invitation: InvitationDetails) => {
    setActionLoading(invitation.id)
    try {
      const result = await invitationService.cancelInvitation(invitation.id)
      
      if (result.success) {
        toast({
          title: 'Invitation Cancelled',
          description: `Invitation to ${invitation.email} has been cancelled`,
        })
        loadInvitations()
        onInvitationUpdate?.()
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to cancel invitation',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const isExpired = (expiresAt: string) => {
    return isAfter(new Date(), new Date(expiresAt))
  }

  if (!currentOrganization) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please select an organization to view invitations.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={className}>
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
                  <p className="text-xs text-muted-foreground">Accepted</p>
                </div>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
                  <p className="text-xs text-muted-foreground">Expired</p>
                </div>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-600">{stats.cancelled}</p>
                  <p className="text-xs text-muted-foreground">Cancelled</p>
                </div>
                <XCircle className="h-4 w-4 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invitations Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Invitations</CardTitle>
              <CardDescription>
                Manage pending and completed invitations for {currentOrganization.name}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadInvitations}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No invitations found</h3>
              <p className="text-sm text-muted-foreground">
                Send your first invitation to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited By</TableHead>
                  <TableHead>Invited On</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => {
                  const statusInfo = statusConfig[invitation.status]
                  const StatusIcon = statusInfo.icon
                  const expired = invitation.status === 'pending' && isExpired(invitation.expiresAt)

                  return (
                    <TableRow key={invitation.id}>
                      <TableCell>
                        <div className="font-medium">{invitation.email}</div>
                        {invitation.message && (
                          <div className="text-sm text-muted-foreground mt-1">
                            "{invitation.message}"
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {roleLabels[invitation.role] || invitation.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`h-4 w-4 ${expired ? 'text-red-600' : statusInfo.color}`} />
                          <Badge variant={expired ? 'destructive' : statusInfo.variant}>
                            {expired ? 'Expired' : statusInfo.label}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{invitation.invitedByName}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(invitation.createdAt), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`text-sm ${expired ? 'text-red-600 font-medium' : ''}`}>
                          {format(new Date(invitation.expiresAt), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(invitation.status === 'pending' || expired) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={actionLoading === invitation.id}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {invitation.status === 'pending' && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleResendInvitation(invitation)}
                                    disabled={actionLoading === invitation.id}
                                  >
                                    <Send className="h-4 w-4 mr-2" />
                                    Resend
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleCancelInvitation(invitation)}
                                    disabled={actionLoading === invitation.id}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Cancel
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default InvitationList
