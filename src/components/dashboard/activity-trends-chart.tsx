'use client'

import * as React from 'react'
import { useActivityTrends } from '@/hooks/use-organization-dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function ActivityTrendsChart() {
  const { trends, isLoading } = useActivityTrends()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-5 w-32 mb-1" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }

  const getTrendIcon = (change: number) => {
    if (change > 0) return TrendingUp
    if (change < 0) return TrendingDown
    return Minus
  }

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-green-600 dark:text-green-400'
    if (change < 0) return 'text-red-600 dark:text-red-400'
    return 'text-muted-foreground'
  }

  const getTrendBadgeColor = (changePercent: number) => {
    if (changePercent > 0) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    if (changePercent < 0) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Activity Trends
        </CardTitle>
        <CardDescription>
          Last 30 days compared to previous 30 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Trend Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {trends.map((trend) => {
              const TrendIcon = getTrendIcon(trend.change)
              const trendColor = getTrendColor(trend.change)
              const badgeColor = getTrendBadgeColor(trend.changePercent)
              
              return (
                <div key={trend.label} className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold mb-1">
                    {trend.current}
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    {trend.label}
                  </div>
                  <div className={cn("flex items-center justify-center gap-1 text-xs", trendColor)}>
                    <TrendIcon className="h-3 w-3" />
                    <span>
                      {trend.change >= 0 ? '+' : ''}{trend.change}
                    </span>
                  </div>
                  {trend.changePercent !== 0 && (
                    <Badge className={cn("text-xs mt-1", badgeColor)}>
                      {trend.changePercent >= 0 ? '+' : ''}{trend.changePercent}%
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>

          {/* Visual Chart Placeholder */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Activity Overview</h4>
            
            {/* Simple bar chart representation */}
            <div className="space-y-3">
              {trends.map((trend) => {
                const maxValue = Math.max(trend.current, trend.previous, 1)
                const currentWidth = (trend.current / maxValue) * 100
                const previousWidth = (trend.previous / maxValue) * 100
                
                return (
                  <div key={trend.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{trend.label}</span>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Current: {trend.current}</span>
                        <span>Previous: {trend.previous}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      {/* Current period bar */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs w-16 text-muted-foreground">Current</span>
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary rounded-full h-2 transition-all duration-300"
                            style={{ width: `${currentWidth}%` }}
                          />
                        </div>
                      </div>
                      
                      {/* Previous period bar */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs w-16 text-muted-foreground">Previous</span>
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div 
                            className="bg-muted-foreground/50 rounded-full h-2 transition-all duration-300"
                            style={{ width: `${previousWidth}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="pt-4 border-t">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-sm text-muted-foreground">Total Growth</div>
                <div className="text-lg font-semibold">
                  {trends.reduce((sum, trend) => sum + trend.change, 0)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Active Categories</div>
                <div className="text-lg font-semibold">
                  {trends.filter(trend => trend.current > 0).length}/{trends.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
