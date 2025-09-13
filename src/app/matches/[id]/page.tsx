'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Calendar, Clock, Users, MapPin, Trophy, ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { matchService, MatchWithDetails } from '@/lib/services/match-service'
import { MatchWorkflowManager, TeamSheetForm, MatchOfficialAssignmentManager, MatchResultApprovalPanel, EventRecordingInterface, EventTimelineInterface, MatchPostponementManager } from '@/components/match'
import MatchStatisticsDashboard from '@/components/match/match-statistics-dashboard'
import Link from 'next/link'

export default function MatchDetailsPage() {
  const params = useParams()
  const { toast } = useToast()
  const [match, setMatch] = useState<MatchWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      loadMatch()
    }
  }, [params.id])

  const loadMatch = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const matchData = await matchService.getMatch(params.id as string)
      setMatch(matchData)
    } catch (err) {
      console.error('Error loading match:', err)
      setError('Failed to load match details')
      toast({
        title: 'Error',
        description: 'Failed to load match details',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-64" />
          </div>
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !match) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Match Not Found</CardTitle>
            <CardDescription>Unable to load match details</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {error || 'The requested match could not be found.'}
            </p>
            <Link href="/matches">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Matches
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'secondary'
      case 'live':
        return 'default'
      case 'paused':
        return 'secondary'
      case 'half_time':
        return 'outline'
      case 'completed':
        return 'default'
      case 'cancelled':
        return 'destructive'
      case 'postponed':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/matches">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">
                {match.home_team?.name || 'Home Team'} vs {match.away_team?.name || 'Away Team'}
              </h1>
              <p className="text-muted-foreground">
                {match.tournament?.name || 'Tournament'}
              </p>
            </div>
          </div>
          <Badge variant={getStatusColor(match.status)}>
            {match.status.replace('_', ' ')}
          </Badge>
        </div>

        {/* Match Information */}
        <Card>
          <CardHeader>
            <CardTitle>Match Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Date & Time</div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(match.scheduled_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>{new Date(match.scheduled_date).toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Venue</div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span>{match.venue_details?.name || match.venue || 'TBD'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Score</div>
                <div className="text-2xl font-bold">
                  {match.home_score || 0} - {match.away_score || 0}
                </div>
              </div>

              {match.round_name && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Round</div>
                  <div className="flex items-center space-x-2">
                    <Trophy className="h-4 w-4" />
                    <span>{match.round_name}</span>
                  </div>
                </div>
              )}
            </div>

            {match.notes && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-muted-foreground mb-1">Notes</div>
                <p className="text-sm">{match.notes}</p>
              </div>
            )}

            <div className="mt-4 flex items-center justify-end">
              <a
                href={`/matches/${params.id as string}/scoreboard`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center bg-primary text-primary-foreground hover:opacity-90 rounded-md px-3 py-2 text-sm"
              >
                Open Fullscreen Scoreboard
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="workflow" className="space-y-4">
          <TabsList>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="officials">Officials</TabsTrigger>
            <TabsTrigger value="team-sheets">Team Sheets</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="postponement">Postponement</TabsTrigger>
            <TabsTrigger value="share">Share</TabsTrigger>
          </TabsList>

          <TabsContent value="workflow" className="space-y-4">
            <MatchWorkflowManager 
              matchId={params.id as string}
              matchName={`${match.home_team?.name || 'Home Team'} vs ${match.away_team?.name || 'Away Team'}`}
              onStatusChange={loadMatch}
            />
            <MatchResultApprovalPanel matchId={params.id as string} onChanged={loadMatch} />
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <EventRecordingInterface 
              matchId={params.id as string}
              onEventAdded={loadMatch}
            />
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <EventTimelineInterface matchId={params.id as string} />
          </TabsContent>

          <TabsContent value="officials" className="space-y-4">
            <MatchOfficialAssignmentManager 
              matchId={params.id as string}
              matchName={`${match.home_team?.name || 'Home Team'} vs ${match.away_team?.name || 'Away Team'}`}
              onAssignmentsUpdate={loadMatch}
            />
          </TabsContent>

          <TabsContent value="team-sheets" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Home Team Sheet</CardTitle>
                  <CardDescription>
                    {match.home_team?.name || 'Home Team'} starting lineup
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TeamSheetForm 
                    matchId={params.id as string}
                    teamId={match.home_team_id}
                    teamName={match.home_team?.name || 'Home Team'}
                    onTeamSheetUpdate={loadMatch}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Away Team Sheet</CardTitle>
                  <CardDescription>
                    {match.away_team?.name || 'Away Team'} starting lineup
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TeamSheetForm 
                    matchId={params.id as string}
                    teamId={match.away_team_id}
                    teamName={match.away_team?.name || 'Away Team'}
                    onTeamSheetUpdate={loadMatch}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="share" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Share & Embed</CardTitle>
                <CardDescription>Use these links to share or embed the scoreboard</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm font-medium mb-1">Fullscreen</div>
                  <code className="break-all text-xs bg-muted px-2 py-1 rounded">{`${location.origin}/matches/${params.id as string}/scoreboard`}</code>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">Embed URL</div>
                  <code className="break-all text-xs bg-muted px-2 py-1 rounded">{`${location.origin}/embed/scoreboard/${params.id as string}?bg=transparent`}</code>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">Embed HTML</div>
                  <code className="break-all text-xs bg-muted px-2 py-1 rounded">{`<iframe src="${location.origin}/embed/scoreboard/${params.id as string}" width="800" height="200" frameborder="0"></iframe>`}</code>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">JSON API</div>
                  <code className="break-all text-xs bg-muted px-2 py-1 rounded">{`${location.origin}/api/scoreboard/${params.id as string}`}</code>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <MatchStatisticsDashboard 
              matchId={params.id as string}
              homeTeamName={match.home_team?.name}
              awayTeamName={match.away_team?.name}
              homeTeamId={match.home_team_id}
              awayTeamId={match.away_team_id}
            />
          </TabsContent>

          <TabsContent value="postponement" className="space-y-4">
            <MatchPostponementManager
              matchId={params.id as string}
              matchName={`${match.home_team?.name || 'Home Team'} vs ${match.away_team?.name || 'Away Team'}`}
              tournamentId={match.tournament_id}
              onPostponementCreated={loadMatch}
              onCancellationCreated={loadMatch}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
