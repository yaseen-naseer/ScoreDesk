'use client'

import { useState, useEffect } from 'react'
import { 
  BarChart3, 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  Settings,
  MapPin,
  Users,
  Clock,
  DollarSign,
  Zap,
  Eye,
  Download,
  Upload
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { 
  ScheduleOptimizationService, 
  OptimizationCriteria, 
  OptimizationImprovements,
  VenueUtilization,
  RefereeWorkload
} from '@/lib/services/schedule-optimization-service'

interface ScheduleOptimizationPanelProps {
  tournamentId: string
  tournamentName: string
  onOptimizationComplete?: (result: any) => void
  className?: string
}

export function ScheduleOptimizationPanel({ 
  tournamentId, 
  tournamentName,
  onOptimizationComplete,
  className 
}: ScheduleOptimizationPanelProps) {
  const { toast } = useToast()
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [optimizationResult, setOptimizationResult] = useState<any>(null)
  const [venueUtilization, setVenueUtilization] = useState<VenueUtilization[]>([])
  const [refereeWorkload, setRefereeWorkload] = useState<RefereeWorkload[]>([])
  const [optimizationCriteria, setOptimizationCriteria] = useState<OptimizationCriteria>({
    prioritize_venue_utilization: true,
    balance_referee_workload: true,
    minimize_team_travel: false,
    optimize_rest_periods: true,
    reduce_conflicts: true,
    minimize_costs: false,
    respect_venue_capacity: true,
    consider_team_preferences: false
  })

  const optimizationService = new ScheduleOptimizationService()

  useEffect(() => {
    analyzeCurrentSchedule()
  }, [tournamentId])

  const analyzeCurrentSchedule = async () => {
    try {
      setIsAnalyzing(true)
      
      const [venueData, refereeData] = await Promise.all([
        optimizationService.analyzeVenueUtilization(tournamentId),
        optimizationService.analyzeRefereeWorkload(tournamentId)
      ])
      
      setVenueUtilization(venueData)
      setRefereeWorkload(refereeData)
      
    } catch (error) {
      console.error('Error analyzing schedule:', error)
      toast({
        title: 'Error',
        description: 'Failed to analyze current schedule',
        variant: 'destructive'
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const runOptimization = async () => {
    try {
      setIsOptimizing(true)
      const result = await optimizationService.optimizeSchedule(tournamentId, optimizationCriteria)
      
      setOptimizationResult(result)
      onOptimizationComplete?.(result)
      
      if (result.success) {
        toast({
          title: 'Optimization Complete',
          description: `Schedule optimized with ${result.total_improvement_score}% improvement`,
          variant: 'default'
        })
      } else {
        throw new Error('Optimization failed')
      }
    } catch (error) {
      console.error('Error running optimization:', error)
      toast({
        title: 'Error',
        description: 'Failed to optimize schedule',
        variant: 'destructive'
      })
    } finally {
      setIsOptimizing(false)
    }
  }

  const applyOptimization = async () => {
    if (!optimizationResult?.success) return

    try {
      // Apply optimized schedule to database
      for (const match of optimizationResult.optimized_schedule) {
        await optimizationService.supabaseClient
          .from('matches')
          .update({
            scheduled_date: match.scheduled_date,
            venue_id: match.venue_id,
            venue: match.venue,
            updated_at: new Date().toISOString()
          })
          .eq('id', match.id)
      }

      toast({
        title: 'Success',
        description: 'Optimized schedule applied successfully',
        variant: 'default'
      })

      // Refresh analysis
      await analyzeCurrentSchedule()

    } catch (error) {
      console.error('Error applying optimization:', error)
      toast({
        title: 'Error',
        description: 'Failed to apply optimized schedule',
        variant: 'destructive'
      })
    }
  }

  const getImprovementIcon = (improvement: number) => {
    if (improvement > 20) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (improvement > 10) return <BarChart3 className="h-4 w-4 text-blue-500" />
    return <Target className="h-4 w-4 text-yellow-500" />
  }

  const getImprovementColor = (improvement: number) => {
    if (improvement > 20) return 'text-green-600'
    if (improvement > 10) return 'text-blue-600'
    return 'text-yellow-600'
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Schedule Optimization
            </CardTitle>
            <CardDescription>
              {tournamentName} - Optimize match scheduling for better efficiency
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={analyzeCurrentSchedule}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </Button>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Optimization Criteria</DialogTitle>
                  <DialogDescription>
                    Configure how the schedule should be optimized
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="venue-utilization">Prioritize Venue Utilization</Label>
                      <Switch
                        id="venue-utilization"
                        checked={optimizationCriteria.prioritize_venue_utilization}
                        onCheckedChange={(checked) => setOptimizationCriteria(prev => ({ ...prev, prioritize_venue_utilization: checked }))}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="referee-balance">Balance Referee Workload</Label>
                      <Switch
                        id="referee-balance"
                        checked={optimizationCriteria.balance_referee_workload}
                        onCheckedChange={(checked) => setOptimizationCriteria(prev => ({ ...prev, balance_referee_workload: checked }))}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="rest-periods">Optimize Rest Periods</Label>
                      <Switch
                        id="rest-periods"
                        checked={optimizationCriteria.optimize_rest_periods}
                        onCheckedChange={(checked) => setOptimizationCriteria(prev => ({ ...prev, optimize_rest_periods: checked }))}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="reduce-conflicts">Reduce Conflicts</Label>
                      <Switch
                        id="reduce-conflicts"
                        checked={optimizationCriteria.reduce_conflicts}
                        onCheckedChange={(checked) => setOptimizationCriteria(prev => ({ ...prev, reduce_conflicts: checked }))}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="minimize-travel">Minimize Team Travel</Label>
                      <Switch
                        id="minimize-travel"
                        checked={optimizationCriteria.minimize_team_travel}
                        onCheckedChange={(checked) => setOptimizationCriteria(prev => ({ ...prev, minimize_team_travel: checked }))}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="minimize-costs">Minimize Costs</Label>
                      <Switch
                        id="minimize-costs"
                        checked={optimizationCriteria.minimize_costs}
                        onCheckedChange={(checked) => setOptimizationCriteria(prev => ({ ...prev, minimize_costs: checked }))}
                      />
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="analysis" className="space-y-4">
          <TabsList>
            <TabsTrigger value="analysis">Current Analysis</TabsTrigger>
            <TabsTrigger value="optimization">Optimization</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          {/* Current Analysis Tab */}
          <TabsContent value="analysis" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Venue Utilization */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <MapPin className="h-5 w-5 mr-2" />
                    Venue Utilization
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {venueUtilization.map((venue) => (
                    <div key={venue.venue_id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{venue.venue_name}</span>
                        <Badge variant={venue.utilization_percentage > 80 ? 'destructive' : venue.utilization_percentage > 60 ? 'default' : 'secondary'}>
                          {venue.utilization_percentage.toFixed(1)}%
                        </Badge>
                      </div>
                      <Progress value={venue.utilization_percentage} className="h-2" />
                      <div className="text-sm text-muted-foreground">
                        {venue.total_matches} matches scheduled
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Referee Workload */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Users className="h-5 w-5 mr-2" />
                    Referee Workload
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {refereeWorkload.map((referee) => (
                    <div key={referee.referee_id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{referee.referee_name}</span>
                        <Badge variant={referee.workload_score > 80 ? 'destructive' : referee.workload_score > 60 ? 'default' : 'secondary'}>
                          {referee.workload_score.toFixed(0)}%
                        </Badge>
                      </div>
                      <Progress value={referee.workload_score} className="h-2" />
                      <div className="text-sm text-muted-foreground">
                        {referee.total_matches} matches • {referee.matches_per_day.toFixed(1)} per day
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Analysis Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Analysis Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {venueUtilization.reduce((acc, v) => acc + v.utilization_percentage, 0) / venueUtilization.length || 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Venue Utilization</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {refereeWorkload.reduce((acc, r) => acc + r.workload_score, 0) / refereeWorkload.length || 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Referee Workload</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {venueUtilization.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Venues</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {refereeWorkload.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Referees</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Optimization Tab */}
          <TabsContent value="optimization" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  Run Optimization
                </CardTitle>
                <CardDescription>
                  Optimize the tournament schedule based on your criteria
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Optimization Criteria</Label>
                    <div className="space-y-2">
                      {Object.entries(optimizationCriteria).map(([key, enabled]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span className="text-sm capitalize">
                            {key.replace('_', ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Expected Improvements</Label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Venue Utilization</span>
                        <span className="text-green-600">+15-25%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Referee Balance</span>
                        <span className="text-blue-600">+10-20%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Conflict Reduction</span>
                        <span className="text-purple-600">+20-40%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Rest Periods</span>
                        <span className="text-orange-600">+15-30%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <Button 
                  onClick={runOptimization}
                  disabled={isOptimizing}
                  className="w-full"
                  size="lg"
                >
                  {isOptimizing ? (
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <Zap className="h-5 w-5 mr-2" />
                  )}
                  {isOptimizing ? 'Optimizing Schedule...' : 'Run Optimization'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-4">
            {optimizationResult ? (
              <div className="space-y-4">
                {/* Optimization Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      {optimizationResult.success ? (
                        <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                      )}
                      Optimization Results
                    </CardTitle>
                    <CardDescription>
                      {optimizationResult.optimization_summary}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">
                          {optimizationResult.total_improvement_score}%
                        </div>
                        <div className="text-sm text-muted-foreground">Overall Improvement</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">
                          {optimizationResult.optimized_schedule.length}
                        </div>
                        <div className="text-sm text-muted-foreground">Matches Optimized</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Improvement Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Improvement Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(optimizationResult.improvements).map(([key, improvement]) => (
                        <div key={key} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {getImprovementIcon(improvement as number)}
                            <span className="capitalize">
                              {key.replace('_', ' ')}
                            </span>
                          </div>
                          <span className={`font-semibold ${getImprovementColor(improvement as number)}`}>
                            +{improvement}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Warnings */}
                {optimizationResult.warnings.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
                        Optimization Warnings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {optimizationResult.warnings.map((warning: any, index: number) => (
                          <Alert key={index}>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>{warning.message}</strong>
                              <p className="text-sm mt-1">{warning.recommendation}</p>
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Apply Optimization */}
                <div className="flex space-x-2">
                  <Button 
                    onClick={applyOptimization}
                    className="flex-1"
                    disabled={!optimizationResult.success}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Apply Optimized Schedule
                  </Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Results
                  </Button>
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Optimization Results</h3>
                  <p className="text-muted-foreground">
                    Run optimization to see results and improvements
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
