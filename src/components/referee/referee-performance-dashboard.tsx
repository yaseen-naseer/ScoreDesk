'use client'

import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  Award, 
  Calendar, 
  Star, 
  Users, 
  BarChart3, 
  FileText, 
  Target,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trophy,
  Activity,
  MapPin,
  UserCheck
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { 
  RefereePerformanceService,
  RefereePerformanceMetrics,
  MatchPerformanceRecord,
  RefereeRanking,
  PerformanceReport,
  refereePerformanceService 
} from '@/lib/services/referee-performance-service'

interface RefereePerformanceDashboardProps {
  refereeId: string
  refereeName: string
  onPerformanceUpdate?: () => void
}

export function RefereePerformanceDashboard({ 
  refereeId, 
  refereeName,
  onPerformanceUpdate 
}: RefereePerformanceDashboardProps) {
  const { toast } = useToast()
  const [metrics, setMetrics] = useState<RefereePerformanceMetrics | null>(null)
  const [performanceHistory, setPerformanceHistory] = useState<MatchPerformanceRecord[]>([])
  const [rankings, setRankings] = useState<RefereeRanking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('1_year')
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)

  useEffect(() => {
    loadPerformanceData()
  }, [refereeId, selectedPeriod])

  const loadPerformanceData = async () => {
    try {
      setIsLoading(true)
      
      const dateRange = getDateRange(selectedPeriod)
      
      // Load metrics
      const metricsData = await refereePerformanceService.getRefereePerformanceMetrics(
        refereeId, 
        dateRange.start, 
        dateRange.end
      )
      setMetrics(metricsData)

      // Load performance history
      const historyData = await refereePerformanceService.getMatchPerformanceHistory(refereeId, 20, 0)
      setPerformanceHistory(historyData)

      // Load rankings
      const rankingsData = await refereePerformanceService.getRefereeRankings()
      setRankings(rankingsData)

    } catch (error) {
      console.error('Error loading performance data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load performance data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getDateRange = (period: string) => {
    const now = new Date()
    let start: Date

    switch (period) {
      case '1_month':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '3_months':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case '6_months':
        start = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
        break
      case '1_year':
      default:
        start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
    }

    return {
      start: start.toISOString(),
      end: now.toISOString()
    }
  }

  const handleGenerateReport = async () => {
    try {
      setIsGeneratingReport(true)
      const dateRange = getDateRange(selectedPeriod)
      
      const result = await refereePerformanceService.generatePerformanceReport(
        refereeId,
        'current-user-id', // This should come from auth context
        {
          startDate: dateRange.start,
          endDate: dateRange.end
        }
      )

      if (result.success && result.report) {
        toast({
          title: 'Success',
          description: 'Performance report generated successfully'
        })
        // Here you would typically download or display the report
      } else {
        throw new Error(result.error || 'Failed to generate report')
      }
    } catch (error) {
      console.error('Error generating report:', error)
      toast({
        title: 'Error',
        description: 'Failed to generate performance report',
        variant: 'destructive'
      })
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const getPerformanceLevel = (rating: number) => {
    if (rating >= 4.5) return { level: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-50' }
    if (rating >= 3.5) return { level: 'Good', color: 'text-blue-600', bgColor: 'bg-blue-50' }
    if (rating >= 2.5) return { level: 'Satisfactory', color: 'text-yellow-600', bgColor: 'bg-yellow-50' }
    if (rating >= 1.5) return { level: 'Needs Improvement', color: 'text-orange-600', bgColor: 'bg-orange-50' }
    return { level: 'Poor', color: 'text-red-600', bgColor: 'bg-red-50' }
  }

  const getRankingPosition = () => {
    const refereeRanking = rankings.find(r => r.referee_id === refereeId)
    return refereeRanking?.rank || 0
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-8 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Performance Data</h3>
            <p className="text-muted-foreground mb-4">
              No performance data available for {refereeName}
            </p>
            <Button onClick={loadPerformanceData}>
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const performanceLevel = getPerformanceLevel(metrics.average_rating)
  const rankingPosition = getRankingPosition()

  return (
    <div className="space-y-6">
      {/* Header with Period Selection */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Dashboard</h2>
          <p className="text-muted-foreground">{refereeName}</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1_month">Last Month</SelectItem>
              <SelectItem value="3_months">Last 3 Months</SelectItem>
              <SelectItem value="6_months">Last 6 Months</SelectItem>
              <SelectItem value="1_year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={isGeneratingReport}>
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Performance Report</DialogTitle>
                <DialogDescription>
                  Generate a comprehensive performance report for {refereeName}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Report Period</Label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1_month">Last Month</SelectItem>
                      <SelectItem value="3_months">Last 3 Months</SelectItem>
                      <SelectItem value="6_months">Last 6 Months</SelectItem>
                      <SelectItem value="1_year">Last Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleGenerateReport} 
                  disabled={isGeneratingReport}
                  className="w-full"
                >
                  {isGeneratingReport ? 'Generating...' : 'Generate Report'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overall Rating</p>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold">{metrics.average_rating.toFixed(1)}</p>
                  <Badge variant="outline" className={performanceLevel.color}>
                    {performanceLevel.level}
                  </Badge>
                </div>
              </div>
              <div className={`p-3 rounded-full ${performanceLevel.bgColor}`}>
                <Star className={`h-6 w-6 ${performanceLevel.color}`} />
              </div>
            </div>
            <div className="mt-4">
              <Progress value={(metrics.average_rating / 5) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Matches</p>
                <p className="text-2xl font-bold">{metrics.total_matches}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-50">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {metrics.confirmed_assignments} confirmed assignments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ranking Position</p>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold">
                    {rankingPosition > 0 ? `#${rankingPosition}` : 'N/A'}
                  </p>
                  {rankingPosition > 0 && (
                    <Trophy className="h-5 w-5 text-yellow-500" />
                  )}
                </div>
              </div>
              <div className="p-3 rounded-full bg-yellow-50">
                <Award className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Out of {rankings.length} referees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Availability Rate</p>
                <p className="text-2xl font-bold">
                  {metrics.total_assignments > 0 
                    ? Math.round((metrics.confirmed_assignments / metrics.total_assignments) * 100)
                    : 0}%
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-50">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {metrics.declined_assignments} declined assignments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Performance Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">Match History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="career">Career</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Rating Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Rating Distribution</CardTitle>
                <CardDescription>Distribution of performance ratings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(metrics.rating_distribution).reverse().map(([rating, count]) => (
                    <div key={rating} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="flex">
                          {[...Array(parseInt(rating))].map((_, i) => (
                            <Star key={i} className="h-4 w-4 text-yellow-500 fill-current" />
                          ))}
                          {[...Array(5 - parseInt(rating))].map((_, i) => (
                            <Star key={i} className="h-4 w-4 text-gray-300" />
                          ))}
                        </div>
                        <span className="text-sm font-medium">{rating} Star{rating !== '1' ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Progress 
                          value={metrics.total_matches > 0 ? (count / metrics.total_matches) * 100 : 0} 
                          className="w-20 h-2" 
                        />
                        <span className="text-sm text-muted-foreground w-8">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Performance Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Performance by Category</CardTitle>
                <CardDescription>Average ratings by performance category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(metrics.performance_by_category).map(([category, data]) => (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">
                          {category.replace('_', ' ')}
                        </span>
                        <span className="text-sm font-bold">{data.average_rating.toFixed(1)}</span>
                      </div>
                      <Progress value={(data.average_rating / 5) * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Performance Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Performance</CardTitle>
              <CardDescription>Latest match performances</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {performanceHistory.slice(0, 6).map((match) => (
                  <div key={match.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="flex">
                          {[...Array(match.overall_rating)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 text-yellow-500 fill-current" />
                          ))}
                          {[...Array(5 - match.overall_rating)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 text-gray-300" />
                          ))}
                        </div>
                        <span className="font-medium">{match.overall_rating}</span>
                      </div>
                      <Badge variant="outline">{match.official_role.replace('_', ' ')}</Badge>
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="font-medium">{match.home_team} vs {match.away_team}</div>
                      <div className="text-muted-foreground">{match.tournament_name}</div>
                      <div className="text-muted-foreground">
                        {new Date(match.match_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Match Performance History</CardTitle>
              <CardDescription>Complete history of match performances</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performanceHistory.map((match) => (
                  <div key={match.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-medium">{match.home_team} vs {match.away_team}</div>
                        <div className="text-sm text-muted-foreground">
                          {match.tournament_name} • {new Date(match.match_date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex">
                          {[...Array(match.overall_rating)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 text-yellow-500 fill-current" />
                          ))}
                          {[...Array(5 - match.overall_rating)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 text-gray-300" />
                          ))}
                        </div>
                        <span className="font-bold">{match.overall_rating}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Role</div>
                        <div className="font-medium">{match.official_role.replace('_', ' ')}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Venue</div>
                        <div className="font-medium">{match.venue_name}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Evaluated</div>
                        <div className="font-medium">{new Date(match.evaluated_at).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Evaluator</div>
                        <div className="font-medium">{match.evaluated_by}</div>
                      </div>
                    </div>

                    {match.performance_notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm text-muted-foreground mb-1">Performance Notes</div>
                        <p className="text-sm">{match.performance_notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Workload Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Workload Analytics</CardTitle>
                <CardDescription>Match assignment patterns and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Average Matches per Month</span>
                    <span className="font-bold">{metrics.workload_analytics.average_matches_per_month}</span>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium mb-2">Busiest Months</div>
                    <div className="space-y-1">
                      {metrics.workload_analytics.busiest_months.map((month, index) => (
                        <div key={month} className="flex items-center justify-between text-sm">
                          <span>{month}</span>
                          <Badge variant="outline">#{index + 1}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Career Milestones */}
            <Card>
              <CardHeader>
                <CardTitle>Career Milestones</CardTitle>
                <CardDescription>Key achievements and statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Years Active</span>
                    <span className="font-bold">{metrics.career_milestones.total_years_active}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">First Match</span>
                    <span className="font-bold">
                      {metrics.career_milestones.first_match_date 
                        ? new Date(metrics.career_milestones.first_match_date).toLocaleDateString()
                        : 'N/A'
                      }
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Highest Rating</span>
                    <div className="flex items-center space-x-1">
                      <span className="font-bold">{metrics.career_milestones.highest_rated_match.rating}</span>
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="career" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Career Development</CardTitle>
              <CardDescription>Professional development and recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Alert>
                  <Target className="h-4 w-4" />
                  <AlertDescription>
                    Based on your performance data, focus on maintaining your excellent rating while 
                    increasing match volume to gain more experience.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Strengths</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>High overall performance rating</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Excellent availability and reliability</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Consistent performance across categories</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Development Areas</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <span>Increase match experience</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <span>Advanced training opportunities</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <span>Mentoring programs</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
