'use client'

/**
 * Team Statistics Overview Component
 * Comprehensive statistics and performance analytics for teams
 */

import React from 'react'
import { 
  Trophy, 
  Target, 
  Users, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Award,
  Shield,
  Zap
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { type TeamProfile, type TeamStatistics } from '@/lib/services/team-service'

interface TeamStatisticsOverviewProps {
  team: TeamProfile
  className?: string
}

interface StatCard {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  description?: string
}

export function TeamStatisticsOverview({ team, className }: TeamStatisticsOverviewProps) {
  const stats = team.statistics

  // Calculate additional metrics
  const winPercentage = stats?.totalMatches ? Math.round((stats.wins / stats.totalMatches) * 100) : 0
  const drawPercentage = stats?.totalMatches ? Math.round((stats.draws / stats.totalMatches) * 100) : 0
  const lossPercentage = stats?.totalMatches ? Math.round((stats.losses / stats.totalMatches) * 100) : 0
  const goalDifference = (stats?.goalsFor || 0) - (stats?.goalsAgainst || 0)
  const averageGoalsFor = stats?.totalMatches ? (stats.goalsFor / stats.totalMatches).toFixed(1) : '0.0'
  const averageGoalsAgainst = stats?.totalMatches ? (stats.goalsAgainst / stats.totalMatches).toFixed(1) : '0.0'

  // Performance rating (0-100)
  const performanceRating = Math.min(100, Math.max(0, 
    (winPercentage * 0.5) + 
    (Math.min(goalDifference + 50, 100) * 0.3) + 
    ((team.playerCount || 0) > 15 ? 20 : (team.playerCount || 0) * 1.33)
  ))

  const statCards: StatCard[] = [
    {
      title: 'Total Matches',
      value: stats?.totalMatches || 0,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'All matches played'
    },
    {
      title: 'Win Rate',
      value: `${winPercentage}%`,
      change: winPercentage > 50 ? winPercentage - 50 : undefined,
      changeLabel: winPercentage > 50 ? 'above average' : undefined,
      icon: Trophy,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: `${stats?.wins || 0} wins out of ${stats?.totalMatches || 0} matches`
    },
    {
      title: 'Goals Scored',
      value: stats?.goalsFor || 0,
      icon: Target,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      description: `Average ${averageGoalsFor} per match`
    },
    {
      title: 'Squad Size',
      value: team.playerCount || 0,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'Active players'
    },
    {
      title: 'Goal Difference',
      value: goalDifference > 0 ? `+${goalDifference}` : goalDifference,
      change: goalDifference,
      icon: goalDifference >= 0 ? TrendingUp : TrendingDown,
      color: goalDifference >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: goalDifference >= 0 ? 'bg-green-50' : 'bg-red-50',
      description: `${stats?.goalsFor || 0} scored, ${stats?.goalsAgainst || 0} conceded`
    },
    {
      title: 'Performance',
      value: `${Math.round(performanceRating)}%`,
      icon: Activity,
      color: performanceRating > 70 ? 'text-green-600' : performanceRating > 40 ? 'text-yellow-600' : 'text-red-600',
      bgColor: performanceRating > 70 ? 'bg-green-50' : performanceRating > 40 ? 'bg-yellow-50' : 'bg-red-50',
      description: 'Overall team performance rating'
    }
  ]

  const achievements = [
    {
      title: 'Win Streak',
      value: stats?.currentStreak === 'No matches' ? 'N/A' : stats?.currentStreak || 'N/A',
      icon: Award,
      color: 'text-gold-600'
    },
    {
      title: 'Home Record',
      value: stats?.homeRecord || '0-0-0',
      icon: Shield,
      color: 'text-blue-600'
    },
    {
      title: 'Away Record',
      value: stats?.awayRecord || '0-0-0',
      icon: Zap,
      color: 'text-purple-600'
    }
  ]

  return (
    <div className={className}>
      {/* Statistics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat) => {
          const IconComponent = stat.icon
          return (
            <Card key={stat.title} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      {stat.title}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-bold">{stat.value}</p>
                      {stat.change !== undefined && (
                        <Badge variant="secondary" className="text-xs">
                          {stat.change > 0 ? '+' : ''}{stat.change}
                          {stat.changeLabel && ` ${stat.changeLabel}`}
                        </Badge>
                      )}
                    </div>
                    {stat.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {stat.description}
                      </p>
                    )}
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <IconComponent className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Match Results Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Match Results</CardTitle>
            <CardDescription>
              Breakdown of wins, draws, and losses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Win Rate Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-600 font-medium">Wins</span>
                <span>{stats?.wins || 0} ({winPercentage}%)</span>
              </div>
              <Progress value={winPercentage} className="h-2" />
            </div>

            {/* Draw Rate Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-yellow-600 font-medium">Draws</span>
                <span>{stats?.draws || 0} ({drawPercentage}%)</span>
              </div>
              <Progress value={drawPercentage} className="h-2" />
            </div>

            {/* Loss Rate Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-red-600 font-medium">Losses</span>
                <span>{stats?.losses || 0} ({lossPercentage}%)</span>
              </div>
              <Progress value={lossPercentage} className="h-2" />
            </div>

            <Separator />

            {/* Total Matches */}
            <div className="text-center">
              <p className="text-2xl font-bold">{stats?.totalMatches || 0}</p>
              <p className="text-sm text-muted-foreground">Total Matches Played</p>
            </div>
          </CardContent>
        </Card>

        {/* Goals Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Goals Analysis</CardTitle>
            <CardDescription>
              Offensive and defensive performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Goals For */}
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm text-green-600 font-medium">Goals Scored</p>
                <p className="text-2xl font-bold text-green-700">{stats?.goalsFor || 0}</p>
                <p className="text-xs text-green-600">Avg: {averageGoalsFor} per match</p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>

            {/* Goals Against */}
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div>
                <p className="text-sm text-red-600 font-medium">Goals Conceded</p>
                <p className="text-2xl font-bold text-red-700">{stats?.goalsAgainst || 0}</p>
                <p className="text-xs text-red-600">Avg: {averageGoalsAgainst} per match</p>
              </div>
              <Shield className="h-8 w-8 text-red-600" />
            </div>

            {/* Goal Difference */}
            <div className={`flex items-center justify-between p-4 rounded-lg ${
              goalDifference >= 0 ? 'bg-blue-50' : 'bg-gray-50'
            }`}>
              <div>
                <p className={`text-sm font-medium ${
                  goalDifference >= 0 ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  Goal Difference
                </p>
                <p className={`text-2xl font-bold ${
                  goalDifference >= 0 ? 'text-blue-700' : 'text-gray-700'
                }`}>
                  {goalDifference > 0 ? `+${goalDifference}` : goalDifference}
                </p>
              </div>
              {goalDifference >= 0 ? (
                <TrendingUp className="h-8 w-8 text-blue-600" />
              ) : (
                <TrendingDown className="h-8 w-8 text-gray-600" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {achievements.map((achievement) => {
          const IconComponent = achievement.icon
          return (
            <Card key={achievement.title}>
              <CardContent className="p-6 text-center">
                <div className="flex flex-col items-center space-y-3">
                  <div className="p-3 rounded-full bg-gray-50">
                    <IconComponent className={`h-6 w-6 ${achievement.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {achievement.title}
                    </p>
                    <p className="text-lg font-bold">{achievement.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Performance Rating */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Performance Rating</CardTitle>
          <CardDescription>
            Composite score based on wins, goals, and squad strength
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Performance Score</span>
              <span className="text-2xl font-bold">{Math.round(performanceRating)}/100</span>
            </div>
            <Progress value={performanceRating} className="h-3" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <p className="font-medium">Win Contribution</p>
                <p className="text-muted-foreground">{Math.round(winPercentage * 0.5)}/50</p>
              </div>
              <div className="text-center">
                <p className="font-medium">Goal Difference</p>
                <p className="text-muted-foreground">{Math.round(Math.min(goalDifference + 50, 100) * 0.3)}/30</p>
              </div>
              <div className="text-center">
                <p className="font-medium">Squad Strength</p>
                <p className="text-muted-foreground">
                  {Math.round((team.playerCount || 0) > 15 ? 20 : (team.playerCount || 0) * 1.33)}/20
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Performer */}
      {stats?.topScorer && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Top Performer</CardTitle>
            <CardDescription>
              Leading scorer for the team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
              <div>
                <p className="font-semibold">{stats.topScorer.playerName}</p>
                <p className="text-sm text-muted-foreground">Leading Scorer</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-yellow-600">{stats.topScorer.goals}</p>
                <p className="text-sm text-yellow-600">Goals</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Statistics State */}
      {(!stats || stats.totalMatches === 0) && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No Statistics Available
              </h3>
              <p className="text-sm text-muted-foreground">
                Statistics will appear once the team starts playing matches.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default TeamStatisticsOverview
