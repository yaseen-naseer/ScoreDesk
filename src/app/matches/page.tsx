'use client'

import { useState } from 'react'
import { Plus, Calendar, MapPin, Trophy, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AppShell } from '@/components/layout/app-shell'
import { MatchCreationForm, MatchList, VenueManagement, RefereeManagement } from '@/components/match'
import { MatchWithDetails } from '@/lib/services/match-service'
import { useOrganization } from '@/lib/contexts/organization-context'

export default function MatchesPage() {
  const { currentOrganization } = useOrganization()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<MatchWithDetails | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const handleMatchCreated = (match: MatchWithDetails) => {
    setIsCreateDialogOpen(false)
    // Refresh the match list
    console.log('Match created:', match)
  }

  const handleMatchEdit = (match: MatchWithDetails) => {
    setSelectedMatch(match)
    setIsEditDialogOpen(true)
  }

  const handleMatchDelete = (matchId: string) => {
    console.log('Match deleted:', matchId)
    // Refresh the match list
  }

  const handleMatchSelect = (match: MatchWithDetails) => {
    setSelectedMatch(match)
    // Could navigate to match details page or show match details modal
    console.log('Match selected:', match)
  }

  if (!currentOrganization) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-6 text-center">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Organization Selected</h3>
              <p className="text-muted-foreground">
                Please select an organization to manage matches
              </p>
            </CardContent>
          </Card>
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
            <h1 className="text-3xl font-bold tracking-tight">Matches</h1>
            <p className="text-muted-foreground">
              Manage matches for {currentOrganization.name}
            </p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Match
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Match</DialogTitle>
                <DialogDescription>
                  Schedule a new match with teams, venue, and timing details
                </DialogDescription>
              </DialogHeader>
              <MatchCreationForm
                onMatchCreated={handleMatchCreated}
                onCancel={() => setIsCreateDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Match Management Tabs */}
        <Tabs defaultValue="matches" className="space-y-6">
          <TabsList>
            <TabsTrigger value="matches" className="flex items-center space-x-2">
              <Trophy className="h-4 w-4" />
              <span>Matches</span>
            </TabsTrigger>
            <TabsTrigger value="venues" className="flex items-center space-x-2">
              <MapPin className="h-4 w-4" />
              <span>Venues</span>
            </TabsTrigger>
            <TabsTrigger value="referees" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Referees</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="matches" className="space-y-6">
            {/* Match Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">0</div>
                  <div className="text-sm text-muted-foreground">Total Matches</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">0</div>
                  <div className="text-sm text-muted-foreground">Upcoming</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">0</div>
                  <div className="text-sm text-muted-foreground">Live</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-gray-600">0</div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </CardContent>
              </Card>
            </div>

            {/* Matches List */}
            <MatchList
              onMatchSelect={handleMatchSelect}
              onMatchEdit={handleMatchEdit}
              onMatchDelete={handleMatchDelete}
            />
          </TabsContent>

          <TabsContent value="venues" className="space-y-6">
            <VenueManagement />
          </TabsContent>

          <TabsContent value="referees" className="space-y-6">
            <RefereeManagement />
          </TabsContent>
        </Tabs>

        {/* Match Edit Dialog */}
        {selectedMatch && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Match</DialogTitle>
                <DialogDescription>
                  Update match details and settings
                </DialogDescription>
              </DialogHeader>
              <div className="p-4">
                <p className="text-muted-foreground">
                  Match editing functionality will be implemented in the next phase.
                  Selected match: {selectedMatch.home_team?.name} vs {selectedMatch.away_team?.name}
                </p>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppShell>
  )
}
