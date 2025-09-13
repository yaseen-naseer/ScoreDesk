'use client'

import { useState, useEffect } from 'react'
import { Users, Clock, AlertTriangle, CheckCircle, XCircle, Save, Send, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { TeamSheetService, TeamSheet, TeamSheetSubmission, TeamSheetValidationResult, TeamSheetDeadlineStatus, PlayerPosition, FormationType, teamSheetService } from '@/lib/services/team-sheet-service'

interface TeamSheetFormProps {
  matchId: string
  teamId: string
  teamName: string
  onTeamSheetUpdate?: (teamSheet: TeamSheet) => void
}

interface Player {
  id: string
  first_name: string
  last_name: string
  full_name: string
  jersey_number: number
  position: string
  is_active: boolean
}

export function TeamSheetForm({ 
  matchId, 
  teamId, 
  teamName,
  onTeamSheetUpdate 
}: TeamSheetFormProps) {
  const { toast } = useToast()
  const [teamSheet, setTeamSheet] = useState<TeamSheet | null>(null)
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([])
  const [deadlineStatus, setDeadlineStatus] = useState<TeamSheetDeadlineStatus | null>(null)
  const [validationResult, setValidationResult] = useState<TeamSheetValidationResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isValidating, setIsValidating] = useState(false)

  // Form state
  const [formation, setFormation] = useState<FormationType>('4-4-2')
  const [players, setPlayers] = useState<TeamSheetSubmission['players']>([])
  const [notes, setNotes] = useState('')

  useEffect(() => {
    loadTeamSheetData()
  }, [matchId, teamId])

  const loadTeamSheetData = async () => {
    try {
      setIsLoading(true)
      const [existingTeamSheet, players, deadline] = await Promise.all([
        teamSheetService.getTeamSheet(matchId, teamId),
        teamSheetService.getAvailablePlayers(teamId, matchId),
        teamSheetService.getTeamSheetDeadlineStatus(matchId)
      ])

      setAvailablePlayers(players)
      setDeadlineStatus(deadline)

      if (existingTeamSheet) {
        setTeamSheet(existingTeamSheet)
        setFormation(existingTeamSheet.formation)
        setPlayers(existingTeamSheet.players)
        setNotes(existingTeamSheet.notes || '')
      } else {
        // Initialize with empty team sheet
        setPlayers([])
      }
    } catch (error) {
      console.error('Error loading team sheet data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load team sheet data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const validateTeamSheet = async () => {
    if (players.length === 0) {
      setValidationResult({
        is_valid: false,
        errors: ['Please select players for the team sheet'],
        warnings: [],
        player_eligibility: []
      })
      return
    }

    try {
      setIsValidating(true)
      const submission: TeamSheetSubmission = {
        match_id: matchId,
        team_id: teamId,
        formation,
        players,
        notes
      }

      const result = await teamSheetService.validateTeamSheet(submission)
      setValidationResult(result)
    } catch (error) {
      console.error('Error validating team sheet:', error)
      toast({
        title: 'Error',
        description: 'Failed to validate team sheet',
        variant: 'destructive'
      })
    } finally {
      setIsValidating(false)
    }
  }

  const handleSubmitTeamSheet = async () => {
    if (!validationResult?.is_valid) {
      await validateTeamSheet()
      return
    }

    try {
      setIsSubmitting(true)
      const submission: TeamSheetSubmission = {
        match_id: matchId,
        team_id: teamId,
        formation,
        players,
        notes
      }

      const result = await teamSheetService.submitTeamSheet(submission, 'current-user-id')
      
      if (result.success && result.teamSheet) {
        setTeamSheet(result.teamSheet)
        onTeamSheetUpdate?.(result.teamSheet)
        toast({
          title: 'Success',
          description: 'Team sheet submitted successfully'
        })
      } else {
        throw new Error(result.error || 'Failed to submit team sheet')
      }
    } catch (error) {
      console.error('Error submitting team sheet:', error)
      toast({
        title: 'Error',
        description: 'Failed to submit team sheet',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const addPlayer = (player: Player) => {
    if (players.length >= 25) {
      toast({
        title: 'Error',
        description: 'Maximum 25 players allowed',
        variant: 'destructive'
      })
      return
    }

    const newPlayer = {
      player_id: player.id,
      player_name: player.full_name,
      jersey_number: player.jersey_number,
      position: player.position as PlayerPosition,
      is_starter: players.length < 11,
      is_captain: false,
      is_vice_captain: false,
      notes: ''
    }

    setPlayers([...players, newPlayer])
  }

  const removePlayer = (playerId: string) => {
    setPlayers(players.filter(p => p.player_id !== playerId))
  }

  const updatePlayer = (playerId: string, updates: Partial<TeamSheetSubmission['players'][0]>) => {
    setPlayers(players.map(p => 
      p.player_id === playerId ? { ...p, ...updates } : p
    ))
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'submitted':
        return <Send className="h-4 w-4 text-yellow-600" />
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'final':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'secondary'
      case 'submitted':
        return 'outline'
      case 'approved':
        return 'default'
      case 'rejected':
        return 'destructive'
      case 'final':
        return 'default'
      default:
        return 'secondary'
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Sheet</CardTitle>
          <CardDescription>Loading team sheet data...</CardDescription>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>{teamName} Team Sheet</span>
            {teamSheet && getStatusIcon(teamSheet.status)}
          </CardTitle>
          <CardDescription>
            {teamSheet ? (
              <div className="flex items-center space-x-2">
                <span>Status:</span>
                <Badge variant={getStatusColor(teamSheet.status)}>
                  {teamSheet.status}
                </Badge>
                {teamSheet.submitted_at && (
                  <span className="text-sm text-muted-foreground">
                    Submitted: {new Date(teamSheet.submitted_at).toLocaleString()}
                  </span>
                )}
              </div>
            ) : (
              'Create and submit your team sheet for this match'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Deadline Status */}
          {deadlineStatus && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>
                    {deadlineStatus.deadline_passed ? 'Deadline passed' : `${deadlineStatus.hours_until_deadline} hours until deadline`}
                  </span>
                  <Badge variant={deadlineStatus.can_submit ? 'default' : 'destructive'}>
                    {deadlineStatus.can_submit ? 'Can Submit' : 'Cannot Submit'}
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Formation Selection */}
          <div className="space-y-2">
            <Label htmlFor="formation">Formation</Label>
            <Select value={formation} onValueChange={(value) => setFormation(value as FormationType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select formation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4-4-2">4-4-2</SelectItem>
                <SelectItem value="4-3-3">4-3-3</SelectItem>
                <SelectItem value="3-5-2">3-5-2</SelectItem>
                <SelectItem value="4-2-3-1">4-2-3-1</SelectItem>
                <SelectItem value="3-4-3">3-4-3</SelectItem>
                <SelectItem value="5-3-2">5-3-2</SelectItem>
                <SelectItem value="4-5-1">4-5-1</SelectItem>
                <SelectItem value="3-4-2-1">3-4-2-1</SelectItem>
                <SelectItem value="4-1-4-1">4-1-4-1</SelectItem>
                <SelectItem value="3-3-3-1">3-3-3-1</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes for the team sheet..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Available Players */}
      <Card>
        <CardHeader>
          <CardTitle>Available Players</CardTitle>
          <CardDescription>
            Select players to add to your team sheet ({players.length}/25 selected)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availablePlayers.map((player) => (
              <div
                key={player.id}
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => addPlayer(player)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{player.full_name}</div>
                    <div className="text-sm text-muted-foreground">
                      #{player.jersey_number} • {player.position}
                    </div>
                  </div>
                  <Badge variant="outline">
                    Available
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Players */}
      <Card>
        <CardHeader>
          <CardTitle>Selected Players</CardTitle>
          <CardDescription>
            {players.filter(p => p.is_starter).length}/11 starters selected
          </CardDescription>
        </CardHeader>
        <CardContent>
          {players.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No players selected</p>
            </div>
          ) : (
            <div className="space-y-4">
              {players.map((player, index) => (
                <div key={player.player_id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Badge variant={player.is_starter ? 'default' : 'secondary'}>
                        {player.is_starter ? 'Starter' : 'Substitute'}
                      </Badge>
                      <div>
                        <div className="font-medium">{player.player_name}</div>
                        <div className="text-sm text-muted-foreground">
                          #{player.jersey_number} • {player.position}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removePlayer(player.player_id)}
                    >
                      Remove
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`captain-${index}`}>Captain</Label>
                      <Checkbox
                        id={`captain-${index}`}
                        checked={player.is_captain}
                        onCheckedChange={(checked) => updatePlayer(player.player_id, { is_captain: !!checked })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`vice-captain-${index}`}>Vice Captain</Label>
                      <Checkbox
                        id={`vice-captain-${index}`}
                        checked={player.is_vice_captain}
                        onCheckedChange={(checked) => updatePlayer(player.player_id, { is_vice_captain: !!checked })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`sub-order-${index}`}>Sub Order</Label>
                      <Input
                        id={`sub-order-${index}`}
                        type="number"
                        min="1"
                        max="12"
                        value={player.substitution_order || ''}
                        onChange={(e) => updatePlayer(player.player_id, { substitution_order: parseInt(e.target.value) || undefined })}
                        disabled={player.is_starter}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`notes-${index}`}>Notes</Label>
                      <Input
                        id={`notes-${index}`}
                        placeholder="Player notes..."
                        value={player.notes || ''}
                        onChange={(e) => updatePlayer(player.player_id, { notes: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation Results */}
      {validationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {validationResult.is_valid ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              <span>Validation Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {validationResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <span className="font-medium">Errors:</span>
                    <ul className="list-disc list-inside text-sm">
                      {validationResult.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {validationResult.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <span className="font-medium">Warnings:</span>
                    <ul className="list-disc list-inside text-sm">
                      {validationResult.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {validationResult.player_eligibility.length > 0 && (
              <div className="space-y-2">
                <span className="font-medium">Player Eligibility:</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {validationResult.player_eligibility.map((eligibility, index) => (
                    <div
                      key={index}
                      className={`p-2 rounded text-sm ${
                        eligibility.is_eligible ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                      }`}
                    >
                      {eligibility.player_name}: {eligibility.is_eligible ? 'Eligible' : eligibility.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-2">
        <Button
          variant="outline"
          onClick={validateTeamSheet}
          disabled={isValidating || players.length === 0}
        >
          {isValidating ? 'Validating...' : 'Validate Team Sheet'}
        </Button>
        
        <Button
          onClick={handleSubmitTeamSheet}
          disabled={isSubmitting || !validationResult?.is_valid || !deadlineStatus?.can_submit}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Team Sheet'}
        </Button>
      </div>
    </div>
  )
}