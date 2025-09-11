'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useOrganization } from '@/lib/contexts/organization-context'
import { FormBase, FormSection } from './form-base'
import { 
  TextInput, 
  TextAreaInput, 
  UrlInput,
  EmailInput,
  PhoneInput,
  FileInput,
  SelectInput
} from './form-inputs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Building2, 
  Upload, 
  Trash2, 
  Globe, 
  Mail, 
  Phone, 
  MapPin,
  Calendar,
  Users,
  Info,
  CheckCircle2,
  AlertCircle,
  Camera
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Validation schema for organization profile
const organizationProfileSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(100),
  description: z.string().max(1000).optional(),
  website: z.string().url().optional().or(z.literal('')),
  // Address
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State/Province is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
  // Contact info
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  // Social links
  facebook: z.string().url().optional().or(z.literal('')),
  twitter: z.string().url().optional().or(z.literal('')),
  instagram: z.string().url().optional().or(z.literal('')),
  youtube: z.string().url().optional().or(z.literal('')),
  // Logo
  logo: z.instanceof(File).optional()
}).refine(data => data.email || data.phone, {
  message: 'At least one contact method (email or phone) is required',
  path: ['email']
})

type FormData = z.infer<typeof organizationProfileSchema>

// Country options
const countries = [
  { label: 'United States', value: 'US' },
  { label: 'United Kingdom', value: 'GB' },
  { label: 'Canada', value: 'CA' },
  { label: 'Australia', value: 'AU' },
  { label: 'Germany', value: 'DE' },
  { label: 'France', value: 'FR' },
  { label: 'Spain', value: 'ES' },
  { label: 'Italy', value: 'IT' },
  { label: 'Brazil', value: 'BR' },
  { label: 'Mexico', value: 'MX' },
  { label: 'Argentina', value: 'AR' },
  { label: 'Chile', value: 'CL' },
  { label: 'Colombia', value: 'CO' },
  { label: 'Peru', value: 'PE' }
]

interface OrganizationProfileFormProps {
  onSuccess?: () => void
  className?: string
}

export function OrganizationProfileForm({ 
  onSuccess, 
  className 
}: OrganizationProfileFormProps) {
  const { 
    currentOrganization, 
    updateOrganization, 
    uploadLogo,
    canManageOrganization 
  } = useOrganization()

  const [logoUploading, setLogoUploading] = React.useState(false)
  const [logoError, setLogoError] = React.useState<string | null>(null)
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null)

  if (!currentOrganization) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No organization selected. Please select an organization first.
        </AlertDescription>
      </Alert>
    )
  }

  if (!canManageOrganization) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to manage this organization's profile.
        </AlertDescription>
      </Alert>
    )
  }

  const defaultValues: Partial<FormData> = {
    name: currentOrganization.name,
    description: currentOrganization.description || '',
    website: currentOrganization.website || '',
    street: currentOrganization.address?.street || '',
    city: currentOrganization.address?.city || '',
    state: currentOrganization.address?.state || '',
    postalCode: currentOrganization.address?.postalCode || '',
    country: currentOrganization.address?.country || '',
    email: currentOrganization.contact_info?.email || '',
    phone: currentOrganization.contact_info?.phone || '',
    facebook: currentOrganization.social_links?.facebook || '',
    twitter: currentOrganization.social_links?.twitter || '',
    instagram: currentOrganization.social_links?.instagram || '',
    youtube: currentOrganization.social_links?.youtube || ''
  }

  const onSubmit = async (data: FormData) => {
    try {
      // Upload logo first if provided
      let logoUrl = currentOrganization.logo_url
      if (data.logo) {
        setLogoUploading(true)
        setLogoError(null)
        try {
          logoUrl = await uploadLogo(data.logo)
        } catch (error) {
          setLogoError('Failed to upload logo')
          throw error
        } finally {
          setLogoUploading(false)
        }
      }

      // Update organization profile
      await updateOrganization({
        name: data.name,
        description: data.description || null,
        website: data.website || null,
        address: {
          street: data.street,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          country: data.country
        },
        contact_info: {
          email: data.email || null,
          phone: data.phone || null,
          website: data.website || null
        },
        social_links: {
          facebook: data.facebook || null,
          twitter: data.twitter || null,
          instagram: data.instagram || null,
          youtube: data.youtube || null
        },
        logo_url: logoUrl
      })

      onSuccess?.()
    } catch (error) {
      throw error
    }
  }

  const handleLogoChange = (file: File | null) => {
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setLogoPreview(null)
    }
  }

  const removeLogo = async () => {
    try {
      await updateOrganization({ logo_url: null })
      setLogoPreview(null)
    } catch (error) {
      console.error('Error removing logo:', error)
    }
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Organization Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage 
                src={logoPreview || currentOrganization.logo_url || undefined} 
                alt={currentOrganization.name}
              />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {currentOrganization.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                {currentOrganization.name}
                <Badge variant="outline">@{currentOrganization.slug}</Badge>
              </CardTitle>
              <CardDescription>
                Organization Profile Management
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Active
              </Badge>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Created {new Date(currentOrganization.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Profile Form */}
      <FormBase
        schema={organizationProfileSchema}
        onSubmit={onSubmit}
        defaultValues={defaultValues}
        submitText="Update Profile"
        showSuccessMessage
        title="Organization Profile"
        description="Update your organization's profile information and settings"
      >
        {/* Logo Section */}
        <FormSection
          title="Logo & Branding"
          description="Upload your organization logo and manage branding"
        >
          <div className="space-y-4">
            {/* Current Logo Display */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage 
                  src={logoPreview || currentOrganization.logo_url || undefined} 
                  alt={currentOrganization.name}
                />
                <AvatarFallback className="bg-muted text-muted-foreground text-2xl">
                  <Building2 className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">Organization Logo</p>
                <p className="text-xs text-muted-foreground">
                  Recommended size: 400x400px. Max file size: 5MB
                </p>
                {currentOrganization.logo_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeLogo}
                    className="mt-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Remove Logo
                  </Button>
                )}
              </div>
            </div>

            {/* Logo Upload */}
            <FileInput
              name="logo"
              control={undefined as any}
              label="Upload New Logo"
              accept="image/*"
              maxSize={5 * 1024 * 1024}
              onChange={handleLogoChange}
            />

            {logoError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{logoError}</AlertDescription>
              </Alert>
            )}
          </div>
        </FormSection>

        {/* Basic Information */}
        <FormSection
          title="Basic Information"
          description="Core details about your organization"
        >
          <div className="space-y-4">
            <TextInput
              name="name"
              control={undefined as any}
              label="Organization Name"
              placeholder="Enter organization name"
              required
            />

            <TextAreaInput
              name="description"
              control={undefined as any}
              label="Description"
              placeholder="Describe your organization..."
              rows={4}
              maxLength={1000}
            />

            <UrlInput
              name="website"
              control={undefined as any}
              label="Website"
              placeholder="https://yourorganization.com"
            />
          </div>
        </FormSection>

        {/* Address Information */}
        <FormSection
          title="Address"
          description="Organization's physical location"
        >
          <div className="space-y-4">
            <TextInput
              name="street"
              control={undefined as any}
              label="Street Address"
              placeholder="123 Main Street"
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput
                name="city"
                control={undefined as any}
                label="City"
                placeholder="City name"
                required
              />
              <TextInput
                name="state"
                control={undefined as any}
                label="State/Province"
                placeholder="State or Province"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput
                name="postalCode"
                control={undefined as any}
                label="Postal Code"
                placeholder="12345"
                required
              />
              <SelectInput
                name="country"
                control={undefined as any}
                label="Country"
                options={countries}
                required
              />
            </div>
          </div>
        </FormSection>

        {/* Contact Information */}
        <FormSection
          title="Contact Information"
          description="How people can reach your organization"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EmailInput
                name="email"
                control={undefined as any}
                label="Contact Email"
                placeholder="contact@organization.com"
              />
              <PhoneInput
                name="phone"
                control={undefined as any}
                label="Contact Phone"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                At least one contact method (email or phone) is required.
              </AlertDescription>
            </Alert>
          </div>
        </FormSection>

        {/* Social Media */}
        <FormSection
          title="Social Media"
          description="Connect your social media profiles"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UrlInput
              name="facebook"
              control={undefined as any}
              label="Facebook"
              placeholder="https://facebook.com/yourorg"
            />
            <UrlInput
              name="twitter"
              control={undefined as any}
              label="Twitter"
              placeholder="https://twitter.com/yourorg"
            />
            <UrlInput
              name="instagram"
              control={undefined as any}
              label="Instagram"
              placeholder="https://instagram.com/yourorg"
            />
            <UrlInput
              name="youtube"
              control={undefined as any}
              label="YouTube"
              placeholder="https://youtube.com/yourorg"
            />
          </div>
        </FormSection>
      </FormBase>
    </div>
  )
}
