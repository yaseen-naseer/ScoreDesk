'use client'

/**
 * Team Performance Analytics Component
 * Advanced analytics and trends for team performance
 */

import React from 'react'
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  Calendar,
  Trophy,
  Target,
  Users,
  MapPin,
  Clock,
  Flame,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { type TeamProfile } from '@/lib/services/team-service'

interface TeamPerformanceAnalyticsProps {
  team: TeamProfile
  className?: string
}

// Mock data for analytics (in real app, this would come from API)
const mockMatchHistory = [
  { date: '2024-03-15', opponent: 'Real Madrid FC', result: 'W', score: '2-1', venue: 'home' },
  { date: '2024-03-10', opponent: 'Barcelona United', result: 'L', score: '0-3', venue: 'away' },
  { date: '2024-03-05', opponent: 'Arsenal Tigers', result: 'W', score: '3-2', venue: 'home' },
  { date: '2024-02-28', opponent: 'Chelsea Lions', result: 'D', score: '1-1', venue: 'away' },
  { date: '2024-02-23', opponent: 'Liverpool Stars', result: 'W', score: '2-0', venue: 'home' },
]

const mockMonthlyStats = [
  { month: 'Jan', wins: 3, draws: 1, losses: 2 },
  { month: 'Feb', wins: 4, draws: 2, losses: 1 },
  { month: 'Mar', wins: 2, draws: 1, losses: 1 },
]

const mockPlayerPerformance = [
  { name: 'John Smith', position: 'Forward', goals: 8, assists: 3, rating: 8.5 },
  { name: 'Mike Johnson', position: 'Midfielder', goals: 4, assists: 7, rating: 8.2 },
  { name: 'David Wilson', position: 'Defender', goals: 1, assists: 2, rating: 7.8 },
]

export function TeamPerformanceAnalytics({ team, className }: TeamPerformanceAnalyticsProps) {
  const stats = team.statistics

  // Calculate form from recent matches
  const recentForm = mockMatchHistory.slice(0, 5).map(match => match.result)
  const formRating = recentForm.reduce((acc, result) => {
    if (result === 'W') return acc + 3
    if (result === 'D') return acc + 1
    return acc
  }, 0) / (recentForm.length * 3) * 100

  // Calculate home vs away performance
  const homeMatches = mockMatchHistory.filter(m => m.venue === 'home')
  const awayMatches = mockMatchHistory.filter(m => m.venue === 'away')
  const homeWins = homeMatches.filter(m => m.result === 'W').length
  const awayWins = awayMatches.filter(m => m.result === 'W').length

  return (
    <div className={className}>
      {/* Recent Form Analysis */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5" />
            Recent Form
          </CardTitle>
          <CardDescription>
            Last 5 matches performance and trend analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Form Rating */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Form Rating</span>
              <Badge variant={formRating > 70 ? 'default' : formRating > 40 ? 'secondary' : 'destructive'}>
                {Math.round(formRating)}%
              </Badge>
            </div>
            <Progress value={formRating} className="h-2" />
            
            {/* Form Sequence */}
            <div className="flex items-center justify-center gap-2 mt-4">
              {recentForm.map((result, index) => (
                <div
                  key={index}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    result === 'W' ? 'bg-green-500' :
                    result === 'D' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                >
                  {result}
                </div>
              ))}
            </div>
            
            <p className="text-xs text-center text-muted-foreground">
              Most recent match on the right
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Match History */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Matches
          </CardTitle>
          <CardDescription>
            Detailed results from recent fixtures
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockMatchHistory.map((match, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge 
                    variant={match.result === 'W' ? 'default' : match.result === 'D' ? 'secondary' : 'destructive'}
                    className="w-6 h-6 p-0 flex items-center justify-center text-xs"
                  >
                    {match.result}
                  </Badge>
                  <div>
                    <p className="font-medium">{match.opponent}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{match.venue === 'home' ? 'Home' : 'Away'}</span>
                      <Clock className="h-3 w-3 ml-2" />
                      <span>{new Date(match.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{match.score}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Home vs Away Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Home vs Away
            </CardTitle>
            <CardDescription>
              Performance comparison by venue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Home Performance */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-600">Home Matches</span>
                <span className="text-sm">{homeWins}/{homeMatches.length} wins</span>
              </div>
              <Progress 
                value={homeMatches.length ? (homeWins / homeMatches.length) * 100 : 0} 
                className="h-2" 
              />
            </div>

            {/* Away Performance */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-600">Away Matches</span>
                <span className="text-sm">{awayWins}/{awayMatches.length} wins</span>
              </div>
              <Progress 
                value={awayMatches.length ? (awayWins / awayMatches.length) * 100 : 0} 
                className="h-2" 
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Home</p>
                <p className="text-lg font-bold text-blue-700">
                  {homeMatches.length ? Math.round((homeWins / homeMatches.length) * 100) : 0}%
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Away</p>
                <p className="text-lg font-bold text-green-700">
                  {awayMatches.length ? Math.round((awayWins / awayMatches.length) * 100) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Monthly Trends
            </CardTitle>
            <CardDescription>
              Performance over the last 3 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockMonthlyStats.map((month, index) => {
                const totalMatches = month.wins + month.draws + month.losses
                const winRate = totalMatches ? (month.wins / totalMatches) * 100 : 0
                const trend = index > 0 ? 
                  winRate - (mockMonthlyStats[index - 1].wins / 
                  (mockMonthlyStats[index - 1].wins + mockMonthlyStats[index - 1].draws + mockMonthlyStats[index - 1].losses) * 100)
                  : 0

                return (
                  <div key={month.month} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{month.month} 2024</p>
                      <p className="text-xs text-muted-foreground">
                        {month.wins}W - {month.draws}D - {month.losses}L
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{Math.round(winRate)}%</span>
                      {index > 0 && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          {trend > 0 ? (
                            <TrendingUp className="h-3 w-3 text-green-500" />
                          ) : trend < 0 ? (
                            <TrendingDown className="h-3 w-3 text-red-500" />
                          ) : (
                            <Minus className="h-3 w-3 text-gray-500" />
                          )}
                          <span className="text-xs">
                            {Math.abs(Math.round(trend))}%
                          </span>
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Top Performers
          </CardTitle>
          <CardDescription>
            Leading players by performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockPlayerPerformance.map((player, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-bold">
                    {index + 1}
                  </div>
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {player.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{player.name}</p>
                    <p className="text-sm text-muted-foreground">{player.position}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-orange-600">{player.goals}</p>
                    <p className="text-xs text-muted-foreground">Goals</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-blue-600">{player.assists}</p>
                    <p className="text-xs text-muted-foreground">Assists</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-600">{player.rating}</p>
                    <p className="text-xs text-muted-foreground">Rating</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Performance Insights
          </CardTitle>
          <CardDescription>
            Key insights and recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Strengths */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Strengths</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Strong home performance ({homeWins}/{homeMatches.length} wins)</li>
                <li>• Consistent goal scoring with {stats?.goalsFor || 0} goals total</li>
                <li>• Well-balanced squad with {team.playerCount || 0} active players</li>
              </ul>
            </div>

            {/* Areas for Improvement */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">Areas for Improvement</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Away form could be strengthened ({awayWins}/{awayMatches.length} wins)</li>
                <li>• Consider tactical adjustments for defensive stability</li>
                <li>• Focus on converting draws to wins</li>
              </ul>
            </div>

            {/* Recommendations */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Recommendations</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Analyze successful home strategies for away games</li>
                <li>• Consider squad rotation to maintain fitness</li>
                <li>• Focus on set-piece training for goal conversion</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default TeamPerformanceAnalytics
