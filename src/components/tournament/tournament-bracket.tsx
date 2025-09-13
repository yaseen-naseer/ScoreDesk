'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  Trophy, 
  Users, 
  Calendar, 
  MapPin, 
  Clock,
  ChevronRight,
  ChevronDown,
  Eye,
  Edit,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useSupabase } from '@/components/providers/supabase-provider'
import { TournamentService } from '@/lib/services/tournament-service'
import { MatchService } from '@/lib/services/match-service'

interface TournamentBracketProps {
  tournamentId: string
  tournamentName: string
  onMatchClick?: (matchId: string) => void
  className?: string
}

interface BracketMatch {
  id: string
  round: number
  position: number
  home_team_id: string
  away_team_id: string
  home_team?: {
    id: string
    name: string
    logo_url?: string
  }
  away_team?: {
    id: string
    name: string
    logo_url?: string
  }
  home_score?: number
  away_score?: number
  status: 'scheduled' | 'live' | 'completed' | 'cancelled'
  scheduled_date?: string
  venue?: string
  winner_id?: string
  next_match_id?: string
  next_match_position?: number
}

interface BracketRound {
  round: number
  name: string
  matches: BracketMatch[]
  is_final: boolean
}

interface BracketStructure {
  rounds: BracketRound[]
  total_teams: number
  total_rounds: number
  current_round: number
}

export function TournamentBracket({ 
  tournamentId, 
  tournamentName, 
  onMatchClick,
  className 
}: TournamentBracketProps) {
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const [bracketStructure, setBracketStructure] = useState<BracketStructure | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null)
  const [viewMode, setViewMode] = useState<'bracket' | 'list'>('bracket')

  const tournamentService = new TournamentService(supabase)
  const matchService = new MatchService(supabase)

  useEffect(() => {
    loadBracketStructure()
  }, [tournamentId])

  const loadBracketStructure = async () => {
    try {
      setIsLoading(true)
      
      // Get tournament details
      const tournament = await tournamentService.getTournamentWithDetails(tournamentId)
      if (!tournament) {
        throw new Error('Tournament not found')
      }

      // Get all matches for this tournament
      const { data: matches } = await supabase
        .from('matches')
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(id, name, logo_url),
          away_team:teams!matches_away_team_id_fkey(id, name, logo_url)
        `)
        .eq('tournament_id', tournamentId)
        .order('scheduled_date')

      if (!matches) {
        throw new Error('No matches found')
      }

      // Generate bracket structure
      const structure = generateBracketStructure(matches, tournament.max_teams || 16)
      setBracketStructure(structure)

    } catch (error) {
      console.error('Error loading bracket structure:', error)
      toast({
        title: 'Error',
        description: 'Failed to load tournament bracket',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const generateBracketStructure = (matches: any[], maxTeams: number): BracketStructure => {
    const rounds: BracketRound[] = []
    const totalRounds = Math.ceil(Math.log2(maxTeams))
    
    // Group matches by round
    const matchesByRound = matches.reduce((acc, match) => {
      const round = match.round_name ? parseInt(match.round_name) : 1
      if (!acc[round]) {
        acc[round] = []
      }
      acc[round].push(match)
      return acc
    }, {} as Record<number, any[]>)

    // Create rounds
    for (let roundNum = 1; roundNum <= totalRounds; roundNum++) {
      const roundMatches = matchesByRound[roundNum] || []
      
      const roundName = getRoundName(roundNum, totalRounds)
      
      rounds.push({
        round: roundNum,
        name: roundName,
        matches: roundMatches.map((match, index) => ({
          id: match.id,
          round: roundNum,
          position: index + 1,
          home_team_id: match.home_team_id,
          away_team_id: match.away_team_id,
          home_team: match.home_team,
          away_team: match.away_team,
          home_score: match.home_score,
          away_score: match.away_score,
          status: match.status,
          scheduled_date: match.scheduled_date,
          venue: match.venue,
          winner_id: match.winner_id
        })),
        is_final: roundNum === totalRounds
      })
    }

    // Find current round
    const currentRound = Math.max(...rounds.map(r => r.round))

    return {
      rounds,
      total_teams: maxTeams,
      total_rounds: totalRounds,
      current_round: currentRound
    }
  }

  const getRoundName = (round: number, totalRounds: number): string => {
    if (round === totalRounds) return 'Final'
    if (round === totalRounds - 1) return 'Semi-Finals'
    if (round === totalRounds - 2) return 'Quarter-Finals'
    if (round === totalRounds - 3) return 'Round of 16'
    if (round === totalRounds - 4) return 'Round of 32'
    return `Round ${round}`
  }

  const getMatchStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'live': return <Play className="h-4 w-4 text-red-500" />
      case 'cancelled': return <XCircle className="h-4 w-4 text-gray-500" />
      default: return <Clock className="h-4 w-4 text-blue-500" />
    }
  }

  const getMatchStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'live': return 'bg-red-100 text-red-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

  const getWinnerClass = (match: BracketMatch, teamId: string) => {
    if (match.status === 'completed' && match.winner_id === teamId) {
      return 'font-bold text-green-700 bg-green-50'
    }
    return ''
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="h-5 w-5 mr-2" />
            Tournament Bracket
          </CardTitle>
          <CardDescription>
            Loading bracket structure...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-64 bg-gray-200 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!bracketStructure) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="h-5 w-5 mr-2" />
            Tournament Bracket
          </CardTitle>
          <CardDescription>
            No bracket data available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Bracket Available</h3>
            <p className="text-muted-foreground">
              Bracket will be generated once matches are created
            </p>
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
              {tournamentName} - Tournament Bracket
            </CardTitle>
            <CardDescription>
              {bracketStructure.total_teams} teams • {bracketStructure.total_rounds} rounds
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'bracket' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('bracket')}
            >
              <Trophy className="h-4 w-4 mr-2" />
              Bracket View
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <Users className="h-4 w-4 mr-2" />
              List View
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === 'bracket' ? (
          <BracketView 
            bracketStructure={bracketStructure}
            onMatchClick={onMatchClick}
            onMatchSelect={setSelectedMatch}
          />
        ) : (
          <ListView 
            bracketStructure={bracketStructure}
            onMatchClick={onMatchClick}
            onMatchSelect={setSelectedMatch}
          />
        )}

        {/* Match Details Dialog */}
        <Dialog open={!!selectedMatch} onOpenChange={() => setSelectedMatch(null)}>
          <DialogContent>
            {selectedMatch && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center">
                    {getMatchStatusIcon(selectedMatch.status)}
                    <span className="ml-2">
                      {selectedMatch.home_team?.name} vs {selectedMatch.away_team?.name}
                    </span>
                  </DialogTitle>
                  <DialogDescription>
                    {getRoundName(selectedMatch.round, bracketStructure.total_rounds)}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {selectedMatch.home_score ?? '-'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {selectedMatch.home_team?.name}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {selectedMatch.away_score ?? '-'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {selectedMatch.away_team?.name}
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Status</span>
                      <Badge className={getMatchStatusColor(selectedMatch.status)}>
                        {selectedMatch.status}
                      </Badge>
                    </div>
                    
                    {selectedMatch.scheduled_date && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Scheduled</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(selectedMatch.scheduled_date).toLocaleString()}
                        </span>
                      </div>
                    )}
                    
                    {selectedMatch.venue && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Venue</span>
                        <span className="text-sm text-muted-foreground">
                          {selectedMatch.venue}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        onMatchClick?.(selectedMatch.id)
                        setSelectedMatch(null)
                      }}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

function BracketView({ 
  bracketStructure, 
  onMatchClick, 
  onMatchSelect 
}: {
  bracketStructure: BracketStructure
  onMatchClick?: (matchId: string) => void
  onMatchSelect?: (match: BracketMatch) => void
}) {
  return (
    <ScrollArea className="h-96 w-full">
      <div className="flex space-x-8 p-4">
        {bracketStructure.rounds.map((round) => (
          <div key={round.round} className="flex-shrink-0">
            <div className="text-center mb-4">
              <h3 className="font-semibold">{round.name}</h3>
              <p className="text-sm text-muted-foreground">
                {round.matches.length} match{round.matches.length !== 1 ? 'es' : ''}
              </p>
            </div>
            <div className="space-y-4">
              {round.matches.map((match) => (
                <BracketMatchCard
                  key={match.id}
                  match={match}
                  onMatchClick={onMatchClick}
                  onMatchSelect={onMatchSelect}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}

function ListView({ 
  bracketStructure, 
  onMatchClick, 
  onMatchSelect 
}: {
  bracketStructure: BracketStructure
  onMatchClick?: (matchId: string) => void
  onMatchSelect?: (match: BracketMatch) => void
}) {
  return (
    <div className="space-y-4">
      {bracketStructure.rounds.map((round) => (
        <Card key={round.round}>
          <CardHeader>
            <CardTitle className="text-lg">{round.name}</CardTitle>
            <CardDescription>
              {round.matches.length} match{round.matches.length !== 1 ? 'es' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {round.matches.map((match) => (
                <BracketMatchCard
                  key={match.id}
                  match={match}
                  onMatchClick={onMatchClick}
                  onMatchSelect={onMatchSelect}
                  variant="list"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function BracketMatchCard({ 
  match, 
  onMatchClick, 
  onMatchSelect,
  variant = 'bracket'
}: {
  match: BracketMatch
  onMatchClick?: (matchId: string) => void
  onMatchSelect?: (match: BracketMatch) => void
  variant?: 'bracket' | 'list'
}) {
  const getMatchStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'live': return <Play className="h-4 w-4 text-red-500" />
      case 'cancelled': return <XCircle className="h-4 w-4 text-gray-500" />
      default: return <Clock className="h-4 w-4 text-blue-500" />
    }
  }

  const getMatchStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'live': return 'bg-red-100 text-red-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

  const getWinnerClass = (teamId: string) => {
    if (match.status === 'completed' && match.winner_id === teamId) {
      return 'font-bold text-green-700 bg-green-50'
    }
    return ''
  }

  if (variant === 'list') {
    return (
      <div 
        className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
        onClick={() => onMatchSelect?.(match)}
      >
        <div className="flex items-center space-x-4 flex-1">
          {getMatchStatusIcon(match.status)}
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className={`${getWinnerClass(match.home_team_id)}`}>
                {match.home_team?.name || 'TBD'}
              </span>
              <span className="text-muted-foreground">vs</span>
              <span className={`${getWinnerClass(match.away_team_id)}`}>
                {match.away_team?.name || 'TBD'}
              </span>
            </div>
            {match.scheduled_date && (
              <p className="text-sm text-muted-foreground">
                {new Date(match.scheduled_date).toLocaleString()}
              </p>
            )}
          </div>
          <div className="text-right">
            <Badge className={getMatchStatusColor(match.status)}>
              {match.status}
            </Badge>
            {(match.home_score !== null && match.away_score !== null) && (
              <div className="text-lg font-bold mt-1">
                {match.home_score} - {match.away_score}
              </div>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div 
      className="w-64 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
      onClick={() => onMatchSelect?.(match)}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Match {match.position}</span>
          <Badge className={getMatchStatusColor(match.status)}>
            {match.status}
          </Badge>
        </div>
        
        <div className="space-y-1">
          <div className={`text-sm ${getWinnerClass(match.home_team_id)}`}>
            {match.home_team?.name || 'TBD'}
          </div>
          <div className={`text-sm ${getWinnerClass(match.away_team_id)}`}>
            {match.away_team?.name || 'TBD'}
          </div>
        </div>

        {(match.home_score !== null && match.away_score !== null) && (
          <div className="text-center text-lg font-bold">
            {match.home_score} - {match.away_score}
          </div>
        )}

        {match.scheduled_date && (
          <div className="text-xs text-muted-foreground text-center">
            {new Date(match.scheduled_date).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  )
}
