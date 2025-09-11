'use client'

/**
 * Roster Management Component
 * Advanced roster management with position assignments and lineup management
 */

import React, { useState, useEffect } from 'react'
import { 
  Users, 
  Shirt, 
  Target, 
  Settings, 
  Plus, 
  Minus,
  RotateCcw,
  Save,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Search,
  Filter,
  Grid,
  List,
  Calendar,
  Trophy,
  Activity
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { playerService, type PlayerProfile, type PlayerSearchFilters } from '@/lib/services/player-service'
import { useToast } from '@/hooks/use-toast'
import { useDebounce } from '@/hooks/use-debounce'

interface RosterManagementProps {
  teamId: string
  className?: string
}

interface Formation {
  id: string
  name: string
  description: string
  positions: {
    goalkeeper: number
    defenders: number
    midfielders: number
    forwards: number
  }
  layout: string[]
}

interface LineupPlayer {
  player: PlayerProfile
  position: string
  isStarter: boolean
  isCaptain?: boolean
  isViceCaptain?: boolean
}

const formations: Formation[] = [
  {
    id: '4-4-2',
    name: '4-4-2',
    description: 'Classic formation with 4 defenders, 4 midfielders, and 2 forwards',
    positions: { goalkeeper: 1, defenders: 4, midfielders: 4, forwards: 2 },
    layout: ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST']
  },
  {
    id: '4-3-3',
    name: '4-3-3',
    description: 'Attacking formation with 4 defenders, 3 midfielders, and 3 forwards',
    positions: { goalkeeper: 1, defenders: 4, midfielders: 3, forwards: 3 },
    layout: ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'ST', 'RW']
  },
  {
    id: '3-5-2',
    name: '3-5-2',
    description: 'Midfield-heavy formation with 3 defenders, 5 midfielders, and 2 forwards',
    positions: { goalkeeper: 1, defenders: 3, midfielders: 5, forwards: 2 },
    layout: ['GK', 'CB', 'CB', 'CB', 'LWB', 'CDM', 'CM', 'CM', 'RWB', 'ST', 'ST']
  },
  {
    id: '4-2-3-1',
    name: '4-2-3-1',
    description: 'Balanced formation with 4 defenders, 2 defensive midfielders, 3 attacking midfielders, and 1 forward',
    positions: { goalkeeper: 1, defenders: 4, midfielders: 5, forwards: 1 },
    layout: ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CDM', 'CAM', 'LW', 'RW', 'ST']
  },
  {
    id: '5-3-2',
    name: '5-3-2',
    description: 'Defensive formation with 5 defenders, 3 midfielders, and 2 forwards',
    positions: { goalkeeper: 1, defenders: 5, midfielders: 3, forwards: 2 },
    layout: ['GK', 'LWB', 'CB', 'CB', 'CB', 'RWB', 'CM', 'CM', 'CM', 'ST', 'ST']
  }
]

const positionColors = {
  goalkeeper: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  defender: 'bg-blue-100 text-blue-800 border-blue-200',
  midfielder: 'bg-green-100 text-green-800 border-green-200',
  forward: 'bg-red-100 text-red-800 border-red-200',
  utility: 'bg-purple-100 text-purple-800 border-purple-200'
}

export function RosterManagement({ teamId, className }: RosterManagementProps) {
  const { toast } = useToast()
  
  // State
  const [players, setPlayers] = useState<PlayerProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'roster' | 'lineup' | 'formations'>('roster')
  const [selectedFormation, setSelectedFormation] = useState<Formation>(formations[0])
  const [lineup, setLineup] = useState<LineupPlayer[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [positionFilter, setPositionFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  useEffect(() => {
    loadPlayers()
  }, [teamId, debouncedSearchTerm, positionFilter, statusFilter])

  const loadPlayers = async () => {
    try {
      setLoading(true)
      const filters: PlayerSearchFilters = {
        search: debouncedSearchTerm || undefined,
        position: positionFilter || undefined,
        status: statusFilter || undefined
      }

      const result = await playerService.getTeamPlayers(teamId, filters, {
        orderBy: { column: 'jersey_number', ascending: true }
      })

      setPlayers(result.players)
    } catch (error) {
      console.error('Error loading players:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load players'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFormationChange = (formation: Formation) => {
    setSelectedFormation(formation)
    // Auto-assign players to positions based on formation
    autoAssignPlayers(formation)
  }

  const autoAssignPlayers = (formation: Formation) => {
    const goalkeepers = players.filter(p => p.position === 'goalkeeper' && p.status === 'active')
    const defenders = players.filter(p => p.position === 'defender' && p.status === 'active')
    const midfielders = players.filter(p => p.position === 'midfielder' && p.status === 'active')
    const forwards = players.filter(p => p.position === 'forward' && p.status === 'active')

    const newLineup: LineupPlayer[] = []

    // Assign goalkeeper
    if (goalkeepers.length > 0) {
      newLineup.push({
        player: goalkeepers[0],
        position: 'GK',
        isStarter: true
      })
    }

    // Assign defenders
    defenders.slice(0, formation.positions.defenders).forEach((player, index) => {
      const positions = ['LB', 'CB', 'CB', 'RB', 'LWB', 'RWB']
      newLineup.push({
        player,
        position: positions[index] || 'CB',
        isStarter: true
      })
    })

    // Assign midfielders
    midfielders.slice(0, formation.positions.midfielders).forEach((player, index) => {
      const positions = ['CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW']
      newLineup.push({
        player,
        position: positions[index] || 'CM',
        isStarter: true
      })
    })

    // Assign forwards
    forwards.slice(0, formation.positions.forwards).forEach((player, index) => {
      const positions = ['ST', 'LW', 'RW']
      newLineup.push({
        player,
        position: positions[index] || 'ST',
        isStarter: true
      })
    })

    setLineup(newLineup)
  }

  const assignPlayerToPosition = (player: PlayerProfile, position: string) => {
    const existingIndex = lineup.findIndex(lp => lp.position === position)
    
    if (existingIndex >= 0) {
      // Replace existing player
      const newLineup = [...lineup]
      newLineup[existingIndex] = {
        player,
        position,
        isStarter: true
      }
      setLineup(newLineup)
    } else {
      // Add new player
      setLineup([...lineup, {
        player,
        position,
        isStarter: true
      }])
    }
  }

  const removePlayerFromLineup = (position: string) => {
    setLineup(lineup.filter(lp => lp.position !== position))
  }

  const toggleCaptain = (position: string) => {
    const newLineup = lineup.map(lp => {
      if (lp.position === position) {
        return { ...lp, isCaptain: !lp.isCaptain, isViceCaptain: false }
      } else if (lp.isCaptain) {
        return { ...lp, isCaptain: false }
      }
      return lp
    })
    setLineup(newLineup)
  }

  const toggleViceCaptain = (position: string) => {
    const newLineup = lineup.map(lp => {
      if (lp.position === position) {
        return { ...lp, isViceCaptain: !lp.isViceCaptain, isCaptain: false }
      } else if (lp.isViceCaptain) {
        return { ...lp, isViceCaptain: false }
      }
      return lp
    })
    setLineup(newLineup)
  }

  const getPositionColor = (position: string) => {
    if (position === 'GK') return positionColors.goalkeeper
    if (['LB', 'CB', 'RB', 'LWB', 'RWB'].includes(position)) return positionColors.defender
    if (['CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW'].includes(position)) return positionColors.midfielder
    if (['ST'].includes(position)) return positionColors.forward
    return positionColors.utility
  }

  const renderRosterView = () => (
    <div className="space-y-6">
      {/* Roster Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(positionColors).map(([position, colorClass]) => {
          const count = players.filter(p => p.position === position && p.status === 'active').length
          return (
            <Card key={position}>
              <CardContent className="p-4 text-center">
                <Badge className={`${colorClass} mb-2`}>
                  {position.charAt(0).toUpperCase() + position.slice(1)}
                </Badge>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">Active Players</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Players List */}
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-20" />
          ))
        ) : players.length > 0 ? (
          players.map((player) => (
            <Card key={player.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={player.profile_image_url || ''} />
                    <AvatarFallback>
                      {player.first_name[0]}{player.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{player.full_name}</h3>
                      {player.jersey_number && (
                        <Badge variant="outline">#{player.jersey_number}</Badge>
                      )}
                      <Badge className={positionColors[player.position]}>
                        {player.position}
                      </Badge>
                      <Badge variant={player.status === 'active' ? 'default' : 'secondary'}>
                        {player.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{player.age} years old</span>
                      <span>{player.preferred_foot} footed</span>
                      {player.height && <span>{player.height}cm</span>}
                      {player.weight && <span>{player.weight}kg</span>}
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Player
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Shirt className="mr-2 h-4 w-4" />
                        Assign to Lineup
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  No players found
                </h3>
                <p className="text-sm text-muted-foreground">
                  Register players to start building your roster.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )

  const renderLineupView = () => (
    <div className="space-y-6">
      {/* Formation Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Formation</CardTitle>
          <CardDescription>
            Choose a tactical formation for your lineup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {formations.map((formation) => (
              <Button
                key={formation.id}
                variant={selectedFormation.id === formation.id ? 'default' : 'outline'}
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => handleFormationChange(formation)}
              >
                <div className="text-lg font-bold">{formation.name}</div>
                <div className="text-xs text-center">{formation.description}</div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Formation Field */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Lineup - {selectedFormation.name}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => autoAssignPlayers(selectedFormation)}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Auto Assign
              </Button>
              <Button size="sm">
                <Save className="mr-2 h-4 w-4" />
                Save Lineup
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative bg-green-50 border-2 border-green-200 rounded-lg p-8 min-h-[400px]">
            {/* Field Layout */}
            <div className="grid grid-cols-11 gap-2 h-full">
              {selectedFormation.layout.map((position, index) => {
                const lineupPlayer = lineup.find(lp => lp.position === position)
                const isGoalkeeper = position === 'GK'
                const row = Math.floor(index / 11)
                const col = index % 11
                
                return (
                  <div
                    key={position}
                    className={`flex items-center justify-center min-h-[60px] border-2 border-dashed rounded-lg ${
                      isGoalkeeper ? 'bg-yellow-100 border-yellow-300' : 'bg-white border-gray-300'
                    }`}
                    style={{
                      gridRow: row + 1,
                      gridColumn: col + 1
                    }}
                  >
                    {lineupPlayer ? (
                      <div className="text-center">
                        <div className="flex items-center gap-1 mb-1">
                          {lineupPlayer.isCaptain && (
                            <Badge className="bg-yellow-500 text-white text-xs">C</Badge>
                          )}
                          {lineupPlayer.isViceCaptain && (
                            <Badge className="bg-gray-500 text-white text-xs">VC</Badge>
                          )}
                        </div>
                        <div className="text-xs font-bold">{lineupPlayer.player.jersey_number || '?'}</div>
                        <div className="text-xs">{lineupPlayer.player.first_name}</div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="center">
                            <DropdownMenuItem onClick={() => toggleCaptain(position)}>
                              {lineupPlayer.isCaptain ? 'Remove Captain' : 'Make Captain'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleViceCaptain(position)}>
                              {lineupPlayer.isViceCaptain ? 'Remove Vice Captain' : 'Make Vice Captain'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => removePlayerFromLineup(position)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ) : (
                      <div className="text-center text-gray-400">
                        <div className="text-xs font-bold">{position}</div>
                        <div className="text-xs">Empty</div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Players */}
      <Card>
        <CardHeader>
          <CardTitle>Available Players</CardTitle>
          <CardDescription>
            Click on a player to assign them to a position
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {players.filter(p => p.status === 'active' && !lineup.some(lp => lp.player.id === p.id)).map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted cursor-pointer"
                onClick={() => {
                  // Show position selection dialog
                  toast({
                    title: 'Select Position',
                    description: `Choose a position for ${player.full_name}`
                  })
                }}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={player.profile_image_url || ''} />
                  <AvatarFallback className="text-xs">
                    {player.first_name[0]}{player.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{player.full_name}</span>
                    {player.jersey_number && (
                      <Badge variant="outline" className="text-xs">#{player.jersey_number}</Badge>
                    )}
                  </div>
                  <Badge className={`${positionColors[player.position]} text-xs`}>
                    {player.position}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderFormationsView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {formations.map((formation) => (
          <Card key={formation.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{formation.name}</span>
                <Badge variant="outline">{formation.layout.length} Players</Badge>
              </CardTitle>
              <CardDescription>{formation.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>Goalkeeper:</span>
                    <span className="font-medium">{formation.positions.goalkeeper}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Defenders:</span>
                    <span className="font-medium">{formation.positions.defenders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Midfielders:</span>
                    <span className="font-medium">{formation.positions.midfielders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Forwards:</span>
                    <span className="font-medium">{formation.positions.forwards}</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="text-xs text-muted-foreground">
                  <div className="font-medium mb-1">Position Layout:</div>
                  <div className="flex flex-wrap gap-1">
                    {formation.layout.map((pos) => (
                      <Badge key={pos} variant="outline" className="text-xs">
                        {pos}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => {
                    setSelectedFormation(formation)
                    setViewMode('lineup')
                  }}
                >
                  Use This Formation
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Roster Management</h2>
          <p className="text-muted-foreground">
            Manage your team roster, lineups, and formations
          </p>
        </div>
        
        {/* Search and Filters */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Positions</SelectItem>
              <SelectItem value="goalkeeper">Goalkeeper</SelectItem>
              <SelectItem value="defender">Defender</SelectItem>
              <SelectItem value="midfielder">Midfielder</SelectItem>
              <SelectItem value="forward">Forward</SelectItem>
              <SelectItem value="utility">Utility</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="injured">Injured</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="roster">Roster</TabsTrigger>
          <TabsTrigger value="lineup">Lineup</TabsTrigger>
          <TabsTrigger value="formations">Formations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="roster">
          {renderRosterView()}
        </TabsContent>
        
        <TabsContent value="lineup">
          {renderLineupView()}
        </TabsContent>
        
        <TabsContent value="formations">
          {renderFormationsView()}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default RosterManagement
