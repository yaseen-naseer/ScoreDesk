'use client'

import * as React from 'react'
import { useQuickStats } from '@/hooks/use-organization-dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Trophy,
  Users,
  User,
  Play,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'
import { cn } from '@/lib/utils'

const iconMap = {
  trophy: Trophy,
  users: Users,
  user: User,
  play: Play
}

interface StatCardProps {
  label: string
  value: number
  change?: number | null
  icon: keyof typeof iconMap
  isLoading?: boolean
}

function StatCard({ label, value, change, icon, isLoading = false }: StatCardProps) {
  const Icon = iconMap[icon]

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-24" />
        </CardContent>
      </Card>
    )
  }

  const formatChange = (change: number) => {
    const absChange = Math.abs(change)
    const sign = change > 0 ? '+' : change < 0 ? '-' : ''
    return `${sign}${absChange}`
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return TrendingUp
    if (change < 0) return TrendingDown
    return Minus
  }

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600 dark:text-green-400'
    if (change < 0) return 'text-red-600 dark:text-red-400'
    return 'text-muted-foreground'
  }

  const ChangeIcon = change !== null && change !== undefined ? getChangeIcon(change) : null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        {change !== null && change !== undefined && ChangeIcon && (
          <div className={cn("flex items-center text-xs", getChangeColor(change))}>
            <ChangeIcon className="mr-1 h-3 w-3" />
            <span>{formatChange(change)} from last month</span>
          </div>
        )}
        {change === null && (
          <div className="text-xs text-muted-foreground">
            Current active count
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function StatsOverviewCards() {
  const { stats, isLoading } = useQuickStats()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {isLoading ? (
        // Loading skeletons
        Array.from({ length: 4 }).map((_, i) => (
          <StatCard
            key={i}
            label=""
            value={0}
            icon="trophy"
            isLoading
          />
        ))
      ) : (
        // Actual stat cards
        stats.map((stat, index) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            change={stat.change}
            icon={stat.icon as keyof typeof iconMap}
          />
        ))
      )}
    </div>
  )
}
