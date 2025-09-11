'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Calendar, Trophy, Users, Clock, Settings } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { tournamentService, TournamentCreationData } from '@/lib/services/tournament-service'
import { useOrganization } from '@/lib/contexts/organization-context'

const tournamentSchema = z.object({
  name: z.string().min(2, 'Tournament name must be at least 2 characters').max(255, 'Tournament name is too long'),
  description: z.string().optional(),
  sport: z.enum(['football', 'futsal']),
  format: z.enum(['league', 'knockout', 'group']),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  max_teams: z.number().min(2, 'Minimum 2 teams required').max(64, 'Maximum 64 teams allowed').optional(),
  registration_deadline: z.string().optional()
}).refine((data) => {
  if (data.start_date && data.end_date) {
    return new Date(data.start_date) < new Date(data.end_date)
  }
  return true
}, {
  message: 'End date must be after start date',
  path: ['end_date']
}).refine((data) => {
  if (data.registration_deadline && data.start_date) {
    return new Date(data.registration_deadline) < new Date(data.start_date)
  }
  return true
}, {
  message: 'Registration deadline must be before start date',
  path: ['registration_deadline']
})

type TournamentFormData = z.infer<typeof tournamentSchema>

interface TournamentCreationFormProps {
  onSuccess?: (tournamentId: string) => void
  onCancel?: () => void
}

export function TournamentCreationForm({ onSuccess, onCancel }: TournamentCreationFormProps) {
  const router = useRouter()
  const { currentOrganization } = useOrganization()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<TournamentFormData>({
    resolver: zodResolver(tournamentSchema),
    defaultValues: {
      name: '',
      description: '',
      sport: 'football',
      format: 'league',
      start_date: '',
      end_date: '',
      max_teams: undefined,
      registration_deadline: ''
    }
  })

  const selectedFormat = form.watch('format')
  const selectedSport = form.watch('sport')

  const formatDescriptions = {
    league: 'Round-robin format where each team plays every other team',
    knockout: 'Single elimination tournament with bracket progression',
    group: 'Teams divided into groups, with group winners advancing'
  }

  const sportDescriptions = {
    football: '11v11 format, 90-minute matches',
    futsal: '5v5 format, 40-minute matches (20-minute halves)'
  }

  const onSubmit = async (data: TournamentFormData) => {
    if (!currentOrganization) {
      toast({
        title: 'Error',
        description: 'No organization selected',
        variant: 'destructive'
      })
      return
    }

    setIsSubmitting(true)

    try {
      const tournamentData: TournamentCreationData = {
        name: data.name,
        description: data.description || undefined,
        sport: data.sport,
        format: data.format,
        start_date: data.start_date,
        end_date: data.end_date,
        max_teams: data.max_teams || undefined,
        registration_deadline: data.registration_deadline || undefined
      }

      const tournament = await tournamentService.createTournament(tournamentData, currentOrganization.id)
      
      toast({
        title: 'Success',
        description: 'Tournament created successfully'
      })

      if (onSuccess) {
        onSuccess(tournament.id)
      } else {
        router.push(`/tournaments/${tournament.id}`)
      }
    } catch (error) {
      console.error('Error creating tournament:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create tournament',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2">
          <Trophy className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Create New Tournament</h1>
        </div>
        <p className="text-muted-foreground">
          Set up a new tournament for your organization
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Basic Information</span>
              </CardTitle>
              <CardDescription>
                Enter the basic details for your tournament
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tournament Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter tournament name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter tournament description"
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sport"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sport</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select sport" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="football">Football (11v11)</SelectItem>
                          <SelectItem value="futsal">Futsal (5v5)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {sportDescriptions[selectedSport]}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="format"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tournament Format</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select format" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="league">League</SelectItem>
                          <SelectItem value="knockout">Knockout</SelectItem>
                          <SelectItem value="group">Group Stage</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {formatDescriptions[selectedFormat]}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Schedule Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Schedule Information</span>
              </CardTitle>
              <CardDescription>
                Set the tournament schedule and registration details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="max_teams"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Teams (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="2" 
                          max="64" 
                          placeholder="e.g., 16"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        Leave empty for unlimited teams
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="registration_deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration Deadline (Optional)</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormDescription>
                        Teams must register before this date
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Format-specific Information */}
          {selectedFormat === 'group' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Group Stage Configuration</span>
                </CardTitle>
                <CardDescription>
                  Configure group stage settings (will be set up after tournament creation)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Group configuration will be available after tournament creation</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Tournament'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
