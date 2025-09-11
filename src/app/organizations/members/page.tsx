/**
 * Organization Members Management Page
 * Displays organization members and handles invitations
 */

'use client'

import React, { useState } from 'react'
import { Users, UserPlus, Settings, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AppShell } from '@/components/layout/app-shell'
import { InvitationForm } from '@/components/forms/invitation-form'
import { InvitationList } from '@/components/invitations/invitation-list'
import { OrganizationMembersList } from '@/components/organization/organization-members-list'
import { RoleManagementDashboard } from '@/components/organization/role-management-dashboard'
import { PermissionManagementDashboard } from '@/components/organization/permission-management-dashboard'
import { useOrganization } from '@/lib/contexts/organization-context'
import { useAuth } from '@/lib/auth/auth-context'
import { hasPermission } from '@/lib/auth/permissions'

export default function MembersPage() {
  const { currentOrganization, userRole } = useOrganization()
  const { user } = useAuth()
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const canInviteUsers = userRole && hasPermission(userRole, 'invite_users')
  const canManageMembers = userRole && hasPermission(userRole, 'manage_members')

  const handleInvitationSuccess = () => {
    setInviteDialogOpen(false)
    setRefreshTrigger(prev => prev + 1)
  }

  const handleInvitationUpdate = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  if (!currentOrganization) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Please select an organization to manage members.
            </AlertDescription>
          </Alert>
        </div>
      </AppShell>
    )
  }

  if (!canManageMembers) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to view organization members.
            </AlertDescription>
          </Alert>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Members</h1>
            <p className="text-muted-foreground">
              Manage team members and invitations for {currentOrganization.name}
            </p>
          </div>
          {canInviteUsers && (
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Invite New Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join {currentOrganization.name}
                  </DialogDescription>
                </DialogHeader>
                <InvitationForm 
                  onSuccess={handleInvitationSuccess}
                  onCancel={() => setInviteDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Members Tabs */}
        <Tabs defaultValue="members" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Members
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Role Management
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Permissions
            </TabsTrigger>
            <TabsTrigger value="invitations" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Invitations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Organization Members
                </CardTitle>
                <CardDescription>
                  View and manage all active members of {currentOrganization.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <OrganizationMembersList 
                  key={refreshTrigger}
                  organizationId={currentOrganization.id}
                  onMemberUpdate={handleInvitationUpdate}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="space-y-6">
            <RoleManagementDashboard 
              onInviteUser={() => setInviteDialogOpen(true)}
            />
          </TabsContent>

          <TabsContent value="permissions" className="space-y-6">
            {canManageMembers ? (
              <PermissionManagementDashboard />
            ) : (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  You don't have permission to view permission management.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="invitations" className="space-y-6">
            {canInviteUsers ? (
              <InvitationList 
                key={refreshTrigger}
                onInvitationUpdate={handleInvitationUpdate}
              />
            ) : (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  You don't have permission to view invitations.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
