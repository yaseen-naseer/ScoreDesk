'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { useSupabase } from '@/components/providers/supabase-provider'
import { MatchEventService, MatchEventData, EventType, MatchEventWithDetails } from '@/lib/services/match-event-service'
import { MatchService, MatchWithDetails } from '@/lib/services/match-service'
import { 
  Goal, 
  Card as CardIcon, 
  Users, 
  Corner, 
  Zap, 
  Target, 
  AlertTriangle,
  Clock,
  Plus,
  Edit,
  Trash2
} from 'lucide-react'

interface EventRecordingInterfaceProps {
  matchId: string
  onEventAdded?: (event: MatchEventWithDetails) => void
  className?: string
}

interface Player {
  id: string
  name: string
  jersey_number?: number
  position?: string
}

interface Team {
  id: string
  name: string
  logo_url?: string
}

const EVENT_TYPES: { type: EventType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: 'goal', label: 'Goal', icon: <Goal className="h-4 w-4" />, color: 'bg-green-500' },
  { type: 'own_goal', label: 'Own Goal', icon: <Goal className="h-4 w-4" />, color: 'bg-red-500' },
  { type: 'penalty_goal', label: 'Penalty Goal', icon: <Target className="h-4 w-4" />, color: 'bg-green-600' },
  { type: 'penalty_miss', label: 'Penalty Miss', icon: <Target className="h-4 w-4" />, color: 'bg-red-600' },
  { type: 'yellow_card', label: 'Yellow Card', icon: <CardIcon className="h-4 w-4" />, color: 'bg-yellow-500' },
  { type: 'red_card', label: 'Red Card', icon: <CardIcon className="h-4 w-4" />, color: 'bg-red-500' },
  { type: 'second_yellow_card', label: 'Second Yellow', icon: <CardIcon className="h-4 w-4" />, color: 'bg-orange-500' },
  { type: 'substitution', label: 'Substitution', icon: <Users className="h-4 w-4" />, color: 'bg-blue-500' },
  { type: 'corner', label: 'Corner', icon: <Corner className="h-4 w-4" />, color: 'bg-purple-500' },
  { type: 'free_kick', label: 'Free Kick', icon: <Zap className="h-4 w-4" />, color: 'bg-indigo-500' },
  { type: 'offside', label: 'Offside', icon: <AlertTriangle className="h-4 w-4" />, color: 'bg-gray-500' },
  { type: 'foul', label: 'Foul', icon: <AlertTriangle className="h-4 w-4" />, color: 'bg-orange-600' }
]

export function EventRecordingInterface({ matchId, onEventAdded, className }: EventRecordingInterfaceProps) {
  const { supabase } = useSupabase()
  const { toast } = useToast()
  
  const [match, setMatch] = useState<MatchWithDetails | null>(null)
  const [homeTeamPlayers, setHomeTeamPlayers] = useState<Player[]>([])
  const [awayTeamPlayers, setAwayTeamPlayers] = useState<Player[]>([])
  const [recentEvents, setRecentEvents] = useState<MatchEventWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [selectedEventType, setSelectedEventType] = useState<EventType>('goal')
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [selectedPlayer, setSelectedPlayer] = useState<string>('')
  const [selectedAssistPlayer, setSelectedAssistPlayer] = useState<string>('')
  const [selectedSubstitutedPlayer, setSelectedSubstitutedPlayer] = useState<string>('')
  const [minute, setMinute] = useState<string>('')
  const [secondMinute, setSecondMinute] = useState<string>('')
  const [description, setDescription] = useState<string>('')

  const matchEventService = useMemo(() => new MatchEventService(supabase), [supabase])
  const matchService = useMemo(() => new MatchService(supabase), [supabase])

  useEffect(() => {
    loadMatchData()
    loadRecentEvents()
  }, [matchId])

  const loadMatchData = async () => {
    try {
      setLoading(true)
      const matchData = await matchService.getMatch(matchId)
      if (matchData) {
        setMatch(matchData)
        setSelectedTeam(matchData.home_team_id)
        
        // Load team lineups
        const teamSheets = await matchService.getTeamSheets(matchId)
        const homeTeamSheet = teamSheets.find(ts => ts.team_id === matchData.home_team_id)
        const awayTeamSheet = teamSheets.find(ts => ts.team_id === matchData.away_team_id)
        
        setHomeTeamPlayers(homeTeamSheet?.players || [])
        setAwayTeamPlayers(awayTeamSheet?.players || [])
      }
    } catch (error) {
      console.error('Error loading match data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load match data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadRecentEvents = async () => {
    try {
      const events = await matchEventService.getMatchEvents(matchId)
      setRecentEvents(events.slice(-10).reverse()) // Last 10 events, most recent first
    } catch (error) {
      console.error('Error loading recent events:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedTeam || !minute) {
      toast({
        title: 'Validation Error',
        description: 'Please select a team and enter the minute',
        variant: 'destructive'
      })
      return
    }

    // Validate player selection for events that require it
    if (['goal', 'own_goal', 'penalty_goal', 'penalty_miss', 'yellow_card', 'red_card', 'second_yellow_card', 'foul', 'offside'].includes(selectedEventType) && !selectedPlayer) {
      toast({
        title: 'Validation Error',
        description: 'Please select a player for this event type',
        variant: 'destructive'
      })
      return
    }

    // Validate substitution requires both players
    if (selectedEventType === 'substitution' && (!selectedPlayer || !selectedSubstitutedPlayer)) {
      toast({
        title: 'Validation Error',
        description: 'Substitution requires both incoming and outgoing players',
        variant: 'destructive'
      })
      return
    }

    try {
      setSubmitting(true)
      
      const eventData: MatchEventData = {
        event_type: selectedEventType,
        minute: parseInt(minute),
        second_minute: secondMinute ? parseInt(secondMinute) : undefined,
        team_id: selectedTeam,
        player_id: selectedPlayer || undefined,
        assist_player_id: selectedAssistPlayer || undefined,
        substituted_player_id: selectedSubstitutedPlayer || undefined,
        description: description || undefined
      }

      const result = await matchEventService.addEvent(matchId, eventData)
      
      if (result.success && result.event) {
        toast({
          title: 'Event Added',
          description: `${EVENT_TYPES.find(et => et.type === selectedEventType)?.label} recorded successfully`
        })
        
        // Reset form
        setSelectedPlayer('')
        setSelectedAssistPlayer('')
        setSelectedSubstitutedPlayer('')
        setDescription('')
        
        // Reload recent events
        await loadRecentEvents()
        
        // Notify parent component
        if (onEventAdded) {
          onEventAdded(result.event)
        }
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to add event',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error adding event:', error)
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getCurrentPlayers = () => {
    return selectedTeam === match?.home_team_id ? homeTeamPlayers : awayTeamPlayers
  }

  const getEventTypeInfo = (eventType: EventType) => {
    return EVENT_TYPES.find(et => et.type === eventType)
  }

  const formatEventDescription = (event: MatchEventWithDetails) => {
    const eventInfo = getEventTypeInfo(event.event_type)
    const playerName = event.player?.name || 'Unknown Player'
    const minuteStr = event.second_minute ? `${event.minute}:${event.second_minute.toString().padStart(2, '0')}` : `${event.minute}'`
    
    switch (event.event_type) {
      case 'substitution':
        return `${minuteStr} - ${playerName} replaces ${event.substituted_player?.name || 'Unknown'}`
      case 'goal':
      case 'penalty_goal':
        return event.assist_player ? 
          `${minuteStr} - ${playerName} (assist: ${event.assist_player.name})` :
          `${minuteStr} - ${playerName}`
      default:
        return `${minuteStr} - ${playerName}`
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading match data...</div>
        </CardContent>
      </Card>
    )
  }

  if (!match) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Match not found</div>
        </CardContent>
      </Card>
    )
  }

  if (match.status !== 'live') {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Events can only be recorded during live matches
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Recording Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Record Event
            </CardTitle>
            <CardDescription>
              Add match events in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Event Type Selection */}
              <div className="space-y-2">
                <Label>Event Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {EVENT_TYPES.map((eventType) => (
                    <Button
                      key={eventType.type}
                      type="button"
                      variant={selectedEventType === eventType.type ? 'default' : 'outline'}
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={() => setSelectedEventType(eventType.type)}
                    >
                      <span className={eventType.color}></span>
                      {eventType.icon}
                      <span className="text-xs">{eventType.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Team Selection */}
              <div className="space-y-2">
                <Label>Team</Label>
                <Select value={selectedTeam} onValueChange={(value) => {
                  setSelectedTeam(value)
                  setSelectedPlayer('')
                  setSelectedAssistPlayer('')
                  setSelectedSubstitutedPlayer('')
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={match.home_team_id}>
                      {match.home_team?.name || 'Home Team'}
                    </SelectItem>
                    <SelectItem value={match.away_team_id}>
                      {match.away_team?.name || 'Away Team'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Player Selection */}
              {['goal', 'own_goal', 'penalty_goal', 'penalty_miss', 'yellow_card', 'red_card', 'second_yellow_card', 'foul', 'offside'].includes(selectedEventType) && (
                <div className="space-y-2">
                  <Label>Player</Label>
                  <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select player" />
                    </SelectTrigger>
                    <SelectContent>
                      {getCurrentPlayers().map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.jersey_number ? `${player.jersey_number}. ` : ''}{player.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Assist Player (for goals) */}
              {['goal', 'penalty_goal'].includes(selectedEventType) && (
                <div className="space-y-2">
                  <Label>Assist Player (Optional)</Label>
                  <Select value={selectedAssistPlayer} onValueChange={setSelectedAssistPlayer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select assist player" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No assist</SelectItem>
                      {getCurrentPlayers().map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.jersey_number ? `${player.jersey_number}. ` : ''}{player.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Substitution Players */}
              {selectedEventType === 'substitution' && (
                <>
                  <div className="space-y-2">
                    <Label>Incoming Player</Label>
                    <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select incoming player" />
                      </SelectTrigger>
                      <SelectContent>
                        {getCurrentPlayers().map((player) => (
                          <SelectItem key={player.id} value={player.id}>
                            {player.jersey_number ? `${player.jersey_number}. ` : ''}{player.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Outgoing Player</Label>
                    <Select value={selectedSubstitutedPlayer} onValueChange={setSelectedSubstitutedPlayer}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select outgoing player" />
                      </SelectTrigger>
                      <SelectContent>
                        {getCurrentPlayers().map((player) => (
                          <SelectItem key={player.id} value={player.id}>
                            {player.jersey_number ? `${player.jersey_number}. ` : ''}{player.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Minute</Label>
                  <Input
                    type="number"
                    min="0"
                    max="120"
                    value={minute}
                    onChange={(e) => setMinute(e.target.value)}
                    placeholder="45"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Second (Optional)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={secondMinute}
                    onChange={(e) => setSecondMinute(e.target.value)}
                    placeholder="30"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional details about the event..."
                  rows={2}
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? 'Adding Event...' : 'Add Event'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Events
            </CardTitle>
            <CardDescription>
              Latest match events
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentEvents.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No events recorded yet
              </div>
            ) : (
              <div className="space-y-3">
                {recentEvents.map((event) => {
                  const eventInfo = getEventTypeInfo(event.event_type)
                  return (
                    <div key={event.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className={`p-2 rounded-full ${eventInfo?.color} text-white`}>
                        {eventInfo?.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{eventInfo?.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatEventDescription(event)}
                        </div>
                        {event.description && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {event.description}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline">
                        {event.second_minute ? `${event.minute}:${event.second_minute.toString().padStart(2, '0')}` : `${event.minute}'`}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
