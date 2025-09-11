'use client'

/**
 * Team Performance Dashboard Component
 * Comprehensive team performance analytics with key metrics and insights
 */

import React, { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Trophy, 
  Users, 
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Zap,
  Shield,
  Award,
  Star,
  Clock,
  MapPin,
  Phone,
  Mail,
  Globe,
  Download,
  RefreshCw,
  Filter,
  Search,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { teamService, type TeamProfile } from '@/lib/services/team-service'
import { playerService, type PlayerProfile } from '@/lib/services/player-service'
import { medicalRecordsService } from '@/lib/services/medical-records-service'

interface TeamPerformanceDashboardProps {
  teamId: string
  className?: string
}

interface TeamPerformanceMetrics {
  // Basic Stats
  totalMatches: number
  wins: number
  draws: number
  losses: number
  winRate: number
  
  // Goals & Scoring
  goalsScored: number
  goalsConceded: number
  goalDifference: number
  averageGoalsPerMatch: number
  
  // Player Stats
  totalPlayers: number
  averageAge: number
  squadValue: number
  
  // Performance Trends
  formTrend: 'up' | 'down' | 'stable'
  recentForm: string // Last 5 matches: W-W-L-D-W
  homeRecord: { wins: number; draws: number; losses: number }
  awayRecord: { wins: number; draws: number; losses: number }
  
  // Advanced Metrics
  possessionAverage: number
  shotsPerMatch: number
  shotsOnTargetPerMatch: number
  passAccuracy: number
  cleanSheets: number
  cardsPerMatch: number
  
  // Season Progress
  points: number
  position: number
  gamesPlayed: number
  gamesRemaining: number
  pointsPerGame: number
}

interface MatchPerformance {
  id: string
  date: string
  opponent: string
  venue: 'home' | 'away'
  result: 'W' | 'D' | 'L'
  score: string
  goalsScored: number
  goalsConceded: number
  possession: number
  shots: number
  shotsOnTarget: number
  passes: number
  passAccuracy: number
  cards: number
  rating: number
}

interface PlayerPerformance {
  player: PlayerProfile
  matchesPlayed: number
  goals: number
  assists: number
  averageRating: number
  minutesPlayed: number
  form: 'excellent' | 'good' | 'average' | 'poor'
}

interface TeamInsights {
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  keyPlayers: PlayerPerformance[]
  upcomingFixtures: Array<{
    date: string
    opponent: string
    venue: 'home' | 'away'
    importance: 'high' | 'medium' | 'low'
  }>
}

export function TeamPerformanceDashboard({ teamId, className }: TeamPerformanceDashboardProps) {
  const { toast } = useToast()
  const [team, setTeam] = useState<TeamProfile | null>(null)
  const [players, setPlayers] = useState<PlayerProfile[]>([])
  const [metrics, setMetrics] = useState<TeamPerformanceMetrics | null>(null)
  const [matchHistory, setMatchHistory] = useState<MatchPerformance[]>([])
  const [insights, setInsights] = useState<TeamInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('season')
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    loadTeamData()
  }, [teamId, selectedPeriod])

  const loadTeamData = async () => {
    try {
      setLoading(true)
      
      // Load team information
      const teamData = await teamService.getTeam(teamId)
      if (teamData) {
        setTeam(teamData)
      }

      // Load players
      const playersData = await playerService.getTeamPlayers(teamId)
      setPlayers(playersData)

      // Load performance metrics (mock data for demonstration)
      const mockMetrics = generateMockMetrics()
      setMetrics(mockMetrics)

      // Load match history (mock data)
      const mockMatchHistory = generateMockMatchHistory()
      setMatchHistory(mockMatchHistory)

      // Load insights (mock data)
      const mockInsights = generateMockInsights(playersData)
      setInsights(mockInsights)

    } catch (error) {
      console.error('Error loading team data:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load team performance data'
      })
    } finally {
      setLoading(false)
    }
  }

  const generateMockMetrics = (): TeamPerformanceMetrics => ({
    totalMatches: 15,
    wins: 8,
    draws: 4,
    losses: 3,
    winRate: 53.3,
    goalsScored: 28,
    goalsConceded: 18,
    goalDifference: 10,
    averageGoalsPerMatch: 1.87,
    totalPlayers: 25,
    averageAge: 26.4,
    squadValue: 2500000,
    formTrend: 'up',
    recentForm: 'W-W-L-D-W',
    homeRecord: { wins: 5, draws: 2, losses: 1 },
    awayRecord: { wins: 3, draws: 2, losses: 2 },
    possessionAverage: 58.2,
    shotsPerMatch: 12.4,
    shotsOnTargetPerMatch: 5.8,
    passAccuracy: 84.6,
    cleanSheets: 6,
    cardsPerMatch: 2.1,
    points: 28,
    position: 3,
    gamesPlayed: 15,
    gamesRemaining: 7,
    pointsPerGame: 1.87
  })

  const generateMockMatchHistory = (): MatchPerformance[] => [
    {
      id: '1',
      date: '2024-03-15',
      opponent: 'Real Madrid FC',
      venue: 'home',
      result: 'W',
      score: '2-1',
      goalsScored: 2,
      goalsConceded: 1,
      possession: 62,
      shots: 14,
      shotsOnTarget: 7,
      passes: 485,
      passAccuracy: 87,
      cards: 2,
      rating: 8.2
    },
    {
      id: '2',
      date: '2024-03-10',
      opponent: 'Barcelona United',
      venue: 'away',
      result: 'L',
      score: '0-3',
      goalsScored: 0,
      goalsConceded: 3,
      possession: 45,
      shots: 8,
      shotsOnTarget: 2,
      passes: 320,
      passAccuracy: 78,
      cards: 4,
      rating: 5.8
    },
    {
      id: '3',
      date: '2024-03-05',
      opponent: 'Arsenal Tigers',
      venue: 'home',
      result: 'W',
      score: '3-2',
      goalsScored: 3,
      goalsConceded: 2,
      possession: 58,
      shots: 16,
      shotsOnTarget: 8,
      passes: 520,
      passAccuracy: 85,
      cards: 1,
      rating: 8.5
    },
    {
      id: '4',
      date: '2024-02-28',
      opponent: 'Chelsea Lions',
      venue: 'away',
      result: 'D',
      score: '1-1',
      goalsScored: 1,
      goalsConceded: 1,
      possession: 52,
      shots: 10,
      shotsOnTarget: 4,
      passes: 420,
      passAccuracy: 82,
      cards: 3,
      rating: 7.0
    },
    {
      id: '5',
      date: '2024-02-23',
      opponent: 'Liverpool Stars',
      venue: 'home',
      result: 'W',
      score: '2-0',
      goalsScored: 2,
      goalsConceded: 0,
      possession: 65,
      shots: 18,
      shotsOnTarget: 9,
      passes: 580,
      passAccuracy: 89,
      cards: 1,
      rating: 9.1
    }
  ]

  const generateMockInsights = (players: PlayerProfile[]): TeamInsights => ({
    strengths: [
      'Strong defensive record with 6 clean sheets',
      'Excellent home form (5 wins, 2 draws, 1 loss)',
      'High pass accuracy (84.6%)',
      'Good goal difference (+10)',
      'Strong squad depth with 25 players'
    ],
    weaknesses: [
      'Inconsistent away form',
      'High card count (2.1 per match)',
      'Limited shots on target conversion',
      'Possession dominance not always translating to wins'
    ],
    recommendations: [
      'Focus on improving away form through tactical adjustments',
      'Work on discipline to reduce card count',
      'Improve finishing in training sessions',
      'Maintain possession advantage while increasing goal threat'
    ],
    keyPlayers: players.slice(0, 5).map(player => ({
      player,
      matchesPlayed: Math.floor(Math.random() * 15) + 5,
      goals: Math.floor(Math.random() * 8) + 1,
      assists: Math.floor(Math.random() * 5) + 1,
      averageRating: 7.5 + Math.random() * 1.5,
      minutesPlayed: Math.floor(Math.random() * 1000) + 500,
      form: ['excellent', 'good', 'average', 'poor'][Math.floor(Math.random() * 4)] as any
    })),
    upcomingFixtures: [
      {
        date: '2024-03-22',
        opponent: 'Manchester City',
        venue: 'away',
        importance: 'high'
      },
      {
        date: '2024-03-29',
        opponent: 'Tottenham Hotspur',
        venue: 'home',
        importance: 'medium'
      },
      {
        date: '2024-04-05',
        opponent: 'Newcastle United',
        venue: 'away',
        importance: 'medium'
      }
    ]
  })

  const getFormColor = (form: string) => {
    switch (form) {
      case 'excellent': return 'text-green-600'
      case 'good': return 'text-blue-600'
      case 'average': return 'text-yellow-600'
      case 'poor': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getResultColor = (result: string) => {
    switch (result) {
      case 'W': return 'bg-green-100 text-green-800'
      case 'D': return 'bg-yellow-100 text-yellow-800'
      case 'L': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className={className}>
        <div className="space-y-6">
          <div className="h-8 bg-muted animate-pulse rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!team || !metrics) {
    return (
      <div className={className}>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Unable to load team performance data. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Team Performance Dashboard</h2>
            <p className="text-muted-foreground">
              Comprehensive performance analytics for {team.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="season">This Season</SelectItem>
                <SelectItem value="last-5">Last 5 Matches</SelectItem>
                <SelectItem value="last-10">Last 10 Matches</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={loadTeamData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Key Performance Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Trophy className="h-8 w-8 text-yellow-600" />
                <div>
                  <div className="text-2xl font-bold">{metrics.winRate.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Win Rate</div>
                </div>
              </div>
              <div className="mt-2">
                <Progress value={metrics.winRate} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Target className="h-8 w-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">{metrics.goalDifference > 0 ? '+' : ''}{metrics.goalDifference}</div>
                  <div className="text-sm text-muted-foreground">Goal Difference</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {metrics.goalsScored} scored, {metrics.goalsConceded} conceded
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{metrics.points}</div>
                  <div className="text-sm text-muted-foreground">Points</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Position #{metrics.position} • {metrics.pointsPerGame.toFixed(2)} PPG
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Activity className="h-8 w-8 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold">{metrics.recentForm}</div>
                  <div className="text-sm text-muted-foreground">Recent Form</div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1">
                {metrics.formTrend === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : metrics.formTrend === 'down' ? (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                ) : (
                  <Activity className="h-4 w-4 text-blue-600" />
                )}
                <span className="text-xs text-muted-foreground capitalize">{metrics.formTrend}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="matches">Match History</TabsTrigger>
            <TabsTrigger value="players">Player Performance</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Season Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Season Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-700">{metrics.wins}</div>
                      <div className="text-sm text-green-600">Wins</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-700">{metrics.draws}</div>
                      <div className="text-sm text-yellow-600">Draws</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-700">{metrics.losses}</div>
                      <div className="text-sm text-red-600">Losses</div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Games Played</span>
                      <span className="font-medium">{metrics.gamesPlayed}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Games Remaining</span>
                      <span className="font-medium">{metrics.gamesRemaining}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Points per Game</span>
                      <span className="font-medium">{metrics.pointsPerGame.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Average Possession</span>
                      <div className="flex items-center gap-2">
                        <Progress value={metrics.possessionAverage} className="w-20 h-2" />
                        <span className="font-medium">{metrics.possessionAverage.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Pass Accuracy</span>
                      <div className="flex items-center gap-2">
                        <Progress value={metrics.passAccuracy} className="w-20 h-2" />
                        <span className="font-medium">{metrics.passAccuracy.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Shots per Match</span>
                      <span className="font-medium">{metrics.shotsPerMatch.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Clean Sheets</span>
                      <span className="font-medium">{metrics.cleanSheets}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Home vs Away Record */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Home vs Away Record
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-800">Home</h4>
                      <div className="text-2xl font-bold text-blue-700">
                        {metrics.homeRecord.wins}W-{metrics.homeRecord.draws}D-{metrics.homeRecord.losses}L
                      </div>
                      <div className="text-sm text-blue-600">
                        {((metrics.homeRecord.wins / (metrics.homeRecord.wins + metrics.homeRecord.draws + metrics.homeRecord.losses)) * 100).toFixed(1)}% win rate
                      </div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-800">Away</h4>
                      <div className="text-2xl font-bold text-gray-700">
                        {metrics.awayRecord.wins}W-{metrics.awayRecord.draws}D-{metrics.awayRecord.losses}L
                      </div>
                      <div className="text-sm text-gray-600">
                        {((metrics.awayRecord.wins / (metrics.awayRecord.wins + metrics.awayRecord.draws + metrics.awayRecord.losses)) * 100).toFixed(1)}% win rate
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Squad Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Squad Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Players</span>
                      <span className="font-medium">{metrics.totalPlayers}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Average Age</span>
                      <span className="font-medium">{metrics.averageAge.toFixed(1)} years</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Squad Value</span>
                      <span className="font-medium">${(metrics.squadValue / 1000000).toFixed(1)}M</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Match History Tab */}
          <TabsContent value="matches">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Recent Match History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {matchHistory.map((match) => (
                    <div key={match.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Badge className={getResultColor(match.result)}>
                          {match.result}
                        </Badge>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{match.opponent}</span>
                            <Badge variant="outline" className="text-xs">
                              {match.venue}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(match.date).toLocaleDateString()} • {match.score}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className="font-medium">{match.possession}%</div>
                          <div className="text-xs text-muted-foreground">Possession</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">{match.shots}</div>
                          <div className="text-xs text-muted-foreground">Shots</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">{match.passAccuracy}%</div>
                          <div className="text-xs text-muted-foreground">Pass Acc</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-green-600">{match.rating}</div>
                          <div className="text-xs text-muted-foreground">Rating</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Player Performance Tab */}
          <TabsContent value="players">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights?.keyPlayers.map((playerPerf, index) => (
                    <div key={playerPerf.player.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-muted-foreground">#{index + 1}</div>
                        </div>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={playerPerf.player.profile_image_url || ''} />
                          <AvatarFallback>
                            {playerPerf.player.first_name[0]}{playerPerf.player.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{playerPerf.player.full_name}</span>
                            <Badge variant="outline">{playerPerf.player.position}</Badge>
                            <Badge className={getFormColor(playerPerf.form)}>
                              {playerPerf.form}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {playerPerf.matchesPlayed} matches • {playerPerf.minutesPlayed} minutes
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className="font-medium text-orange-600">{playerPerf.goals}</div>
                          <div className="text-xs text-muted-foreground">Goals</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-blue-600">{playerPerf.assists}</div>
                          <div className="text-xs text-muted-foreground">Assists</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-green-600">{playerPerf.averageRating.toFixed(1)}</div>
                          <div className="text-xs text-muted-foreground">Rating</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Performance Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Wins</span>
                        <span className="font-medium">{metrics.wins}</span>
                      </div>
                      <Progress value={(metrics.wins / metrics.totalMatches) * 100} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Draws</span>
                        <span className="font-medium">{metrics.draws}</span>
                      </div>
                      <Progress value={(metrics.draws / metrics.totalMatches) * 100} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Losses</span>
                        <span className="font-medium">{metrics.losses}</span>
                      </div>
                      <Progress value={(metrics.losses / metrics.totalMatches) * 100} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5" />
                    Performance Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <LineChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Performance trend charts will appear here</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Strengths & Weaknesses */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Strengths & Weaknesses
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-green-600 mb-2">Strengths</h4>
                    <ul className="space-y-1">
                      {insights?.strengths.map((strength, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium text-red-600 mb-2">Weaknesses</h4>
                    <ul className="space-y-1">
                      {insights?.weaknesses.map((weakness, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                          <span>{weakness}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {insights?.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                        <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                        <span className="text-sm">{recommendation}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Upcoming Fixtures */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Upcoming Fixtures
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {insights?.upcomingFixtures.map((fixture, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className="text-sm text-muted-foreground">
                              {new Date(fixture.date).toLocaleDateString()}
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{fixture.opponent}</span>
                              <Badge variant="outline" className="text-xs">
                                {fixture.venue}
                              </Badge>
                              <Badge className={getImportanceColor(fixture.importance)}>
                                {fixture.importance}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default TeamPerformanceDashboard
