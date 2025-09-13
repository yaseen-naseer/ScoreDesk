'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useSupabase } from '@/components/providers/supabase-provider'
import { MatchService, MatchWithDetails } from '@/lib/services/match-service'
import { MatchEventService } from '@/lib/services/match-event-service'
import { MatchTimer } from '@/components/scoreboard/match-timer'

interface ScoreboardProps {
  matchId: string
  className?: string
  homeColor?: string
  awayColor?: string
  homeLogoUrl?: string
  awayLogoUrl?: string
}

export function Scoreboard({ matchId, className, homeColor, awayColor, homeLogoUrl, awayLogoUrl }: ScoreboardProps) {
  const { supabase } = useSupabase()
  const [match, setMatch] = useState<MatchWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [recentEvent, setRecentEvent] = useState<string | null>(null)

  const matchService = useMemo(() => new MatchService(supabase), [supabase])
  const matchEventService = useMemo(() => new MatchEventService(supabase), [supabase])

  const title = useMemo(() => {
    if (!match) return 'Scoreboard'
    const home = match.home_team?.name || 'Home'
    const away = match.away_team?.name || 'Away'
    return `${home} vs ${away}`
  }, [match])

  useEffect(() => {
    let active = true
    ;(async () => {
      const m = await matchService.getMatch(matchId)
      if (active) {
        setMatch(m)
        setLoading(false)
      }
    })()

    // Realtime subscription to match row changes
    const matchChannel = supabase
      .channel(`scoreboard-matches-${matchId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
        async () => {
          const m = await matchService.getMatch(matchId)
          setMatch(m)
        }
      )
      .on(
        'broadcast',
        { event: 'score_update' },
        (payload) => {
          // Handle real-time score updates from events
          const m = payload.payload.match
          if (m) {
            setMatch(m)
          }
        }
      )
      .subscribe()

    // Subscribe to match events for live updates
    const eventsChannel = matchEventService.subscribeToMatchEvents(matchId, (event) => {
      // Show recent event notification
      const eventTypeLabels: Record<string, string> = {
        goal: 'GOAL!',
        own_goal: 'OWN GOAL!',
        penalty_goal: 'PENALTY GOAL!',
        yellow_card: 'Yellow Card',
        red_card: 'Red Card',
        substitution: 'Substitution'
      }
      
      const eventLabel = eventTypeLabels[event.event_type] || event.event_type
      const playerName = event.player?.name || 'Unknown Player'
      const minute = event.second_minute ? `${event.minute}:${event.second_minute.toString().padStart(2, '0')}` : `${event.minute}'`
      
      setRecentEvent(`${eventLabel} - ${playerName} (${minute})`)
      
      // Clear notification after 5 seconds
      setTimeout(() => setRecentEvent(null), 5000)
    })

    return () => {
      active = false
      supabase.removeChannel(matchChannel)
      supabase.removeChannel(eventsChannel)
    }
  }, [matchId])

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center text-muted-foreground">Loading scoreboard…</CardContent>
      </Card>
    )
  }

  if (!match) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center text-muted-foreground">Match not found</CardContent>
      </Card>
    )
  }

  const home = match.home_team?.name || 'Home'
  const away = match.away_team?.name || 'Away'
  const homeScore = match.home_score ?? 0
  const awayScore = match.away_score ?? 0

  return (
    <Card className={className} role="region" aria-label="Match scoreboard">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold" aria-live="polite">{title}</h3>
          <Badge variant={match.status === 'live' ? 'secondary' : 'outline'} className="capitalize" aria-label={`Status ${match.status}`}>
            {match.status}
          </Badge>
        </div>
        <div className="grid grid-cols-3 items-center text-center" aria-live="polite">
          <div className="flex items-center gap-2 truncate text-lg font-medium justify-start">
            {homeLogoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={homeLogoUrl} alt="home logo" className="h-6 w-6 rounded-sm" />
            )}
            <span style={homeColor ? { color: homeColor } : undefined}>{home}</span>
          </div>
          <div className="text-4xl font-bold" aria-label={`Score ${homeScore} to ${awayScore}`}>{homeScore} : {awayScore}</div>
          <div className="flex items-center gap-2 truncate text-lg font-medium justify-end">
            <span style={awayColor ? { color: awayColor } : undefined}>{away}</span>
            {awayLogoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={awayLogoUrl} alt="away logo" className="h-6 w-6 rounded-sm" />
            )}
          </div>
        </div>
        
        {/* Recent Event Notification */}
        {recentEvent && (
          <div className="mt-4 p-3 bg-primary text-primary-foreground rounded-lg text-center font-medium animate-pulse" aria-live="polite">
            {recentEvent}
          </div>
        )}
        
        {/* Timer */}
        <div className="mt-4 flex justify-center">
          <MatchTimer 
            isLive={match.status === 'live'} 
            startTimestamp={match.actual_start_time ? new Date(match.actual_start_time).getTime() : null}
            periodMinutes={match.match_duration ? Math.floor((match.match_duration || 90) / 2) : 45}
            persistKey={`match:${match.id}:timer`}
          />
        </div>
      </CardContent>
    </Card>
  )
}


