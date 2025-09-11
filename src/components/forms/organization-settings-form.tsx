'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useOrganization } from '@/lib/contexts/organization-context'
import { FormBase, FormSection } from './form-base'
import { 
  SelectInput,
  RadioInput,
  CheckboxInput,
  NumberInput
} from './form-inputs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Globe, 
  Clock, 
  Calendar, 
  DollarSign,
  Settings,
  Shield,
  Bell,
  Users,
  Trophy,
  Info,
  AlertCircle,
  CheckCircle2,
  Save
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Validation schema for organization settings
const organizationSettingsSchema = z.object({
  // Core settings
  defaultSport: z.enum(['football', 'futsal']),
  timezone: z.string().min(1, 'Timezone is required'),
  language: z.string().min(1, 'Language is required'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  
  // Date and time formatting
  dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']),
  timeFormat: z.enum(['12', '24']),
  
  // Match settings
  defaultMatchDuration: z.number().int().min(30).max(120),
  defaultHalftimeDuration: z.number().int().min(5).max(30),
  allowExtraTime: z.boolean(),
  defaultExtraTimeDuration: z.number().int().min(10).max(30),
  allowPenaltyShootouts: z.boolean(),
  
  // Team settings
  maxTeamsPerTournament: z.number().int().min(2).max(64),
  maxPlayersPerTeam: z.number().int().min(11).max(35),
  requirePlayerPhotos: z.boolean(),
  requireMedicalInfo: z.boolean(),
  
  // Notification settings
  emailNotifications: z.boolean(),
  matchStartReminders: z.boolean(),
  tournamentUpdates: z.boolean(),
  membershipChanges: z.boolean(),
  
  // Privacy settings
  publicProfile: z.boolean(),
  allowMemberSearch: z.boolean(),
  showStatistics: z.boolean(),
  
  // Advanced settings
  autoApproveTeams: z.boolean(),
  requireRefereeApproval: z.boolean(),
  enableLiveStreaming: z.boolean(),
  enableStatsExport: z.boolean()
})

type FormData = z.infer<typeof organizationSettingsSchema>

// Option arrays
const timezones = [
  { label: 'UTC', value: 'UTC' },
  { label: 'Eastern Time (EST)', value: 'America/New_York' },
  { label: 'Central Time (CST)', value: 'America/Chicago' },
  { label: 'Mountain Time (MST)', value: 'America/Denver' },
  { label: 'Pacific Time (PST)', value: 'America/Los_Angeles' },
  { label: 'Alaska Time (AKST)', value: 'America/Anchorage' },
  { label: 'Hawaii Time (HST)', value: 'Pacific/Honolulu' },
  { label: 'London (GMT)', value: 'Europe/London' },
  { label: 'Paris (CET)', value: 'Europe/Paris' },
  { label: 'Berlin (CET)', value: 'Europe/Berlin' },
  { label: 'Madrid (CET)', value: 'Europe/Madrid' },
  { label: 'Rome (CET)', value: 'Europe/Rome' },
  { label: 'Moscow (MSK)', value: 'Europe/Moscow' },
  { label: 'Tokyo (JST)', value: 'Asia/Tokyo' },
  { label: 'Seoul (KST)', value: 'Asia/Seoul' },
  { label: 'Shanghai (CST)', value: 'Asia/Shanghai' },
  { label: 'Mumbai (IST)', value: 'Asia/Kolkata' },
  { label: 'Dubai (GST)', value: 'Asia/Dubai' },
  { label: 'Sydney (AEST)', value: 'Australia/Sydney' },
  { label: 'Melbourne (AEST)', value: 'Australia/Melbourne' },
  { label: 'São Paulo (BRT)', value: 'America/Sao_Paulo' },
  { label: 'Buenos Aires (ART)', value: 'America/Argentina/Buenos_Aires' },
  { label: 'Mexico City (CST)', value: 'America/Mexico_City' },
  { label: 'Lima (PET)', value: 'America/Lima' },
  { label: 'Bogotá (COT)', value: 'America/Bogota' },
  { label: 'Santiago (CLT)', value: 'America/Santiago' },
  { label: 'Cairo (EET)', value: 'Africa/Cairo' },
  { label: 'Lagos (WAT)', value: 'Africa/Lagos' },
  { label: 'Johannesburg (SAST)', value: 'Africa/Johannesburg' }
]

const languages = [
  { label: 'English', value: 'en' },
  { label: 'Spanish', value: 'es' },
  { label: 'Portuguese', value: 'pt' },
  { label: 'French', value: 'fr' },
  { label: 'German', value: 'de' },
  { label: 'Italian', value: 'it' },
  { label: 'Dutch', value: 'nl' },
  { label: 'Russian', value: 'ru' },
  { label: 'Chinese (Simplified)', value: 'zh-CN' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Korean', value: 'ko' },
  { label: 'Arabic', value: 'ar' }
]

const currencies = [
  { label: 'US Dollar (USD)', value: 'USD' },
  { label: 'Euro (EUR)', value: 'EUR' },
  { label: 'British Pound (GBP)', value: 'GBP' },
  { label: 'Canadian Dollar (CAD)', value: 'CAD' },
  { label: 'Australian Dollar (AUD)', value: 'AUD' },
  { label: 'Japanese Yen (JPY)', value: 'JPY' },
  { label: 'Swiss Franc (CHF)', value: 'CHF' },
  { label: 'Chinese Yuan (CNY)', value: 'CNY' },
  { label: 'Brazilian Real (BRL)', value: 'BRL' },
  { label: 'Mexican Peso (MXN)', value: 'MXN' },
  { label: 'Argentine Peso (ARS)', value: 'ARS' },
  { label: 'Chilean Peso (CLP)', value: 'CLP' },
  { label: 'Colombian Peso (COP)', value: 'COP' },
  { label: 'Peruvian Sol (PEN)', value: 'PEN' },
  { label: 'South African Rand (ZAR)', value: 'ZAR' },
  { label: 'Indian Rupee (INR)', value: 'INR' },
  { label: 'UAE Dirham (AED)', value: 'AED' },
  { label: 'Russian Ruble (RUB)', value: 'RUB' }
]

interface OrganizationSettingsFormProps {
  onSuccess?: () => void
  className?: string
}

export function OrganizationSettingsForm({ 
  onSuccess, 
  className 
}: OrganizationSettingsFormProps) {
  const { 
    currentOrganization, 
    updateOrganization,
    canManageOrganization 
  } = useOrganization()

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
          You don't have permission to manage this organization's settings.
        </AlertDescription>
      </Alert>
    )
  }

  const currentSettings = currentOrganization.settings || {}

  const defaultValues: Partial<FormData> = {
    defaultSport: currentSettings.defaultSport || 'football',
    timezone: currentSettings.timezone || 'UTC',
    language: currentSettings.language || 'en',
    currency: currentSettings.currency || 'USD',
    dateFormat: currentSettings.dateFormat || 'DD/MM/YYYY',
    timeFormat: currentSettings.timeFormat || '24',
    
    // Match settings with defaults
    defaultMatchDuration: currentSettings.defaultMatchDuration || 90,
    defaultHalftimeDuration: currentSettings.defaultHalftimeDuration || 15,
    allowExtraTime: currentSettings.allowExtraTime ?? true,
    defaultExtraTimeDuration: currentSettings.defaultExtraTimeDuration || 30,
    allowPenaltyShootouts: currentSettings.allowPenaltyShootouts ?? true,
    
    // Team settings with defaults
    maxTeamsPerTournament: currentSettings.maxTeamsPerTournament || 32,
    maxPlayersPerTeam: currentSettings.maxPlayersPerTeam || 25,
    requirePlayerPhotos: currentSettings.requirePlayerPhotos ?? false,
    requireMedicalInfo: currentSettings.requireMedicalInfo ?? false,
    
    // Notification settings with defaults
    emailNotifications: currentSettings.emailNotifications ?? true,
    matchStartReminders: currentSettings.matchStartReminders ?? true,
    tournamentUpdates: currentSettings.tournamentUpdates ?? true,
    membershipChanges: currentSettings.membershipChanges ?? true,
    
    // Privacy settings with defaults
    publicProfile: currentSettings.publicProfile ?? true,
    allowMemberSearch: currentSettings.allowMemberSearch ?? true,
    showStatistics: currentSettings.showStatistics ?? true,
    
    // Advanced settings with defaults
    autoApproveTeams: currentSettings.autoApproveTeams ?? false,
    requireRefereeApproval: currentSettings.requireRefereeApproval ?? true,
    enableLiveStreaming: currentSettings.enableLiveStreaming ?? false,
    enableStatsExport: currentSettings.enableStatsExport ?? true
  }

  const onSubmit = async (data: FormData) => {
    try {
      await updateOrganization({
        settings: {
          ...data,
          updatedAt: new Date().toISOString()
        }
      })
      onSuccess?.()
    } catch (error) {
      throw error
    }
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Settings className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>
                Configure preferences, timezone, and organizational policies for {currentOrganization.name}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Settings Form */}
      <FormBase
        schema={organizationSettingsSchema}
        onSubmit={onSubmit}
        defaultValues={defaultValues}
        submitText="Save Settings"
        showSuccessMessage
        title="General Settings"
        description="Core organizational preferences and configuration"
      >
        {/* General Preferences */}
        <FormSection
          title="General Preferences"
          description="Basic settings that affect the entire organization"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectInput
              name="defaultSport"
              control={undefined as any}
              label="Default Sport"
              options={[
                { label: 'Football', value: 'football' },
                { label: 'Futsal', value: 'futsal' }
              ]}
              required
            />

            <SelectInput
              name="timezone"
              control={undefined as any}
              label="Timezone"
              options={timezones}
              required
            />

            <SelectInput
              name="language"
              control={undefined as any}
              label="Language"
              options={languages}
              required
            />

            <SelectInput
              name="currency"
              control={undefined as any}
              label="Currency"
              options={currencies}
              required
            />
          </div>
        </FormSection>

        {/* Date & Time Formatting */}
        <FormSection
          title="Date & Time Formatting"
          description="How dates and times are displayed throughout the system"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectInput
              name="dateFormat"
              control={undefined as any}
              label="Date Format"
              options={[
                { label: 'DD/MM/YYYY (31/12/2024)', value: 'DD/MM/YYYY' },
                { label: 'MM/DD/YYYY (12/31/2024)', value: 'MM/DD/YYYY' },
                { label: 'YYYY-MM-DD (2024-12-31)', value: 'YYYY-MM-DD' }
              ]}
              required
            />

            <SelectInput
              name="timeFormat"
              control={undefined as any}
              label="Time Format"
              options={[
                { label: '24 Hour (23:59)', value: '24' },
                { label: '12 Hour (11:59 PM)', value: '12' }
              ]}
              required
            />
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              These formats will be used for displaying dates and times in schedules, reports, and throughout the application.
            </AlertDescription>
          </Alert>
        </FormSection>

        {/* Match Settings */}
        <FormSection
          title="Match Settings"
          description="Default settings for matches and competitions"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <NumberInput
                name="defaultMatchDuration"
                control={undefined as any}
                label="Default Match Duration (minutes)"
                min={30}
                max={120}
                required
              />

              <NumberInput
                name="defaultHalftimeDuration"
                control={undefined as any}
                label="Default Halftime Duration (minutes)"
                min={5}
                max={30}
                required
              />
            </div>

            <div className="space-y-3">
              <CheckboxInput
                name="allowExtraTime"
                control={undefined as any}
                label="Match Options"
                checkboxLabel="Allow Extra Time in Matches"
              />

              <NumberInput
                name="defaultExtraTimeDuration"
                control={undefined as any}
                label="Default Extra Time Duration (minutes)"
                min={10}
                max={30}
                className="ml-6"
                required
              />

              <CheckboxInput
                name="allowPenaltyShootouts"
                control={undefined as any}
                label=""
                checkboxLabel="Allow Penalty Shootouts"
              />
            </div>
          </div>
        </FormSection>

        {/* Team & Player Settings */}
        <FormSection
          title="Team & Player Settings"
          description="Policies for team registration and player management"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <NumberInput
                name="maxTeamsPerTournament"
                control={undefined as any}
                label="Maximum Teams per Tournament"
                min={2}
                max={64}
                required
              />

              <NumberInput
                name="maxPlayersPerTeam"
                control={undefined as any}
                label="Maximum Players per Team"
                min={11}
                max={35}
                required
              />
            </div>

            <div className="space-y-3">
              <CheckboxInput
                name="requirePlayerPhotos"
                control={undefined as any}
                label="Player Requirements"
                checkboxLabel="Require Player Photos"
              />

              <CheckboxInput
                name="requireMedicalInfo"
                control={undefined as any}
                label=""
                checkboxLabel="Require Medical Information"
              />
            </div>
          </div>
        </FormSection>

        {/* Notification Settings */}
        <FormSection
          title="Notification Settings"
          description="Configure when and how notifications are sent"
        >
          <div className="space-y-3">
            <CheckboxInput
              name="emailNotifications"
              control={undefined as any}
              label="Email Notifications"
              checkboxLabel="Enable Email Notifications"
            />

            <CheckboxInput
              name="matchStartReminders"
              control={undefined as any}
              label=""
              checkboxLabel="Send Match Start Reminders"
            />

            <CheckboxInput
              name="tournamentUpdates"
              control={undefined as any}
              label=""
              checkboxLabel="Send Tournament Updates"
            />

            <CheckboxInput
              name="membershipChanges"
              control={undefined as any}
              label=""
              checkboxLabel="Notify on Membership Changes"
            />
          </div>
        </FormSection>

        {/* Privacy Settings */}
        <FormSection
          title="Privacy Settings"
          description="Control visibility and access to organization information"
        >
          <div className="space-y-3">
            <CheckboxInput
              name="publicProfile"
              control={undefined as any}
              label="Profile Visibility"
              checkboxLabel="Make Organization Profile Public"
            />

            <CheckboxInput
              name="allowMemberSearch"
              control={undefined as any}
              label=""
              checkboxLabel="Allow Members to be Found in Search"
            />

            <CheckboxInput
              name="showStatistics"
              control={undefined as any}
              label=""
              checkboxLabel="Show Organization Statistics Publicly"
            />
          </div>
        </FormSection>

        {/* Advanced Settings */}
        <FormSection
          title="Advanced Settings"
          description="Advanced features and administrative controls"
        >
          <div className="space-y-3">
            <CheckboxInput
              name="autoApproveTeams"
              control={undefined as any}
              label="Approval Settings"
              checkboxLabel="Automatically Approve Team Registrations"
            />

            <CheckboxInput
              name="requireRefereeApproval"
              control={undefined as any}
              label=""
              checkboxLabel="Require Referee Approval for Matches"
            />

            <CheckboxInput
              name="enableLiveStreaming"
              control={undefined as any}
              label="Features"
              checkboxLabel="Enable Live Streaming Support"
            />

            <CheckboxInput
              name="enableStatsExport"
              control={undefined as any}
              label=""
              checkboxLabel="Enable Statistics Export"
            />
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Advanced settings affect how your organization operates. Changes may impact existing tournaments and matches.
            </AlertDescription>
          </Alert>
        </FormSection>
      </FormBase>
    </div>
  )
}
