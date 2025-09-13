'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSupabase } from '@/components/providers/supabase-provider'
import { MatchEventService, EventTimelineItem, EventType, MatchStatistics } from '@/lib/services/match-event-service'
import { 
  Clock, 
  Filter, 
  BarChart3, 
  Target, 
  Card as CardIcon, 
  Users, 
  Corner, 
  Zap, 
  AlertTriangle,
  Goal,
  TrendingUp,
  Activity
} from 'lucide-react'

interface EventTimelineInterfaceProps {
  matchId: string
  className?: string
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

export function EventTimelineInterface({ matchId, className }: EventTimelineInterfaceProps) {
  const { supabase } = useSupabase()
  
  const [timeline, setTimeline] = useState<EventTimelineItem[]>([])
  const [statistics, setStatistics] = useState<MatchStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<{
    eventTypes?: EventType[]
    teamId?: string
    half?: 1 | 2
  }>({})

  const matchEventService = useMemo(() => new MatchEventService(supabase), [supabase])

  useEffect(() => {
    loadTimeline()
    loadStatistics()
    
    // Subscribe to real-time updates
    const eventsChannel = matchEventService.subscribeToMatchEvents(matchId, (event) => {
      loadTimeline()
      loadStatistics()
    })

    const statsChannel = matchEventService.subscribeToMatchStatistics(matchId, (stats) => {
      setStatistics(stats)
    })

    return () => {
      supabase.removeChannel(eventsChannel)
      supabase.removeChannel(statsChannel)
    }
  }, [matchId])

  const loadTimeline = async () => {
    try {
      setLoading(true)
      const events = await matchEventService.getEventTimeline(matchId)
      setTimeline(events)
    } catch (error) {
      console.error('Error loading timeline:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStatistics = async () => {
    try {
      const stats = await matchEventService.getMatchStatistics(matchId)
      setStatistics(stats)
    } catch (error) {
      console.error('Error loading statistics:', error)
    }
  }

  const filteredTimeline = useMemo(() => {
    let filtered = timeline

    if (filter.eventTypes && filter.eventTypes.length > 0) {
      filtered = filtered.filter(event => filter.eventTypes!.includes(event.event_type))
    }

    if (filter.teamId) {
      filtered = filtered.filter(event => event.team_id === filter.teamId)
    }

    if (filter.half) {
      filtered = filtered.filter(event => {
        if (filter.half === 1) {
          return event.minute <= 45
        } else {
          return event.minute > 45
        }
      })
    }

    return filtered
  }, [timeline, filter])

  const getEventTypeInfo = (eventType: EventType) => {
    return EVENT_TYPES.find(et => et.type === eventType)
  }

  const formatEventDescription = (event: EventTimelineItem) => {
    const minuteStr = event.second_minute ? `${event.minute}:${event.second_minute.toString().padStart(2, '0')}` : `${event.minute}'`
    
    switch (event.event_type) {
      case 'substitution':
        return `${minuteStr} - ${event.player_name} replaces ${event.substituted_player_name}`
      case 'goal':
      case 'penalty_goal':
        return event.assist_player_name ? 
          `${minuteStr} - ${event.player_name} (assist: ${event.assist_player_name})` :
          `${minuteStr} - ${event.player_name}`
      default:
        return `${minuteStr} - ${event.player_name}`
    }
  }

  const getTimelinePosition = (minute: number) => {
    // Calculate position on timeline (0-100%)
    const maxMinute = 90
    return Math.min((minute / maxMinute) * 100, 100)
  }

  const firstHalfEvents = timeline.filter(event => event.minute <= 45)
  const secondHalfEvents = timeline.filter(event => event.minute > 45)

  return (
    <div className={className}>
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Statistics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Event Type</label>
                  <Select onValueChange={(value) => {
                    if (value === 'all') {
                      setFilter(prev => ({ ...prev, eventTypes: undefined }))
                    } else {
                      setFilter(prev => ({ ...prev, eventTypes: [value as EventType] }))
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="All events" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Events</SelectItem>
                      {EVENT_TYPES.map((eventType) => (
                        <SelectItem key={eventType.type} value={eventType.type}>
                          <div className="flex items-center gap-2">
                            <span className={eventType.color}></span>
                            {eventType.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Half</label>
                  <Select onValueChange={(value) => {
                    if (value === 'all') {
                      setFilter(prev => ({ ...prev, half: undefined }))
                    } else {
                      setFilter(prev => ({ ...prev, half: parseInt(value) as 1 | 2 }))
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="All halves" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Halves</SelectItem>
                      <SelectItem value="1">First Half</SelectItem>
                      <SelectItem value="2">Second Half</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Team</label>
                  <Select onValueChange={(value) => {
                    if (value === 'all') {
                      setFilter(prev => ({ ...prev, teamId: undefined }))
                    } else {
                      setFilter(prev => ({ ...prev, teamId: value }))
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="All teams" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Teams</SelectItem>
                      {/* This would need team data from props or context */}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Match Timeline</CardTitle>
              <CardDescription>
                {filteredTimeline.length} events recorded
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center text-muted-foreground py-8">
                  Loading timeline...
                </div>
              ) : filteredTimeline.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No events match the current filters
                </div>
              ) : (
                <div className="space-y-6">
                  {/* First Half */}
                  {firstHalfEvents.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Badge variant="outline">1st Half</Badge>
                        <span className="text-sm text-muted-foreground">
                          {firstHalfEvents.length} events
                        </span>
                      </div>
                      <div className="space-y-3">
                        {firstHalfEvents.map((event) => {
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
                    </div>
                  )}

                  {/* Half Time Break */}
                  {firstHalfEvents.length > 0 && secondHalfEvents.length > 0 && (
                    <div className="flex items-center justify-center py-4">
                      <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-full">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-medium">Half Time</span>
                      </div>
                    </div>
                  )}

                  {/* Second Half */}
                  {secondHalfEvents.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Badge variant="outline">2nd Half</Badge>
                        <span className="text-sm text-muted-foreground">
                          {secondHalfEvents.length} events
                        </span>
                      </div>
                      <div className="space-y-3">
                        {secondHalfEvents.map((event) => {
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
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          {statistics ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Home Team Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Home Team Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{statistics.home_team.goals}</div>
                      <div className="text-sm text-muted-foreground">Goals</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{statistics.home_team.yellow_cards}</div>
                      <div className="text-sm text-muted-foreground">Yellow Cards</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{statistics.home_team.red_cards}</div>
                      <div className="text-sm text-muted-foreground">Red Cards</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{statistics.home_team.corners}</div>
                      <div className="text-sm text-muted-foreground">Corners</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{statistics.home_team.fouls}</div>
                      <div className="text-sm text-muted-foreground">Fouls</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{statistics.home_team.substitutions}</div>
                      <div className="text-sm text-muted-foreground">Substitutions</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Away Team Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Away Team Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{statistics.away_team.goals}</div>
                      <div className="text-sm text-muted-foreground">Goals</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{statistics.away_team.yellow_cards}</div>
                      <div className="text-sm text-muted-foreground">Yellow Cards</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{statistics.away_team.red_cards}</div>
                      <div className="text-sm text-muted-foreground">Red Cards</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{statistics.away_team.corners}</div>
                      <div className="text-sm text-muted-foreground">Corners</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{statistics.away_team.fouls}</div>
                      <div className="text-sm text-muted-foreground">Fouls</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{statistics.away_team.substitutions}</div>
                      <div className="text-sm text-muted-foreground">Substitutions</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Match Overview */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Match Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-600">{statistics.total_events}</div>
                      <div className="text-sm text-muted-foreground">Total Events</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{statistics.first_half_events}</div>
                      <div className="text-sm text-muted-foreground">1st Half Events</div>
                    </div>
                    <div className="text-center p-3 bg-indigo-50 rounded-lg">
                      <div className="text-2xl font-bold text-indigo-600">{statistics.second_half_events}</div>
                      <div className="text-sm text-muted-foreground">2nd Half Events</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {statistics.home_team.goals + statistics.away_team.goals}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Goals</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">
                  Loading statistics...
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
