'use client'

/**
 * Team Customization Form Component
 * Advanced customization interface for team branding, colors, and venue
 */

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  Palette, 
  Upload, 
  MapPin, 
  Save, 
  Loader2, 
  Camera,
  Trash2,
  RefreshCw,
  Eye,
  Download,
  Wand2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { teamService, type TeamProfile } from '@/lib/services/team-service'
import { useToast } from '@/hooks/use-toast'

const customizationSchema = z.object({
  // Branding
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Primary color must be a valid hex color'),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Secondary color must be a valid hex color'),
  
  // Venue Information
  home_venue: z.string().max(200, 'Venue name must be less than 200 characters').optional(),
  venue_address: z.string().max(300, 'Venue address must be less than 300 characters').optional(),
  venue_capacity: z.number().min(0).max(200000).optional(),
})

type CustomizationFormData = z.infer<typeof customizationSchema>

interface TeamCustomizationFormProps {
  team: TeamProfile
  onUpdate?: (updatedTeam: TeamProfile) => void
  className?: string
}

const colorThemes = [
  { name: 'Classic Red', primary: '#DC2626', secondary: '#FFFFFF' },
  { name: 'Royal Blue', primary: '#2563EB', secondary: '#FFFFFF' },
  { name: 'Forest Green', primary: '#16A34A', secondary: '#FFFFFF' },
  { name: 'Sunset Orange', primary: '#EA580C', secondary: '#FFFFFF' },
  { name: 'Deep Purple', primary: '#7C3AED', secondary: '#FFFFFF' },
  { name: 'Golden Yellow', primary: '#EAB308', secondary: '#000000' },
  { name: 'Teal', primary: '#0D9488', secondary: '#FFFFFF' },
  { name: 'Rose Pink', primary: '#E11D48', secondary: '#FFFFFF' },
  { name: 'Indigo', primary: '#4F46E5', secondary: '#FFFFFF' },
  { name: 'Emerald', primary: '#059669', secondary: '#FFFFFF' },
]

const gradientOptions = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
]

export function TeamCustomizationForm({ team, onUpdate, className }: TeamCustomizationFormProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(team.logo_url || null)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [selectedGradient, setSelectedGradient] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
    reset
  } = useForm<CustomizationFormData>({
    resolver: zodResolver(customizationSchema),
    defaultValues: {
      primary_color: team.primary_color,
      secondary_color: team.secondary_color,
      home_venue: team.home_venue || '',
      venue_address: team.venue_address || '',
      venue_capacity: team.venue_capacity || undefined,
    }
  })

  const watchedColors = watch(['primary_color', 'secondary_color'])
  const [primaryColor, secondaryColor] = watchedColors

  useEffect(() => {
    reset({
      primary_color: team.primary_color,
      secondary_color: team.secondary_color,
      home_venue: team.home_venue || '',
      venue_address: team.venue_address || '',
      venue_capacity: team.venue_capacity || undefined,
    })
    setLogoPreview(team.logo_url || null)
  }, [team, reset])

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

  const uploadLogo = async () => {
    if (!logoFile) return

    setIsUploadingLogo(true)
    try {
      const result = await teamService.uploadTeamLogo(team.id, logoFile)
      if (result.success && result.logoUrl) {
        setLogoPreview(result.logoUrl)
        setLogoFile(null)
        toast({
          title: 'Logo Updated',
          description: 'Team logo has been successfully uploaded'
        })
        onUpdate?.({ ...team, logo_url: result.logoUrl })
      } else {
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: result.error || 'Failed to upload logo'
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Upload Error',
        description: 'An unexpected error occurred'
      })
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const removeLogo = async () => {
    try {
      const result = await teamService.updateTeam(team.id, { logo_url: undefined })
      if (result.success) {
        setLogoPreview(null)
        setLogoFile(null)
        toast({
          title: 'Logo Removed',
          description: 'Team logo has been removed'
        })
        onUpdate?.(result.team!)
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to remove logo'
      })
    }
  }

  const applyColorTheme = (theme: typeof colorThemes[0]) => {
    setValue('primary_color', theme.primary)
    setValue('secondary_color', theme.secondary)
  }

  const generateRandomColors = () => {
    const randomColor = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
    setValue('primary_color', randomColor())
    setValue('secondary_color', randomColor())
  }

  const onSubmit = async (data: CustomizationFormData) => {
    setIsSubmitting(true)

    try {
      const result = await teamService.updateTeam(team.id, {
        primary_color: data.primary_color,
        secondary_color: data.secondary_color,
        home_venue: data.home_venue || undefined,
        venue_address: data.venue_address || undefined,
        venue_capacity: data.venue_capacity || undefined,
      })

      if (result.success) {
        toast({
          title: 'Team Updated',
          description: 'Team customization has been saved successfully'
        })
        onUpdate?.(result.team!)
        reset(data) // Reset form dirty state
      } else {
        toast({
          variant: 'destructive',
          title: 'Update Failed',
          description: result.error || 'Failed to update team'
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update Error',
        description: 'An unexpected error occurred'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const downloadColorPalette = () => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = 400
    canvas.height = 200

    if (ctx) {
      // Primary color
      ctx.fillStyle = primaryColor
      ctx.fillRect(0, 0, 200, 200)
      
      // Secondary color
      ctx.fillStyle = secondaryColor
      ctx.fillRect(200, 0, 200, 200)

      // Add text labels
      ctx.fillStyle = secondaryColor
      ctx.font = '16px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('Primary', 100, 100)
      ctx.fillText(primaryColor, 100, 120)

      ctx.fillStyle = primaryColor
      ctx.fillText('Secondary', 300, 100)
      ctx.fillText(secondaryColor, 300, 120)

      // Download
      const link = document.createElement('a')
      link.download = `${team.name}-colors.png`
      link.href = canvas.toDataURL()
      link.click()
    }
  }

  return (
    <div className={className}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="branding" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="branding">Branding & Colors</TabsTrigger>
            <TabsTrigger value="logo">Logo & Assets</TabsTrigger>
            <TabsTrigger value="venue">Venue Details</TabsTrigger>
          </TabsList>

          {/* Branding & Colors Tab */}
          <TabsContent value="branding" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Team Colors
                </CardTitle>
                <CardDescription>
                  Define your team's visual identity with custom colors and themes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Color Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="primary_color">Primary Color</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          id="primary_color"
                          type="color"
                          className="w-16 h-10 p-1 rounded cursor-pointer"
                          {...register('primary_color')}
                        />
                        <Input
                          placeholder="#FF0000"
                          value={primaryColor}
                          onChange={(e) => setValue('primary_color', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                      {errors.primary_color && (
                        <p className="text-sm text-destructive">{errors.primary_color.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="secondary_color">Secondary Color</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          id="secondary_color"
                          type="color"
                          className="w-16 h-10 p-1 rounded cursor-pointer"
                          {...register('secondary_color')}
                        />
                        <Input
                          placeholder="#FFFFFF"
                          value={secondaryColor}
                          onChange={(e) => setValue('secondary_color', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                      {errors.secondary_color && (
                        <p className="text-sm text-destructive">{errors.secondary_color.message}</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={generateRandomColors}>
                        <Wand2 className="mr-2 h-4 w-4" />
                        Random
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={downloadColorPalette}>
                        <Download className="mr-2 h-4 w-4" />
                        Export
                      </Button>
                    </div>
                  </div>

                  {/* Color Preview */}
                  <div className="space-y-4">
                    <Label>Live Preview</Label>
                    <div className="space-y-3">
                      {/* Jersey Preview */}
                      <div className="flex items-center gap-4">
                        <div
                          className="w-16 h-20 rounded-lg border-2 flex items-center justify-center text-white font-bold text-xs"
                          style={{ 
                            backgroundColor: primaryColor,
                            color: secondaryColor,
                            borderColor: secondaryColor
                          }}
                        >
                          {team.short_name || 'TEAM'}
                        </div>
                        <div
                          className="w-16 h-20 rounded-lg border-2 flex items-center justify-center font-bold text-xs"
                          style={{ 
                            backgroundColor: secondaryColor,
                            color: primaryColor,
                            borderColor: primaryColor
                          }}
                        >
                          {team.short_name || 'TEAM'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Home & Away Jerseys
                        </div>
                      </div>

                      {/* Color Swatch */}
                      <div className="flex">
                        <div
                          className="flex-1 h-12 flex items-center justify-center text-white font-medium"
                          style={{ backgroundColor: primaryColor, color: secondaryColor }}
                        >
                          Primary
                        </div>
                        <div
                          className="flex-1 h-12 flex items-center justify-center font-medium"
                          style={{ backgroundColor: secondaryColor, color: primaryColor }}
                        >
                          Secondary
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Color Themes */}
                <div className="space-y-3">
                  <Label>Quick Color Themes</Label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {colorThemes.map((theme) => (
                      <button
                        key={theme.name}
                        type="button"
                        className="flex flex-col items-center p-3 border rounded-lg hover:border-primary transition-colors"
                        onClick={() => applyColorTheme(theme)}
                      >
                        <div className="flex mb-2">
                          <div
                            className="w-6 h-6 rounded-l border"
                            style={{ backgroundColor: theme.primary }}
                          />
                          <div
                            className="w-6 h-6 rounded-r border"
                            style={{ backgroundColor: theme.secondary }}
                          />
                        </div>
                        <span className="text-xs text-center">{theme.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logo & Assets Tab */}
          <TabsContent value="logo" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Team Logo
                </CardTitle>
                <CardDescription>
                  Upload and manage your team's logo and visual assets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Current Logo */}
                {logoPreview && (
                  <div className="space-y-3">
                    <Label>Current Logo</Label>
                    <div className="flex items-center gap-4">
                      <img
                        src={logoPreview}
                        alt="Team logo"
                        className="w-24 h-24 object-cover rounded-lg border"
                      />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          Logo is successfully uploaded and will be displayed across the platform
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(logoPreview, '_blank')}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Preview
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={removeLogo}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Logo Upload */}
                <div className="space-y-3">
                  <Label htmlFor="logo">Upload New Logo</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                    <div className="flex flex-col items-center text-center">
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <div className="space-y-2">
                        <Input
                          id="logo"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="cursor-pointer"
                        />
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG, or SVG (max 5MB). Recommended: 200x200px minimum
                        </p>
                      </div>
                    </div>
                  </div>
                  {logoFile && (
                    <Button
                      type="button"
                      onClick={uploadLogo}
                      disabled={isUploadingLogo}
                      className="w-full"
                    >
                      {isUploadingLogo ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Logo
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Logo Guidelines */}
                <Alert>
                  <Camera className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Logo Guidelines:</strong> Use high-resolution images (minimum 200x200px) 
                    with transparent backgrounds for best results. Square logos work best for consistency 
                    across different display sizes.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Venue Details Tab */}
          <TabsContent value="venue" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Venue Information
                </CardTitle>
                <CardDescription>
                  Manage your team's home venue and location details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="home_venue">Venue Name</Label>
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

                {/* Venue Summary */}
                {(team.home_venue || team.venue_address) && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2">Current Venue Information</h4>
                    <div className="space-y-1 text-sm">
                      {team.home_venue && (
                        <p><strong>Name:</strong> {team.home_venue}</p>
                      )}
                      {team.venue_address && (
                        <p><strong>Address:</strong> {team.venue_address}</p>
                      )}
                      {team.venue_capacity && (
                        <p><strong>Capacity:</strong> {team.venue_capacity.toLocaleString()} spectators</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={isSubmitting || !isDirty}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default TeamCustomizationForm
