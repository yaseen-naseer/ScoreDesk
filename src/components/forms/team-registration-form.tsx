'use client'

/**
 * Team Registration Form Component
 * Multi-step form for registering new teams with full profile information
 */

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  Building, 
  Users, 
  Palette, 
  Globe, 
  Phone, 
  Mail, 
  Calendar,
  MapPin,
  Upload,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { teamService, type TeamRegistrationData } from '@/lib/services/team-service'
import { useOrganization } from '@/lib/contexts/organization-context'
import { useToast } from '@/hooks/use-toast'

const teamRegistrationSchema = z.object({
  // Basic Information
  name: z.string().min(2, 'Team name must be at least 2 characters').max(100, 'Team name must be less than 100 characters'),
  short_name: z.string().max(10, 'Short name must be less than 10 characters').optional(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  founded_year: z.number().min(1800).max(new Date().getFullYear()).optional(),
  
  // Venue Information
  home_venue: z.string().max(200, 'Venue name must be less than 200 characters').optional(),
  venue_address: z.string().max(300, 'Venue address must be less than 300 characters').optional(),
  venue_capacity: z.number().min(0).max(200000).optional(),
  
  // Team Colors
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Primary color must be a valid hex color'),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Secondary color must be a valid hex color'),
  
  // Contact Information
  contact_email: z.string().email('Invalid email address').optional(),
  contact_phone: z.string().max(20, 'Phone number must be less than 20 characters').optional(),
  website_url: z.string().url('Invalid URL').optional(),
  
  // Social Media
  facebook: z.string().url('Invalid Facebook URL').optional(),
  twitter: z.string().url('Invalid Twitter URL').optional(),
  instagram: z.string().url('Invalid Instagram URL').optional(),
  youtube: z.string().url('Invalid YouTube URL').optional(),
  
  // Team Classification
  team_type: z.enum(['football', 'futsal', 'both'], {
    errorMap: () => ({ message: 'Please select a team type' })
  }),
  category: z.enum(['senior', 'youth', 'women', 'mixed'], {
    errorMap: () => ({ message: 'Please select a category' })
  }),
  division: z.string().max(50, 'Division must be less than 50 characters').optional(),
  status: z.enum(['active', 'inactive', 'suspended']).default('active')
})

type TeamRegistrationFormData = z.infer<typeof teamRegistrationSchema>

interface TeamRegistrationFormProps {
  onSuccess?: (team: any) => void
  onCancel?: () => void
  className?: string
}

const steps = [
  {
    id: 'basic',
    title: 'Basic Information',
    description: 'Team name, description, and founding details',
    icon: Building
  },
  {
    id: 'venue',
    title: 'Venue & Location',
    description: 'Home venue and address information',
    icon: MapPin
  },
  {
    id: 'branding',
    title: 'Colors & Branding',
    description: 'Team colors and visual identity',
    icon: Palette
  },
  {
    id: 'contact',
    title: 'Contact & Social',
    description: 'Contact information and social media',
    icon: Globe
  },
  {
    id: 'classification',
    title: 'Classification',
    description: 'Team type, category, and division',
    icon: Users
  }
]

const teamTypeOptions = [
  { value: 'football', label: 'Football (11-a-side)', description: '11 players, full-size field' },
  { value: 'futsal', label: 'Futsal (5-a-side)', description: '5 players, indoor court' },
  { value: 'both', label: 'Both Football & Futsal', description: 'Multi-format team' }
]

const categoryOptions = [
  { value: 'senior', label: 'Senior', description: 'Adult players (18+)' },
  { value: 'youth', label: 'Youth', description: 'Young players (under 18)' },
  { value: 'women', label: 'Women', description: 'Women\'s team' },
  { value: 'mixed', label: 'Mixed', description: 'Mixed gender team' }
]

const defaultColors = [
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#FFA500', '#800080', '#008000', '#000080', '#800000', '#808000'
]

export function TeamRegistrationForm({ onSuccess, onCancel, className }: TeamRegistrationFormProps) {
  const { currentOrganization } = useOrganization()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    trigger,
    getValues
  } = useForm<TeamRegistrationFormData>({
    resolver: zodResolver(teamRegistrationSchema),
    defaultValues: {
      primary_color: '#FF0000',
      secondary_color: '#FFFFFF',
      team_type: 'football',
      category: 'senior',
      status: 'active'
    }
  })

  const watchedValues = watch()

  const handleNext = async () => {
    const stepFields = getStepFields(currentStep)
    const isValid = await trigger(stepFields)
    
    if (isValid) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1)
      }
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const getStepFields = (step: number): (keyof TeamRegistrationFormData)[] => {
    switch (step) {
      case 0: return ['name', 'short_name', 'description', 'founded_year']
      case 1: return ['home_venue', 'venue_address', 'venue_capacity']
      case 2: return ['primary_color', 'secondary_color']
      case 3: return ['contact_email', 'contact_phone', 'website_url', 'facebook', 'twitter', 'instagram', 'youtube']
      case 4: return ['team_type', 'category', 'division']
      default: return []
    }
  }

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const onSubmit = async (data: TeamRegistrationFormData) => {
    if (!currentOrganization) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No organization selected'
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Check team name availability
      const isAvailable = await teamService.isTeamNameAvailable(currentOrganization.id, data.name)
      if (!isAvailable) {
        toast({
          variant: 'destructive',
          title: 'Team Name Taken',
          description: 'A team with this name already exists in your organization'
        })
        setCurrentStep(0) // Go back to basic info step
        setIsSubmitting(false)
        return
      }

      // Prepare team data
      const teamData: TeamRegistrationData = {
        name: data.name,
        short_name: data.short_name || undefined,
        description: data.description || undefined,
        founded_year: data.founded_year || undefined,
        home_venue: data.home_venue || undefined,
        venue_address: data.venue_address || undefined,
        venue_capacity: data.venue_capacity || undefined,
        primary_color: data.primary_color,
        secondary_color: data.secondary_color,
        contact_email: data.contact_email || undefined,
        contact_phone: data.contact_phone || undefined,
        website_url: data.website_url || undefined,
        social_media: {
          facebook: data.facebook || undefined,
          twitter: data.twitter || undefined,
          instagram: data.instagram || undefined,
          youtube: data.youtube || undefined
        },
        team_type: data.team_type,
        category: data.category,
        division: data.division || undefined,
        status: data.status
      }

      // Register team
      const result = await teamService.registerTeam(currentOrganization.id, teamData)
      
      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Registration Failed',
          description: result.error || 'Failed to register team'
        })
        return
      }

      // Upload logo if provided
      if (logoFile && result.team) {
        const logoResult = await teamService.uploadTeamLogo(result.team.id, logoFile)
        if (!logoResult.success) {
          console.warn('Logo upload failed:', logoResult.error)
          // Don't fail the entire registration for logo upload failure
        }
      }

      toast({
        title: 'Team Registered',
        description: `${data.name} has been successfully registered!`
      })

      onSuccess?.(result.team)
    } catch (error) {
      console.error('Error registering team:', error)
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: 'An unexpected error occurred'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0: // Basic Information
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Team Name *</Label>
              <Input
                id="name"
                placeholder="Enter team name"
                {...register('name')}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="short_name">Short Name</Label>
              <Input
                id="short_name"
                placeholder="e.g., FCB"
                maxLength={10}
                {...register('short_name')}
                className={errors.short_name ? 'border-destructive' : ''}
              />
              {errors.short_name && (
                <p className="text-sm text-destructive">{errors.short_name.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Optional short name for displays (max 10 characters)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the team..."
                rows={3}
                {...register('description')}
                className={errors.description ? 'border-destructive' : ''}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="founded_year">Founded Year</Label>
              <Input
                id="founded_year"
                type="number"
                placeholder="e.g., 2020"
                min="1800"
                max={new Date().getFullYear()}
                {...register('founded_year', { valueAsNumber: true })}
                className={errors.founded_year ? 'border-destructive' : ''}
              />
              {errors.founded_year && (
                <p className="text-sm text-destructive">{errors.founded_year.message}</p>
              )}
            </div>
          </div>
        )

      case 1: // Venue & Location
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="home_venue">Home Venue</Label>
              <Input
                id="home_venue"
                placeholder="Stadium or venue name"
                {...register('home_venue')}
                className={errors.home_venue ? 'border-destructive' : ''}
              />
              {errors.home_venue && (
                <p className="text-sm text-destructive">{errors.home_venue.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="venue_address">Venue Address</Label>
              <Textarea
                id="venue_address"
                placeholder="Full address of the venue..."
                rows={3}
                {...register('venue_address')}
                className={errors.venue_address ? 'border-destructive' : ''}
              />
              {errors.venue_address && (
                <p className="text-sm text-destructive">{errors.venue_address.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="venue_capacity">Venue Capacity</Label>
              <Input
                id="venue_capacity"
                type="number"
                placeholder="Number of spectators"
                min="0"
                max="200000"
                {...register('venue_capacity', { valueAsNumber: true })}
                className={errors.venue_capacity ? 'border-destructive' : ''}
              />
              {errors.venue_capacity && (
                <p className="text-sm text-destructive">{errors.venue_capacity.message}</p>
              )}
            </div>
          </div>
        )

      case 2: // Colors & Branding
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="primary_color">Primary Color *</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="primary_color"
                    type="color"
                    className="w-20 h-10 p-1 rounded cursor-pointer"
                    {...register('primary_color')}
                  />
                  <Input
                    placeholder="#FF0000"
                    value={watchedValues.primary_color}
                    onChange={(e) => setValue('primary_color', e.target.value)}
                    className="flex-1"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {defaultColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-500"
                      style={{ backgroundColor: color }}
                      onClick={() => setValue('primary_color', color)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondary_color">Secondary Color *</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="secondary_color"
                    type="color"
                    className="w-20 h-10 p-1 rounded cursor-pointer"
                    {...register('secondary_color')}
                  />
                  <Input
                    placeholder="#FFFFFF"
                    value={watchedValues.secondary_color}
                    onChange={(e) => setValue('secondary_color', e.target.value)}
                    className="flex-1"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {defaultColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-500"
                      style={{ backgroundColor: color }}
                      onClick={() => setValue('secondary_color', color)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Color Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Color Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div
                    className="w-20 h-20 rounded-lg border flex items-center justify-center text-white font-bold"
                    style={{ 
                      backgroundColor: watchedValues.primary_color,
                      color: watchedValues.secondary_color 
                    }}
                  >
                    {watchedValues.short_name || 'TEAM'}
                  </div>
                  <div
                    className="w-20 h-20 rounded-lg border flex items-center justify-center font-bold"
                    style={{ 
                      backgroundColor: watchedValues.secondary_color,
                      color: watchedValues.primary_color 
                    }}
                  >
                    {watchedValues.short_name || 'TEAM'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Logo Upload */}
            <div className="space-y-2">
              <Label htmlFor="logo">Team Logo (Optional)</Label>
              <div className="flex items-center gap-4">
                {logoPreview && (
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-16 h-16 object-cover rounded border"
                  />
                )}
                <div className="flex-1">
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload PNG, JPG, or SVG (max 5MB)
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      case 3: // Contact & Social
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  placeholder="team@example.com"
                  {...register('contact_email')}
                  className={errors.contact_email ? 'border-destructive' : ''}
                />
                {errors.contact_email && (
                  <p className="text-sm text-destructive">{errors.contact_email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  placeholder="+1 (555) 123-4567"
                  {...register('contact_phone')}
                  className={errors.contact_phone ? 'border-destructive' : ''}
                />
                {errors.contact_phone && (
                  <p className="text-sm text-destructive">{errors.contact_phone.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website_url">Website</Label>
              <Input
                id="website_url"
                type="url"
                placeholder="https://team-website.com"
                {...register('website_url')}
                className={errors.website_url ? 'border-destructive' : ''}
              />
              {errors.website_url && (
                <p className="text-sm text-destructive">{errors.website_url.message}</p>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Social Media (Optional)</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    type="url"
                    placeholder="https://facebook.com/team"
                    {...register('facebook')}
                    className={errors.facebook ? 'border-destructive' : ''}
                  />
                  {errors.facebook && (
                    <p className="text-sm text-destructive">{errors.facebook.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twitter">Twitter</Label>
                  <Input
                    id="twitter"
                    type="url"
                    placeholder="https://twitter.com/team"
                    {...register('twitter')}
                    className={errors.twitter ? 'border-destructive' : ''}
                  />
                  {errors.twitter && (
                    <p className="text-sm text-destructive">{errors.twitter.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    type="url"
                    placeholder="https://instagram.com/team"
                    {...register('instagram')}
                    className={errors.instagram ? 'border-destructive' : ''}
                  />
                  {errors.instagram && (
                    <p className="text-sm text-destructive">{errors.instagram.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="youtube">YouTube</Label>
                  <Input
                    id="youtube"
                    type="url"
                    placeholder="https://youtube.com/team"
                    {...register('youtube')}
                    className={errors.youtube ? 'border-destructive' : ''}
                  />
                  {errors.youtube && (
                    <p className="text-sm text-destructive">{errors.youtube.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )

      case 4: // Classification
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Team Type *</Label>
                <div className="grid gap-3">
                  {teamTypeOptions.map((option) => (
                    <div
                      key={option.value}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        watchedValues.team_type === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setValue('team_type', option.value as any)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{option.label}</h4>
                          <p className="text-sm text-muted-foreground">{option.description}</p>
                        </div>
                        {watchedValues.team_type === option.value && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Category *</Label>
                <div className="grid gap-3">
                  {categoryOptions.map((option) => (
                    <div
                      key={option.value}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        watchedValues.category === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setValue('category', option.value as any)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{option.label}</h4>
                          <p className="text-sm text-muted-foreground">{option.description}</p>
                        </div>
                        {watchedValues.category === option.value && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="division">Division</Label>
                <Input
                  id="division"
                  placeholder="e.g., Premier League, Division 1"
                  {...register('division')}
                  className={errors.division ? 'border-destructive' : ''}
                />
                {errors.division && (
                  <p className="text-sm text-destructive">{errors.division.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Optional division or league classification
                </p>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Register New Team
        </CardTitle>
        <CardDescription>
          Create a new team profile with complete information and branding
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => {
              const StepIcon = step.icon
              const isActive = index === currentStep
              const isCompleted = index < currentStep
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    isCompleted 
                      ? 'bg-primary border-primary text-primary-foreground'
                      : isActive
                      ? 'border-primary text-primary'
                      : 'border-muted text-muted-foreground'
                  }`}>
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-12 h-px mx-2 ${
                      isCompleted ? 'bg-primary' : 'bg-muted'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Current Step Content */}
          <div className="min-h-[400px]">
            <div className="mb-6">
              <h3 className="text-lg font-semibold">{steps[currentStep].title}</h3>
              <p className="text-sm text-muted-foreground">{steps[currentStep].description}</p>
            </div>
            
            {renderStep()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={currentStep === 0 ? onCancel : handlePrevious}
              disabled={isSubmitting}
            >
              {currentStep === 0 ? (
                'Cancel'
              ) : (
                <>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous
                </>
              )}
            </Button>
            
            {currentStep < steps.length - 1 ? (
              <Button type="button" onClick={handleNext} disabled={isSubmitting}>
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Register Team
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default TeamRegistrationForm
