'use client'

import * as React from 'react'
import Link from 'next/link'
import { useOrganization } from '@/lib/contexts/organization-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Building2, 
  Users, 
  Trophy, 
  Calendar, 
  Target,
  Award,
  Play,
  TrendingUp,
  ArrowRight,
  Eye,
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface OrganizationSummaryProps {
  className?: string
}

export function OrganizationSummary({ className }: OrganizationSummaryProps) {
  const { 
    currentOrganization, 
    organizationStats, 
    isLoading, 
    isLoadingStats,
    canManageOrganization 
  } = useOrganization()

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="text-center">
                <Skeleton className="h-8 w-full mb-2" />
                <Skeleton className="h-4 w-12 mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!currentOrganization) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No organization selected</p>
            <Button asChild>
              <Link href="/organizations">Select Organization</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage 
                src={currentOrganization.logo_url || undefined} 
                alt={currentOrganization.name}
              />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {currentOrganization.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{currentOrganization.name}</CardTitle>
              <CardDescription>
                Organization Overview
              </CardDescription>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/organizations/profile">
                <Eye className="mr-2 h-4 w-4" />
                View
              </Link>
            </Button>
            {canManageOrganization && (
              <Button asChild variant="outline" size="sm">
                <Link href="/organizations/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoadingStats ? (
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="text-center">
                <Skeleton className="h-8 w-full mb-2" />
                <Skeleton className="h-4 w-16 mx-auto mb-1" />
                <Skeleton className="h-3 w-12 mx-auto" />
              </div>
            ))}
          </div>
        ) : organizationStats ? (
          <div className="space-y-6">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="text-2xl font-bold">{organizationStats.totalMembers}</div>
                <div className="text-xs text-muted-foreground">Members</div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <div className="text-2xl font-bold">{organizationStats.totalTeams}</div>
                <div className="text-xs text-muted-foreground">Teams</div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div className="text-2xl font-bold">{organizationStats.totalPlayers}</div>
                <div className="text-xs text-muted-foreground">Players</div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div className="text-2xl font-bold">{organizationStats.totalMatches}</div>
                <div className="text-xs text-muted-foreground">Matches</div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Award className="h-5 w-5 text-primary" />
                </div>
                <div className="text-2xl font-bold">{organizationStats.activeTournaments}</div>
                <div className="text-xs text-muted-foreground">Tournaments</div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Play className="h-5 w-5 text-destructive" />
                </div>
                <div className="text-2xl font-bold text-destructive">{organizationStats.liveMatches}</div>
                <div className="text-xs text-muted-foreground">Live</div>
              </div>
            </div>

            {/* Activity Status */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Activity Status</span>
                <div className="flex items-center gap-2">
                  {organizationStats.liveMatches > 0 ? (
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                      <Play className="mr-1 h-3 w-3" />
                      {organizationStats.liveMatches} Live
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      No active matches
                    </Badge>
                  )}
                </div>
              </div>

              {organizationStats.activeTournaments > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active Tournaments</span>
                  <Badge variant="outline">
                    {organizationStats.activeTournaments} running
                  </Badge>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Quick Actions</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                  <Link href="/teams">
                    <Trophy className="mr-1 h-3 w-3" />
                    Teams
                  </Link>
                </Button>
                
                <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                  <Link href="/tournaments">
                    <Award className="mr-1 h-3 w-3" />
                    Tournaments
                  </Link>
                </Button>
                
                <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                  <Link href="/matches">
                    <Calendar className="mr-1 h-3 w-3" />
                    Matches
                  </Link>
                </Button>
                
                <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                  <Link href="/members">
                    <Users className="mr-1 h-3 w-3" />
                    Members
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No statistics available yet
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
