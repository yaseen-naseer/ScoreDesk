'use client'

import { useState, useEffect } from 'react'
import { 
  Trophy, 
  Users, 
  Shuffle, 
  Target, 
  BarChart3, 
  Settings,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Eye,
  Edit,
  Save,
  X
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { TournamentSeedingService, SeedingCriteria, SeededTeam, SeedingResult } from '@/lib/services/tournament-seeding-service'

interface TournamentSeedingManagerProps {
  tournamentId: string
  tournamentName: string
  registeredTeams: Array<{
    id: string
    name: string
    logo_url?: string
  }>
  onSeedingComplete?: (result: SeedingResult) => void
  className?: string
}

export function TournamentSeedingManager({ 
  tournamentId, 
  tournamentName, 
  registeredTeams,
  onSeedingComplete,
  className 
}: TournamentSeedingManagerProps) {
  const { toast } = useToast()
  const [seededTeams, setSeededTeams] = useState<SeededTeam[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSeeding, setIsSeeding] = useState(false)
  const [seedingCriteria, setSeedingCriteria] = useState<SeedingCriteria>({
    method: 'random',
    ranking_criteria: ['performance', 'points'],
    group_balance: true,
    avoid_same_group: false,
    geographic_separation: false,
    previous_tournament_results: false
  })
  const [editingSeed, setEditingSeed] = useState<string | null>(null)
  const [newSeed, setNewSeed] = useState<number>(1)

  const seedingService = new TournamentSeedingService()

  useEffect(() => {
    loadExistingSeeding()
  }, [tournamentId])

  const loadExistingSeeding = async () => {
    try {
      setIsLoading(true)
      const existing = await seedingService.getTournamentSeeding(tournamentId)
      setSeededTeams(existing)
    } catch (error) {
      console.error('Error loading existing seeding:', error)
      toast({
        title: 'Error',
        description: 'Failed to load existing seeding',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const performSeeding = async () => {
    try {
      setIsSeeding(true)
      const teamIds = registeredTeams.map(t => t.id)
      const result = await seedingService.seedTournament(tournamentId, teamIds, seedingCriteria)
      
      if (result.success) {
        setSeededTeams(result.seeded_teams)
        onSeedingComplete?.(result)
        
        toast({
          title: 'Seeding Complete',
          description: `Teams seeded using ${result.seeding_method} method`,
          variant: 'default'
        })
        
        if (result.warnings.length > 0) {
          toast({
            title: 'Seeding Warnings',
            description: `${result.warnings.length} warning(s) during seeding`,
            variant: 'default'
          })
        }
      } else {
        throw new Error('Seeding failed')
      }
    } catch (error) {
      console.error('Error performing seeding:', error)
      toast({
        title: 'Error',
        description: 'Failed to perform seeding',
        variant: 'destructive'
      })
    } finally {
      setIsSeeding(false)
    }
  }

  const updateTeamSeed = async (teamId: string, newSeedValue: number) => {
    try {
      const success = await seedingService.updateTeamSeed(tournamentId, teamId, newSeedValue)
      
      if (success) {
        // Update local state
        setSeededTeams(prev => 
          prev.map(team => 
            team.team_id === teamId 
              ? { ...team, seed: newSeedValue, seeding_method: 'manual' }
              : team
          ).sort((a, b) => a.seed - b.seed)
        )
        
        setEditingSeed(null)
        toast({
          title: 'Seed Updated',
          description: 'Team seed updated successfully',
          variant: 'default'
        })
      } else {
        throw new Error('Failed to update seed')
      }
    } catch (error) {
      console.error('Error updating team seed:', error)
      toast({
        title: 'Error',
        description: 'Failed to update team seed',
        variant: 'destructive'
      })
    }
  }

  const moveTeamUp = (teamId: string) => {
    const team = seededTeams.find(t => t.team_id === teamId)
    if (team && team.seed > 1) {
      updateTeamSeed(teamId, team.seed - 1)
    }
  }

  const moveTeamDown = (teamId: string) => {
    const team = seededTeams.find(t => t.team_id === teamId)
    if (team && team.seed < seededTeams.length) {
      updateTeamSeed(teamId, team.seed + 1)
    }
  }

  const getSeedingMethodIcon = (method: string) => {
    switch (method) {
      case 'random': return <Shuffle className="h-4 w-4" />
      case 'ranked': return <BarChart3 className="h-4 w-4" />
      case 'balanced': return <Target className="h-4 w-4" />
      default: return <Settings className="h-4 w-4" />
    }
  }

  const getSeedingMethodColor = (method: string) => {
    switch (method) {
      case 'random': return 'bg-blue-100 text-blue-800'
      case 'ranked': return 'bg-green-100 text-green-800'
      case 'balanced': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
            Tournament Seeding
          </CardTitle>
          <CardDescription>
            Loading seeding information...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-32 bg-gray-200 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Trophy className="h-5 w-5 mr-2" />
              Tournament Seeding
            </CardTitle>
            <CardDescription>
              {tournamentName} - {registeredTeams.length} teams
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Seeding
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Seeding Configuration</DialogTitle>
                  <DialogDescription>
                    Configure how teams should be seeded for the tournament
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="seeding-method">Seeding Method</Label>
                    <Select 
                      value={seedingCriteria.method} 
                      onValueChange={(value) => setSeedingCriteria(prev => ({ ...prev, method: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="random">Random</SelectItem>
                        <SelectItem value="ranked">Ranked by Performance</SelectItem>
                        <SelectItem value="balanced">Balanced Distribution</SelectItem>
                        <SelectItem value="manual">Manual Seeding</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {seedingCriteria.method === 'ranked' && (
                    <div className="space-y-2">
                      <Label>Ranking Criteria</Label>
                      <div className="space-y-2">
                        {['performance', 'points', 'goals_scored', 'goal_difference', 'recent_form'].map(criterion => (
                          <div key={criterion} className="flex items-center space-x-2">
                            <Switch
                              id={criterion}
                              checked={seedingCriteria.ranking_criteria?.includes(criterion) || false}
                              onCheckedChange={(checked) => {
                                const criteria = seedingCriteria.ranking_criteria || []
                                if (checked) {
                                  setSeedingCriteria(prev => ({
                                    ...prev,
                                    ranking_criteria: [...criteria, criterion]
                                  }))
                                } else {
                                  setSeedingCriteria(prev => ({
                                    ...prev,
                                    ranking_criteria: criteria.filter(c => c !== criterion)
                                  }))
                                }
                              }}
                            />
                            <Label htmlFor={criterion} className="capitalize">
                              {criterion.replace('_', ' ')}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="group-balance"
                      checked={seedingCriteria.group_balance || false}
                      onCheckedChange={(checked) => setSeedingCriteria(prev => ({ ...prev, group_balance: checked }))}
                    />
                    <Label htmlFor="group-balance">Balance Groups</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="avoid-same-group"
                      checked={seedingCriteria.avoid_same_group || false}
                      onCheckedChange={(checked) => setSeedingCriteria(prev => ({ ...prev, avoid_same_group: checked }))}
                    />
                    <Label htmlFor="avoid-same-group">Avoid Same Group</Label>
                  </div>

                  <Button 
                    onClick={performSeeding}
                    disabled={isSeeding}
                    className="w-full"
                  >
                    {isSeeding ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      getSeedingMethodIcon(seedingCriteria.method)
                    )}
                    {isSeeding ? 'Seeding Teams...' : 'Apply Seeding'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Seeding Status */}
        {seededTeams.length > 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Teams Seeded:</strong> {seededTeams.length} teams have been seeded using{' '}
              <Badge className={getSeedingMethodColor(seededTeams[0]?.seeding_method)}>
                {seededTeams[0]?.seeding_method} method
              </Badge>
            </AlertDescription>
          </Alert>
        )}

        {seededTeams.length === 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>No Seeding:</strong> Teams have not been seeded yet. Configure and apply seeding to continue.
            </AlertDescription>
          </Alert>
        )}

        {/* Seeded Teams List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Seeded Teams</h3>
            <Badge variant="outline">
              {seededTeams.length} teams
            </Badge>
          </div>

          <ScrollArea className="h-64">
            <div className="space-y-2">
              {seededTeams.map((team, index) => (
                <div 
                  key={team.team_id} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                        {team.seed}
                      </Badge>
                      <span className="font-medium">{team.team_name}</span>
                    </div>
                    
                    <Badge className={getSeedingMethodColor(team.seeding_method)}>
                      {getSeedingMethodIcon(team.seeding_method)}
                      <span className="ml-1">{team.seeding_method}</span>
                    </Badge>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveTeamUp(team.team_id)}
                      disabled={team.seed === 1}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveTeamDown(team.team_id)}
                      disabled={team.seed === seededTeams.length}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Team Seed</DialogTitle>
                          <DialogDescription>
                            Change the seed position for {team.team_name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="new-seed">New Seed Position</Label>
                            <Select 
                              value={newSeed.toString()} 
                              onValueChange={(value) => setNewSeed(parseInt(value))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: seededTeams.length }, (_, i) => i + 1).map(seed => (
                                  <SelectItem key={seed} value={seed.toString()}>
                                    {seed}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => updateTeamSeed(team.team_id, newSeed)}
                              className="flex-1"
                            >
                              <Save className="h-4 w-4 mr-2" />
                              Update Seed
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setEditingSeed(null)}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Quick Actions */}
        <Separator />
        <div className="flex justify-between">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={performSeeding}
              disabled={isSeeding}
            >
              {isSeeding ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Shuffle className="h-4 w-4 mr-2" />
              )}
              {isSeeding ? 'Seeding...' : 'Reseed Teams'}
            </Button>
          </div>
          
          {seededTeams.length > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                // Generate bracket preview
                toast({
                  title: 'Bracket Preview',
                  description: 'Bracket will be generated based on current seeding',
                  variant: 'default'
                })
              }}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview Bracket
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
