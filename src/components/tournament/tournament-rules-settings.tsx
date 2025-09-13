'use client'

import { useState, useEffect } from 'react'
import { 
  Settings, 
  Trophy, 
  Clock, 
  Users, 
  DollarSign, 
  Award, 
  Shield, 
  FileText, 
  Calendar,
  Globe,
  Camera,
  Palette,
  Bell,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Save,
  RotateCcw
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { useSupabase } from '@/components/providers/supabase-provider'
import { TournamentService } from '@/lib/services/tournament-service'

interface TournamentRulesSettingsProps {
  tournamentId: string
  tournament: any
  onUpdate?: () => void
}

interface TournamentSettings {
  // Basic Information
  name: string
  description: string
  sport: 'football' | 'futsal'
  format: 'league' | 'knockout' | 'group'
  
  // Dates and Deadlines
  start_date: string
  end_date: string
  registration_deadline: string
  registration_start_date: string
  early_bird_deadline: string
  
  // Team Configuration
  max_teams: number
  min_team_size: number
  max_team_size: number
  
  // Financial
  entry_fee: number
  currency: string
  prize_money: number
  early_bird_discount: number
  late_registration_fee: number
  
  // Match Rules
  match_duration_minutes: number
  break_between_matches_minutes: number
  max_substitutions: number
  extra_time: boolean
  penalty_shootout: boolean
  var_enabled: boolean
  match_officials_required: number
  
  // Equipment and Venue
  ball_type: string
  field_size: string
  venue_requirements: string
  equipment_requirements: string
  
  // Age and Skill
  age_group: string
  skill_level: string
  
  // Registration Settings
  allow_registration: boolean
  require_approval: boolean
  show_standings: boolean
  show_statistics: boolean
  
  // Contact and Information
  contact_email: string
  contact_phone: string
  website_url: string
  
  // Policies
  rules_and_regulations: string
  refund_policy: string
  cancellation_policy: string
  weather_policy: string
  emergency_procedures: string
  code_of_conduct: string
  data_privacy_policy: string
  terms_and_conditions: string
  
  // Requirements
  requires_medical_certificate: boolean
  requires_insurance: boolean
  anti_doping_policy: boolean
  
  // Media and Branding
  tournament_logo_url: string
  tournament_banner_url: string
  media_coverage: boolean
  live_streaming: boolean
  streaming_url: string
  
  // Technical
  timezone: string
  language: string
  is_public: boolean
}

export function TournamentRulesSettings({ tournamentId, tournament, onUpdate }: TournamentRulesSettingsProps) {
  const { supabase } = useSupabase()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasChanges, setHasChanges] = useState(false)
  
  const [settings, setSettings] = useState<TournamentSettings>({
    // Basic Information
    name: '',
    description: '',
    sport: 'football',
    format: 'league',
    
    // Dates and Deadlines
    start_date: '',
    end_date: '',
    registration_deadline: '',
    registration_start_date: '',
    early_bird_deadline: '',
    
    // Team Configuration
    max_teams: 16,
    min_team_size: 11,
    max_team_size: 25,
    
    // Financial
    entry_fee: 0,
    currency: 'USD',
    prize_money: 0,
    early_bird_discount: 0,
    late_registration_fee: 0,
    
    // Match Rules
    match_duration_minutes: 90,
    break_between_matches_minutes: 15,
    max_substitutions: 5,
    extra_time: false,
    penalty_shootout: true,
    var_enabled: false,
    match_officials_required: 3,
    
    // Equipment and Venue
    ball_type: 'standard',
    field_size: 'full',
    venue_requirements: '',
    equipment_requirements: '',
    
    // Age and Skill
    age_group: '',
    skill_level: '',
    
    // Registration Settings
    allow_registration: true,
    require_approval: true,
    show_standings: true,
    show_statistics: true,
    
    // Contact and Information
    contact_email: '',
    contact_phone: '',
    website_url: '',
    
    // Policies
    rules_and_regulations: '',
    refund_policy: '',
    cancellation_policy: '',
    weather_policy: '',
    emergency_procedures: '',
    code_of_conduct: '',
    data_privacy_policy: '',
    terms_and_conditions: '',
    
    // Requirements
    requires_medical_certificate: false,
    requires_insurance: false,
    anti_doping_policy: false,
    
    // Media and Branding
    tournament_logo_url: '',
    tournament_banner_url: '',
    media_coverage: false,
    live_streaming: false,
    streaming_url: '',
    
    // Technical
    timezone: 'UTC',
    language: 'en',
    is_public: true
  })

  const tournamentService = new TournamentService(supabase)

  useEffect(() => {
    loadTournamentSettings()
  }, [tournamentId])

  const loadTournamentSettings = async () => {
    try {
      setIsLoading(true)
      const data = await tournamentService.getTournamentWithDetails(tournamentId)
      
      if (data) {
        setSettings({
          // Basic Information
          name: data.name || '',
          description: data.description || '',
          sport: data.sport || 'football',
          format: data.format || 'league',
          
          // Dates and Deadlines
          start_date: data.start_date ? new Date(data.start_date).toISOString().slice(0, 16) : '',
          end_date: data.end_date ? new Date(data.end_date).toISOString().slice(0, 16) : '',
          registration_deadline: data.registration_deadline ? new Date(data.registration_deadline).toISOString().slice(0, 16) : '',
          registration_start_date: data.registration_start_date ? new Date(data.registration_start_date).toISOString().slice(0, 16) : '',
          early_bird_deadline: data.early_bird_deadline ? new Date(data.early_bird_deadline).toISOString().slice(0, 16) : '',
          
          // Team Configuration
          max_teams: data.max_teams || 16,
          min_team_size: data.min_team_size || 11,
          max_team_size: data.max_team_size || 25,
          
          // Financial
          entry_fee: data.entry_fee || 0,
          currency: data.currency || 'USD',
          prize_money: data.prize_money || 0,
          early_bird_discount: data.early_bird_discount || 0,
          late_registration_fee: data.late_registration_fee || 0,
          
          // Match Rules
          match_duration_minutes: data.match_duration_minutes || 90,
          break_between_matches_minutes: data.break_between_matches_minutes || 15,
          max_substitutions: data.max_substitutions || 5,
          extra_time: data.extra_time || false,
          penalty_shootout: data.penalty_shootout !== false,
          var_enabled: data.var_enabled || false,
          match_officials_required: data.match_officials_required || 3,
          
          // Equipment and Venue
          ball_type: data.ball_type || 'standard',
          field_size: data.field_size || 'full',
          venue_requirements: data.venue_requirements || '',
          equipment_requirements: data.equipment_requirements || '',
          
          // Age and Skill
          age_group: data.age_group || '',
          skill_level: data.skill_level || '',
          
          // Registration Settings
          allow_registration: data.allow_registration !== false,
          require_approval: data.require_approval !== false,
          show_standings: data.show_standings !== false,
          show_statistics: data.show_statistics !== false,
          
          // Contact and Information
          contact_email: data.contact_email || '',
          contact_phone: data.contact_phone || '',
          website_url: data.website_url || '',
          
          // Policies
          rules_and_regulations: data.rules_and_regulations || '',
          refund_policy: data.refund_policy || '',
          cancellation_policy: data.cancellation_policy || '',
          weather_policy: data.weather_policy || '',
          emergency_procedures: data.emergency_procedures || '',
          code_of_conduct: data.code_of_conduct || '',
          data_privacy_policy: data.data_privacy_policy || '',
          terms_and_conditions: data.terms_and_conditions || '',
          
          // Requirements
          requires_medical_certificate: data.requires_medical_certificate || false,
          requires_insurance: data.requires_insurance || false,
          anti_doping_policy: data.anti_doping_policy || false,
          
          // Media and Branding
          tournament_logo_url: data.tournament_logo_url || '',
          tournament_banner_url: data.tournament_banner_url || '',
          media_coverage: data.media_coverage || false,
          live_streaming: data.live_streaming || false,
          streaming_url: data.streaming_url || '',
          
          // Technical
          timezone: data.timezone || 'UTC',
          language: data.language || 'en',
          is_public: data.is_public !== false
        })
      }
    } catch (error) {
      console.error('Error loading tournament settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load tournament settings',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      
      const updateData = {
        ...settings,
        start_date: settings.start_date ? new Date(settings.start_date).toISOString() : null,
        end_date: settings.end_date ? new Date(settings.end_date).toISOString() : null,
        registration_deadline: settings.registration_deadline ? new Date(settings.registration_deadline).toISOString() : null,
        registration_start_date: settings.registration_start_date ? new Date(settings.registration_start_date).toISOString() : null,
        early_bird_deadline: settings.early_bird_deadline ? new Date(settings.early_bird_deadline).toISOString() : null,
      }
      
      await tournamentService.updateTournament(tournamentId, updateData)
      
      toast({
        title: 'Success',
        description: 'Tournament settings updated successfully'
      })
      
      setHasChanges(false)
      onUpdate?.()
    } catch (error) {
      console.error('Error saving tournament settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to save tournament settings',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    loadTournamentSettings()
    setHasChanges(false)
  }

  const handleSettingChange = (key: keyof TournamentSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tournament Rules & Settings</h2>
          <p className="text-muted-foreground">
            Configure all aspects of your tournament including rules, deadlines, and requirements
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {hasChanges && (
            <Badge variant="outline" className="text-amber-600 border-amber-200">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Unsaved Changes
            </Badge>
          )}
          <Button variant="outline" onClick={handleReset} disabled={!hasChanges}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="dates">Dates & Deadlines</TabsTrigger>
          <TabsTrigger value="teams">Teams & Rules</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="media">Media & Branding</TabsTrigger>
        </TabsList>

        {/* Basic Information Tab */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="h-5 w-5 mr-2" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Core tournament details and configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tournament Name</Label>
                  <Input
                    id="name"
                    value={settings.name}
                    onChange={(e) => handleSettingChange('name', e.target.value)}
                    placeholder="Enter tournament name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sport">Sport Type</Label>
                  <Select value={settings.sport} onValueChange={(value) => handleSettingChange('sport', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="football">Football</SelectItem>
                      <SelectItem value="futsal">Futsal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={settings.description}
                  onChange={(e) => handleSettingChange('description', e.target.value)}
                  placeholder="Describe your tournament..."
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="format">Tournament Format</Label>
                  <Select value={settings.format} onValueChange={(value) => handleSettingChange('format', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="league">League (Round Robin)</SelectItem>
                      <SelectItem value="knockout">Knockout (Elimination)</SelectItem>
                      <SelectItem value="group">Group Stage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={settings.timezone} onValueChange={(value) => handleSettingChange('timezone', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Paris">Paris</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dates & Deadlines Tab */}
        <TabsContent value="dates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Dates & Deadlines
              </CardTitle>
              <CardDescription>
                Set tournament dates and registration deadlines
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Tournament Start Date</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={settings.start_date}
                    onChange={(e) => handleSettingChange('start_date', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Tournament End Date</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={settings.end_date}
                    onChange={(e) => handleSettingChange('end_date', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="registration_start_date">Registration Opens</Label>
                  <Input
                    id="registration_start_date"
                    type="datetime-local"
                    value={settings.registration_start_date}
                    onChange={(e) => handleSettingChange('registration_start_date', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registration_deadline">Registration Deadline</Label>
                  <Input
                    id="registration_deadline"
                    type="datetime-local"
                    value={settings.registration_deadline}
                    onChange={(e) => handleSettingChange('registration_deadline', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="early_bird_deadline">Early Bird Discount Deadline</Label>
                <Input
                  id="early_bird_deadline"
                  type="datetime-local"
                  value={settings.early_bird_deadline}
                  onChange={(e) => handleSettingChange('early_bird_deadline', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teams & Rules Tab */}
        <TabsContent value="teams" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Team Configuration
              </CardTitle>
              <CardDescription>
                Configure team requirements and match rules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_teams">Maximum Teams</Label>
                  <Input
                    id="max_teams"
                    type="number"
                    value={settings.max_teams}
                    onChange={(e) => handleSettingChange('max_teams', parseInt(e.target.value) || 0)}
                    min="2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_team_size">Minimum Team Size</Label>
                  <Input
                    id="min_team_size"
                    type="number"
                    value={settings.min_team_size}
                    onChange={(e) => handleSettingChange('min_team_size', parseInt(e.target.value) || 0)}
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_team_size">Maximum Team Size</Label>
                  <Input
                    id="max_team_size"
                    type="number"
                    value={settings.max_team_size}
                    onChange={(e) => handleSettingChange('max_team_size', parseInt(e.target.value) || 0)}
                    min="1"
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age_group">Age Group</Label>
                  <Select value={settings.age_group} onValueChange={(value) => handleSettingChange('age_group', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select age group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="u8">Under 8</SelectItem>
                      <SelectItem value="u10">Under 10</SelectItem>
                      <SelectItem value="u12">Under 12</SelectItem>
                      <SelectItem value="u14">Under 14</SelectItem>
                      <SelectItem value="u16">Under 16</SelectItem>
                      <SelectItem value="u18">Under 18</SelectItem>
                      <SelectItem value="u21">Under 21</SelectItem>
                      <SelectItem value="senior">Senior</SelectItem>
                      <SelectItem value="veteran">Veteran</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="skill_level">Skill Level</Label>
                  <Select value={settings.skill_level} onValueChange={(value) => handleSettingChange('skill_level', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select skill level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="mixed">Mixed Levels</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Match Rules
              </CardTitle>
              <CardDescription>
                Configure match duration and rules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="match_duration">Match Duration (minutes)</Label>
                  <Input
                    id="match_duration"
                    type="number"
                    value={settings.match_duration_minutes}
                    onChange={(e) => handleSettingChange('match_duration_minutes', parseInt(e.target.value) || 0)}
                    min="30"
                    max="120"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="break_duration">Break Between Matches (minutes)</Label>
                  <Input
                    id="break_duration"
                    type="number"
                    value={settings.break_between_matches_minutes}
                    onChange={(e) => handleSettingChange('break_between_matches_minutes', parseInt(e.target.value) || 0)}
                    min="0"
                    max="60"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_substitutions">Maximum Substitutions</Label>
                  <Input
                    id="max_substitutions"
                    type="number"
                    value={settings.max_substitutions}
                    onChange={(e) => handleSettingChange('max_substitutions', parseInt(e.target.value) || 0)}
                    min="0"
                    max="12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="match_officials">Match Officials Required</Label>
                  <Input
                    id="match_officials"
                    type="number"
                    value={settings.match_officials_required}
                    onChange={(e) => handleSettingChange('match_officials_required', parseInt(e.target.value) || 0)}
                    min="1"
                    max="6"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ball_type">Ball Type</Label>
                  <Select value={settings.ball_type} onValueChange={(value) => handleSettingChange('ball_type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="futsal">Futsal</SelectItem>
                      <SelectItem value="indoor">Indoor</SelectItem>
                      <SelectItem value="beach">Beach</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="field_size">Field Size</Label>
                  <Select value={settings.field_size} onValueChange={(value) => handleSettingChange('field_size', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Size</SelectItem>
                      <SelectItem value="half">Half Size</SelectItem>
                      <SelectItem value="futsal">Futsal</SelectItem>
                      <SelectItem value="indoor">Indoor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="extra_time"
                    checked={settings.extra_time}
                    onCheckedChange={(checked) => handleSettingChange('extra_time', checked)}
                  />
                  <Label htmlFor="extra_time">Extra Time</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="penalty_shootout"
                    checked={settings.penalty_shootout}
                    onCheckedChange={(checked) => handleSettingChange('penalty_shootout', checked)}
                  />
                  <Label htmlFor="penalty_shootout">Penalty Shootout</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="var_enabled"
                    checked={settings.var_enabled}
                    onCheckedChange={(checked) => handleSettingChange('var_enabled', checked)}
                  />
                  <Label htmlFor="var_enabled">VAR Enabled</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Financial Configuration
              </CardTitle>
              <CardDescription>
                Set entry fees, prizes, and payment terms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="entry_fee">Entry Fee</Label>
                  <Input
                    id="entry_fee"
                    type="number"
                    step="0.01"
                    value={settings.entry_fee}
                    onChange={(e) => handleSettingChange('entry_fee', parseFloat(e.target.value) || 0)}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={settings.currency} onValueChange={(value) => handleSettingChange('currency', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="CAD">CAD (C$)</SelectItem>
                      <SelectItem value="AUD">AUD (A$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prize_money">Total Prize Money</Label>
                  <Input
                    id="prize_money"
                    type="number"
                    step="0.01"
                    value={settings.prize_money}
                    onChange={(e) => handleSettingChange('prize_money', parseFloat(e.target.value) || 0)}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="early_bird_discount">Early Bird Discount (%)</Label>
                  <Input
                    id="early_bird_discount"
                    type="number"
                    step="0.01"
                    value={settings.early_bird_discount}
                    onChange={(e) => handleSettingChange('early_bird_discount', parseFloat(e.target.value) || 0)}
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="late_registration_fee">Late Registration Fee</Label>
                <Input
                  id="late_registration_fee"
                  type="number"
                  step="0.01"
                  value={settings.late_registration_fee}
                  onChange={(e) => handleSettingChange('late_registration_fee', parseFloat(e.target.value) || 0)}
                  min="0"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Policies Tab */}
        <TabsContent value="policies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Policies & Requirements
              </CardTitle>
              <CardDescription>
                Set tournament policies and requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rules_and_regulations">Rules & Regulations</Label>
                <Textarea
                  id="rules_and_regulations"
                  value={settings.rules_and_regulations}
                  onChange={(e) => handleSettingChange('rules_and_regulations', e.target.value)}
                  placeholder="Enter tournament rules and regulations..."
                  rows={4}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="refund_policy">Refund Policy</Label>
                  <Textarea
                    id="refund_policy"
                    value={settings.refund_policy}
                    onChange={(e) => handleSettingChange('refund_policy', e.target.value)}
                    placeholder="Enter refund policy..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cancellation_policy">Cancellation Policy</Label>
                  <Textarea
                    id="cancellation_policy"
                    value={settings.cancellation_policy}
                    onChange={(e) => handleSettingChange('cancellation_policy', e.target.value)}
                    placeholder="Enter cancellation policy..."
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="code_of_conduct">Code of Conduct</Label>
                <Textarea
                  id="code_of_conduct"
                  value={settings.code_of_conduct}
                  onChange={(e) => handleSettingChange('code_of_conduct', e.target.value)}
                  placeholder="Enter code of conduct..."
                  rows={3}
                />
              </div>
              
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="requires_medical_certificate"
                    checked={settings.requires_medical_certificate}
                    onCheckedChange={(checked) => handleSettingChange('requires_medical_certificate', checked)}
                  />
                  <Label htmlFor="requires_medical_certificate">Requires Medical Certificate</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="requires_insurance"
                    checked={settings.requires_insurance}
                    onCheckedChange={(checked) => handleSettingChange('requires_insurance', checked)}
                  />
                  <Label htmlFor="requires_insurance">Requires Insurance</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="anti_doping_policy"
                    checked={settings.anti_doping_policy}
                    onCheckedChange={(checked) => handleSettingChange('anti_doping_policy', checked)}
                  />
                  <Label htmlFor="anti_doping_policy">Anti-Doping Policy</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Media & Branding Tab */}
        <TabsContent value="media" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Camera className="h-5 w-5 mr-2" />
                Media & Branding
              </CardTitle>
              <CardDescription>
                Configure media coverage and branding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tournament_logo_url">Tournament Logo URL</Label>
                  <Input
                    id="tournament_logo_url"
                    value={settings.tournament_logo_url}
                    onChange={(e) => handleSettingChange('tournament_logo_url', e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tournament_banner_url">Tournament Banner URL</Label>
                  <Input
                    id="tournament_banner_url"
                    value={settings.tournament_banner_url}
                    onChange={(e) => handleSettingChange('tournament_banner_url', e.target.value)}
                    placeholder="https://example.com/banner.png"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="streaming_url">Live Streaming URL</Label>
                <Input
                  id="streaming_url"
                  value={settings.streaming_url}
                  onChange={(e) => handleSettingChange('streaming_url', e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
              
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="media_coverage"
                    checked={settings.media_coverage}
                    onCheckedChange={(checked) => handleSettingChange('media_coverage', checked)}
                  />
                  <Label htmlFor="media_coverage">Media Coverage</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="live_streaming"
                    checked={settings.live_streaming}
                    onCheckedChange={(checked) => handleSettingChange('live_streaming', checked)}
                  />
                  <Label htmlFor="live_streaming">Live Streaming</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_public"
                    checked={settings.is_public}
                    onCheckedChange={(checked) => handleSettingChange('is_public', checked)}
                  />
                  <Label htmlFor="is_public">Public Tournament</Label>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                Contact Information
              </CardTitle>
              <CardDescription>
                Tournament contact details and website
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Contact Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={settings.contact_email}
                    onChange={(e) => handleSettingChange('contact_email', e.target.value)}
                    placeholder="contact@tournament.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Contact Phone</Label>
                  <Input
                    id="contact_phone"
                    value={settings.contact_phone}
                    onChange={(e) => handleSettingChange('contact_phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="website_url">Website URL</Label>
                <Input
                  id="website_url"
                  value={settings.website_url}
                  onChange={(e) => handleSettingChange('website_url', e.target.value)}
                  placeholder="https://tournament.com"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
