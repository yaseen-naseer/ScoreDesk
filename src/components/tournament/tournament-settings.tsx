'use client'

import { useState } from 'react'
import { Settings, Trophy, Clock, Users, DollarSign, Award, Shield } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { tournamentService } from '@/lib/services/tournament-service'

interface TournamentSettingsProps {
  tournamentId: string
  tournament: {
    name: string
    description?: string
    sport: 'football' | 'futsal'
    format: 'league' | 'knockout' | 'group'
    max_teams?: number
    registration_deadline?: string
    entry_fee?: number
    prize_money?: number
  }
  onUpdate?: () => void
}

export function TournamentSettings({ tournamentId, tournament, onUpdate }: TournamentSettingsProps) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState({
    name: tournament.name,
    description: tournament.description || '',
    sport: tournament.sport,
    format: tournament.format,
    max_teams: tournament.max_teams || '',
    registration_deadline: tournament.registration_deadline || '',
    entry_fee: tournament.entry_fee || '',
    prize_money: tournament.prize_money || '',
    allow_registration: true,
    require_approval: true,
    show_standings: true,
    show_statistics: true
  })

  const handleSave = async () => {
    setIsSaving(true)

    try {
      const updateData = {
        name: settings.name,
        description: settings.description || undefined,
        sport: settings.sport,
        format: settings.format,
        max_teams: settings.max_teams ? parseInt(settings.max_teams.toString()) : undefined,
        registration_deadline: settings.registration_deadline || undefined,
        entry_fee: settings.entry_fee ? parseFloat(settings.entry_fee.toString()) : undefined,
        prize_money: settings.prize_money ? parseFloat(settings.prize_money.toString()) : undefined
      }

      await tournamentService.updateTournament(tournamentId, updateData)
      
      toast({
        title: 'Success',
        description: 'Tournament settings updated successfully'
      })

      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error updating tournament:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update tournament settings',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const getFormatDescription = (format: string) => {
    switch (format) {
      case 'league':
        return 'Round-robin format where each team plays every other team'
      case 'knockout':
        return 'Single elimination tournament with bracket progression'
      case 'group':
        return 'Teams divided into groups, with group winners advancing'
      default:
        return ''
    }
  }

  const getSportDescription = (sport: string) => {
    switch (sport) {
      case 'football':
        return '11v11 format, 90-minute matches'
      case 'futsal':
        return '5v5 format, 40-minute matches (20-minute halves)'
      default:
        return ''
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold">Tournament Settings</h3>
        <p className="text-muted-foreground">
          Configure your tournament settings and rules
        </p>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="h-5 w-5" />
            <span>Basic Information</span>
          </CardTitle>
          <CardDescription>
            Update the basic tournament information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tournament Name</Label>
            <Input
              id="name"
              value={settings.name}
              onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter tournament name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={settings.description}
              onChange={(e) => setSettings(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter tournament description"
              className="min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sport">Sport</Label>
              <Select
                value={settings.sport}
                onValueChange={(value) => setSettings(prev => ({ ...prev, sport: value as 'football' | 'futsal' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="football">Football (11v11)</SelectItem>
                  <SelectItem value="futsal">Futsal (5v5)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {getSportDescription(settings.sport)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="format">Tournament Format</Label>
              <Select
                value={settings.format}
                onValueChange={(value) => setSettings(prev => ({ ...prev, format: value as 'league' | 'knockout' | 'group' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="league">League</SelectItem>
                  <SelectItem value="knockout">Knockout</SelectItem>
                  <SelectItem value="group">Group Stage</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {getFormatDescription(settings.format)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registration Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Registration Settings</span>
          </CardTitle>
          <CardDescription>
            Configure team registration settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_teams">Maximum Teams</Label>
              <Input
                id="max_teams"
                type="number"
                min="2"
                max="64"
                value={settings.max_teams}
                onChange={(e) => setSettings(prev => ({ ...prev, max_teams: e.target.value }))}
                placeholder="e.g., 16"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for unlimited teams
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="registration_deadline">Registration Deadline</Label>
              <Input
                id="registration_deadline"
                type="datetime-local"
                value={settings.registration_deadline}
                onChange={(e) => setSettings(prev => ({ ...prev, registration_deadline: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Teams must register before this date
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Registration</Label>
                <p className="text-sm text-muted-foreground">
                  Allow teams to register for this tournament
                </p>
              </div>
              <Switch
                checked={settings.allow_registration}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, allow_registration: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Approval</Label>
                <p className="text-sm text-muted-foreground">
                  Require manual approval for team registrations
                </p>
              </div>
              <Switch
                checked={settings.require_approval}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, require_approval: checked }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Financial Settings</span>
          </CardTitle>
          <CardDescription>
            Configure entry fees and prize money
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entry_fee">Entry Fee</Label>
              <Input
                id="entry_fee"
                type="number"
                min="0"
                step="0.01"
                value={settings.entry_fee}
                onChange={(e) => setSettings(prev => ({ ...prev, entry_fee: e.target.value }))}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Fee per team (leave empty for free entry)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prize_money">Prize Money</Label>
              <Input
                id="prize_money"
                type="number"
                min="0"
                step="0.01"
                value={settings.prize_money}
                onChange={(e) => setSettings(prev => ({ ...prev, prize_money: e.target.value }))}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Total prize money pool
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Display Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Display Settings</span>
          </CardTitle>
          <CardDescription>
            Configure what information is visible to participants
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Standings</Label>
                <p className="text-sm text-muted-foreground">
                  Display tournament standings table
                </p>
              </div>
              <Switch
                checked={settings.show_standings}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, show_standings: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Statistics</Label>
                <p className="text-sm text-muted-foreground">
                  Display match and player statistics
                </p>
              </div>
              <Switch
                checked={settings.show_statistics}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, show_statistics: checked }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <Button variant="outline">
          Reset to Defaults
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
