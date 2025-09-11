'use client'

/**
 * Invitation Form Component
 * Form for sending user invitations with role assignment
 */

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Send, Loader2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { invitationService, type CreateInvitationData } from '@/lib/services/invitation-service'
import { useOrganization } from '@/lib/contexts/organization-context'
import type { Database } from '@/lib/supabase/types'

const invitationSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['owner', 'admin', 'manager', 'referee', 'stats_operator', 'viewer'] as const, {
    errorMap: () => ({ message: 'Please select a role' })
  }),
  message: z.string().max(500, 'Message must be 500 characters or less').optional(),
  expiresInHours: z.number().min(1).max(720).optional() // Max 30 days
})

type InvitationFormData = z.infer<typeof invitationSchema>

interface InvitationFormProps {
  onSuccess?: (invitation: any) => void
  onCancel?: () => void
  className?: string
}

const roleDescriptions: Record<Database['public']['Enums']['user_role'], string> = {
  owner: 'Full administrative access to the organization',
  admin: 'Administrative access with user management capabilities',
  manager: 'Manage teams, players, and tournaments',
  referee: 'Control match timing and officiating',
  stats_operator: 'Record and manage match statistics',
  viewer: 'View-only access to organization data'
}

const roleLabels: Record<Database['public']['Enums']['user_role'], string> = {
  owner: 'Owner',
  admin: 'Administrator',
  manager: 'Manager',
  referee: 'Referee',
  stats_operator: 'Stats Operator',
  viewer: 'Viewer'
}

export function InvitationForm({ onSuccess, onCancel, className }: InvitationFormProps) {
  const { currentOrganization } = useOrganization()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<InvitationFormData>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      expiresInHours: 168 // 7 days
    }
  })

  const selectedRole = watch('role')

  const onSubmit = async (data: InvitationFormData) => {
    if (!currentOrganization) {
      setSubmitError('No organization selected')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(null)

    try {
      const invitationData: CreateInvitationData = {
        email: data.email,
        role: data.role,
        organizationId: currentOrganization.id,
        message: data.message,
        expiresInHours: data.expiresInHours
      }

      const result = await invitationService.createInvitation(invitationData)

      if (result.success) {
        setSubmitSuccess(`Invitation sent successfully to ${data.email}`)
        reset()
        onSuccess?.(result.invitation)
      } else {
        setSubmitError(result.error || 'Failed to send invitation')
      }
    } catch (error) {
      console.error('Error sending invitation:', error)
      setSubmitError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    reset()
    setSubmitError(null)
    setSubmitSuccess(null)
    onCancel?.()
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Invite New Member
        </CardTitle>
        <CardDescription>
          Invite someone to join {currentOrganization?.name} and assign them a role.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                className="pl-10"
                {...register('email')}
                disabled={isSubmitting}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select
              onValueChange={(value) => setValue('role', value as Database['public']['Enums']['user_role'])}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(roleLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{label}</span>
                      <span className="text-xs text-muted-foreground">
                        {roleDescriptions[value as Database['public']['Enums']['user_role']]}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-destructive">{errors.role.message}</p>
            )}
            {selectedRole && (
              <p className="text-sm text-muted-foreground">
                {roleDescriptions[selectedRole]}
              </p>
            )}
          </div>

          {/* Personal Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Personal Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a personal message to the invitation..."
              rows={3}
              {...register('message')}
              disabled={isSubmitting}
            />
            {errors.message && (
              <p className="text-sm text-destructive">{errors.message.message}</p>
            )}
          </div>

          {/* Expiration */}
          <div className="space-y-2">
            <Label htmlFor="expiresInHours">Invitation Expires</Label>
            <Select
              onValueChange={(value) => setValue('expiresInHours', parseInt(value))}
              defaultValue="168"
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24">1 Day</SelectItem>
                <SelectItem value="72">3 Days</SelectItem>
                <SelectItem value="168">1 Week</SelectItem>
                <SelectItem value="336">2 Weeks</SelectItem>
                <SelectItem value="720">30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Error Alert */}
          {submitError && (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {submitSuccess && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <AlertDescription>{submitSuccess}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default InvitationForm
