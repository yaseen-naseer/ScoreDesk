'use client'

/**
 * Player Profile Page
 * Comprehensive player profile with performance statistics and analytics
 */

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Edit, 
  Share2, 
  MoreVertical,
  Calendar,
  Trophy,
  Target,
  Users,
  Activity,
  TrendingUp,
  TrendingDown,
  Award,
  Shield,
  Zap,
  Heart,
  Phone,
  Mail,
  MapPin,
  Clock,
  Star,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { AppShell } from '@/components/layout/app-shell'
import { PlayerStatistics } from '@/components/players/player-statistics'
import { playerService, type PlayerProfile } from '@/lib/services/player-service'
import { useOrganization } from '@/lib/contexts/organization-context'
import { useAuth } from '@/lib/auth/auth-context'
import { hasPermission } from '@/lib/auth/permissions'
import { useToast } from '@/hooks/use-toast'

export default function PlayerProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { currentOrganization, userRole } = useOrganization()
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [player, setPlayer] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [team, setTeam] = useState<any>(null)

  const playerId = params.playerId as string
  const teamId = params.id as string
  const canManagePlayers = userRole && hasPermission(userRole, 'players:write')

  useEffect(() => {
    loadPlayer()
  }, [playerId])

  const loadPlayer = async () => {
    try {
      setLoading(true)
      const playerData = await playerService.getPlayer(playerId)
      if (playerData) {
        setPlayer(playerData)
        // TODO: Load team data
      } else {
        toast({
          variant: 'destructive',
          title: 'Player Not Found',
          description: 'The requested player could not be found'
        })
        router.push(`/teams/${teamId}/players`)
      }
    } catch (error) {
      console.error('Error loading player:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load player information'
      })
    } finally {
      setLoading(false)
    }
  }

  const getPositionLabel = (position: string) => {
    switch (position) {
      case 'goalkeeper': return 'Goalkeeper'
      case 'defender': return 'Defender'
      case 'midfielder': return 'Midfielder'
      case 'forward': return 'Forward'
      case 'utility': return 'Utility'
      default: return position
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'injured': return 'bg-red-100 text-red-800'
      case 'suspended': return 'bg-orange-100 text-orange-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getFootLabel = (foot: string) => {
    switch (foot) {
      case 'left': return 'Left-footed'
      case 'right': return 'Right-footed'
      case 'both': return 'Both-footed'
      default: return foot
    }
  }

  // Mock data for demonstration
  const mockMatchHistory = [
    { date: '2024-03-15', opponent: 'Real Madrid FC', result: 'W', score: '2-1', goals: 1, assists: 0, rating: 8.5 },
    { date: '2024-03-10', opponent: 'Barcelona United', result: 'L', score: '0-3', goals: 0, assists: 0, rating: 6.0 },
    { date: '2024-03-05', opponent: 'Arsenal Tigers', result: 'W', score: '3-2', goals: 2, assists: 1, rating: 9.0 },
    { date: '2024-02-28', opponent: 'Chelsea Lions', result: 'D', score: '1-1', goals: 0, assists: 1, rating: 7.5 },
    { date: '2024-02-23', opponent: 'Liverpool Stars', result: 'W', score: '2-0', goals: 1, assists: 0, rating: 8.0 },
  ]

  const mockSeasonStats = {
    matchesPlayed: 15,
    goals: 8,
    assists: 5,
    yellowCards: 2,
    redCards: 0,
    minutesPlayed: 1350,
    averageRating: 7.8,
    cleanSheets: 0, // for goalkeepers
    saves: 0, // for goalkeepers
    tackles: 45, // for defenders
    interceptions: 32, // for defenders
    passesCompleted: 450,
    passAccuracy: 85.2,
    shotsOnTarget: 12,
    shotsOffTarget: 8
  }

  if (loading) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Skeleton className="h-64" />
                <Skeleton className="h-40" />
              </div>
              <div className="space-y-6">
                <Skeleton className="h-32" />
                <Skeleton className="h-48" />
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  if (!player) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <AlertDescription>
              Player not found or you don't have permission to view it.
            </AlertDescription>
          </Alert>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => router.push(`/teams/${teamId}/players`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Players
            </Button>
            <div className="flex items-center gap-3">
              <Avatar className="h-16 w-16">
                <AvatarImage src={player.profile_image_url || ''} />
                <AvatarFallback className="text-lg">
                  {player.first_name[0]}{player.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold">{player.full_name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  {player.jersey_number && (
                    <Badge variant="outline">#{player.jersey_number}</Badge>
                  )}
                  <Badge className="bg-blue-100 text-blue-800">
                    {getPositionLabel(player.position)}
                  </Badge>
                  <Badge className={getStatusColor(player.status)}>
                    {player.status.charAt(0).toUpperCase() + player.status.slice(1)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            {canManagePlayers && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Player
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Player Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Player Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Key Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{mockSeasonStats.goals}</div>
                    <div className="text-xs text-muted-foreground">Goals</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{mockSeasonStats.assists}</div>
                    <div className="text-xs text-muted-foreground">Assists</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{mockSeasonStats.matchesPlayed}</div>
                    <div className="text-xs text-muted-foreground">Matches</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{mockSeasonStats.averageRating}</div>
                    <div className="text-xs text-muted-foreground">Avg Rating</div>
                  </div>
                </div>

                {/* Performance Rating */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overall Performance</span>
                    <span className="text-lg font-bold">{mockSeasonStats.averageRating}/10</span>
                  </div>
                  <Progress value={mockSeasonStats.averageRating * 10} className="h-3" />
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <p className="font-medium">Goals</p>
                      <p className="text-muted-foreground">{mockSeasonStats.goals} total</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium">Assists</p>
                      <p className="text-muted-foreground">{mockSeasonStats.assists} total</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium">Minutes</p>
                      <p className="text-muted-foreground">{mockSeasonStats.minutesPlayed} played</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs for additional content */}
            <Tabs defaultValue="statistics" className="w-full">
              <TabsList>
                <TabsTrigger value="statistics">Statistics</TabsTrigger>
                <TabsTrigger value="matches">Match History</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="profile">Profile</TabsTrigger>
              </TabsList>
              
              <TabsContent value="statistics">
                <PlayerStatistics player={player} />
              </TabsContent>
              
              <TabsContent value="matches">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Recent Matches
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {mockMatchHistory.map((match, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <Badge 
                              variant={match.result === 'W' ? 'default' : match.result === 'D' ? 'secondary' : 'destructive'}
                              className="w-8 h-8 p-0 flex items-center justify-center text-xs"
                            >
                              {match.result}
                            </Badge>
                            <div>
                              <p className="font-medium">{match.opponent}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(match.date).toLocaleDateString()}</span>
                                <span>•</span>
                                <span>{match.score}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="text-center">
                              <div className="font-medium text-orange-600">{match.goals}</div>
                              <div className="text-xs text-muted-foreground">Goals</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-blue-600">{match.assists}</div>
                              <div className="text-xs text-muted-foreground">Assists</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-green-600">{match.rating}</div>
                              <div className="text-xs text-muted-foreground">Rating</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="analytics">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <LineChart className="h-5 w-5" />
                      Performance Analytics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <PieChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Analytics charts will appear here</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="profile">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Player Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Personal Information */}
                      <div className="space-y-4">
                        <h4 className="font-medium">Personal Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">Full Name</Label>
                            <p className="font-medium">{player.full_name}</p>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">Age</Label>
                            <p className="font-medium">{player.age} years old</p>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">Date of Birth</Label>
                            <p className="font-medium">{new Date(player.date_of_birth).toLocaleDateString()}</p>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">Nationality</Label>
                            <p className="font-medium">{player.nationality || 'Not specified'}</p>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Football Information */}
                      <div className="space-y-4">
                        <h4 className="font-medium">Football Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">Position</Label>
                            <Badge className="bg-blue-100 text-blue-800">
                              {getPositionLabel(player.position)}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">Preferred Foot</Label>
                            <p className="font-medium">{getFootLabel(player.preferred_foot)}</p>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">Jersey Number</Label>
                            <p className="font-medium">{player.jersey_number ? `#${player.jersey_number}` : 'Not assigned'}</p>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">Status</Label>
                            <Badge className={getStatusColor(player.status)}>
                              {player.status.charAt(0).toUpperCase() + player.status.slice(1)}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Physical Information */}
                      {(player.height || player.weight) && (
                        <>
                          <Separator />
                          <div className="space-y-4">
                            <h4 className="font-medium">Physical Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {player.height && (
                                <div className="space-y-2">
                                  <Label className="text-sm text-muted-foreground">Height</Label>
                                  <p className="font-medium">{player.height} cm</p>
                                </div>
                              )}
                              {player.weight && (
                                <div className="space-y-2">
                                  <Label className="text-sm text-muted-foreground">Weight</Label>
                                  <p className="font-medium">{player.weight} kg</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Contact Information */}
                      {(player.phone || player.email) && (
                        <>
                          <Separator />
                          <div className="space-y-4">
                            <h4 className="font-medium">Contact Information</h4>
                            <div className="space-y-3">
                              {player.phone && (
                                <div className="flex items-center gap-3">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{player.phone}</span>
                                </div>
                              )}
                              {player.email && (
                                <div className="flex items-center gap-3">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{player.email}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Medical Information */}
                      {(player.medical_conditions || player.allergies || player.medications) && (
                        <>
                          <Separator />
                          <div className="space-y-4">
                            <h4 className="font-medium">Medical Information</h4>
                            <div className="space-y-3">
                              {player.medical_conditions && (
                                <div className="space-y-1">
                                  <Label className="text-sm text-muted-foreground">Medical Conditions</Label>
                                  <p className="text-sm">{player.medical_conditions}</p>
                                </div>
                              )}
                              {player.allergies && (
                                <div className="space-y-1">
                                  <Label className="text-sm text-muted-foreground">Allergies</Label>
                                  <p className="text-sm">{player.allergies}</p>
                                </div>
                              )}
                              {player.medications && (
                                <div className="space-y-1">
                                  <Label className="text-sm text-muted-foreground">Current Medications</Label>
                                  <p className="text-sm">{player.medications}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Matches Played</span>
                    <span className="text-sm font-medium">{mockSeasonStats.matchesPlayed}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Goals</span>
                    <span className="text-sm font-medium">{mockSeasonStats.goals}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Assists</span>
                    <span className="text-sm font-medium">{mockSeasonStats.assists}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Average Rating</span>
                    <span className="text-sm font-medium">{mockSeasonStats.averageRating}/10</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockMatchHistory.slice(0, 3).map((match, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{match.opponent}</p>
                        <p className="text-xs text-muted-foreground">{match.score}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={match.result === 'W' ? 'default' : match.result === 'D' ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {match.result}
                        </Badge>
                        <span className="text-sm font-medium">{match.rating}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Award className="h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="text-sm font-medium">Top Scorer</p>
                      <p className="text-xs text-muted-foreground">8 goals this season</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Star className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">Player of the Month</p>
                      <p className="text-xs text-muted-foreground">March 2024</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Target className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">Assist Leader</p>
                      <p className="text-xs text-muted-foreground">5 assists this season</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
