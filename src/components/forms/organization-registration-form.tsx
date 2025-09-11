'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm, UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { OrganizationService } from '@/lib/services/organization-service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  TextInput, 
  TextAreaInput, 
  SelectInput, 
  FileInput,
  UrlInput,
  EmailInput,
  PhoneInput
} from './form-inputs'
import { 
  ChevronLeft, 
  ChevronRight, 
  Building2, 
  MapPin, 
  Contact, 
  Settings, 
  Check,
  AlertCircle,
  Loader2,
  Globe,
  Mail,
  Phone
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Validation schemas for each step
const basicInfoSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(100),
  slug: z.string().min(3, 'Slug must be at least 3 characters').max(50).regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
  description: z.string().max(1000).optional(),
  website: z.string().url().optional().or(z.literal('')),
  logo: z.instanceof(File).optional()
})

const addressSchema = z.object({
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State/Province is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required')
})

const contactSchema = z.object({
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  facebook: z.string().url().optional().or(z.literal('')),
  twitter: z.string().url().optional().or(z.literal('')),
  instagram: z.string().url().optional().or(z.literal('')),
  youtube: z.string().url().optional().or(z.literal(''))
}).refine(data => data.email || data.phone, {
  message: 'At least one contact method (email or phone) is required',
  path: ['email']
})

const settingsSchema = z.object({
  defaultSport: z.enum(['football', 'futsal']),
  timezone: z.string().min(1, 'Timezone is required'),
  language: z.string().min(1, 'Language is required'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']),
  timeFormat: z.enum(['12', '24'])
})

const fullSchema = basicInfoSchema.merge(addressSchema).merge(contactSchema).merge(settingsSchema)

type FormData = z.infer<typeof fullSchema>

// Step definitions
interface Step {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  fields: (keyof FormData)[]
  schema: z.ZodSchema<any>
}

const steps: Step[] = [
  {
    id: 'basic',
    title: 'Basic Information',
    description: 'Organization name, description, and branding',
    icon: Building2,
    fields: ['name', 'slug', 'description', 'website', 'logo'],
    schema: basicInfoSchema
  },
  {
    id: 'address',
    title: 'Address',
    description: 'Physical location and address details',
    icon: MapPin,
    fields: ['street', 'city', 'state', 'postalCode', 'country'],
    schema: addressSchema
  },
  {
    id: 'contact',
    title: 'Contact & Social',
    description: 'Contact information and social media links',
    icon: Contact,
    fields: ['email', 'phone', 'facebook', 'twitter', 'instagram', 'youtube'],
    schema: contactSchema
  },
  {
    id: 'settings',
    title: 'Preferences',
    description: 'Default settings and preferences',
    icon: Settings,
    fields: ['defaultSport', 'timezone', 'language', 'currency', 'dateFormat', 'timeFormat'],
    schema: settingsSchema
  }
]

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

// Currency options
const currencies = [
  { label: 'US Dollar (USD)', value: 'USD' },
  { label: 'Euro (EUR)', value: 'EUR' },
  { label: 'British Pound (GBP)', value: 'GBP' },
  { label: 'Canadian Dollar (CAD)', value: 'CAD' },
  { label: 'Australian Dollar (AUD)', value: 'AUD' },
  { label: 'Brazilian Real (BRL)', value: 'BRL' },
  { label: 'Mexican Peso (MXN)', value: 'MXN' },
  { label: 'Argentine Peso (ARS)', value: 'ARS' }
]

// Timezone options (simplified list)
const timezones = [
  { label: 'UTC', value: 'UTC' },
  { label: 'Eastern Time (EST)', value: 'America/New_York' },
  { label: 'Central Time (CST)', value: 'America/Chicago' },
  { label: 'Mountain Time (MST)', value: 'America/Denver' },
  { label: 'Pacific Time (PST)', value: 'America/Los_Angeles' },
  { label: 'London (GMT)', value: 'Europe/London' },
  { label: 'Paris (CET)', value: 'Europe/Paris' },
  { label: 'Tokyo (JST)', value: 'Asia/Tokyo' },
  { label: 'Sydney (AEST)', value: 'Australia/Sydney' },
  { label: 'São Paulo (BRT)', value: 'America/Sao_Paulo' }
]

interface OrganizationRegistrationFormProps {
  onSuccess?: (organizationId: string) => void
  className?: string
}

export function OrganizationRegistrationForm({ 
  onSuccess, 
  className 
}: OrganizationRegistrationFormProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = React.useState(0)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [slugChecking, setSlugChecking] = React.useState(false)
  const [slugError, setSlugError] = React.useState<string | null>(null)

  const organizationService = new OrganizationService()

  const form = useForm<FormData>({
    resolver: zodResolver(fullSchema),
    mode: 'onBlur',
    defaultValues: {
      defaultSport: 'football',
      timezone: 'UTC',
      language: 'en',
      currency: 'USD',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24'
    }
  })

  const { watch, setValue, trigger } = form

  // Watch name to auto-generate slug
  const organizationName = watch('name')
  const currentSlug = watch('slug')

  React.useEffect(() => {
    if (organizationName && !currentSlug) {
      const generatedSlug = organizationService.generateSlug(organizationName)
      setValue('slug', generatedSlug)
    }
  }, [organizationName, currentSlug, setValue, organizationService])

  // Check slug availability
  const checkSlugAvailability = React.useCallback(async (slug: string) => {
    if (!slug || slug.length < 3) return

    const validation = organizationService.validateSlug(slug)
    if (!validation.isValid) {
      setSlugError(validation.error!)
      return
    }

    setSlugChecking(true)
    setSlugError(null)

    try {
      const isAvailable = await organizationService.checkSlugAvailability(slug)
      if (!isAvailable) {
        setSlugError('This slug is already taken')
      }
    } catch (error) {
      setSlugError('Unable to check slug availability')
    } finally {
      setSlugChecking(false)
    }
  }, [organizationService])

  // Debounced slug checking
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (currentSlug) {
        checkSlugAvailability(currentSlug)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [currentSlug, checkSlugAvailability])

  const currentStepData = steps[currentStep]
  const progress = ((currentStep + 1) / steps.length) * 100

  const validateCurrentStep = async (): Promise<boolean> => {
    const fieldsToValidate = currentStepData.fields
    return await trigger(fieldsToValidate as any)
  }

  const nextStep = async () => {
    const isValid = await validateCurrentStep()
    if (isValid && !slugError && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const { organization } = await organizationService.createOrganization({
        name: data.name,
        slug: data.slug,
        description: data.description || undefined,
        website: data.website || undefined,
        address: {
          street: data.street,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          country: data.country
        },
        contactInfo: {
          email: data.email || undefined,
          phone: data.phone || undefined,
          website: data.website || undefined
        },
        socialLinks: {
          facebook: data.facebook || undefined,
          twitter: data.twitter || undefined,
          instagram: data.instagram || undefined,
          youtube: data.youtube || undefined
        },
        settings: {
          defaultSport: data.defaultSport,
          timezone: data.timezone,
          language: data.language,
          currency: data.currency,
          dateFormat: data.dateFormat,
          timeFormat: data.timeFormat
        }
      })

      // Upload logo if provided
      if (data.logo) {
        await organizationService.uploadLogo(organization.id, data.logo)
      }

      if (onSuccess) {
        onSuccess(organization.id)
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Organization registration error:', error)
      setSubmitError(error instanceof Error ? error.message : 'Registration failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStepData.id) {
      case 'basic':
        return (
          <div className="space-y-6">
            <TextInput
              name="name"
              control={form.control}
              label="Organization Name"
              placeholder="Enter your organization name"
              required
            />
            
            <div className="space-y-2">
              <TextInput
                name="slug"
                control={form.control}
                label="Organization Slug"
                placeholder="organization-slug"
                description="This will be used in your organization URL: scoredesk.com/org/your-slug"
                required
              />
              {slugChecking && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Checking availability...
                </div>
              )}
              {slugError && (
                <p className="text-sm text-destructive">{slugError}</p>
              )}
              {currentSlug && !slugError && !slugChecking && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Check className="h-3 w-3" />
                  Slug is available
                </div>
              )}
            </div>

            <TextAreaInput
              name="description"
              control={form.control}
              label="Description"
              placeholder="Describe your organization..."
              rows={4}
              maxLength={1000}
            />

            <UrlInput
              name="website"
              control={form.control}
              label="Website"
              placeholder="https://yourorganization.com"
            />

            <FileInput
              name="logo"
              control={form.control}
              label="Organization Logo"
              accept="image/*"
              maxSize={5 * 1024 * 1024} // 5MB
            />
          </div>
        )

      case 'address':
        return (
          <div className="space-y-6">
            <TextInput
              name="street"
              control={form.control}
              label="Street Address"
              placeholder="123 Main Street"
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput
                name="city"
                control={form.control}
                label="City"
                placeholder="City name"
                required
              />
              <TextInput
                name="state"
                control={form.control}
                label="State/Province"
                placeholder="State or Province"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput
                name="postalCode"
                control={form.control}
                label="Postal Code"
                placeholder="12345"
                required
              />
              <SelectInput
                name="country"
                control={form.control}
                label="Country"
                options={countries}
                required
              />
            </div>
          </div>
        )

      case 'contact':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EmailInput
                name="email"
                control={form.control}
                label="Contact Email"
                placeholder="contact@organization.com"
              />
              <PhoneInput
                name="phone"
                control={form.control}
                label="Contact Phone"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Social Media Links</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <UrlInput
                  name="facebook"
                  control={form.control}
                  label="Facebook"
                  placeholder="https://facebook.com/yourorg"
                />
                <UrlInput
                  name="twitter"
                  control={form.control}
                  label="Twitter"
                  placeholder="https://twitter.com/yourorg"
                />
                <UrlInput
                  name="instagram"
                  control={form.control}
                  label="Instagram"
                  placeholder="https://instagram.com/yourorg"
                />
                <UrlInput
                  name="youtube"
                  control={form.control}
                  label="YouTube"
                  placeholder="https://youtube.com/yourorg"
                />
              </div>
            </div>
          </div>
        )

      case 'settings':
        return (
          <div className="space-y-6">
            <SelectInput
              name="defaultSport"
              control={form.control}
              label="Default Sport"
              options={[
                { label: 'Football', value: 'football' },
                { label: 'Futsal', value: 'futsal' }
              ]}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectInput
                name="timezone"
                control={form.control}
                label="Timezone"
                options={timezones}
                required
              />
              <SelectInput
                name="language"
                control={form.control}
                label="Language"
                options={[
                  { label: 'English', value: 'en' },
                  { label: 'Spanish', value: 'es' },
                  { label: 'Portuguese', value: 'pt' },
                  { label: 'French', value: 'fr' },
                  { label: 'German', value: 'de' },
                  { label: 'Italian', value: 'it' }
                ]}
                required
              />
            </div>

            <SelectInput
              name="currency"
              control={form.control}
              label="Currency"
              options={currencies}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectInput
                name="dateFormat"
                control={form.control}
                label="Date Format"
                options={[
                  { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
                  { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
                  { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' }
                ]}
                required
              />
              <SelectInput
                name="timeFormat"
                control={form.control}
                label="Time Format"
                options={[
                  { label: '24 Hour (23:59)', value: '24' },
                  { label: '12 Hour (11:59 PM)', value: '12' }
                ]}
                required
              />
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className={cn("max-w-2xl mx-auto", className)}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>Create Organization</CardTitle>
              <CardDescription>
                Set up your sports organization to start managing teams and tournaments
              </CardDescription>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-4 pt-4">
            <div className="flex justify-between text-sm">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-between pt-4">
            {steps.map((step, index) => {
              const isActive = index === currentStep
              const isCompleted = index < currentStep
              const Icon = step.icon

              return (
                <div key={step.id} className="flex flex-col items-center gap-2">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                    isActive && "border-primary bg-primary text-primary-foreground",
                    isCompleted && "border-green-500 bg-green-500 text-white",
                    !isActive && !isCompleted && "border-muted-foreground/25"
                  )}>
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className={cn(
                      "text-xs font-medium",
                      isActive && "text-primary",
                      isCompleted && "text-green-600"
                    )}>
                      {step.title}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Current step content */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">{currentStepData.title}</h3>
                <p className="text-sm text-muted-foreground">{currentStepData.description}</p>
              </div>
              
              {renderStepContent()}
            </div>

            {/* Error display */}
            {submitError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>

              {currentStep === steps.length - 1 ? (
                <Button
                  type="submit"
                  disabled={isSubmitting || !!slugError}
                  className="min-w-[120px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Organization'
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={!!slugError}
                >
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
