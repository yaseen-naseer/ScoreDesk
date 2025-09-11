'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trophy, Calendar, Users, Settings, MoreHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { tournamentService, Tournament } from '@/lib/services/tournament-service'
import { useOrganization } from '@/lib/contexts/organization-context'

export default function TournamentsPage() {
  const router = useRouter()
  const { currentOrganization, isLoading: orgLoading } = useOrganization()
  const { toast } = useToast()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (currentOrganization && !orgLoading) {
      loadTournaments()
    }
  }, [currentOrganization, orgLoading])

  const loadTournaments = async () => {
    if (!currentOrganization) return

    try {
      setIsLoading(true)
      const data = await tournamentService.getTournaments(currentOrganization.id)
      setTournaments(data)
    } catch (error) {
      console.error('Error loading tournaments:', error)
      toast({
        title: 'Error',
        description: 'Failed to load tournaments',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteTournament = async (tournamentId: string) => {
    try {
      await tournamentService.deleteTournament(tournamentId)
      toast({
        title: 'Success',
        description: 'Tournament deleted successfully'
      })
      loadTournaments()
    } catch (error) {
      console.error('Error deleting tournament:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete tournament',
        variant: 'destructive'
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'secondary'
      case 'registration':
        return 'default'
      case 'active':
        return 'destructive'
      case 'completed':
        return 'outline'
      case 'cancelled':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'league':
        return '🏆'
      case 'knockout':
        return '🎯'
      case 'group':
        return '👥'
      default:
        return '🏆'
    }
  }

  const getSportIcon = (sport: string) => {
    switch (sport) {
      case 'football':
        return '⚽'
      case 'futsal':
        return '🥅'
      default:
        return '⚽'
    }
  }

  if (orgLoading || isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!currentOrganization) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No Organization Selected</h1>
          <p>Please select an organization to manage tournaments.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-2">
            <Trophy className="h-8 w-8 text-blue-600" />
            <span>Tournaments</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your organization's tournaments
          </p>
        </div>
        <Button onClick={() => router.push('/tournaments/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Tournament
        </Button>
      </div>

      {/* Tournaments Grid */}
      {tournaments.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tournaments yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first tournament to get started
            </p>
            <Button onClick={() => router.push('/tournaments/create')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Tournament
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((tournament) => (
            <Card key={tournament.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <span>{getFormatIcon(tournament.format)}</span>
                      <span>{tournament.name}</span>
                    </CardTitle>
                    <CardDescription className="flex items-center space-x-2">
                      <span>{getSportIcon(tournament.sport)}</span>
                      <span className="capitalize">{tournament.sport}</span>
                      <span>•</span>
                      <span className="capitalize">{tournament.format}</span>
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/tournaments/${tournament.id}`)}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/tournaments/${tournament.id}/edit`)}>
                        Edit Tournament
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteTournament(tournament.id)}
                        className="text-red-600"
                      >
                        Delete Tournament
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant={getStatusColor(tournament.status)}>
                    {tournament.status}
                  </Badge>
                  {tournament.max_teams && (
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>Max {tournament.max_teams}</span>
                    </div>
                  )}
                </div>

                {tournament.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {tournament.description}
                  </p>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {new Date(tournament.start_date).toLocaleDateString()} - {' '}
                      {new Date(tournament.end_date).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {tournament.registration_deadline && (
                    <div className="flex items-center space-x-2">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Registration: {new Date(tournament.registration_deadline).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => router.push(`/tournaments/${tournament.id}`)}
                  >
                    View Tournament
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
