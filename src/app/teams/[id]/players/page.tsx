/**
 * Players Management Page
 * Main page for viewing and managing team players
 */

'use client'

import React, { useState } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Users, Search, Filter, Grid, List, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AppShell } from '@/components/layout/app-shell'
import { PlayerRegistrationForm } from '@/components/forms/player-registration-form'
import { RosterManagement } from '@/components/teams/roster-management'
import { JerseyNumberManagement } from '@/components/teams/jersey-number-management'
import { PlayerEligibilityManagement } from '@/components/teams/player-eligibility-management'
import { useOrganization } from '@/lib/contexts/organization-context'
import { useAuth } from '@/lib/auth/auth-context'
import { hasPermission } from '@/lib/auth/permissions'
import { teamService } from '@/lib/services/team-service'

export default function PlayersPage() {
  const params = useParams()
  const { currentOrganization, userRole } = useOrganization()
  const { user } = useAuth()
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false)

  const teamId = params.id as string
  const canManagePlayers = userRole && hasPermission(userRole, 'players:write')

  const handlePlayerRegistrationSuccess = (player: any) => {
    setRegisterDialogOpen(false)
    // TODO: Refresh players list or navigate to player detail
    console.log('Player registered:', player)
  }

  if (!currentOrganization) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              Please select an organization to manage players.
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
            <h1 className="text-3xl font-bold tracking-tight">Players</h1>
            <p className="text-muted-foreground">
              Manage players for this team
            </p>
          </div>
          {canManagePlayers && (
            <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Register Player
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Register New Player</DialogTitle>
                  <DialogDescription>
                    Add a new player to the team with comprehensive profile information
                  </DialogDescription>
                </DialogHeader>
                <PlayerRegistrationForm 
                  teamId={teamId}
                  onSuccess={handlePlayerRegistrationSuccess}
                  onCancel={() => setRegisterDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="roster" className="w-full">
          <TabsList>
            <TabsTrigger value="roster">Roster Management</TabsTrigger>
            <TabsTrigger value="jersey">Jersey Numbers</TabsTrigger>
            <TabsTrigger value="eligibility">Eligibility & Medical</TabsTrigger>
          </TabsList>
          
          <TabsContent value="roster">
            <RosterManagement teamId={teamId} />
          </TabsContent>
          
          <TabsContent value="jersey">
            <JerseyNumberManagement 
              teamId={teamId} 
              players={[]} // TODO: Load players from team service
              onPlayerUpdate={(player) => console.log('Player updated:', player)}
            />
          </TabsContent>
          
          <TabsContent value="eligibility">
            <PlayerEligibilityManagement 
              teamId={teamId} 
              players={[]} // TODO: Load players from team service
              onPlayerUpdate={(player) => console.log('Player updated:', player)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
