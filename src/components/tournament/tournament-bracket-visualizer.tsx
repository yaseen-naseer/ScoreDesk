'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
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
  AlertCircle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Share2,
  Settings,
  RefreshCw
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useSupabase } from '@/components/providers/supabase-provider'
import { 
  TournamentBracketService,
  BracketStructure,
  BracketNode,
  BracketMatch,
  BracketType,
  BracketStats,
  BracketVisualization,
  tournamentBracketService 
} from '@/lib/services/tournament-bracket-service'

interface TournamentBracketVisualizerProps {
  tournamentId: string
  tournamentName: string
  onMatchClick?: (matchId: string) => void
  onBracketUpdate?: () => void
  className?: string
}

interface ViewportState {
  x: number
  y: number
  zoom: number
}

export function TournamentBracketVisualizer({ 
  tournamentId, 
  tournamentName,
  onMatchClick,
  onBracketUpdate,
  className 
}: TournamentBracketVisualizerProps) {
  const { toast } = useToast()
  const { supabase } = useSupabase()
  const [bracket, setBracket] = useState<BracketStructure | null>(null)
  const [visualization, setVisualization] = useState<BracketVisualization | null>(null)
  const [stats, setStats] = useState<BracketStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<BracketNode | null>(null)
  const [viewport, setViewport] = useState<ViewportState>({ x: 0, y: 0, zoom: 1 })
  const [viewMode, setViewMode] = useState<'bracket' | 'list'>('bracket')
  const [selectedRound, setSelectedRound] = useState<number>(1)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadBracketData()
  }, [tournamentId])

  const loadBracketData = async () => {
    try {
      setIsLoading(true)
      
      // Get bracket structure
      const bracketData = await tournamentBracketService.getBracketStructure(tournamentId)
      setBracket(bracketData)

      if (bracketData) {
        // Generate visualization
        const vizData = await tournamentBracketService.generateBracketVisualization(bracketData.id)
        setVisualization(vizData)

        // Get statistics
        const statsData = await tournamentBracketService.getBracketStats(bracketData.id)
        setStats(statsData)
      }
    } catch (error) {
      console.error('Error loading bracket data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load tournament bracket',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleZoomIn = () => {
    setViewport(prev => ({ ...prev, zoom: Math.min(prev.zoom * 1.2, 3) }))
  }

  const handleZoomOut = () => {
    setViewport(prev => ({ ...prev, zoom: Math.max(prev.zoom / 1.2, 0.5) }))
  }

  const handleResetView = () => {
    setViewport({ x: 0, y: 0, zoom: 1 })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setViewport(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }))
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleNodeClick = (node: BracketNode) => {
    setSelectedNode(node)
    if (node.match_id && onMatchClick) {
      onMatchClick(node.match_id)
    }
  }

  const getNodeStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 border-green-300 text-green-800'
      case 'live':
        return 'bg-blue-100 border-blue-300 text-blue-800'
      case 'scheduled':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800'
      case 'pending':
        return 'bg-gray-100 border-gray-300 text-gray-800'
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800'
    }
  }

  const getNodeStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'live':
        return <Play className="h-4 w-4 text-blue-600" />
      case 'scheduled':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'pending':
        return <Pause className="h-4 w-4 text-gray-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const renderBracketNode = (node: BracketNode) => {
    const isSelected = selectedNode?.id === node.id
    const hasTeams = node.home_team_id || node.away_team_id
    
    return (
      <div
        key={node.id}
        className={`
          relative bg-white border-2 rounded-lg p-3 cursor-pointer transition-all duration-200
          ${getNodeStatusColor(node.status)}
          ${isSelected ? 'ring-2 ring-blue-500' : ''}
          ${hasTeams ? 'hover:shadow-md' : 'opacity-50'}
          min-w-[200px] max-w-[250px]
        `}
        onClick={() => handleNodeClick(node)}
        style={{
          transform: `scale(${viewport.zoom})`,
          transformOrigin: 'center'
        }}
      >
        {/* Round indicator */}
        <div className="absolute -top-2 -left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
          R{node.round}
        </div>

        {/* Status icon */}
        <div className="absolute -top-2 -right-2">
          {getNodeStatusIcon(node.status)}
        </div>

        {/* Teams */}
        <div className="space-y-2">
          {node.home_team_id ? (
            <div className="flex items-center justify-between">
              <span className="font-medium truncate">
                {node.home_team?.name || `Team ${node.home_team_id.slice(0, 8)}`}
              </span>
              {node.score?.home !== undefined && (
                <span className="font-bold text-lg">{node.score.home}</span>
              )}
            </div>
          ) : (
            <div className="text-gray-400 text-sm">TBD</div>
          )}

          <div className="text-center text-gray-400">vs</div>

          {node.away_team_id ? (
            <div className="flex items-center justify-between">
              <span className="font-medium truncate">
                {node.away_team?.name || `Team ${node.away_team_id.slice(0, 8)}`}
              </span>
              {node.score?.away !== undefined && (
                <span className="font-bold text-lg">{node.score.away}</span>
              )}
            </div>
          ) : (
            <div className="text-gray-400 text-sm">TBD</div>
          )}
        </div>

        {/* Match details */}
        {node.scheduled_date && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div className="flex items-center text-xs text-gray-600 space-x-1">
              <Calendar className="h-3 w-3" />
              <span>{new Date(node.scheduled_date).toLocaleDateString()}</span>
            </div>
            {node.venue && (
              <div className="flex items-center text-xs text-gray-600 space-x-1 mt-1">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{node.venue.name}</span>
              </div>
            )}
          </div>
        )}

        {/* Winner indicator */}
        {node.winner_id && (
          <div className="absolute -bottom-2 -right-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
          </div>
        )}
      </div>
    )
  }

  const renderBracketConnections = () => {
    if (!visualization?.connections) return null

    return visualization.connections.map((connection, index) => {
      // This would render SVG lines connecting nodes
      // For now, we'll use a simple visual indicator
      return (
        <div
          key={index}
          className="absolute border-l-2 border-gray-300"
          style={{
            // Connection positioning would be calculated based on node positions
          }}
        />
      )
    })
  }

  const renderBracketView = () => {
    if (!bracket?.nodes) return null

    const rounds = Array.from(new Set(bracket.nodes.map(n => n.round))).sort((a, b) => a - b)

    return (
      <div className="relative">
        <div
          ref={canvasRef}
          className="relative overflow-hidden bg-gray-50 border rounded-lg"
          style={{ height: '600px' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="relative"
            style={{
              transform: `translate(${viewport.x}px, ${viewport.y}px)`,
              transformOrigin: 'center'
            }}
          >
            {rounds.map(round => {
              const roundNodes = bracket.nodes.filter(n => n.round === round)
              const roundWidth = 300
              const roundX = (round - 1) * roundWidth

              return (
                <div
                  key={round}
                  className="absolute flex flex-col justify-center space-y-8"
                  style={{
                    left: roundX,
                    top: 50,
                    width: roundWidth,
                    height: '100%'
                  }}
                >
                  <div className="text-center font-semibold text-gray-700 mb-4">
                    Round {round}
                  </div>
                  {roundNodes.map(node => renderBracketNode(node))}
                </div>
              )
            })}
            {renderBracketConnections()}
          </div>
        </div>
      </div>
    )
  }

  const renderListView = () => {
    if (!bracket?.nodes) return null

    const roundNodes = bracket.nodes.filter(n => n.round === selectedRound)

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Round {selectedRound} Matches</h3>
          <Select value={selectedRound.toString()} onValueChange={(value) => setSelectedRound(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from(new Set(bracket.nodes.map(n => n.round))).map(round => (
                <SelectItem key={round} value={round.toString()}>
                  Round {round}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roundNodes.map(node => (
            <Card key={node.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline">Round {node.round}</Badge>
                  <div className="flex items-center space-x-2">
                    {getNodeStatusIcon(node.status)}
                    <span className="text-sm font-medium">{node.status}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {node.home_team?.name || 'TBD'}
                    </span>
                    <span className="text-lg font-bold">
                      {node.score?.home !== undefined ? node.score.home : '-'}
                    </span>
                  </div>

                  <div className="text-center text-gray-400 text-sm">vs</div>

                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {node.away_team?.name || 'TBD'}
                    </span>
                    <span className="text-lg font-bold">
                      {node.score?.away !== undefined ? node.score.away : '-'}
                    </span>
                  </div>
                </div>

                {node.scheduled_date && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center text-sm text-gray-600 space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(node.scheduled_date).toLocaleDateString()}</span>
                      <Clock className="h-4 w-4" />
                      <span>{new Date(node.scheduled_date).toLocaleTimeString()}</span>
                    </div>
                    {node.venue && (
                      <div className="flex items-center text-sm text-gray-600 space-x-2 mt-1">
                        <MapPin className="h-4 w-4" />
                        <span>{node.venue.name}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3 flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleNodeClick(node)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Tournament Bracket</CardTitle>
          <CardDescription>Loading bracket data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!bracket) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Tournament Bracket</CardTitle>
          <CardDescription>No bracket found for this tournament</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Bracket Created</h3>
            <p className="text-muted-foreground mb-4">
              This tournament doesn't have a bracket yet. Create one to visualize the tournament structure.
            </p>
            <Button onClick={loadBracketData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="h-5 w-5" />
                <span>Tournament Bracket</span>
              </CardTitle>
              <CardDescription>{tournamentName}</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">{bracket.bracket_type.replace('_', ' ')}</Badge>
              <Badge variant={bracket.status === 'active' ? 'default' : 'secondary'}>
                {bracket.status}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Statistics */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total_matches}</div>
                <div className="text-sm text-muted-foreground">Total Matches</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.completed_matches}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending_matches}</div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.total_goals}</div>
                <div className="text-sm text-muted-foreground">Total Goals</div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'bracket' | 'list')}>
                <TabsList>
                  <TabsTrigger value="bracket">Bracket View</TabsTrigger>
                  <TabsTrigger value="list">List View</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex items-center space-x-2">
              {viewMode === 'bracket' && (
                <>
                  <Button size="sm" variant="outline" onClick={handleZoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <div className="w-20">
                    <Slider
                      value={[viewport.zoom]}
                      onValueChange={([value]) => setViewport(prev => ({ ...prev, zoom: value }))}
                      min={0.5}
                      max={3}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                  <Button size="sm" variant="outline" onClick={handleZoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleResetView}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </>
              )}
              
              <Button size="sm" variant="outline" onClick={loadBracketData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Bracket Settings</DialogTitle>
                    <DialogDescription>
                      Configure bracket display and behavior
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Bracket Type</Label>
                      <Select value={bracket.bracket_type} disabled>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single_elimination">Single Elimination</SelectItem>
                          <SelectItem value="double_elimination">Double Elimination</SelectItem>
                          <SelectItem value="round_robin">Round Robin</SelectItem>
                          <SelectItem value="group_stage">Group Stage</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Bracket Content */}
          <TabsContent value="bracket" className="space-y-4">
            {renderBracketView()}
          </TabsContent>

          <TabsContent value="list" className="space-y-4">
            {renderListView()}
          </TabsContent>
        </CardContent>
      </Card>

      {/* Selected Node Details */}
      {selectedNode && (
        <Dialog open={!!selectedNode} onOpenChange={() => setSelectedNode(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Match Details</DialogTitle>
              <DialogDescription>
                Round {selectedNode.round} • Position {selectedNode.position}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Home Team</Label>
                  <div className="p-3 border rounded-lg">
                    {selectedNode.home_team?.name || 'TBD'}
                  </div>
                </div>
                <div>
                  <Label>Away Team</Label>
                  <div className="p-3 border rounded-lg">
                    {selectedNode.away_team?.name || 'TBD'}
                  </div>
                </div>
              </div>

              {selectedNode.scheduled_date && (
                <div>
                  <Label>Match Date & Time</Label>
                  <div className="p-3 border rounded-lg">
                    {new Date(selectedNode.scheduled_date).toLocaleString()}
                  </div>
                </div>
              )}

              {selectedNode.venue && (
                <div>
                  <Label>Venue</Label>
                  <div className="p-3 border rounded-lg">
                    {selectedNode.venue.name}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setSelectedNode(null)}>
                  Close
                </Button>
                {selectedNode.match_id && (
                  <Button onClick={() => {
                    if (onMatchClick) onMatchClick(selectedNode.match_id!)
                    setSelectedNode(null)
                  }}>
                    View Match
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
