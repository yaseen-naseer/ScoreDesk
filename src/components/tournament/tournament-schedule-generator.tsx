'use client'

import { useState } from 'react'
import { Calendar, Clock, Users, MapPin, Settings, Play } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { tournamentService, ScheduleGenerationOptions } from '@/lib/services/tournament-service'

interface TournamentScheduleGeneratorProps {
  tournamentId: string
  tournamentFormat: 'league' | 'knockout' | 'group'
  teams: Array<{ id: string; name: string }>
  onScheduleGenerated?: () => void
}

export function TournamentScheduleGenerator({
  tournamentId,
  tournamentFormat,
  teams,
  onScheduleGenerated
}: TournamentScheduleGeneratorProps) {
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)
  const [scheduleConfig, setScheduleConfig] = useState({
    venue: '',
    start_date: '',
    match_duration_minutes: 90,
    break_between_matches_minutes: 15
  })

  const handleGenerateSchedule = async () => {
    if (!scheduleConfig.start_date) {
      toast({
        title: 'Error',
        description: 'Please select a start date',
        variant: 'destructive'
      })
      return
    }

    if (teams.length < 2) {
      toast({
        title: 'Error',
        description: 'At least 2 teams are required to generate a schedule',
        variant: 'destructive'
      })
      return
    }

    setIsGenerating(true)

    try {
      const options: ScheduleGenerationOptions = {
        tournament_id: tournamentId,
        teams: teams.map(team => team.id),
        venue: scheduleConfig.venue || undefined,
        start_date: scheduleConfig.start_date,
        match_duration_minutes: scheduleConfig.match_duration_minutes,
        break_between_matches_minutes: scheduleConfig.break_between_matches_minutes
      }

      switch (tournamentFormat) {
        case 'league':
          await tournamentService.generateLeagueSchedule(options)
          break
        case 'knockout':
          await tournamentService.generateKnockoutSchedule(options)
          break
        case 'group':
          await tournamentService.generateGroupStageSchedule(options)
          break
        default:
          throw new Error('Unsupported tournament format')
      }

      toast({
        title: 'Success',
        description: 'Tournament schedule generated successfully'
      })

      if (onScheduleGenerated) {
        onScheduleGenerated()
      }
    } catch (error) {
      console.error('Error generating schedule:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate schedule',
        variant: 'destructive'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const getFormatDescription = () => {
    switch (tournamentFormat) {
      case 'league':
        return 'Round-robin format where each team plays every other team'
      case 'knockout':
        return 'Single elimination tournament with bracket progression'
      case 'group':
        return 'Teams divided into groups, with group winners advancing'
      default:
        return ''
    }
  }

  const getEstimatedMatches = () => {
    const teamCount = teams.length
    switch (tournamentFormat) {
      case 'league':
        return (teamCount * (teamCount - 1)) / 2
      case 'knockout':
        return teamCount - 1
      case 'group':
        // Assuming 4 teams per group
        const groups = Math.ceil(teamCount / 4)
        const matchesPerGroup = 6 // 4 teams = 6 matches
        return groups * matchesPerGroup
      default:
        return 0
    }
  }

  const getEstimatedDuration = () => {
    const matches = getEstimatedMatches()
    const totalMinutes = matches * (scheduleConfig.match_duration_minutes + scheduleConfig.break_between_matches_minutes)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return `${hours}h ${minutes}m`
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold">Generate Tournament Schedule</h3>
        <p className="text-muted-foreground">
          Configure and generate the match schedule for your tournament
        </p>
      </div>

      {/* Tournament Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Tournament Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">{teams.length} Teams</div>
                <div className="text-xs text-muted-foreground">Registered</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">{getEstimatedMatches()} Matches</div>
                <div className="text-xs text-muted-foreground">Estimated</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">{getEstimatedDuration()}</div>
                <div className="text-xs text-muted-foreground">Total Duration</div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center space-x-2">
              <Badge variant="outline">{tournamentFormat.toUpperCase()}</Badge>
              <span className="text-sm text-muted-foreground">{getFormatDescription()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Schedule Configuration</span>
          </CardTitle>
          <CardDescription>
            Configure the schedule parameters for your tournament
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date & Time</Label>
              <Input
                id="start_date"
                type="datetime-local"
                value={scheduleConfig.start_date}
                onChange={(e) => setScheduleConfig(prev => ({ ...prev, start_date: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="venue">Venue (Optional)</Label>
              <Input
                id="venue"
                placeholder="Enter venue name"
                value={scheduleConfig.venue}
                onChange={(e) => setScheduleConfig(prev => ({ ...prev, venue: e.target.value }))}
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="match_duration">Match Duration (minutes)</Label>
              <Select
                value={scheduleConfig.match_duration_minutes.toString()}
                onValueChange={(value) => setScheduleConfig(prev => ({ 
                  ...prev, 
                  match_duration_minutes: parseInt(value) 
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="40">40 minutes (Futsal)</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes (Football)</SelectItem>
                  <SelectItem value="120">120 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="break_duration">Break Between Matches (minutes)</Label>
              <Select
                value={scheduleConfig.break_between_matches_minutes.toString()}
                onValueChange={(value) => setScheduleConfig(prev => ({ 
                  ...prev, 
                  break_between_matches_minutes: parseInt(value) 
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Schedule Preview</span>
          </CardTitle>
          <CardDescription>
            Preview of the generated schedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium">Total Matches</div>
                <div className="text-muted-foreground">{getEstimatedMatches()}</div>
              </div>
              <div>
                <div className="font-medium">Match Duration</div>
                <div className="text-muted-foreground">{scheduleConfig.match_duration_minutes} min</div>
              </div>
              <div>
                <div className="font-medium">Break Duration</div>
                <div className="text-muted-foreground">{scheduleConfig.break_between_matches_minutes} min</div>
              </div>
              <div>
                <div className="font-medium">Total Duration</div>
                <div className="text-muted-foreground">{getEstimatedDuration()}</div>
              </div>
            </div>

            {scheduleConfig.start_date && (
              <div className="pt-2 border-t">
                <div className="text-sm">
                  <div className="font-medium">Schedule will start:</div>
                  <div className="text-muted-foreground">
                    {new Date(scheduleConfig.start_date).toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleGenerateSchedule}
          disabled={isGenerating || !scheduleConfig.start_date || teams.length < 2}
          size="lg"
          className="min-w-[200px]"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Generating...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Generate Schedule
            </>
          )}
        </Button>
      </div>

      {/* Warning Messages */}
      {teams.length < 2 && (
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 text-sm text-amber-600 dark:text-amber-400">
            <Users className="h-4 w-4" />
            <span>At least 2 teams are required to generate a schedule</span>
          </div>
        </div>
      )}

      {!scheduleConfig.start_date && (
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 text-sm text-amber-600 dark:text-amber-400">
            <Calendar className="h-4 w-4" />
            <span>Please select a start date to generate the schedule</span>
          </div>
        </div>
      )}
    </div>
  )
}
