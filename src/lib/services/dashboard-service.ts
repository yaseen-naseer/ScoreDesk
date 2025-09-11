/**
 * Dashboard Service
 * Handles fetching and aggregating dashboard data for organizations
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'

export interface DashboardMetrics {
  // Organization overview
  totalTournaments: number
  activeTournaments: number
  completedTournaments: number
  
  // Team metrics
  totalTeams: number
  activeTeams: number
  totalPlayers: number
  
  // Match metrics
  totalMatches: number
  liveMatches: number
  scheduledMatches: number
  completedMatches: number
  
  // Member metrics
  totalMembers: number
  activeMembers: number
  membersByRole: Record<string, number>
  
  // Recent activity
  recentMatches: Array<{
    id: string
    home_team: string
    away_team: string
    status: string
    scheduled_at: string
    score?: {
      home: number
      away: number
    }
  }>
  
  // Performance stats
  averageMatchDuration: number
  totalGoalsScored: number
  mostActiveTeam?: {
    name: string
    matchCount: number
  }
  
  // Trends (last 30 days vs previous 30 days)
  trends: {
    tournaments: { current: number; previous: number; change: number }
    matches: { current: number; previous: number; change: number }
    teams: { current: number; previous: number; change: number }
    members: { current: number; previous: number; change: number }
  }
}

export interface DashboardChartData {
  // Match activity over time
  matchActivity: Array<{
    date: string
    matches: number
    tournaments: number
  }>
  
  // Team registration over time
  teamGrowth: Array<{
    date: string
    teams: number
    players: number
  }>
  
  // Match status distribution
  matchStatusDistribution: Array<{
    status: string
    count: number
    percentage: number
  }>
  
  // Tournament format distribution
  tournamentFormats: Array<{
    format: string
    count: number
    percentage: number
  }>
  
  // Activity by sport type
  sportActivity: Array<{
    sport: string
    tournaments: number
    matches: number
    teams: number
  }>
}

export interface UpcomingEvents {
  matches: Array<{
    id: string
    home_team: string
    away_team: string
    tournament: string
    scheduled_at: string
    venue?: string
  }>
  
  tournaments: Array<{
    id: string
    name: string
    format: string
    start_date: string
    team_count: number
    status: string
  }>
}

class DashboardService {
  private supabase = createClientComponentClient<Database>()

  async getOrganizationMetrics(organizationId: string): Promise<DashboardMetrics> {
    try {
      // Fetch all data in parallel
      const [
        tournamentsData,
        teamsData,
        playersData,
        matchesData,
        membersData,
        recentMatchesData,
        statsData
      ] = await Promise.all([
        this.getTournamentMetrics(organizationId),
        this.getTeamMetrics(organizationId),
        this.getPlayerMetrics(organizationId),
        this.getMatchMetrics(organizationId),
        this.getMemberMetrics(organizationId),
        this.getRecentMatches(organizationId),
        this.getPerformanceStats(organizationId)
      ])

      // Calculate trends
      const trends = await this.calculateTrends(organizationId)

      return {
        ...tournamentsData,
        ...teamsData,
        ...playersData,
        ...matchesData,
        ...membersData,
        recentMatches: recentMatchesData,
        ...statsData,
        trends
      }
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error)
      throw error
    }
  }

  private async getTournamentMetrics(organizationId: string) {
    const { data, error } = await this.supabase
      .from('tournaments')
      .select('status')
      .eq('organization_id', organizationId)

    if (error) throw error

    const totalTournaments = data?.length || 0
    const activeTournaments = data?.filter(t => ['draft', 'upcoming', 'ongoing'].includes(t.status)).length || 0
    const completedTournaments = data?.filter(t => t.status === 'completed').length || 0

    return {
      totalTournaments,
      activeTournaments,
      completedTournaments
    }
  }

  private async getTeamMetrics(organizationId: string) {
    const { data, error } = await this.supabase
      .from('teams')
      .select('id, is_active')
      .eq('organization_id', organizationId)

    if (error) throw error

    const totalTeams = data?.length || 0
    const activeTeams = data?.filter(t => t.is_active).length || 0

    return {
      totalTeams,
      activeTeams
    }
  }

  private async getPlayerMetrics(organizationId: string) {
    const { data, error } = await this.supabase
      .from('players')
      .select('id')
      .eq('organization_id', organizationId)

    if (error) throw error

    return {
      totalPlayers: data?.length || 0
    }
  }

  private async getMatchMetrics(organizationId: string) {
    const { data, error } = await this.supabase
      .from('matches')
      .select('status')
      .eq('organization_id', organizationId)

    if (error) throw error

    const totalMatches = data?.length || 0
    const liveMatches = data?.filter(m => m.status === 'live').length || 0
    const scheduledMatches = data?.filter(m => m.status === 'scheduled').length || 0
    const completedMatches = data?.filter(m => m.status === 'completed').length || 0

    return {
      totalMatches,
      liveMatches,
      scheduledMatches,
      completedMatches
    }
  }

  private async getMemberMetrics(organizationId: string) {
    const { data, error } = await this.supabase
      .from('organization_memberships')
      .select('role, status')
      .eq('organization_id', organizationId)

    if (error) throw error

    const totalMembers = data?.length || 0
    const activeMembers = data?.filter(m => m.status === 'active').length || 0
    
    const membersByRole = data?.reduce((acc, member) => {
      acc[member.role] = (acc[member.role] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    return {
      totalMembers,
      activeMembers,
      membersByRole
    }
  }

  private async getRecentMatches(organizationId: string) {
    const { data, error } = await this.supabase
      .from('matches')
      .select(`
        id,
        status,
        scheduled_at,
        home_score,
        away_score,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name)
      `)
      .eq('organization_id', organizationId)
      .order('scheduled_at', { ascending: false })
      .limit(10)

    if (error) throw error

    return data?.map(match => ({
      id: match.id,
      home_team: (match.home_team as any)?.name || 'Unknown',
      away_team: (match.away_team as any)?.name || 'Unknown',
      status: match.status,
      scheduled_at: match.scheduled_at,
      score: match.home_score !== null && match.away_score !== null ? {
        home: match.home_score,
        away: match.away_score
      } : undefined
    })) || []
  }

  private async getPerformanceStats(organizationId: string) {
    // Get average match duration (from completed matches)
    const { data: matchData, error: matchError } = await this.supabase
      .from('matches')
      .select('actual_duration')
      .eq('organization_id', organizationId)
      .eq('status', 'completed')
      .not('actual_duration', 'is', null)

    if (matchError) throw matchError

    const averageMatchDuration = matchData?.length 
      ? matchData.reduce((acc, match) => acc + (match.actual_duration || 0), 0) / matchData.length
      : 0

    // Get total goals scored
    const { data: goalsData, error: goalsError } = await this.supabase
      .from('match_events')
      .select('id')
      .eq('organization_id', organizationId)
      .in('event_type', ['goal', 'penalty_goal', 'own_goal'])

    if (goalsError) throw goalsError

    const totalGoalsScored = goalsData?.length || 0

    // Get most active team
    const { data: teamMatchData, error: teamError } = await this.supabase
      .from('matches')
      .select(`
        home_team_id,
        away_team_id,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name)
      `)
      .eq('organization_id', organizationId)

    if (teamError) throw teamError

    const teamMatchCounts = new Map<string, { name: string; count: number }>()
    
    teamMatchData?.forEach(match => {
      const homeTeamName = (match.home_team as any)?.name
      const awayTeamName = (match.away_team as any)?.name
      
      if (homeTeamName) {
        const current = teamMatchCounts.get(match.home_team_id) || { name: homeTeamName, count: 0 }
        teamMatchCounts.set(match.home_team_id, { ...current, count: current.count + 1 })
      }
      
      if (awayTeamName) {
        const current = teamMatchCounts.get(match.away_team_id) || { name: awayTeamName, count: 0 }
        teamMatchCounts.set(match.away_team_id, { ...current, count: current.count + 1 })
      }
    })

    const mostActiveTeam = Array.from(teamMatchCounts.values())
      .sort((a, b) => b.count - a.count)[0] || undefined

    return {
      averageMatchDuration,
      totalGoalsScored,
      mostActiveTeam: mostActiveTeam ? {
        name: mostActiveTeam.name,
        matchCount: mostActiveTeam.count
      } : undefined
    }
  }

  private async calculateTrends(organizationId: string) {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
    const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000))

    // Get current period data (last 30 days)
    const currentPeriodStart = thirtyDaysAgo.toISOString()
    const currentPeriodEnd = now.toISOString()

    // Get previous period data (30-60 days ago)
    const previousPeriodStart = sixtyDaysAgo.toISOString()
    const previousPeriodEnd = thirtyDaysAgo.toISOString()

    const [currentData, previousData] = await Promise.all([
      this.getPeriodData(organizationId, currentPeriodStart, currentPeriodEnd),
      this.getPeriodData(organizationId, previousPeriodStart, previousPeriodEnd)
    ])

    return {
      tournaments: {
        current: currentData.tournaments,
        previous: previousData.tournaments,
        change: currentData.tournaments - previousData.tournaments
      },
      matches: {
        current: currentData.matches,
        previous: previousData.matches,
        change: currentData.matches - previousData.matches
      },
      teams: {
        current: currentData.teams,
        previous: previousData.teams,
        change: currentData.teams - previousData.teams
      },
      members: {
        current: currentData.members,
        previous: previousData.members,
        change: currentData.members - previousData.members
      }
    }
  }

  private async getPeriodData(organizationId: string, startDate: string, endDate: string) {
    const [tournaments, matches, teams, members] = await Promise.all([
      this.supabase
        .from('tournaments')
        .select('id')
        .eq('organization_id', organizationId)
        .gte('created_at', startDate)
        .lte('created_at', endDate),
      
      this.supabase
        .from('matches')
        .select('id')
        .eq('organization_id', organizationId)
        .gte('created_at', startDate)
        .lte('created_at', endDate),
      
      this.supabase
        .from('teams')
        .select('id')
        .eq('organization_id', organizationId)
        .gte('created_at', startDate)
        .lte('created_at', endDate),
      
      this.supabase
        .from('organization_memberships')
        .select('id')
        .eq('organization_id', organizationId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
    ])

    return {
      tournaments: tournaments.data?.length || 0,
      matches: matches.data?.length || 0,
      teams: teams.data?.length || 0,
      members: members.data?.length || 0
    }
  }

  async getChartData(organizationId: string): Promise<DashboardChartData> {
    try {
      const [
        matchActivity,
        teamGrowth,
        matchStatusData,
        tournamentFormatData,
        sportActivityData
      ] = await Promise.all([
        this.getMatchActivityData(organizationId),
        this.getTeamGrowthData(organizationId),
        this.getMatchStatusDistribution(organizationId),
        this.getTournamentFormatDistribution(organizationId),
        this.getSportActivityData(organizationId)
      ])

      return {
        matchActivity,
        teamGrowth,
        matchStatusDistribution: matchStatusData,
        tournamentFormats: tournamentFormatData,
        sportActivity: sportActivityData
      }
    } catch (error) {
      console.error('Error fetching chart data:', error)
      throw error
    }
  }

  private async getMatchActivityData(organizationId: string) {
    // Get last 30 days of match activity
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data, error } = await this.supabase
      .from('matches')
      .select('scheduled_at, tournament_id')
      .eq('organization_id', organizationId)
      .gte('scheduled_at', thirtyDaysAgo.toISOString())
      .order('scheduled_at')

    if (error) throw error

    // Group by date
    const activityByDate = new Map<string, { matches: number; tournaments: Set<string> }>()
    
    data?.forEach(match => {
      const date = new Date(match.scheduled_at).toISOString().split('T')[0]
      const current = activityByDate.get(date) || { matches: 0, tournaments: new Set() }
      current.matches++
      if (match.tournament_id) {
        current.tournaments.add(match.tournament_id)
      }
      activityByDate.set(date, current)
    })

    // Convert to array format
    return Array.from(activityByDate.entries()).map(([date, data]) => ({
      date,
      matches: data.matches,
      tournaments: data.tournaments.size
    }))
  }

  private async getTeamGrowthData(organizationId: string) {
    // Get team and player growth over last 90 days
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const [teamsData, playersData] = await Promise.all([
      this.supabase
        .from('teams')
        .select('created_at')
        .eq('organization_id', organizationId)
        .gte('created_at', ninetyDaysAgo.toISOString())
        .order('created_at'),
      
      this.supabase
        .from('players')
        .select('created_at')
        .eq('organization_id', organizationId)
        .gte('created_at', ninetyDaysAgo.toISOString())
        .order('created_at')
    ])

    if (teamsData.error) throw teamsData.error
    if (playersData.error) throw playersData.error

    // Group by week
    const growthByWeek = new Map<string, { teams: number; players: number }>()
    
    // Process teams
    teamsData.data?.forEach(team => {
      const weekStart = this.getWeekStart(new Date(team.created_at))
      const current = growthByWeek.get(weekStart) || { teams: 0, players: 0 }
      current.teams++
      growthByWeek.set(weekStart, current)
    })

    // Process players
    playersData.data?.forEach(player => {
      const weekStart = this.getWeekStart(new Date(player.created_at))
      const current = growthByWeek.get(weekStart) || { teams: 0, players: 0 }
      current.players++
      growthByWeek.set(weekStart, current)
    })

    return Array.from(growthByWeek.entries()).map(([date, data]) => ({
      date,
      teams: data.teams,
      players: data.players
    }))
  }

  private getWeekStart(date: Date): string {
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay())
    return weekStart.toISOString().split('T')[0]
  }

  private async getMatchStatusDistribution(organizationId: string) {
    const { data, error } = await this.supabase
      .from('matches')
      .select('status')
      .eq('organization_id', organizationId)

    if (error) throw error

    const statusCounts = data?.reduce((acc, match) => {
      acc[match.status] = (acc[match.status] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0)

    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }))
  }

  private async getTournamentFormatDistribution(organizationId: string) {
    const { data, error } = await this.supabase
      .from('tournaments')
      .select('format')
      .eq('organization_id', organizationId)

    if (error) throw error

    const formatCounts = data?.reduce((acc, tournament) => {
      acc[tournament.format] = (acc[tournament.format] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    const total = Object.values(formatCounts).reduce((sum, count) => sum + count, 0)

    return Object.entries(formatCounts).map(([format, count]) => ({
      format,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }))
  }

  private async getSportActivityData(organizationId: string) {
    const { data, error } = await this.supabase
      .from('tournaments')
      .select(`
        sport_type,
        id,
        matches:matches(count),
        tournament_teams:tournament_teams(count)
      `)
      .eq('organization_id', organizationId)

    if (error) throw error

    const sportData = data?.reduce((acc, tournament) => {
      const sport = tournament.sport_type
      if (!acc[sport]) {
        acc[sport] = { tournaments: 0, matches: 0, teams: 0 }
      }
      acc[sport].tournaments++
      acc[sport].matches += (tournament.matches as any)?.[0]?.count || 0
      acc[sport].teams += (tournament.tournament_teams as any)?.[0]?.count || 0
      return acc
    }, {} as Record<string, { tournaments: number; matches: number; teams: number }>) || {}

    return Object.entries(sportData).map(([sport, data]) => ({
      sport,
      tournaments: data.tournaments,
      matches: data.matches,
      teams: data.teams
    }))
  }

  async getUpcomingEvents(organizationId: string): Promise<UpcomingEvents> {
    try {
      const [upcomingMatches, upcomingTournaments] = await Promise.all([
        this.getUpcomingMatches(organizationId),
        this.getUpcomingTournaments(organizationId)
      ])

      return {
        matches: upcomingMatches,
        tournaments: upcomingTournaments
      }
    } catch (error) {
      console.error('Error fetching upcoming events:', error)
      throw error
    }
  }

  private async getUpcomingMatches(organizationId: string) {
    const { data, error } = await this.supabase
      .from('matches')
      .select(`
        id,
        scheduled_at,
        venue,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name),
        tournament:tournaments(name)
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'scheduled')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at')
      .limit(10)

    if (error) throw error

    return data?.map(match => ({
      id: match.id,
      home_team: (match.home_team as any)?.name || 'Unknown',
      away_team: (match.away_team as any)?.name || 'Unknown',
      tournament: (match.tournament as any)?.name || 'Unknown',
      scheduled_at: match.scheduled_at,
      venue: match.venue
    })) || []
  }

  private async getUpcomingTournaments(organizationId: string) {
    const { data, error } = await this.supabase
      .from('tournaments')
      .select(`
        id,
        name,
        format,
        start_date,
        status,
        tournament_teams:tournament_teams(count)
      `)
      .eq('organization_id', organizationId)
      .in('status', ['draft', 'upcoming'])
      .order('start_date')
      .limit(5)

    if (error) throw error

    return data?.map(tournament => ({
      id: tournament.id,
      name: tournament.name,
      format: tournament.format,
      start_date: tournament.start_date,
      team_count: (tournament.tournament_teams as any)?.[0]?.count || 0,
      status: tournament.status
    })) || []
  }
}

export const dashboardService = new DashboardService()
