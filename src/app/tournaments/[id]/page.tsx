'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trophy, Calendar, Users, Settings, Play, Edit, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { tournamentService, TournamentWithDetails } from '@/lib/services/tournament-service'
import { TournamentScheduleGenerator, TournamentRegistrationManager, TournamentTeamRegistration, TournamentRulesSettings, TournamentBracket, ScheduleOptimizationPanel, TournamentWorkflowManager, RegistrationDeadlineManager, TournamentBracketVisualizer, StandingsTable, EntryRequirementsManager, PrizeConfigurationManager, TournamentSeedingManager, TournamentGroupManager, GroupAdvancementRulesManager, TournamentRulesEnforcement } from '@/components/tournament'

interface TournamentDetailsPageProps {
  params: {
    id: string
  }
}

export default function TournamentDetailsPage({ params }: TournamentDetailsPageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [tournament, setTournament] = useState<TournamentWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadTournament()
  }, [params.id])

  const loadTournament = async () => {
    try {
      setIsLoading(true)
      const data = await tournamentService.getTournamentWithDetails(params.id)
      setTournament(data)
    } catch (error) {
      console.error('Error loading tournament:', error)
      toast({
        title: 'Error',
        description: 'Failed to load tournament details',
        variant: 'destructive'
      })
      router.push('/tournaments')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteTournament = async () => {
    if (!tournament) return

    try {
      await tournamentService.deleteTournament(tournament.id)
      toast({
        title: 'Success',
        description: 'Tournament deleted successfully'
      })
      router.push('/tournaments')
    } catch (error) {
      console.error('Error deleting tournament:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete tournament',
        variant: 'destructive'
      })
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

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'league':
        return '🏆'
      case 'knockout':
        return '🎯'
      case 'group':
        return '👥'
      default:
        return '🏆'
    }
  }

  const getSportIcon = (sport: string) => {
    switch (sport) {
      case 'football':
        return '⚽'
      case 'futsal':
        return '🥅'
      default:
        return '⚽'
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="container mx-auto py-6">
        <Card className="text-center py-12">
          <CardContent>
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Tournament not found</h3>
            <p className="text-muted-foreground mb-4">
              The tournament you're looking for doesn't exist or has been deleted
            </p>
            <Button onClick={() => router.push('/tournaments')}>
              Back to Tournaments
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/tournaments')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-2">
              <span>{getFormatIcon(tournament.format)}</span>
              <span>{tournament.name}</span>
            </h1>
            <div className="flex items-center space-x-4 mt-2">
              <Badge variant={getStatusColor(tournament.status || 'draft')}>
                {tournament.status || 'draft'}
              </Badge>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <span>{getSportIcon(tournament.sport)}</span>
                <span className="capitalize">{tournament.sport}</span>
                <span>•</span>
                <span className="capitalize">{tournament.format}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={handleDeleteTournament}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tournament Description */}
          {tournament.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{tournament.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Tabs */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="workflow">Workflow</TabsTrigger>
              <TabsTrigger value="registration">Registration</TabsTrigger>
              <TabsTrigger value="teams">Teams</TabsTrigger>
              <TabsTrigger value="groups">Groups</TabsTrigger>
              <TabsTrigger value="seeding">Seeding</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="bracket">Bracket</TabsTrigger>
              <TabsTrigger value="standings">Standings</TabsTrigger>
              <TabsTrigger value="settings">Rules & Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Tournament Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">Start Date</div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(tournament.start_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">End Date</div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(tournament.end_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {tournament.max_teams && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-muted-foreground">Maximum Teams</div>
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4" />
                          <span>{tournament.max_teams}</span>
                        </div>
                      </div>
                    )}
                    {tournament.registration_deadline && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-muted-foreground">Registration Deadline</div>
                        <div className="flex items-center space-x-2">
                          <Settings className="h-4 w-4" />
                          <span>{new Date(tournament.registration_deadline).toLocaleDateString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="workflow" className="space-y-4">
              <TournamentWorkflowManager 
                tournamentId={params.id}
                tournamentName={tournament?.name || 'Tournament'}
                onStatusChange={loadTournament}
              />
            </TabsContent>

            <TabsContent value="registration" className="space-y-4">
              <RegistrationDeadlineManager 
                tournamentId={params.id}
                tournamentName={tournament?.name || 'Tournament'}
                onDeadlineChange={loadTournament}
              />
            </TabsContent>

            <TabsContent value="teams" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Team Registration */}
                <TournamentTeamRegistration
                  tournamentId={tournament.id}
                  tournamentName={tournament.name}
                  maxTeams={tournament.max_teams || undefined}
                  registrationDeadline={tournament.registration_deadline || undefined}
                  onRegistrationComplete={loadTournament}
                />
                
                {/* Registration Management (for managers) */}
                <TournamentRegistrationManager
                  tournamentId={tournament.id}
                  tournamentName={tournament.name}
                  maxTeams={tournament.max_teams || undefined}
                />
              </div>
            </TabsContent>

            <TabsContent value="groups" className="space-y-4">
              <div className="space-y-6">
                {/* Group Management */}
                <TournamentGroupManager
                  tournamentId={tournament.id}
                  tournamentName={tournament.name}
                  tournamentFormat={tournament.format}
                  onGroupsUpdated={loadTournament}
                />
                
                {/* Advancement Rules for each group */}
                {tournament.groups && tournament.groups.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Group Advancement Rules</h3>
                    {tournament.groups.map((group) => (
                      <GroupAdvancementRulesManager
                        key={group.id}
                        tournamentId={tournament.id}
                        groupId={group.id}
                        groupName={group.name}
                        onRulesUpdated={loadTournament}
                      />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="seeding" className="space-y-4">
              <TournamentSeedingManager
                tournamentId={tournament.id}
                tournamentName={tournament.name}
                registeredTeams={(tournament.teams as any)?.map((tt: any) => ({
                  id: tt.team_id,
                  name: tt.team?.name || 'Unknown Team',
                  logo_url: tt.team?.logo_url
                })) || []}
                onSeedingComplete={loadTournament}
              />
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4">
              <div className="space-y-6">
                {/* Schedule Generation */}
                <Card>
                  <CardHeader>
                    <CardTitle>Match Schedule</CardTitle>
                    <CardDescription>
                      Tournament match schedule and fixtures
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Schedule not generated</h3>
                      <p className="text-muted-foreground mb-4">
                        Generate the tournament schedule to see match fixtures
                      </p>
                      <Button>
                        <Play className="h-4 w-4 mr-2" />
                        Generate Schedule
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Schedule Optimization */}
                <ScheduleOptimizationPanel 
                  tournamentId={params.id}
                  tournamentName={tournament?.name || 'Tournament'}
                  onOptimizationComplete={(result: any) => {
                    toast({
                      title: 'Optimization Complete',
                      description: `Schedule optimized with ${result.total_improvement_score}% improvement`,
                      variant: 'default'
                    })
                  }}
                />
              </div>
            </TabsContent>

            <TabsContent value="bracket" className="space-y-4">
              <TournamentBracketVisualizer 
                tournamentId={params.id}
                tournamentName={tournament?.name || 'Tournament'}
                onMatchClick={(matchId: string) => {
                  // Navigate to match details
                  router.push(`/matches/${matchId}` as any)
                }}
                onBracketUpdate={loadTournament}
              />
            </TabsContent>

            <TabsContent value="standings" className="space-y-4">
              <StandingsTable 
                tournamentId={params.id}
                tournamentName={tournament?.name || 'Tournament'}
              />
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <TournamentRulesEnforcement 
                tournamentId={params.id}
                onComplianceChange={(isCompliant: boolean) => {
                  // Handle compliance change if needed
                  console.log('Tournament compliance:', isCompliant)
                }}
              />
              <TournamentRulesSettings 
                tournamentId={params.id} 
                tournament={tournament}
                onUpdate={loadTournament}
              />
              <EntryRequirementsManager 
                tournamentId={params.id}
                tournamentName={tournament?.name || 'Tournament'}
                onUpdate={loadTournament}
              />
              <PrizeConfigurationManager 
                tournamentId={params.id}
                tournamentName={tournament?.name || 'Tournament'}
                onUpdate={loadTournament}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Manage Teams
              </Button>
              <Button className="w-full" variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Generate Schedule
              </Button>
              <Button className="w-full" variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Tournament Settings
              </Button>
            </CardContent>
          </Card>

          {/* Tournament Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Tournament Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Teams Registered</span>
                <span className="font-medium">{tournament.teams?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Groups</span>
                <span className="font-medium">{tournament.groups?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Matches Played</span>
                <span className="font-medium">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Matches</span>
                <span className="font-medium">0</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
