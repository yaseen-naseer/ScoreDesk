'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, Users, Trophy, Play, Pause, CheckCircle, XCircle, AlertCircle, Edit, Trash2, MoreHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { matchService, MatchWithDetails, MatchFilters } from '@/lib/services/match-service'
import { useOrganization } from '@/lib/contexts/organization-context'

interface MatchListProps {
  tournamentId?: string
  teamId?: string
  status?: string
  onMatchSelect?: (match: MatchWithDetails) => void
  onMatchEdit?: (match: MatchWithDetails) => void
  onMatchDelete?: (matchId: string) => void
}

export function MatchList({ 
  tournamentId, 
  teamId, 
  status, 
  onMatchSelect, 
  onMatchEdit, 
  onMatchDelete 
}: MatchListProps) {
  const { currentOrganization } = useOrganization()
  const { toast } = useToast()
  const [matches, setMatches] = useState<MatchWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState(status || 'all')

  useEffect(() => {
    if (currentOrganization) {
      loadMatches()
    }
  }, [currentOrganization, tournamentId, teamId, selectedStatus])

  const loadMatches = async () => {
    try {
      setIsLoading(true)
      const filters: MatchFilters = {}
      
      if (tournamentId) filters.tournament_id = tournamentId
      if (teamId) filters.team_id = teamId
      if (selectedStatus !== 'all') filters.status = selectedStatus

      const matchesData = await matchService.getMatches(filters)
      setMatches(matchesData)
    } catch (error) {
      console.error('Error loading matches:', error)
      toast({
        title: 'Error',
        description: 'Failed to load matches',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = async (matchId: string, newStatus: string) => {
    try {
      let result
      
      if (newStatus === 'live') {
        result = await matchService.startMatch(matchId)
      } else if (newStatus === 'completed') {
        result = await matchService.endMatch(matchId)
      } else {
        result = await matchService.updateMatch(matchId, { status: newStatus as any })
      }

      if (result.success) {
        toast({
          title: 'Success',
          description: `Match status updated to ${newStatus}`
        })
        loadMatches()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update match status',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error updating match status:', error)
      toast({
        title: 'Error',
        description: 'Failed to update match status',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm('Are you sure you want to delete this match? This action cannot be undone.')) {
      return
    }

    try {
      const result = await matchService.deleteMatch(matchId)
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Match deleted successfully'
        })
        onMatchDelete?.(matchId)
        loadMatches()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete match',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error deleting match:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete match',
        variant: 'destructive'
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'live':
        return <Play className="h-4 w-4 text-green-500" />
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-gray-500" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'postponed':
        return <AlertCircle className="h-4 w-4 text-orange-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'default'
      case 'live':
        return 'secondary'
      case 'paused':
        return 'default'
      case 'completed':
        return 'outline'
      case 'cancelled':
        return 'destructive'
      case 'postponed':
        return 'default'
      default:
        return 'outline'
    }
  }

  const formatMatchTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  }

  const getStatusActions = (match: MatchWithDetails) => {
    const actions = []
    
    switch (match.status) {
      case 'scheduled':
        actions.push(
          <DropdownMenuItem 
            key="start" 
            onClick={() => handleStatusChange(match.id, 'live')}
          >
            <Play className="h-4 w-4 mr-2" />
            Start Match
          </DropdownMenuItem>,
          <DropdownMenuItem 
            key="postpone" 
            onClick={() => handleStatusChange(match.id, 'postponed')}
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            Postpone
          </DropdownMenuItem>,
          <DropdownMenuItem 
            key="cancel" 
            onClick={() => handleStatusChange(match.id, 'cancelled')}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Cancel
          </DropdownMenuItem>
        )
        break
      case 'live':
        actions.push(
          <DropdownMenuItem 
            key="pause" 
            onClick={() => handleStatusChange(match.id, 'paused')}
          >
            <Pause className="h-4 w-4 mr-2" />
            Pause Match
          </DropdownMenuItem>,
          <DropdownMenuItem 
            key="end" 
            onClick={() => handleStatusChange(match.id, 'completed')}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            End Match
          </DropdownMenuItem>
        )
        break
      case 'paused':
        actions.push(
          <DropdownMenuItem 
            key="resume" 
            onClick={() => handleStatusChange(match.id, 'live')}
          >
            <Play className="h-4 w-4 mr-2" />
            Resume Match
          </DropdownMenuItem>,
          <DropdownMenuItem 
            key="end" 
            onClick={() => handleStatusChange(match.id, 'completed')}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            End Match
          </DropdownMenuItem>
        )
        break
    }

    return actions
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No matches found</h3>
          <p className="text-muted-foreground">
            {selectedStatus === 'all' 
              ? 'No matches have been scheduled yet'
              : `No ${selectedStatus} matches found`
            }
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Status Filter */}
      <div className="flex space-x-2">
        {['all', 'scheduled', 'live', 'paused', 'completed', 'cancelled', 'postponed'].map((status) => (
          <Button
            key={status}
            variant={selectedStatus === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedStatus(status)}
          >
            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
      </div>

      {/* Matches List */}
      <div className="space-y-4">
        {matches.map((match) => {
          const { date, time } = formatMatchTime(match.scheduled_date)
          
          return (
            <Card key={match.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    {/* Match Header */}
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(match.status)}
                        <Badge variant={getStatusColor(match.status)}>
                          {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
                        </Badge>
                      </div>
                      
                      {match.round_name && (
                        <Badge variant="outline">
                          {match.round_name}
                        </Badge>
                      )}
                    </div>

                    {/* Teams */}
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">{match.home_team?.name || 'Unknown Team'}</div>
                          <div className="text-sm text-muted-foreground">Home</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="text-2xl font-bold">
                          {match.home_score !== null ? match.home_score : '-'}
                        </div>
                        <div className="text-muted-foreground">vs</div>
                        <div className="text-2xl font-bold">
                          {match.away_score !== null ? match.away_score : '-'}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div>
                          <div className="font-medium">{match.away_team?.name || 'Unknown Team'}</div>
                          <div className="text-sm text-muted-foreground">Away</div>
                        </div>
                        <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 text-red-600" />
                        </div>
                      </div>
                    </div>

                    {/* Match Details */}
                    <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{date}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{time}</span>
                      </div>
                      {(match.venue || match.venue_details?.name) && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4" />
                          <span>{match.venue_details?.name || match.venue}</span>
                        </div>
                      )}
                      {match.match_duration && (
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{match.match_duration} min</span>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {match.notes && (
                      <div className="bg-muted p-3 rounded text-sm">
                        <strong>Notes:</strong> {match.notes}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onMatchSelect?.(match)}
                    >
                      View Details
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onMatchEdit?.(match)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Match
                        </DropdownMenuItem>
                        
                        {getStatusActions(match)}
                        
                        <DropdownMenuItem 
                          onClick={() => handleDeleteMatch(match.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Match
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
