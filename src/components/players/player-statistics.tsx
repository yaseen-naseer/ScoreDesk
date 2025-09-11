'use client'

/**
 * Player Statistics Component
 * Detailed player performance statistics and analytics
 */

import React from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Shield, 
  Zap,
  Award,
  Activity,
  Calendar,
  Clock,
  Star,
  Trophy
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { type PlayerProfile, type PlayerStatistics } from '@/lib/services/player-service'

interface PlayerStatisticsProps {
  player: PlayerProfile
  className?: string
}

// Mock data for demonstration
const mockDetailedStats = {
  // Season totals
  season: {
    matchesPlayed: 15,
    goals: 8,
    assists: 5,
    yellowCards: 2,
    redCards: 0,
    minutesPlayed: 1350,
    averageRating: 7.8,
    cleanSheets: 0,
    saves: 0,
    tackles: 45,
    interceptions: 32,
    passesCompleted: 450,
    passAccuracy: 85.2,
    shotsOnTarget: 12,
    shotsOffTarget: 8
  },
  // Monthly breakdown
  monthly: [
    { month: 'Jan', goals: 2, assists: 1, rating: 7.5, matches: 3 },
    { month: 'Feb', goals: 3, assists: 2, rating: 8.0, matches: 4 },
    { month: 'Mar', goals: 3, assists: 2, rating: 8.2, matches: 4 },
    { month: 'Apr', goals: 0, assists: 0, rating: 7.0, matches: 2 },
    { month: 'May', goals: 0, assists: 0, rating: 0, matches: 0 },
    { month: 'Jun', goals: 0, assists: 0, rating: 0, matches: 0 }
  ],
  // Position-specific stats
  positionStats: {
    goalkeeper: {
      cleanSheets: 0,
      saves: 0,
      goalsConceded: 0,
      savePercentage: 0
    },
    defender: {
      tackles: 45,
      interceptions: 32,
      clearances: 28,
      blocks: 12
    },
    midfielder: {
      passesCompleted: 450,
      passAccuracy: 85.2,
      keyPasses: 18,
      crosses: 25
    },
    forward: {
      goals: 8,
      assists: 5,
      shotsOnTarget: 12,
      shotsOffTarget: 8,
      shotAccuracy: 60.0
    }
  },
  // Performance trends
  trends: {
    goalsPerMatch: 0.53,
    assistsPerMatch: 0.33,
    ratingTrend: 'up',
    formTrend: 'stable'
  }
}

export function PlayerStatistics({ player, className }: PlayerStatisticsProps) {
  const stats = mockDetailedStats
  const positionStats = stats.positionStats[player.position as keyof typeof stats.positionStats]

  const getPerformanceColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600'
    if (rating >= 7) return 'text-blue-600'
    if (rating >= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />
      default: return <Activity className="h-4 w-4 text-blue-500" />
    }
  }

  return (
    <div className={className}>
      {/* Performance Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Overview
          </CardTitle>
          <CardDescription>
            Key performance indicators and trends for {player.full_name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Goals */}
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <Target className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-700">{stats.season.goals}</div>
              <div className="text-sm text-orange-600">Goals</div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats.trends.goalsPerMatch.toFixed(2)} per match
              </div>
            </div>

            {/* Assists */}
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Zap className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-700">{stats.season.assists}</div>
              <div className="text-sm text-blue-600">Assists</div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats.trends.assistsPerMatch.toFixed(2)} per match
              </div>
            </div>

            {/* Rating */}
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Star className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-700">{stats.season.averageRating}</div>
              <div className="text-sm text-green-600">Avg Rating</div>
              <div className="flex items-center justify-center gap-1 mt-1">
                {getTrendIcon(stats.trends.ratingTrend)}
                <span className="text-xs text-muted-foreground">Trending {stats.trends.ratingTrend}</span>
              </div>
            </div>

            {/* Matches */}
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Calendar className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-700">{stats.season.matchesPlayed}</div>
              <div className="text-sm text-purple-600">Matches</div>
              <div className="text-xs text-muted-foreground mt-1">
                {Math.round(stats.season.minutesPlayed / stats.season.matchesPlayed)} min avg
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Position-Specific Statistics */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {player.position.charAt(0).toUpperCase() + player.position.slice(1)} Statistics
          </CardTitle>
          <CardDescription>
            Detailed statistics specific to {player.position} position
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {player.position === 'goalkeeper' && (
              <>
                <div className="space-y-4">
                  <h4 className="font-medium text-yellow-600">Goalkeeper Stats</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Clean Sheets</span>
                      <span className="font-medium">{positionStats.cleanSheets}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Saves</span>
                      <span className="font-medium">{positionStats.saves}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Goals Conceded</span>
                      <span className="font-medium">{positionStats.goalsConceded}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Save Percentage</span>
                      <span className="font-medium">{positionStats.savePercentage}%</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {player.position === 'defender' && (
              <>
                <div className="space-y-4">
                  <h4 className="font-medium text-blue-600">Defensive Stats</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Tackles</span>
                      <span className="font-medium">{positionStats.tackles}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Interceptions</span>
                      <span className="font-medium">{positionStats.interceptions}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Clearances</span>
                      <span className="font-medium">{positionStats.clearances}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Blocks</span>
                      <span className="font-medium">{positionStats.blocks}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {player.position === 'midfielder' && (
              <>
                <div className="space-y-4">
                  <h4 className="font-medium text-green-600">Midfield Stats</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Passes Completed</span>
                      <span className="font-medium">{positionStats.passesCompleted}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Pass Accuracy</span>
                      <span className="font-medium">{positionStats.passAccuracy}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Key Passes</span>
                      <span className="font-medium">{positionStats.keyPasses}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Crosses</span>
                      <span className="font-medium">{positionStats.crosses}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {player.position === 'forward' && (
              <>
                <div className="space-y-4">
                  <h4 className="font-medium text-red-600">Attacking Stats</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Goals</span>
                      <span className="font-medium">{positionStats.goals}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Assists</span>
                      <span className="font-medium">{positionStats.assists}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Shots on Target</span>
                      <span className="font-medium">{positionStats.shotsOnTarget}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Shot Accuracy</span>
                      <span className="font-medium">{positionStats.shotAccuracy}%</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Common stats for all positions */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-600">General Stats</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Minutes Played</span>
                  <span className="font-medium">{stats.season.minutesPlayed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Yellow Cards</span>
                  <span className="font-medium">{stats.season.yellowCards}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Red Cards</span>
                  <span className="font-medium">{stats.season.redCards}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Average Rating</span>
                  <span className={`font-medium ${getPerformanceColor(stats.season.averageRating)}`}>
                    {stats.season.averageRating}/10
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Performance */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Monthly Performance
          </CardTitle>
          <CardDescription>
            Performance breakdown by month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.monthly.map((month, index) => (
              <div key={month.month} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold">{month.month}</div>
                    <div className="text-xs text-muted-foreground">{month.matches} matches</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-sm font-medium text-orange-600">{month.goals}</div>
                      <div className="text-xs text-muted-foreground">Goals</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-blue-600">{month.assists}</div>
                      <div className="text-xs text-muted-foreground">Assists</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${getPerformanceColor(month.rating)}`}>
                    {month.rating > 0 ? month.rating : 'N/A'}
                  </span>
                  <span className="text-xs text-muted-foreground">Rating</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Trends
          </CardTitle>
          <CardDescription>
            Recent performance trends and form analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Goals Trend */}
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <Target className="h-6 w-6 text-orange-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-orange-700">
                {stats.trends.goalsPerMatch.toFixed(2)}
              </div>
              <div className="text-sm text-orange-600">Goals per Match</div>
              <div className="flex items-center justify-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-xs text-muted-foreground">+0.1 from last month</span>
              </div>
            </div>

            {/* Assists Trend */}
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Zap className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-blue-700">
                {stats.trends.assistsPerMatch.toFixed(2)}
              </div>
              <div className="text-sm text-blue-600">Assists per Match</div>
              <div className="flex items-center justify-center gap-1 mt-1">
                <Activity className="h-3 w-3 text-blue-500" />
                <span className="text-xs text-muted-foreground">Stable</span>
              </div>
            </div>

            {/* Form Trend */}
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Trophy className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-green-700">Good</div>
              <div className="text-sm text-green-600">Current Form</div>
              <div className="flex items-center justify-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-xs text-muted-foreground">Improving</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PlayerStatistics
