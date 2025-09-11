'use client'

import { useState, useEffect, useCallback } from 'react'
import { useOrganization } from '@/lib/contexts/organization-context'
import { dashboardService, type DashboardMetrics, type DashboardChartData, type UpcomingEvents } from '@/lib/services/dashboard-service'

export interface DashboardState {
  metrics: DashboardMetrics | null
  chartData: DashboardChartData | null
  upcomingEvents: UpcomingEvents | null
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
}

export function useOrganizationDashboard() {
  const { currentOrganization } = useOrganization()
  const [state, setState] = useState<DashboardState>({
    metrics: null,
    chartData: null,
    upcomingEvents: null,
    isLoading: false,
    error: null,
    lastUpdated: null
  })

  const fetchDashboardData = useCallback(async (organizationId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const [metrics, chartData, upcomingEvents] = await Promise.all([
        dashboardService.getOrganizationMetrics(organizationId),
        dashboardService.getChartData(organizationId),
        dashboardService.getUpcomingEvents(organizationId)
      ])

      setState({
        metrics,
        chartData,
        upcomingEvents,
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load dashboard data'
      }))
    }
  }, [])

  const refreshData = useCallback(() => {
    if (currentOrganization?.id) {
      fetchDashboardData(currentOrganization.id)
    }
  }, [currentOrganization?.id, fetchDashboardData])

  // Fetch data when organization changes
  useEffect(() => {
    if (currentOrganization?.id) {
      fetchDashboardData(currentOrganization.id)
    }
  }, [currentOrganization?.id, fetchDashboardData])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!currentOrganization?.id) return

    const interval = setInterval(() => {
      fetchDashboardData(currentOrganization.id)
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [currentOrganization?.id, fetchDashboardData])

  return {
    ...state,
    refreshData,
    hasData: !!(state.metrics && state.chartData && state.upcomingEvents)
  }
}

// Specific hooks for different parts of the dashboard
export function useDashboardMetrics() {
  const { metrics, isLoading, error } = useOrganizationDashboard()
  return { metrics, isLoading, error }
}

export function useDashboardCharts() {
  const { chartData, isLoading, error } = useOrganizationDashboard()
  return { chartData, isLoading, error }
}

export function useUpcomingEvents() {
  const { upcomingEvents, isLoading, error } = useOrganizationDashboard()
  return { upcomingEvents, isLoading, error }
}

// Helper hooks for specific metrics
export function useQuickStats() {
  const { metrics } = useOrganizationDashboard()
  
  if (!metrics) {
    return {
      stats: [],
      isLoading: true
    }
  }

  const stats = [
    {
      label: 'Total Tournaments',
      value: metrics.totalTournaments,
      change: metrics.trends.tournaments.change,
      icon: 'trophy'
    },
    {
      label: 'Active Teams',
      value: metrics.activeTeams,
      change: metrics.trends.teams.change,
      icon: 'users'
    },
    {
      label: 'Total Players',
      value: metrics.totalPlayers,
      change: null, // Player trends not tracked in current implementation
      icon: 'user'
    },
    {
      label: 'Live Matches',
      value: metrics.liveMatches,
      change: null, // Live matches don't have historical trends
      icon: 'play'
    }
  ]

  return {
    stats,
    isLoading: false
  }
}

export function useActivityTrends() {
  const { metrics } = useOrganizationDashboard()
  
  if (!metrics) {
    return {
      trends: [],
      isLoading: true
    }
  }

  const trends = [
    {
      label: 'New Tournaments',
      current: metrics.trends.tournaments.current,
      previous: metrics.trends.tournaments.previous,
      change: metrics.trends.tournaments.change,
      changePercent: metrics.trends.tournaments.previous > 0 
        ? Math.round((metrics.trends.tournaments.change / metrics.trends.tournaments.previous) * 100)
        : 0
    },
    {
      label: 'New Matches',
      current: metrics.trends.matches.current,
      previous: metrics.trends.matches.previous,
      change: metrics.trends.matches.change,
      changePercent: metrics.trends.matches.previous > 0 
        ? Math.round((metrics.trends.matches.change / metrics.trends.matches.previous) * 100)
        : 0
    },
    {
      label: 'New Teams',
      current: metrics.trends.teams.current,
      previous: metrics.trends.teams.previous,
      change: metrics.trends.teams.change,
      changePercent: metrics.trends.teams.previous > 0 
        ? Math.round((metrics.trends.teams.change / metrics.trends.teams.previous) * 100)
        : 0
    },
    {
      label: 'New Members',
      current: metrics.trends.members.current,
      previous: metrics.trends.members.previous,
      change: metrics.trends.members.change,
      changePercent: metrics.trends.members.previous > 0 
        ? Math.round((metrics.trends.members.change / metrics.trends.members.previous) * 100)
        : 0
    }
  ]

  return {
    trends,
    isLoading: false
  }
}

export function useMatchOverview() {
  const { metrics } = useOrganizationDashboard()
  
  if (!metrics) {
    return {
      overview: null,
      isLoading: true
    }
  }

  const overview = {
    total: metrics.totalMatches,
    live: metrics.liveMatches,
    scheduled: metrics.scheduledMatches,
    completed: metrics.completedMatches,
    averageDuration: metrics.averageMatchDuration,
    totalGoals: metrics.totalGoalsScored,
    recentMatches: metrics.recentMatches
  }

  return {
    overview,
    isLoading: false
  }
}

export function useTeamOverview() {
  const { metrics } = useOrganizationDashboard()
  
  if (!metrics) {
    return {
      overview: null,
      isLoading: true
    }
  }

  const overview = {
    totalTeams: metrics.totalTeams,
    activeTeams: metrics.activeTeams,
    totalPlayers: metrics.totalPlayers,
    mostActiveTeam: metrics.mostActiveTeam
  }

  return {
    overview,
    isLoading: false
  }
}

export function useMembershipOverview() {
  const { metrics } = useOrganizationDashboard()
  
  if (!metrics) {
    return {
      overview: null,
      isLoading: true
    }
  }

  const overview = {
    totalMembers: metrics.totalMembers,
    activeMembers: metrics.activeMembers,
    membersByRole: metrics.membersByRole
  }

  return {
    overview,
    isLoading: false
  }
}
