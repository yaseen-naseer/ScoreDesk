'use client'

import * as React from 'react'
import { useOrganizationDashboard } from '@/hooks/use-organization-dashboard'
import { useOrganizationPreferences } from '@/hooks/use-organization-preferences'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  RefreshCw,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Import dashboard widgets
import { StatsOverviewCards } from './stats-overview-cards'
import { ActivityTrendsChart } from './activity-trends-chart'
import { MatchStatusChart } from './match-status-chart'
import { UpcomingEventsWidget } from './upcoming-events-widget'
import { RecentMatchesWidget } from './recent-matches-widget'
import { TeamPerformanceWidget } from './team-performance-widget'
import { MembershipOverviewWidget } from './membership-overview-widget'
import { QuickActionsWidget } from './quick-actions-widget'

interface OrganizationDashboardProps {
  className?: string
}

export function OrganizationDashboard({ className }: OrganizationDashboardProps) {
  const { 
    metrics, 
    chartData, 
    upcomingEvents, 
    isLoading, 
    error, 
    lastUpdated, 
    refreshData,
    hasData 
  } = useOrganizationDashboard()
  
  const { utils } = useOrganizationPreferences()

  // Loading state
  if (isLoading && !hasData) {
    return (
      <div className={cn("space-y-6", className)}>
        <DashboardSkeleton />
      </div>
    )
  }

  // Error state
  if (error && !hasData) {
    return (
      <div className={cn("space-y-6", className)}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
        <div className="text-center">
          <Button onClick={refreshData} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Overview</h2>
          <p className="text-muted-foreground">
            Organization insights and key metrics
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Updated {utils.formatTime(lastUpdated)}
              </span>
            </div>
          )}
          
          <Button 
            onClick={refreshData} 
            variant="outline" 
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats Overview */}
      <StatsOverviewCards />

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts and Analytics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Activity Trends Chart */}
          <ActivityTrendsChart />
          
          {/* Match Status Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MatchStatusChart />
            <TeamPerformanceWidget />
          </div>
        </div>

        {/* Right Column - Lists and Quick Info */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <QuickActionsWidget />
          
          {/* Upcoming Events */}
          <UpcomingEventsWidget />
          
          {/* Recent Matches */}
          <RecentMatchesWidget />
          
          {/* Membership Overview */}
          <MembershipOverviewWidget />
        </div>
      </div>

      {/* Additional Information */}
      {!hasData && !isLoading && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Info className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Welcome to ScoreDesk!</h3>
              <p className="text-muted-foreground mb-4">
                Start by creating your first tournament or adding teams to see your dashboard come to life.
              </p>
              <div className="flex justify-center gap-3">
                <Button asChild>
                  <a href="/tournaments/create">Create Tournament</a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="/teams/create">Add Team</a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error indicator for refresh failures */}
      {error && hasData && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to refresh dashboard data: {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// Loading skeleton component
function DashboardSkeleton() {
  return (
    <>
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Chart skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>

          {/* Two smaller charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-28" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {/* Side widgets skeleton */}
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  )
}
