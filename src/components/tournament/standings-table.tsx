'use client'

import { useEffect, useMemo, useState } from 'react'
import { Trophy, Goal, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { StandingsService, TeamStandingsRow, standingsService } from '@/lib/services/standings-service'

interface StandingsTableProps {
  tournamentId: string
  tournamentName: string
}

export function StandingsTable({ tournamentId, tournamentName }: StandingsTableProps) {
  const { toast } = useToast()
  const [standings, setStandings] = useState<TeamStandingsRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [groupId, setGroupId] = useState<string | undefined>(undefined)

  useEffect(() => {
    loadStandings()
  }, [tournamentId, groupId])

  const loadStandings = async () => {
    try {
      setIsLoading(true)
      const rows = await standingsService.getStandings(tournamentId, { groupId })
      setStandings(rows)
    } catch (error) {
      console.error('Error loading standings:', error)
      toast({ title: 'Error', description: 'Failed to load standings', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Standings</CardTitle>
          <CardDescription>Loading standings...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Standings</CardTitle>
            <CardDescription>{tournamentName}</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">Auto-calculated</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="text-center">P</TableHead>
                <TableHead className="text-center">W</TableHead>
                <TableHead className="text-center">D</TableHead>
                <TableHead className="text-center">L</TableHead>
                <TableHead className="text-center">GF</TableHead>
                <TableHead className="text-center">GA</TableHead>
                <TableHead className="text-center">GD</TableHead>
                <TableHead className="text-center">Pts</TableHead>
                <TableHead className="text-right">Form</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standings.map(row => (
                <TableRow key={row.team_id}>
                  <TableCell className="font-medium">{row.position}</TableCell>
                  <TableCell>{row.team_name}</TableCell>
                  <TableCell className="text-center">{row.played}</TableCell>
                  <TableCell className="text-center">{row.wins}</TableCell>
                  <TableCell className="text-center">{row.draws}</TableCell>
                  <TableCell className="text-center">{row.losses}</TableCell>
                  <TableCell className="text-center">{row.goals_for}</TableCell>
                  <TableCell className="text-center">{row.goals_against}</TableCell>
                  <TableCell className="text-center">{row.goal_difference}</TableCell>
                  <TableCell className="text-center font-bold">{row.points}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-1">
                      {row.form.slice(0, 5).map((f, idx) => (
                        <Badge key={idx} variant={f === 'W' ? 'default' : f === 'D' ? 'secondary' : 'destructive'}>
                          {f}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}


