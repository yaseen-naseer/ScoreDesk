/**
 * Teams Management Page
 * Main page for viewing and managing teams
 */

'use client'

import React, { useState } from 'react'
import { Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AppShell } from '@/components/layout/app-shell'
import { TeamRegistrationForm } from '@/components/forms/team-registration-form'
import { TeamList } from '@/components/teams/team-list'
import { useOrganization } from '@/lib/contexts/organization-context'
import { useAuth } from '@/lib/auth/auth-context'
import { hasPermission } from '@/lib/auth/permissions'

export default function TeamsPage() {
  const { currentOrganization, userRole } = useOrganization()
  const { user } = useAuth()
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false)

  const canManageTeams = userRole && hasPermission(userRole, 'teams:write')
  const canCreateTeams = userRole && hasPermission(userRole, 'teams:write')

  const handleTeamRegistrationSuccess = (team: any) => {
    setRegisterDialogOpen(false)
    // TODO: Refresh teams list or navigate to team detail
    console.log('Team registered:', team)
  }

  if (!currentOrganization) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              Please select an organization to manage teams.
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
            <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
            <p className="text-muted-foreground">
              Manage teams for {currentOrganization.name}
            </p>
          </div>
          {canCreateTeams && (
            <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Register Team
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Register New Team</DialogTitle>
                  <DialogDescription>
                    Create a new team profile with complete information
                  </DialogDescription>
                </DialogHeader>
                <TeamRegistrationForm 
                  onSuccess={handleTeamRegistrationSuccess}
                  onCancel={() => setRegisterDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Teams List */}
        <TeamList />
      </div>
    </AppShell>
  )
}
