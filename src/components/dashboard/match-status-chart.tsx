'use client'

import * as React from 'react'
import { useDashboardCharts } from '@/hooks/use-organization-dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { 
  PieChart,
  Calendar,
  Play,
  CheckCircle2,
  Clock,
  XCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

const statusConfig = {
  scheduled: {
    icon: Calendar,
    color: 'bg-blue-500',
    label: 'Scheduled'
  },
  live: {
    icon: Play,
    color: 'bg-red-500',
    label: 'Live'
  },
  paused: {
    icon: Clock,
    color: 'bg-yellow-500',
    label: 'Paused'
  },
  completed: {
    icon: CheckCircle2,
    color: 'bg-green-500',
    label: 'Completed'
  },
  cancelled: {
    icon: XCircle,
    color: 'bg-gray-500',
    label: 'Cancelled'
  },
  postponed: {
    icon: Clock,
    color: 'bg-orange-500',
    label: 'Postponed'
  }
}

export function MatchStatusChart() {
  const { chartData, isLoading } = useDashboardCharts()

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
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-2 w-24" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const matchStatusData = chartData?.matchStatusDistribution || []
  const totalMatches = matchStatusData.reduce((sum, item) => sum + item.count, 0)

  if (totalMatches === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Match Status
          </CardTitle>
          <CardDescription>
            Distribution of match statuses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <PieChart className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">No matches yet</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          Match Status
        </CardTitle>
        <CardDescription>
          Distribution of {totalMatches} matches
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Status breakdown */}
          <div className="space-y-3">
            {matchStatusData
              .sort((a, b) => b.count - a.count)
              .map((item) => {
                const statusInfo = statusConfig[item.status as keyof typeof statusConfig]
                if (!statusInfo) return null
                
                const StatusIcon = statusInfo.icon
                
                return (
                  <div key={item.status} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <StatusIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium capitalize">{statusInfo.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{item.count}</span>
                        <span className="font-medium">{item.percentage}%</span>
                      </div>
                    </div>
                    <Progress 
                      value={item.percentage} 
                      className="h-2"
                      // Custom color would be applied via CSS variables
                    />
                  </div>
                )
              })}
          </div>

          {/* Visual pie chart representation */}
          <div className="pt-4 border-t">
            <div className="flex justify-center">
              <div className="relative w-32 h-32">
                {/* Simple circular representation */}
                <div className="w-full h-full rounded-full border-8 border-muted">
                  {/* This would be replaced with an actual chart library in production */}
                  <div className="w-full h-full flex items-center justify-center text-xs font-medium">
                    {totalMatches}
                    <br />
                    Matches
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary stats */}
          <div className="pt-4 border-t grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-green-600">
                {matchStatusData.find(item => item.status === 'completed')?.count || 0}
              </div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-red-600">
                {matchStatusData.find(item => item.status === 'live')?.count || 0}
              </div>
              <div className="text-xs text-muted-foreground">Live Now</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
