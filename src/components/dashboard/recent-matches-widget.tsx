'use client'

import * as React from 'react'
import Link from 'next/link'
import { useMatchOverview } from '@/hooks/use-organization-dashboard'
import { useOrganizationPreferences } from '@/hooks/use-organization-preferences'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Clock,
  Play,
  CheckCircle2,
  Calendar,
  Eye,
  ArrowRight,
  Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'

const statusConfig = {
  scheduled: {
    icon: Calendar,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    label: 'Scheduled'
  },
  live: {
    icon: Play,
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    label: 'Live'
  },
  paused: {
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    label: 'Paused'
  },
  completed: {
    icon: CheckCircle2,
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    label: 'Completed'
  },
  cancelled: {
    icon: Calendar,
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    label: 'Cancelled'
  },
  postponed: {
    icon: Clock,
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    label: 'Postponed'
  }
}

export function RecentMatchesWidget() {
  const { overview, isLoading } = useMatchOverview()
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
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!overview || !overview.recentMatches) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Matches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2" />
            <p>No recent matches</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const recentMatches = overview.recentMatches.slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Matches
            </CardTitle>
            <CardDescription>
              Latest match results and activity
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/matches">
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Match Overview Stats */}
          <div className="grid grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-semibold">{overview.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">{overview.completed}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-red-600">{overview.live}</div>
              <div className="text-xs text-muted-foreground">Live</div>
            </div>
          </div>

          {/* Recent Matches List */}
          {recentMatches.length > 0 ? (
            <div className="space-y-3">
              {recentMatches.map((match) => {
                const statusInfo = statusConfig[match.status as keyof typeof statusConfig] || statusConfig.scheduled
                const StatusIcon = statusInfo.icon

                return (
                  <div key={match.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">
                        {match.home_team} vs {match.away_team}
                      </div>
                      <Badge className={cn("text-xs", statusInfo.color)}>
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {statusInfo.label}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        {utils.formatDateTime(match.scheduled_at)}
                      </div>
                      
                      {match.score && (
                        <div className="text-sm font-mono bg-muted px-2 py-1 rounded">
                          {match.score.home} - {match.score.away}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              
              {overview.recentMatches.length > 5 && (
                <Button variant="ghost" size="sm" asChild className="w-full">
                  <Link href="/matches">
                    <ArrowRight className="mr-1 h-3 w-3" />
                    View all {overview.recentMatches.length} recent matches
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No recent matches</p>
              <Button variant="outline" size="sm" asChild className="mt-2">
                <Link href="/matches/create">
                  Schedule First Match
                </Link>
              </Button>
            </div>
          )}

          {/* Additional Stats */}
          {overview.total > 0 && (
            <div className="pt-4 border-t space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Average Duration:</span>
                <span className="font-medium">
                  {utils.formatMatchDuration(Math.round(overview.averageDuration))}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Goals Scored:</span>
                <span className="font-medium">{overview.totalGoals}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Scheduled Matches:</span>
                <span className="font-medium">{overview.scheduled}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
