'use client'

import * as React from 'react'
import Link from 'next/link'
import { useTeamOverview } from '@/hooks/use-organization-dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Users,
  Trophy,
  Star,
  Eye,
  UserPlus,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function TeamPerformanceWidget() {
  const { overview, isLoading } = useTeamOverview()

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
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <Skeleton className="h-6 w-8 mx-auto mb-1" />
                <Skeleton className="h-3 w-12 mx-auto" />
              </div>
              <div className="text-center">
                <Skeleton className="h-6 w-8 mx-auto mb-1" />
                <Skeleton className="h-3 w-12 mx-auto" />
              </div>
            </div>
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!overview) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2" />
            <p>No team data</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { totalTeams, activeTeams, totalPlayers, mostActiveTeam } = overview
  const activePercentage = totalTeams > 0 ? Math.round((activeTeams / totalTeams) * 100) : 0
  const averagePlayersPerTeam = totalTeams > 0 ? Math.round(totalPlayers / totalTeams) : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Performance
            </CardTitle>
            <CardDescription>
              Team and player statistics
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/teams">
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Team Overview */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-semibold">{totalTeams}</div>
              <div className="text-xs text-muted-foreground">Total Teams</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">{activeTeams}</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Players:</span>
              <span className="font-medium">{totalPlayers}</span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Avg Players/Team:</span>
              <span className="font-medium">{averagePlayersPerTeam}</span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Team Activity:</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{activePercentage}%</span>
                <div className="w-16 bg-muted rounded-full h-2">
                  <div 
                    className="bg-green-500 rounded-full h-2 transition-all"
                    style={{ width: `${activePercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Most Active Team */}
          {mostActiveTeam && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                Most Active Team
              </h4>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{mostActiveTeam.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {mostActiveTeam.matchCount} matches played
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    <Trophy className="mr-1 h-3 w-3" />
                    Top Team
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="pt-4 border-t space-y-2">
            {totalTeams === 0 ? (
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link href="/teams/create">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add First Team
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link href="/teams/create">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add New Team
                  </Link>
                </Button>
                
                <Button variant="ghost" size="sm" asChild className="w-full">
                  <Link href="/teams">
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Manage All Teams
                  </Link>
                </Button>
              </>
            )}
          </div>

          {/* Performance Indicators */}
          {totalTeams > 0 && (
            <div className="pt-4 border-t">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-xs text-muted-foreground">Activity</div>
                  <div className={cn(
                    "text-sm font-medium",
                    activePercentage >= 75 ? "text-green-600" :
                    activePercentage >= 50 ? "text-yellow-600" : "text-red-600"
                  )}>
                    {activePercentage >= 75 ? "High" :
                     activePercentage >= 50 ? "Medium" : "Low"}
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-muted-foreground">Size</div>
                  <div className={cn(
                    "text-sm font-medium",
                    averagePlayersPerTeam >= 20 ? "text-green-600" :
                    averagePlayersPerTeam >= 15 ? "text-yellow-600" : "text-red-600"
                  )}>
                    {averagePlayersPerTeam >= 20 ? "Large" :
                     averagePlayersPerTeam >= 15 ? "Medium" : "Small"}
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-muted-foreground">Scale</div>
                  <div className={cn(
                    "text-sm font-medium",
                    totalTeams >= 10 ? "text-green-600" :
                    totalTeams >= 5 ? "text-yellow-600" : "text-red-600"
                  )}>
                    {totalTeams >= 10 ? "Large" :
                     totalTeams >= 5 ? "Medium" : "Small"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
