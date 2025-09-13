'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { matchStatisticsService, type TeamMatchStats, type PlayerMatchStats } from '@/lib/services/match-statistics-service'
import { useLiveMatch } from '@/hooks/use-live-match'

interface Props {
  matchId: string
  homeTeamName?: string
  awayTeamName?: string
  homeTeamId?: string
  awayTeamId?: string
}

export function MatchStatisticsDashboard({ matchId, homeTeamName, awayTeamName, homeTeamId, awayTeamId }: Props) {
  const [teamStats, setTeamStats] = useState<TeamMatchStats[]>([])
  const [homePlayers, setHomePlayers] = useState<PlayerMatchStats[]>([])
  const [awayPlayers, setAwayPlayers] = useState<PlayerMatchStats[]>([])
  const [loading, setLoading] = useState(true)

  // Use live match hook for realtime updates
  const { statistics: liveStats, playerStatistics: livePlayerStats, isConnected } = useLiveMatch(matchId, {
    onStatsUpdate: (stats) => {
      // Update team stats when live stats change
      setTeamStats(prev => prev.map(s => 
        s.team_id === stats.team_id ? {
          ...s,
          possession_percentage: stats.possession_percentage ?? s.possession_percentage,
          shots_total: stats.shots_total ?? s.shots_total,
          shots_on_target: stats.shots_on_target ?? s.shots_on_target,
          shots_off_target: stats.shots_off_target ?? s.shots_off_target,
          corners: stats.corners ?? s.corners,
          fouls: stats.fouls ?? s.fouls,
          yellow_cards: stats.yellow_cards ?? s.yellow_cards,
          red_cards: stats.red_cards ?? s.red_cards,
          offside: stats.offside ?? s.offside,
          passes_total: stats.passes_total ?? s.passes_total,
          passes_completed: stats.passes_completed ?? s.passes_completed,
          crosses_total: stats.crosses_total ?? s.crosses_total,
          crosses_completed: stats.crosses_completed ?? s.crosses_completed,
          tackles_total: stats.tackles_total ?? s.tackles_total,
          tackles_successful: stats.tackles_successful ?? s.tackles_successful,
          saves: stats.saves ?? s.saves,
          goals_conceded: stats.goals_conceded ?? s.goals_conceded,
        } : s
      ))
    },
    onPlayerStatsUpdate: (playerStats) => {
      // Update player stats when live player stats change
      const updatePlayerInList = (players: PlayerMatchStats[]) => 
        players.map(p => 
          p.player_id === playerStats.player_id ? {
            ...p,
            minutes_played: playerStats.minutes_played ?? p.minutes_played,
            goals: playerStats.goals ?? p.goals,
            assists: playerStats.assists ?? p.assists,
            shots_total: playerStats.shots_total ?? p.shots_total,
            shots_on_target: playerStats.shots_on_target ?? p.shots_on_target,
            passes_total: playerStats.passes_total ?? p.passes_total,
            passes_completed: playerStats.passes_completed ?? p.passes_completed,
            tackles_total: playerStats.tackles_total ?? p.tackles_total,
            tackles_successful: playerStats.tackles_successful ?? p.tackles_successful,
            fouls_committed: playerStats.fouls_committed ?? p.fouls_committed,
            fouls_suffered: playerStats.fouls_suffered ?? p.fouls_suffered,
            yellow_cards: playerStats.yellow_cards ?? p.yellow_cards,
            red_cards: playerStats.red_cards ?? p.red_cards,
            saves: playerStats.saves ?? p.saves,
            goals_conceded: playerStats.goals_conceded ?? p.goals_conceded,
            rating: playerStats.rating ?? p.rating,
          } : p
        )
      
      setHomePlayers(prev => updatePlayerInList(prev))
      setAwayPlayers(prev => updatePlayerInList(prev))
    }
  })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [teams, home, away] = await Promise.all([
        matchStatisticsService.getTeamStats(matchId),
        homeTeamId ? matchStatisticsService.getPlayerStats(matchId, homeTeamId) : Promise.resolve([]),
        awayTeamId ? matchStatisticsService.getPlayerStats(matchId, awayTeamId) : Promise.resolve([])
      ])
      setTeamStats(teams)
      setHomePlayers(home)
      setAwayPlayers(away)
      setLoading(false)
    }
    load()
  }, [matchId, homeTeamId, awayTeamId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading statistics...</div>
        </CardContent>
      </Card>
    )
  }

  const findTeam = (teamId?: string) => teamStats.find(t => t.team_id === teamId)
  const home = findTeam(homeTeamId)
  const away = findTeam(awayTeamId)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Statistics</CardTitle>
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? "Live" : "Offline"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Team comparison */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">{homeTeamName}</div>
            <StatBlock s={home} />
          </div>
          <div className="text-center text-sm text-muted-foreground">vs</div>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">{awayTeamName}</div>
            <StatBlock s={away} />
          </div>
        </div>

        {/* Player stats */}
        <Tabs defaultValue="home">
          <TabsList>
            <TabsTrigger value="home">{homeTeamName} Players</TabsTrigger>
            <TabsTrigger value="away">{awayTeamName} Players</TabsTrigger>
          </TabsList>
          <TabsContent value="home">
            <PlayerTable players={homePlayers} />
          </TabsContent>
          <TabsContent value="away">
            <PlayerTable players={awayPlayers} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function StatRow({ label, a, b }: { label: string, a?: number | null, b?: number | null }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <div className="text-right font-medium">{a ?? 0}</div>
      <div className="text-center text-muted-foreground">{label}</div>
      <div className="font-medium">{b ?? 0}</div>
    </div>
  )
}

function StatBlock({ s }: { s?: TeamMatchStats }) {
  if (!s) return <div className="text-sm text-muted-foreground">No data</div>
  return (
    <div className="space-y-2">
      <StatRow label="Possession %" a={s.possession_percentage} b={undefined} />
      <StatRow label="Shots (on target)" a={s.shots_total} b={s.shots_on_target} />
      <StatRow label="Shots off target" a={s.shots_off_target} b={undefined} />
      <StatRow label="Corners" a={s.corners} b={undefined} />
      <StatRow label="Fouls" a={s.fouls} b={undefined} />
      <StatRow label="Yellow Cards" a={s.yellow_cards} b={undefined} />
      <StatRow label="Red Cards" a={s.red_cards} b={undefined} />
      <StatRow label="Offside" a={s.offside} b={undefined} />
      <StatRow label="Passes (completed)" a={s.passes_total} b={s.passes_completed} />
      <StatRow label="Crosses (completed)" a={s.crosses_total} b={s.crosses_completed} />
      <StatRow label="Tackles (successful)" a={s.tackles_total} b={s.tackles_successful} />
      <StatRow label="Saves" a={s.saves} b={undefined} />
      <StatRow label="Goals Conceded" a={s.goals_conceded} b={undefined} />
    </div>
  )
}

function PlayerTable({ players }: { players: PlayerMatchStats[] }) {
  if (!players.length) return <div className="text-sm text-muted-foreground">No player stats</div>
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-2 pr-4">Player</th>
            <th className="py-2 pr-4">Min</th>
            <th className="py-2 pr-4">G</th>
            <th className="py-2 pr-4">A</th>
            <th className="py-2 pr-4">Sh</th>
            <th className="py-2 pr-4">SOT</th>
            <th className="py-2 pr-4">Pass</th>
            <th className="py-2 pr-4">Cmp</th>
            <th className="py-2 pr-4">Tkls</th>
            <th className="py-2 pr-4">Fls</th>
            <th className="py-2 pr-4">YC</th>
            <th className="py-2 pr-4">RC</th>
            <th className="py-2 pr-4">Saves</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.player_id} className="border-t">
              <td className="py-2 pr-4">{p.player_id}</td>
              <td className="py-2 pr-4">{p.minutes_played}</td>
              <td className="py-2 pr-4">{p.goals}</td>
              <td className="py-2 pr-4">{p.assists}</td>
              <td className="py-2 pr-4">{p.shots_total}</td>
              <td className="py-2 pr-4">{p.shots_on_target}</td>
              <td className="py-2 pr-4">{p.passes_total}</td>
              <td className="py-2 pr-4">{p.passes_completed}</td>
              <td className="py-2 pr-4">{p.tackles_total}</td>
              <td className="py-2 pr-4">{p.fouls_committed}</td>
              <td className="py-2 pr-4">{p.yellow_cards}</td>
              <td className="py-2 pr-4">{p.red_cards}</td>
              <td className="py-2 pr-4">{p.saves}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default MatchStatisticsDashboard


