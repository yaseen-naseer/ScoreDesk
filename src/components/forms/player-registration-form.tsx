'use client'

/**
 * Player Registration Form Component
 * Comprehensive form for registering new players with detailed profiles
 */

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  User, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  Shield, 
  Heart,
  FileText,
  Upload,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  UserPlus,
  Shirt,
  Ruler,
  Weight
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
import { Separator } from '@/components/ui/separator'
import { playerService, type PlayerRegistrationData } from '@/lib/services/player-service'
import { useToast } from '@/hooks/use-toast'

const playerRegistrationSchema = z.object({
  // Personal Information
  first_name: z.string().min(2, 'First name must be at least 2 characters').max(50, 'First name must be less than 50 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters').max(50, 'Last name must be less than 50 characters'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  nationality: z.string().max(50, 'Nationality must be less than 50 characters').optional(),
  
  // Football Information
  position: z.enum(['goalkeeper', 'defender', 'midfielder', 'forward', 'utility'], {
    errorMap: () => ({ message: 'Please select a position' })
  }),
  preferred_foot: z.enum(['left', 'right', 'both'], {
    errorMap: () => ({ message: 'Please select preferred foot' })
  }),
  jersey_number: z.number().min(1).max(99).optional(),
  
  // Physical Information
  height: z.number().min(100).max(250).optional(),
  weight: z.number().min(30).max(200).optional(),
  
  // Contact Information
  phone: z.string().max(20, 'Phone number must be less than 20 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  
  // Emergency Contact
  emergency_contact_name: z.string().max(100, 'Emergency contact name must be less than 100 characters').optional(),
  emergency_contact_phone: z.string().max(20, 'Emergency contact phone must be less than 20 characters').optional(),
  
  // Medical Information
  medical_conditions: z.string().max(500, 'Medical conditions must be less than 500 characters').optional(),
  allergies: z.string().max(500, 'Allergies must be less than 500 characters').optional(),
  medications: z.string().max(500, 'Medications must be less than 500 characters').optional(),
  
  // Insurance Information
  insurance_provider: z.string().max(100, 'Insurance provider must be less than 100 characters').optional(),
  insurance_policy_number: z.string().max(50, 'Policy number must be less than 50 characters').optional(),
  
  // Address Information
  address: z.string().max(200, 'Address must be less than 200 characters').optional(),
  city: z.string().max(50, 'City must be less than 50 characters').optional(),
  state: z.string().max(50, 'State must be less than 50 characters').optional(),
  postal_code: z.string().max(20, 'Postal code must be less than 20 characters').optional(),
  country: z.string().max(50, 'Country must be less than 50 characters').optional(),
  
  // Contract Information
  contract_start_date: z.string().optional(),
  contract_end_date: z.string().optional(),
  salary: z.number().min(0).optional(),
  transfer_fee: z.number().min(0).optional(),
  
  // Additional Information
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
  status: z.enum(['active', 'injured', 'suspended', 'inactive']).default('active')
})

type PlayerRegistrationFormData = z.infer<typeof playerRegistrationSchema>

interface PlayerRegistrationFormProps {
  teamId: string
  onSuccess?: (player: any) => void
  onCancel?: () => void
  className?: string
}

const steps = [
  {
    id: 'personal',
    title: 'Personal Information',
    description: 'Basic personal details and identification',
    icon: User
  },
  {
    id: 'football',
    title: 'Football Information',
    description: 'Position, jersey number, and playing preferences',
    icon: Shirt
  },
  {
    id: 'physical',
    title: 'Physical Information',
    description: 'Height, weight, and physical characteristics',
    icon: Ruler
  },
  {
    id: 'contact',
    title: 'Contact & Emergency',
    description: 'Contact information and emergency contacts',
    icon: Phone
  },
  {
    id: 'medical',
    title: 'Medical & Insurance',
    description: 'Medical conditions, allergies, and insurance',
    icon: Heart
  },
  {
    id: 'address',
    title: 'Address Information',
    description: 'Home address and location details',
    icon: MapPin
  },
  {
    id: 'contract',
    title: 'Contract & Additional',
    description: 'Contract details and additional notes',
    icon: FileText
  }
]

const positionOptions = [
  { value: 'goalkeeper', label: 'Goalkeeper', description: 'Defends the goal', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'defender', label: 'Defender', description: 'Defensive players', color: 'bg-blue-100 text-blue-800' },
  { value: 'midfielder', label: 'Midfielder', description: 'Central players', color: 'bg-green-100 text-green-800' },
  { value: 'forward', label: 'Forward', description: 'Attacking players', color: 'bg-red-100 text-red-800' },
  { value: 'utility', label: 'Utility', description: 'Versatile players', color: 'bg-purple-100 text-purple-800' }
]

const footOptions = [
  { value: 'left', label: 'Left Foot', description: 'Left-footed player' },
  { value: 'right', label: 'Right Foot', description: 'Right-footed player' },
  { value: 'both', label: 'Both Feet', description: 'Ambidextrous player' }
]

const statusOptions = [
  { value: 'active', label: 'Active', description: 'Available for selection', color: 'bg-green-100 text-green-800' },
  { value: 'injured', label: 'Injured', description: 'Currently injured', color: 'bg-red-100 text-red-800' },
  { value: 'suspended', label: 'Suspended', description: 'Suspended from play', color: 'bg-orange-100 text-orange-800' },
  { value: 'inactive', label: 'Inactive', description: 'Not available', color: 'bg-gray-100 text-gray-800' }
]

export function PlayerRegistrationForm({ teamId, onSuccess, onCancel, className }: PlayerRegistrationFormProps) {
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [availableJerseyNumbers, setAvailableJerseyNumbers] = useState<number[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    trigger,
    getValues
  } = useForm<PlayerRegistrationFormData>({
    resolver: zodResolver(playerRegistrationSchema),
    defaultValues: {
      preferred_foot: 'right',
      status: 'active'
    }
  })

  const watchedValues = watch()

  useEffect(() => {
    loadAvailableJerseyNumbers()
  }, [teamId])

  const loadAvailableJerseyNumbers = async () => {
    try {
      const numbers = await playerService.getAvailableJerseyNumbers(teamId)
      setAvailableJerseyNumbers(numbers)
    } catch (error) {
      console.error('Error loading jersey numbers:', error)
    }
  }

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

  const getStepFields = (step: number): (keyof PlayerRegistrationFormData)[] => {
    switch (step) {
      case 0: return ['first_name', 'last_name', 'date_of_birth', 'nationality']
      case 1: return ['position', 'preferred_foot', 'jersey_number']
      case 2: return ['height', 'weight']
      case 3: return ['phone', 'email', 'emergency_contact_name', 'emergency_contact_phone']
      case 4: return ['medical_conditions', 'allergies', 'medications', 'insurance_provider', 'insurance_policy_number']
      case 5: return ['address', 'city', 'state', 'postal_code', 'country']
      case 6: return ['contract_start_date', 'contract_end_date', 'salary', 'transfer_fee', 'notes', 'status']
      default: return []
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const onSubmit = async (data: PlayerRegistrationFormData) => {
    setIsSubmitting(true)

    try {
      // Register player
      const result = await playerService.registerPlayer(teamId, data)
      
      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Registration Failed',
          description: result.error || 'Failed to register player'
        })
        return
      }

      // Upload image if provided
      if (imageFile && result.player) {
        const imageResult = await playerService.uploadPlayerImage(result.player.id, imageFile)
        if (!imageResult.success) {
          console.warn('Image upload failed:', imageResult.error)
          // Don't fail the entire registration for image upload failure
        }
      }

      toast({
        title: 'Player Registered',
        description: `${data.first_name} ${data.last_name} has been successfully registered!`
      })

      onSuccess?.(result.player)
    } catch (error) {
      console.error('Error registering player:', error)
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
      case 0: // Personal Information
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  placeholder="Enter first name"
                  {...register('first_name')}
                  className={errors.first_name ? 'border-destructive' : ''}
                />
                {errors.first_name && (
                  <p className="text-sm text-destructive">{errors.first_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  placeholder="Enter last name"
                  {...register('last_name')}
                  className={errors.last_name ? 'border-destructive' : ''}
                />
                {errors.last_name && (
                  <p className="text-sm text-destructive">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date of Birth *</Label>
              <Input
                id="date_of_birth"
                type="date"
                {...register('date_of_birth')}
                className={errors.date_of_birth ? 'border-destructive' : ''}
              />
              {errors.date_of_birth && (
                <p className="text-sm text-destructive">{errors.date_of_birth.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nationality">Nationality</Label>
              <Input
                id="nationality"
                placeholder="e.g., Spanish, Brazilian, English"
                {...register('nationality')}
                className={errors.nationality ? 'border-destructive' : ''}
              />
              {errors.nationality && (
                <p className="text-sm text-destructive">{errors.nationality.message}</p>
              )}
            </div>
          </div>
        )

      case 1: // Football Information
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label>Position *</Label>
              <div className="grid gap-3">
                {positionOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      watchedValues.position === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setValue('position', option.value as any)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{option.label}</h4>
                          <Badge className={option.color}>{option.value}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                      {watchedValues.position === option.value && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <Label>Preferred Foot *</Label>
              <div className="grid gap-3">
                {footOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      watchedValues.preferred_foot === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setValue('preferred_foot', option.value as any)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{option.label}</h4>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                      {watchedValues.preferred_foot === option.value && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jersey_number">Jersey Number</Label>
              <Select 
                value={watchedValues.jersey_number?.toString() || ''} 
                onValueChange={(value) => setValue('jersey_number', value ? parseInt(value) : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select jersey number" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No number</SelectItem>
                  {availableJerseyNumbers.slice(0, 20).map((number) => (
                    <SelectItem key={number} value={number.toString()}>
                      #{number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.jersey_number && (
                <p className="text-sm text-destructive">{errors.jersey_number.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {availableJerseyNumbers.length} numbers available
              </p>
            </div>
          </div>
        )

      case 2: // Physical Information
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  placeholder="e.g., 180"
                  min="100"
                  max="250"
                  {...register('height', { valueAsNumber: true })}
                  className={errors.height ? 'border-destructive' : ''}
                />
                {errors.height && (
                  <p className="text-sm text-destructive">{errors.height.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  placeholder="e.g., 75"
                  min="30"
                  max="200"
                  {...register('weight', { valueAsNumber: true })}
                  className={errors.weight ? 'border-destructive' : ''}
                />
                {errors.weight && (
                  <p className="text-sm text-destructive">{errors.weight.message}</p>
                )}
              </div>
            </div>

            {/* Profile Image Upload */}
            <div className="space-y-2">
              <Label htmlFor="profile_image">Profile Image (Optional)</Label>
              <div className="flex items-center gap-4">
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Profile preview"
                    className="w-16 h-16 object-cover rounded-full border"
                  />
                )}
                <div className="flex-1">
                  <Input
                    id="profile_image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload PNG, JPG, or JPEG (max 5MB)
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      case 3: // Contact & Emergency
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium">Contact Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="+1 (555) 123-4567"
                    {...register('phone')}
                    className={errors.phone ? 'border-destructive' : ''}
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="player@example.com"
                    {...register('email')}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Emergency Contact</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                  <Input
                    id="emergency_contact_name"
                    placeholder="Full name"
                    {...register('emergency_contact_name')}
                    className={errors.emergency_contact_name ? 'border-destructive' : ''}
                  />
                  {errors.emergency_contact_name && (
                    <p className="text-sm text-destructive">{errors.emergency_contact_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                  <Input
                    id="emergency_contact_phone"
                    placeholder="+1 (555) 123-4567"
                    {...register('emergency_contact_phone')}
                    className={errors.emergency_contact_phone ? 'border-destructive' : ''}
                  />
                  {errors.emergency_contact_phone && (
                    <p className="text-sm text-destructive">{errors.emergency_contact_phone.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )

      case 4: // Medical & Insurance
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium">Medical Information</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="medical_conditions">Medical Conditions</Label>
                  <Textarea
                    id="medical_conditions"
                    placeholder="Any known medical conditions..."
                    rows={3}
                    {...register('medical_conditions')}
                    className={errors.medical_conditions ? 'border-destructive' : ''}
                  />
                  {errors.medical_conditions && (
                    <p className="text-sm text-destructive">{errors.medical_conditions.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allergies">Allergies</Label>
                  <Textarea
                    id="allergies"
                    placeholder="Any known allergies..."
                    rows={3}
                    {...register('allergies')}
                    className={errors.allergies ? 'border-destructive' : ''}
                  />
                  {errors.allergies && (
                    <p className="text-sm text-destructive">{errors.allergies.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medications">Current Medications</Label>
                  <Textarea
                    id="medications"
                    placeholder="Any current medications..."
                    rows={3}
                    {...register('medications')}
                    className={errors.medications ? 'border-destructive' : ''}
                  />
                  {errors.medications && (
                    <p className="text-sm text-destructive">{errors.medications.message}</p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Insurance Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="insurance_provider">Insurance Provider</Label>
                  <Input
                    id="insurance_provider"
                    placeholder="Insurance company name"
                    {...register('insurance_provider')}
                    className={errors.insurance_provider ? 'border-destructive' : ''}
                  />
                  {errors.insurance_provider && (
                    <p className="text-sm text-destructive">{errors.insurance_provider.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="insurance_policy_number">Policy Number</Label>
                  <Input
                    id="insurance_policy_number"
                    placeholder="Policy number"
                    {...register('insurance_policy_number')}
                    className={errors.insurance_policy_number ? 'border-destructive' : ''}
                  />
                  {errors.insurance_policy_number && (
                    <p className="text-sm text-destructive">{errors.insurance_policy_number.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )

      case 5: // Address Information
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="Street address"
                {...register('address')}
                className={errors.address ? 'border-destructive' : ''}
              />
              {errors.address && (
                <p className="text-sm text-destructive">{errors.address.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="City"
                  {...register('city')}
                  className={errors.city ? 'border-destructive' : ''}
                />
                {errors.city && (
                  <p className="text-sm text-destructive">{errors.city.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  placeholder="State or Province"
                  {...register('state')}
                  className={errors.state ? 'border-destructive' : ''}
                />
                {errors.state && (
                  <p className="text-sm text-destructive">{errors.state.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input
                  id="postal_code"
                  placeholder="Postal code"
                  {...register('postal_code')}
                  className={errors.postal_code ? 'border-destructive' : ''}
                />
                {errors.postal_code && (
                  <p className="text-sm text-destructive">{errors.postal_code.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  placeholder="Country"
                  {...register('country')}
                  className={errors.country ? 'border-destructive' : ''}
                />
                {errors.country && (
                  <p className="text-sm text-destructive">{errors.country.message}</p>
                )}
              </div>
            </div>
          </div>
        )

      case 6: // Contract & Additional
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium">Contract Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contract_start_date">Contract Start Date</Label>
                  <Input
                    id="contract_start_date"
                    type="date"
                    {...register('contract_start_date')}
                    className={errors.contract_start_date ? 'border-destructive' : ''}
                  />
                  {errors.contract_start_date && (
                    <p className="text-sm text-destructive">{errors.contract_start_date.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contract_end_date">Contract End Date</Label>
                  <Input
                    id="contract_end_date"
                    type="date"
                    {...register('contract_end_date')}
                    className={errors.contract_end_date ? 'border-destructive' : ''}
                  />
                  {errors.contract_end_date && (
                    <p className="text-sm text-destructive">{errors.contract_end_date.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salary">Salary</Label>
                  <Input
                    id="salary"
                    type="number"
                    placeholder="Annual salary"
                    min="0"
                    {...register('salary', { valueAsNumber: true })}
                    className={errors.salary ? 'border-destructive' : ''}
                  />
                  {errors.salary && (
                    <p className="text-sm text-destructive">{errors.salary.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transfer_fee">Transfer Fee</Label>
                  <Input
                    id="transfer_fee"
                    type="number"
                    placeholder="Transfer fee"
                    min="0"
                    {...register('transfer_fee', { valueAsNumber: true })}
                    className={errors.transfer_fee ? 'border-destructive' : ''}
                  />
                  {errors.transfer_fee && (
                    <p className="text-sm text-destructive">{errors.transfer_fee.message}</p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Status & Additional Information</h4>
              
              <div className="space-y-2">
                <Label>Player Status</Label>
                <div className="grid gap-3">
                  {statusOptions.map((option) => (
                    <div
                      key={option.value}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        watchedValues.status === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setValue('status', option.value as any)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{option.label}</h4>
                          <Badge className={option.color}>{option.value}</Badge>
                        </div>
                        {watchedValues.status === option.value && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional information about the player..."
                  rows={4}
                  {...register('notes')}
                  className={errors.notes ? 'border-destructive' : ''}
                />
                {errors.notes && (
                  <p className="text-sm text-destructive">{errors.notes.message}</p>
                )}
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
          <UserPlus className="h-5 w-5" />
          Register New Player
        </CardTitle>
        <CardDescription>
          Add a new player to the team with comprehensive profile information
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
          <div className="min-h-[500px]">
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
                    Register Player
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

export default PlayerRegistrationForm
