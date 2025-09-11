'use client'

/**
 * Jersey Number Management Component
 * Advanced jersey number assignment with conflict resolution
 */

import React, { useState, useEffect } from 'react'
import { 
  Shirt, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Minus,
  Search,
  Filter,
  RefreshCw,
  Users,
  Crown,
  Star,
  Zap,
  Shield,
  Target
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { playerService, type PlayerProfile } from '@/lib/services/player-service'

interface JerseyNumberManagementProps {
  teamId: string
  players: PlayerProfile[]
  onPlayerUpdate?: (player: PlayerProfile) => void
  className?: string
}

interface JerseyConflict {
  number: number
  players: PlayerProfile[]
  conflictType: 'duplicate' | 'retired' | 'reserved'
  severity: 'high' | 'medium' | 'low'
}

interface JerseyRule {
  id: string
  name: string
  description: string
  type: 'retired' | 'reserved' | 'range' | 'position'
  value: number | number[]
  appliesTo: string[]
}

export function JerseyNumberManagement({ 
  teamId, 
  players, 
  onPlayerUpdate,
  className 
}: JerseyNumberManagementProps) {
  const { toast } = useToast()
  const [conflicts, setConflicts] = useState<JerseyConflict[]>([])
  const [availableNumbers, setAvailableNumbers] = useState<number[]>([])
  const [retiredNumbers, setRetiredNumbers] = useState<number[]>([])
  const [reservedNumbers, setReservedNumbers] = useState<number[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerProfile | null>(null)
  const [newJerseyNumber, setNewJerseyNumber] = useState<number | null>(null)
  const [isAssigning, setIsAssigning] = useState(false)
  const [showRules, setShowRules] = useState(false)

  // Mock jersey rules for demonstration
  const jerseyRules: JerseyRule[] = [
    {
      id: 'retired-10',
      name: 'Retired Number 10',
      description: 'Number 10 is retired in honor of legendary player',
      type: 'retired',
      value: 10,
      appliesTo: ['all']
    },
    {
      id: 'retired-7',
      name: 'Retired Number 7',
      description: 'Number 7 is retired for club legend',
      type: 'retired',
      value: 7,
      appliesTo: ['all']
    },
    {
      id: 'reserved-1',
      name: 'Reserved for Goalkeepers',
      description: 'Number 1 is reserved for goalkeepers only',
      type: 'reserved',
      value: 1,
      appliesTo: ['goalkeeper']
    },
    {
      id: 'range-1-99',
      name: 'Valid Range',
      description: 'Jersey numbers must be between 1 and 99',
      type: 'range',
      value: [1, 99],
      appliesTo: ['all']
    }
  ]

  useEffect(() => {
    analyzeJerseyNumbers()
    generateAvailableNumbers()
  }, [players])

  const analyzeJerseyNumbers = () => {
    const conflicts: JerseyConflict[] = []
    const numberMap = new Map<number, PlayerProfile[]>()

    // Group players by jersey number
    players.forEach(player => {
      if (player.jersey_number) {
        if (!numberMap.has(player.jersey_number)) {
          numberMap.set(player.jersey_number, [])
        }
        numberMap.get(player.jersey_number)!.push(player)
      }
    })

    // Check for duplicates
    numberMap.forEach((playersWithNumber, number) => {
      if (playersWithNumber.length > 1) {
        conflicts.push({
          number,
          players: playersWithNumber,
          conflictType: 'duplicate',
          severity: 'high'
        })
      }
    })

    // Check for retired numbers
    jerseyRules
      .filter(rule => rule.type === 'retired')
      .forEach(rule => {
        const retiredNumber = rule.value as number
        const playersWithRetiredNumber = players.filter(p => p.jersey_number === retiredNumber)
        
        if (playersWithRetiredNumber.length > 0) {
          conflicts.push({
            number: retiredNumber,
            players: playersWithRetiredNumber,
            conflictType: 'retired',
            severity: 'high'
          })
        }
      })

    // Check for reserved numbers
    jerseyRules
      .filter(rule => rule.type === 'reserved')
      .forEach(rule => {
        const reservedNumber = rule.value as number
        const playersWithReservedNumber = players.filter(p => 
          p.jersey_number === reservedNumber && 
          !rule.appliesTo.includes(p.position) && 
          !rule.appliesTo.includes('all')
        )
        
        if (playersWithReservedNumber.length > 0) {
          conflicts.push({
            number: reservedNumber,
            players: playersWithReservedNumber,
            conflictType: 'reserved',
            severity: 'medium'
          })
        }
      })

    setConflicts(conflicts)
  }

  const generateAvailableNumbers = () => {
    const usedNumbers = new Set(players.map(p => p.jersey_number).filter(Boolean))
    const retiredNumbersSet = new Set(jerseyRules.filter(r => r.type === 'retired').map(r => r.value as number))
    const reservedNumbersSet = new Set(jerseyRules.filter(r => r.type === 'reserved').map(r => r.value as number))
    
    const available: number[] = []
    for (let i = 1; i <= 99; i++) {
      if (!usedNumbers.has(i) && !retiredNumbersSet.has(i)) {
        available.push(i)
      }
    }
    
    setAvailableNumbers(available)
    setRetiredNumbers(Array.from(retiredNumbersSet))
    setReservedNumbers(Array.from(reservedNumbersSet))
  }

  const assignJerseyNumber = async (player: PlayerProfile, number: number) => {
    try {
      setIsAssigning(true)
      
      // Check for conflicts
      const conflict = conflicts.find(c => c.number === number)
      if (conflict) {
        toast({
          variant: 'destructive',
          title: 'Jersey Number Conflict',
          description: `Number ${number} has conflicts that must be resolved first`
        })
        return
      }

      // Check jersey rules
      const ruleViolation = checkJerseyRules(player, number)
      if (ruleViolation) {
        toast({
          variant: 'destructive',
          title: 'Jersey Rule Violation',
          description: ruleViolation
        })
        return
      }

      // Update player jersey number
      const updatedPlayer = await playerService.updatePlayer(player.id, {
        jersey_number: number
      })

      if (updatedPlayer) {
        toast({
          title: 'Jersey Number Assigned',
          description: `${player.full_name} assigned jersey number ${number}`
        })
        
        onPlayerUpdate?.(updatedPlayer)
        setSelectedPlayer(null)
        setNewJerseyNumber(null)
      }
    } catch (error) {
      console.error('Error assigning jersey number:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to assign jersey number'
      })
    } finally {
      setIsAssigning(false)
    }
  }

  const removeJerseyNumber = async (player: PlayerProfile) => {
    try {
      const updatedPlayer = await playerService.updatePlayer(player.id, {
        jersey_number: null
      })

      if (updatedPlayer) {
        toast({
          title: 'Jersey Number Removed',
          description: `${player.full_name}'s jersey number has been removed`
        })
        
        onPlayerUpdate?.(updatedPlayer)
      }
    } catch (error) {
      console.error('Error removing jersey number:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to remove jersey number'
      })
    }
  }

  const checkJerseyRules = (player: PlayerProfile, number: number): string | null => {
    for (const rule of jerseyRules) {
      if (rule.type === 'retired' && rule.value === number) {
        return `Number ${number} is retired: ${rule.description}`
      }
      
      if (rule.type === 'reserved' && rule.value === number) {
        if (!rule.appliesTo.includes(player.position) && !rule.appliesTo.includes('all')) {
          return `Number ${number} is reserved for ${rule.appliesTo.join(', ')}: ${rule.description}`
        }
      }
      
      if (rule.type === 'range') {
        const [min, max] = rule.value as number[]
        if (number < min || number > max) {
          return `Jersey numbers must be between ${min} and ${max}`
        }
      }
    }
    
    return null
  }

  const getConflictIcon = (conflictType: string) => {
    switch (conflictType) {
      case 'duplicate': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'retired': return <XCircle className="h-4 w-4 text-orange-500" />
      case 'reserved': return <Shield className="h-4 w-4 text-yellow-500" />
      default: return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  const getConflictColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'border-red-200 bg-red-50'
      case 'medium': return 'border-yellow-200 bg-yellow-50'
      case 'low': return 'border-blue-200 bg-blue-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  const getPositionIcon = (position: string) => {
    switch (position) {
      case 'goalkeeper': return <Shield className="h-4 w-4" />
      case 'defender': return <Shield className="h-4 w-4" />
      case 'midfielder': return <Zap className="h-4 w-4" />
      case 'forward': return <Target className="h-4 w-4" />
      default: return <Users className="h-4 w-4" />
    }
  }

  const filteredPlayers = players.filter(player =>
    player.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.jersey_number?.toString().includes(searchTerm) ||
    player.position.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Jersey Number Management</h2>
            <p className="text-muted-foreground">
              Manage jersey number assignments and resolve conflicts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowRules(true)}>
              <Shield className="mr-2 h-4 w-4" />
              Jersey Rules
            </Button>
            <Button variant="outline" size="sm" onClick={analyzeJerseyNumbers}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Conflicts Alert */}
        {conflicts.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>{conflicts.length} jersey number conflict{conflicts.length > 1 ? 's' : ''}</strong> detected. 
              Please resolve these conflicts before assigning new numbers.
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{players.length}</div>
                  <div className="text-sm text-muted-foreground">Total Players</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Shirt className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">
                    {players.filter(p => p.jersey_number).length}
                  </div>
                  <div className="text-sm text-muted-foreground">With Jersey Numbers</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <div className="text-2xl font-bold">{conflicts.length}</div>
                  <div className="text-sm text-muted-foreground">Conflicts</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold">{availableNumbers.length}</div>
                  <div className="text-sm text-muted-foreground">Available Numbers</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="players" className="w-full">
          <TabsList>
            <TabsTrigger value="players">Players</TabsTrigger>
            <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
            <TabsTrigger value="available">Available Numbers</TabsTrigger>
            <TabsTrigger value="rules">Jersey Rules</TabsTrigger>
          </TabsList>

          {/* Players Tab */}
          <TabsContent value="players">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Player Jersey Numbers</CardTitle>
                    <CardDescription>
                      Manage jersey number assignments for all players
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search players..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredPlayers.map((player) => (
                    <div key={player.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={player.profile_image_url || ''} />
                          <AvatarFallback>
                            {player.first_name[0]}{player.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{player.full_name}</p>
                            {player.is_captain && (
                              <Crown className="h-4 w-4 text-yellow-500" />
                            )}
                            {player.is_vice_captain && (
                              <Star className="h-4 w-4 text-blue-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {getPositionIcon(player.position)}
                            <span>{player.position.charAt(0).toUpperCase() + player.position.slice(1)}</span>
                            <span>•</span>
                            <span>Age {player.age}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {player.jersey_number ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-lg px-3 py-1">
                              #{player.jersey_number}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeJerseyNumber(player)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedPlayer(player)}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Assign Number
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Conflicts Tab */}
          <TabsContent value="conflicts">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Jersey Number Conflicts
                </CardTitle>
                <CardDescription>
                  Resolve jersey number conflicts and rule violations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {conflicts.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-muted-foreground">No jersey number conflicts found!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {conflicts.map((conflict, index) => (
                      <div key={index} className={`p-4 border rounded-lg ${getConflictColor(conflict.severity)}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getConflictIcon(conflict.conflictType)}
                            <span className="font-medium">
                              Jersey Number #{conflict.number}
                            </span>
                            <Badge variant="outline" className={conflict.severity === 'high' ? 'border-red-500 text-red-700' : ''}>
                              {conflict.conflictType}
                            </Badge>
                          </div>
                          <Badge variant={conflict.severity === 'high' ? 'destructive' : 'secondary'}>
                            {conflict.severity} priority
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            {conflict.conflictType === 'duplicate' && 'Multiple players assigned this number:'}
                            {conflict.conflictType === 'retired' && 'This number is retired:'}
                            {conflict.conflictType === 'reserved' && 'This number is reserved for specific positions:'}
                          </p>
                          
                          <div className="space-y-2">
                            {conflict.players.map((player) => (
                              <div key={player.id} className="flex items-center gap-2 p-2 bg-white rounded border">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={player.profile_image_url || ''} />
                                  <AvatarFallback className="text-xs">
                                    {player.first_name[0]}{player.last_name[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium">{player.full_name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {player.position}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Available Numbers Tab */}
          <TabsContent value="available">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Available Jersey Numbers
                </CardTitle>
                <CardDescription>
                  Numbers available for assignment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-10 gap-2">
                  {Array.from({ length: 99 }, (_, i) => i + 1).map((number) => {
                    const isAvailable = availableNumbers.includes(number)
                    const isRetired = retiredNumbers.includes(number)
                    const isReserved = reservedNumbers.includes(number)
                    
                    return (
                      <div
                        key={number}
                        className={`
                          aspect-square flex items-center justify-center rounded border text-sm font-medium
                          ${isAvailable 
                            ? 'bg-green-100 border-green-300 text-green-700 hover:bg-green-200 cursor-pointer' 
                            : isRetired 
                            ? 'bg-red-100 border-red-300 text-red-700' 
                            : isReserved 
                            ? 'bg-yellow-100 border-yellow-300 text-yellow-700'
                            : 'bg-gray-100 border-gray-300 text-gray-700'
                          }
                        `}
                        onClick={() => isAvailable && setNewJerseyNumber(number)}
                      >
                        {number}
                      </div>
                    )
                  })}
                </div>
                
                <div className="mt-4 flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
                    <span>Retired</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
                    <span>Reserved</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
                    <span>Assigned</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Jersey Rules Tab */}
          <TabsContent value="rules">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Jersey Number Rules
                </CardTitle>
                <CardDescription>
                  Rules and restrictions for jersey number assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {jerseyRules.map((rule) => (
                    <div key={rule.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{rule.name}</h4>
                        <Badge variant="outline">
                          {rule.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {rule.description}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        Applies to: {rule.appliesTo.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Jersey Number Assignment Dialog */}
        <Dialog open={!!selectedPlayer} onOpenChange={() => setSelectedPlayer(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Jersey Number</DialogTitle>
              <DialogDescription>
                Assign a jersey number to {selectedPlayer?.full_name}
              </DialogDescription>
            </DialogHeader>
            
            {selectedPlayer && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedPlayer.profile_image_url || ''} />
                    <AvatarFallback>
                      {selectedPlayer.first_name[0]}{selectedPlayer.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedPlayer.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedPlayer.position.charAt(0).toUpperCase() + selectedPlayer.position.slice(1)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Available Jersey Numbers</Label>
                  <div className="grid grid-cols-10 gap-2 max-h-40 overflow-y-auto">
                    {availableNumbers.map((number) => {
                      const ruleViolation = checkJerseyRules(selectedPlayer, number)
                      const isReserved = reservedNumbers.includes(number)
                      
                      return (
                        <button
                          key={number}
                          className={`
                            aspect-square flex items-center justify-center rounded border text-sm font-medium
                            ${ruleViolation 
                              ? 'bg-red-100 border-red-300 text-red-700 cursor-not-allowed' 
                              : isReserved && !jerseyRules.find(r => r.type === 'reserved' && r.value === number && r.appliesTo.includes(selectedPlayer.position))
                              ? 'bg-yellow-100 border-yellow-300 text-yellow-700 cursor-not-allowed'
                              : 'bg-green-100 border-green-300 text-green-700 hover:bg-green-200 cursor-pointer'
                            }
                          `}
                          onClick={() => !ruleViolation && setNewJerseyNumber(number)}
                          disabled={!!ruleViolation}
                          title={ruleViolation || ''}
                        >
                          {number}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {newJerseyNumber && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Ready to assign jersey number <strong>#{newJerseyNumber}</strong> to {selectedPlayer.full_name}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSelectedPlayer(null)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => newJerseyNumber && assignJerseyNumber(selectedPlayer, newJerseyNumber)}
                    disabled={!newJerseyNumber || isAssigning}
                  >
                    {isAssigning ? 'Assigning...' : 'Assign Number'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default JerseyNumberManagement
