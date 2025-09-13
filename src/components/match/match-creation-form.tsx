'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, Users, Trophy, AlertCircle, CheckCircle, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { matchService, MatchCreationData, MatchWithDetails } from '@/lib/services/match-service'
import { teamService, TeamProfile } from '@/lib/services/team-service'
import { tournamentService, Tournament } from '@/lib/services/tournament-service'
import { useOrganization } from '@/lib/contexts/organization-context'
import { createClient } from '@/lib/supabase/client'
import { ConflictDetectionPanel } from './conflict-detection-panel'

const supabase = createClient()

interface MatchCreationFormProps {
  tournamentId?: string
  onMatchCreated?: (match: MatchWithDetails) => void
  onCancel?: () => void
}

export function MatchCreationForm({ 
  tournamentId, 
  onMatchCreated, 
  onCancel 
}: MatchCreationFormProps) {
  const { currentOrganization } = useOrganization()
  const { toast } = useToast()
  
  const [formData, setFormData] = useState<MatchCreationData>({
    tournament_id: tournamentId || '',
    home_team_id: '',
    away_team_id: '',
    scheduled_date: '',
    venue_id: '',
    venue: '',
    round_name: '',
    notes: '',
    match_duration: 90
  })
  
  const [teams, setTeams] = useState<TeamProfile[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [venues, setVenues] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [hasConflicts, setHasConflicts] = useState(false)

  useEffect(() => {
    if (currentOrganization) {
      loadData()
    }
  }, [currentOrganization, tournamentId])

  const loadData = async () => {
    try {
      setIsLoading(true)
      
      const [teamsData, tournamentsData, venuesData] = await Promise.all([
        teamService.getOrganizationTeams(currentOrganization!.id, { status: 'active' }),
        tournamentService.getTournaments(currentOrganization!.id),
        loadVenues()
      ])

      setTeams(teamsData.teams)
      setTournaments(tournamentsData)
      setVenues(venuesData)
      
      // Set default tournament if provided
      if (tournamentId) {
        setFormData(prev => ({ ...prev, tournament_id: tournamentId }))
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load form data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadVenues = async () => {
    try {
      const { data: venuesData } = await supabase
        .from('venues')
        .select('*')
        .eq('organization_id', currentOrganization!.id)
        .eq('is_active', true)
        .order('name')

      return venuesData || []
    } catch (error) {
      console.error('Error loading venues:', error)
      return []
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.tournament_id) {
      newErrors.tournament_id = 'Tournament is required'
    }
    if (!formData.home_team_id) {
      newErrors.home_team_id = 'Home team is required'
    }
    if (!formData.away_team_id) {
      newErrors.away_team_id = 'Away team is required'
    }
    if (formData.home_team_id === formData.away_team_id) {
      newErrors.away_team_id = 'Away team must be different from home team'
    }
    if (!formData.scheduled_date) {
      newErrors.scheduled_date = 'Match date and time is required'
    }
    if (formData.scheduled_date && new Date(formData.scheduled_date) < new Date()) {
      newErrors.scheduled_date = 'Match date cannot be in the past'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      setIsSubmitting(true)
      const result = await matchService.createMatch(formData)

      if (result.success && result.match) {
        toast({
          title: 'Success',
          description: 'Match created successfully'
        })
        onMatchCreated?.(result.match)
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create match',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error creating match:', error)
      toast({
        title: 'Error',
        description: 'Failed to create match',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof MatchCreationData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const getAvailableAwayTeams = () => {
    return teams.filter(team => team.id !== formData.home_team_id)
  }

  const getAvailableHomeTeams = () => {
    return teams.filter(team => team.id !== formData.away_team_id)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading form data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Trophy className="h-6 w-6 text-blue-600" />
          <span>Create New Match</span>
        </CardTitle>
        <CardDescription>
          Schedule a new match with teams, venue, and timing details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tournament Selection */}
          <div className="space-y-2">
            <Label htmlFor="tournament">Tournament *</Label>
            <Select 
              value={formData.tournament_id} 
              onValueChange={(value) => handleInputChange('tournament_id', value)}
              disabled={!!tournamentId}
            >
              <SelectTrigger className={errors.tournament_id ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select tournament" />
              </SelectTrigger>
              <SelectContent>
                {tournaments.map((tournament) => (
                  <SelectItem key={tournament.id} value={tournament.id}>
                    <div className="flex items-center space-x-2">
                      <span>{tournament.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {tournament.tournament_type}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tournament_id && (
              <p className="text-sm text-red-500">{errors.tournament_id}</p>
            )}
          </div>

          {/* Teams Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="home-team">Home Team *</Label>
              <Select 
                value={formData.home_team_id} 
                onValueChange={(value) => handleInputChange('home_team_id', value)}
              >
                <SelectTrigger className={errors.home_team_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select home team" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableHomeTeams().map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      <div className="flex items-center space-x-2">
                        <span>{team.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {team.category}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.home_team_id && (
                <p className="text-sm text-red-500">{errors.home_team_id}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="away-team">Away Team *</Label>
              <Select 
                value={formData.away_team_id} 
                onValueChange={(value) => handleInputChange('away_team_id', value)}
              >
                <SelectTrigger className={errors.away_team_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select away team" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableAwayTeams().map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      <div className="flex items-center space-x-2">
                        <span>{team.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {team.category}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.away_team_id && (
                <p className="text-sm text-red-500">{errors.away_team_id}</p>
              )}
            </div>
          </div>

          {/* Match Date and Time */}
          <div className="space-y-2">
            <Label htmlFor="scheduled-date">Match Date & Time *</Label>
            <Input
              id="scheduled-date"
              type="datetime-local"
              value={formData.scheduled_date}
              onChange={(e) => handleInputChange('scheduled_date', e.target.value)}
              className={errors.scheduled_date ? 'border-red-500' : ''}
            />
            {errors.scheduled_date && (
              <p className="text-sm text-red-500">{errors.scheduled_date}</p>
            )}
          </div>

          {/* Venue Selection */}
          <div className="space-y-2">
            <Label htmlFor="venue">Venue</Label>
            <Select 
              value={formData.venue_id} 
              onValueChange={(value) => handleInputChange('venue_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select venue (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No venue selected</SelectItem>
                {venues.map((venue) => (
                  <SelectItem key={venue.id} value={venue.id}>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4" />
                      <span>{venue.name}</span>
                      {venue.capacity && (
                        <Badge variant="outline" className="text-xs">
                          {venue.capacity} capacity
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Round Name */}
          <div className="space-y-2">
            <Label htmlFor="round-name">Round/Stage</Label>
            <Input
              id="round-name"
              placeholder="e.g., Group Stage, Quarter Final, Final"
              value={formData.round_name || ''}
              onChange={(e) => handleInputChange('round_name', e.target.value)}
            />
          </div>

          {/* Match Duration */}
          <div className="space-y-2">
            <Label htmlFor="match-duration">Match Duration (minutes)</Label>
            <Input
              id="match-duration"
              type="number"
              min="60"
              max="180"
              value={formData.match_duration || 90}
              onChange={(e) => handleInputChange('match_duration', parseInt(e.target.value))}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional match information..."
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
            />
          </div>

          {/* Conflict Detection */}
          <ConflictDetectionPanel
            matchData={{
              tournament_id: formData.tournament_id,
              home_team_id: formData.home_team_id,
              away_team_id: formData.away_team_id,
              scheduled_date: formData.scheduled_date,
              venue_id: formData.venue_id,
              venue: formData.venue,
              match_duration: formData.match_duration
            }}
            onConflictsFound={() => setHasConflicts(true)}
            onConflictsResolved={() => setHasConflicts(false)}
          />

          {/* Form Actions */}
          <div className="flex space-x-4 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting || hasConflicts}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Match...
                </>
              ) : hasConflicts ? (
                <>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Resolve Conflicts to Continue
                </>
              ) : (
                <>
                  <Trophy className="h-4 w-4 mr-2" />
                  Create Match
                </>
              )}
            </Button>
            
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
