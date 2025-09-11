'use client'

import * as React from 'react'
import Link from 'next/link'
import { useUpcomingEvents } from '@/hooks/use-organization-dashboard'
import { useOrganizationPreferences } from '@/hooks/use-organization-preferences'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Calendar,
  Clock,
  MapPin,
  Trophy,
  Users,
  Eye,
  Plus,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function UpcomingEventsWidget() {
  const { upcomingEvents, isLoading, error } = useUpcomingEvents()
  const { utils } = useOrganizationPreferences()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-5 w-32 mb-1" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2" />
            <p>Unable to load events</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasUpcomingMatches = upcomingEvents?.matches && upcomingEvents.matches.length > 0
  const hasUpcomingTournaments = upcomingEvents?.tournaments && upcomingEvents.tournaments.length > 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Events
            </CardTitle>
            <CardDescription>
              Scheduled matches and tournaments
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/calendar">
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Upcoming Matches */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">Next Matches</h4>
              {hasUpcomingMatches && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/matches">
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              )}
            </div>
            
            {hasUpcomingMatches ? (
              <div className="space-y-3">
                {upcomingEvents!.matches.slice(0, 3).map((match) => (
                  <div key={match.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">
                        {match.home_team} vs {match.away_team}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {match.tournament}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{utils.formatDateTime(match.scheduled_at)}</span>
                      </div>
                      {match.venue && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{match.venue}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {upcomingEvents!.matches.length > 3 && (
                  <Button variant="ghost" size="sm" asChild className="w-full">
                    <Link href="/matches">
                      View all {upcomingEvents!.matches.length} upcoming matches
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <Clock className="h-6 w-6 mx-auto mb-2" />
                <p className="text-sm">No upcoming matches</p>
                <Button variant="outline" size="sm" asChild className="mt-2">
                  <Link href="/matches/create">
                    <Plus className="mr-1 h-3 w-3" />
                    Schedule Match
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {/* Upcoming Tournaments */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">Upcoming Tournaments</h4>
              {hasUpcomingTournaments && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/tournaments">
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              )}
            </div>
            
            {hasUpcomingTournaments ? (
              <div className="space-y-3">
                {upcomingEvents!.tournaments.slice(0, 2).map((tournament) => (
                  <div key={tournament.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium truncate">
                        {tournament.name}
                      </div>
                      <Badge 
                        variant={tournament.status === 'upcoming' ? 'default' : 'secondary'}
                        className="text-xs capitalize"
                      >
                        {tournament.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{utils.formatDate(tournament.start_date)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{tournament.team_count} teams</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Trophy className="h-3 w-3" />
                        <span className="capitalize">{tournament.format}</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {upcomingEvents!.tournaments.length > 2 && (
                  <Button variant="ghost" size="sm" asChild className="w-full">
                    <Link href="/tournaments">
                      View all {upcomingEvents!.tournaments.length} tournaments
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <Trophy className="h-6 w-6 mx-auto mb-2" />
                <p className="text-sm">No upcoming tournaments</p>
                <Button variant="outline" size="sm" asChild className="mt-2">
                  <Link href="/tournaments/create">
                    <Plus className="mr-1 h-3 w-3" />
                    Create Tournament
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
