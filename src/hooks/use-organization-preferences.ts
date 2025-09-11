'use client'

import { useMemo } from 'react'
import { useOrganization } from '@/lib/contexts/organization-context'
import { 
  formatDateInTimezone, 
  formatTimeInTimezone, 
  formatDateTimeInTimezone,
  getCurrentTimeInTimezone,
  getTimezoneInfo
} from '@/lib/utils/timezone'

export interface OrganizationPreferences {
  // Core settings
  defaultSport: 'football' | 'futsal'
  timezone: string
  language: string
  currency: string
  
  // Formatting
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
  timeFormat: '12' | '24'
  
  // Match settings
  defaultMatchDuration: number
  defaultHalftimeDuration: number
  allowExtraTime: boolean
  defaultExtraTimeDuration: number
  allowPenaltyShootouts: boolean
  
  // Team settings
  maxTeamsPerTournament: number
  maxPlayersPerTeam: number
  requirePlayerPhotos: boolean
  requireMedicalInfo: boolean
  
  // Notification settings
  emailNotifications: boolean
  matchStartReminders: boolean
  tournamentUpdates: boolean
  membershipChanges: boolean
  
  // Privacy settings
  publicProfile: boolean
  allowMemberSearch: boolean
  showStatistics: boolean
  
  // Advanced settings
  autoApproveTeams: boolean
  requireRefereeApproval: boolean
  enableLiveStreaming: boolean
  enableStatsExport: boolean
}

export interface PreferenceUtils {
  // Date/time formatting utilities
  formatDate: (date: Date | string) => string
  formatTime: (date: Date | string) => string
  formatDateTime: (date: Date | string) => string
  getCurrentTime: () => Date
  
  // Currency formatting
  formatCurrency: (amount: number) => string
  
  // Timezone info
  timezoneInfo: ReturnType<typeof getTimezoneInfo>
  timezoneLabel: string
  
  // Match duration formatting
  formatMatchDuration: (minutes: number) => string
  
  // Language/locale utilities
  getLocale: () => string
  
  // Sport-specific utilities
  isFutsal: boolean
  isFootball: boolean
  
  // Team/tournament limits
  isValidTeamCount: (count: number) => boolean
  isValidPlayerCount: (count: number) => boolean
  
  // Feature flags
  canUseExtraTime: boolean
  canUsePenaltyShootouts: boolean
  canAutoApproveTeams: boolean
  needsRefereeApproval: boolean
  hasLiveStreamingEnabled: boolean
  canExportStats: boolean
}

const DEFAULT_PREFERENCES: OrganizationPreferences = {
  defaultSport: 'football',
  timezone: 'UTC',
  language: 'en',
  currency: 'USD',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24',
  defaultMatchDuration: 90,
  defaultHalftimeDuration: 15,
  allowExtraTime: true,
  defaultExtraTimeDuration: 30,
  allowPenaltyShootouts: true,
  maxTeamsPerTournament: 32,
  maxPlayersPerTeam: 25,
  requirePlayerPhotos: false,
  requireMedicalInfo: false,
  emailNotifications: true,
  matchStartReminders: true,
  tournamentUpdates: true,
  membershipChanges: true,
  publicProfile: true,
  allowMemberSearch: true,
  showStatistics: true,
  autoApproveTeams: false,
  requireRefereeApproval: true,
  enableLiveStreaming: false,
  enableStatsExport: true
}

export function useOrganizationPreferences(): {
  preferences: OrganizationPreferences
  utils: PreferenceUtils
  isLoading: boolean
} {
  const { currentOrganization, isLoading } = useOrganization()

  const preferences = useMemo((): OrganizationPreferences => {
    if (!currentOrganization?.settings) {
      return DEFAULT_PREFERENCES
    }

    return {
      defaultSport: currentOrganization.settings.defaultSport || DEFAULT_PREFERENCES.defaultSport,
      timezone: currentOrganization.settings.timezone || DEFAULT_PREFERENCES.timezone,
      language: currentOrganization.settings.language || DEFAULT_PREFERENCES.language,
      currency: currentOrganization.settings.currency || DEFAULT_PREFERENCES.currency,
      dateFormat: currentOrganization.settings.dateFormat || DEFAULT_PREFERENCES.dateFormat,
      timeFormat: currentOrganization.settings.timeFormat || DEFAULT_PREFERENCES.timeFormat,
      defaultMatchDuration: currentOrganization.settings.defaultMatchDuration || DEFAULT_PREFERENCES.defaultMatchDuration,
      defaultHalftimeDuration: currentOrganization.settings.defaultHalftimeDuration || DEFAULT_PREFERENCES.defaultHalftimeDuration,
      allowExtraTime: currentOrganization.settings.allowExtraTime ?? DEFAULT_PREFERENCES.allowExtraTime,
      defaultExtraTimeDuration: currentOrganization.settings.defaultExtraTimeDuration || DEFAULT_PREFERENCES.defaultExtraTimeDuration,
      allowPenaltyShootouts: currentOrganization.settings.allowPenaltyShootouts ?? DEFAULT_PREFERENCES.allowPenaltyShootouts,
      maxTeamsPerTournament: currentOrganization.settings.maxTeamsPerTournament || DEFAULT_PREFERENCES.maxTeamsPerTournament,
      maxPlayersPerTeam: currentOrganization.settings.maxPlayersPerTeam || DEFAULT_PREFERENCES.maxPlayersPerTeam,
      requirePlayerPhotos: currentOrganization.settings.requirePlayerPhotos ?? DEFAULT_PREFERENCES.requirePlayerPhotos,
      requireMedicalInfo: currentOrganization.settings.requireMedicalInfo ?? DEFAULT_PREFERENCES.requireMedicalInfo,
      emailNotifications: currentOrganization.settings.emailNotifications ?? DEFAULT_PREFERENCES.emailNotifications,
      matchStartReminders: currentOrganization.settings.matchStartReminders ?? DEFAULT_PREFERENCES.matchStartReminders,
      tournamentUpdates: currentOrganization.settings.tournamentUpdates ?? DEFAULT_PREFERENCES.tournamentUpdates,
      membershipChanges: currentOrganization.settings.membershipChanges ?? DEFAULT_PREFERENCES.membershipChanges,
      publicProfile: currentOrganization.settings.publicProfile ?? DEFAULT_PREFERENCES.publicProfile,
      allowMemberSearch: currentOrganization.settings.allowMemberSearch ?? DEFAULT_PREFERENCES.allowMemberSearch,
      showStatistics: currentOrganization.settings.showStatistics ?? DEFAULT_PREFERENCES.showStatistics,
      autoApproveTeams: currentOrganization.settings.autoApproveTeams ?? DEFAULT_PREFERENCES.autoApproveTeams,
      requireRefereeApproval: currentOrganization.settings.requireRefereeApproval ?? DEFAULT_PREFERENCES.requireRefereeApproval,
      enableLiveStreaming: currentOrganization.settings.enableLiveStreaming ?? DEFAULT_PREFERENCES.enableLiveStreaming,
      enableStatsExport: currentOrganization.settings.enableStatsExport ?? DEFAULT_PREFERENCES.enableStatsExport
    }
  }, [currentOrganization?.settings])

  const utils = useMemo((): PreferenceUtils => {
    const timezoneInfo = getTimezoneInfo(preferences.timezone)

    return {
      // Date/time formatting
      formatDate: (date: Date | string) => formatDateInTimezone(date, preferences.timezone, preferences.dateFormat),
      formatTime: (date: Date | string) => formatTimeInTimezone(date, preferences.timezone, preferences.timeFormat),
      formatDateTime: (date: Date | string) => formatDateTimeInTimezone(date, preferences.timezone, preferences.dateFormat, preferences.timeFormat),
      getCurrentTime: () => getCurrentTimeInTimezone(preferences.timezone),

      // Currency formatting
      formatCurrency: (amount: number) => {
        try {
          return new Intl.NumberFormat(preferences.language, {
            style: 'currency',
            currency: preferences.currency
          }).format(amount)
        } catch (error) {
          console.error('Error formatting currency:', error)
          return `${preferences.currency} ${amount.toFixed(2)}`
        }
      },

      // Timezone info
      timezoneInfo,
      timezoneLabel: timezoneInfo?.label || preferences.timezone,

      // Match duration formatting
      formatMatchDuration: (minutes: number) => {
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        if (hours > 0) {
          return `${hours}h ${mins}m`
        }
        return `${mins}m`
      },

      // Locale utilities
      getLocale: () => {
        // Map language codes to full locales
        const localeMap: Record<string, string> = {
          'en': 'en-US',
          'es': 'es-ES',
          'pt': 'pt-BR',
          'fr': 'fr-FR',
          'de': 'de-DE',
          'it': 'it-IT',
          'nl': 'nl-NL',
          'ru': 'ru-RU',
          'zh-CN': 'zh-CN',
          'ja': 'ja-JP',
          'ko': 'ko-KR',
          'ar': 'ar-SA'
        }
        return localeMap[preferences.language] || 'en-US'
      },

      // Sport utilities
      isFutsal: preferences.defaultSport === 'futsal',
      isFootball: preferences.defaultSport === 'football',

      // Validation utilities
      isValidTeamCount: (count: number) => count >= 2 && count <= preferences.maxTeamsPerTournament,
      isValidPlayerCount: (count: number) => count >= 11 && count <= preferences.maxPlayersPerTeam,

      // Feature flags
      canUseExtraTime: preferences.allowExtraTime,
      canUsePenaltyShootouts: preferences.allowPenaltyShootouts,
      canAutoApproveTeams: preferences.autoApproveTeams,
      needsRefereeApproval: preferences.requireRefereeApproval,
      hasLiveStreamingEnabled: preferences.enableLiveStreaming,
      canExportStats: preferences.enableStatsExport
    }
  }, [preferences])

  return {
    preferences,
    utils,
    isLoading
  }
}

// Utility hook for specific preference categories
export function useMatchPreferences() {
  const { preferences, utils } = useOrganizationPreferences()

  return {
    defaultDuration: preferences.defaultMatchDuration,
    halftimeDuration: preferences.defaultHalftimeDuration,
    allowExtraTime: preferences.allowExtraTime,
    extraTimeDuration: preferences.defaultExtraTimeDuration,
    allowPenaltyShootouts: preferences.allowPenaltyShootouts,
    formatDuration: utils.formatMatchDuration,
    isFutsal: utils.isFutsal
  }
}

export function useTeamPreferences() {
  const { preferences, utils } = useOrganizationPreferences()

  return {
    maxTeamsPerTournament: preferences.maxTeamsPerTournament,
    maxPlayersPerTeam: preferences.maxPlayersPerTeam,
    requirePlayerPhotos: preferences.requirePlayerPhotos,
    requireMedicalInfo: preferences.requireMedicalInfo,
    autoApproveTeams: preferences.autoApproveTeams,
    isValidTeamCount: utils.isValidTeamCount,
    isValidPlayerCount: utils.isValidPlayerCount
  }
}

export function useNotificationPreferences() {
  const { preferences } = useOrganizationPreferences()

  return {
    emailNotifications: preferences.emailNotifications,
    matchStartReminders: preferences.matchStartReminders,
    tournamentUpdates: preferences.tournamentUpdates,
    membershipChanges: preferences.membershipChanges
  }
}

export function useFormattingPreferences() {
  const { preferences, utils } = useOrganizationPreferences()

  return {
    timezone: preferences.timezone,
    language: preferences.language,
    currency: preferences.currency,
    dateFormat: preferences.dateFormat,
    timeFormat: preferences.timeFormat,
    formatDate: utils.formatDate,
    formatTime: utils.formatTime,
    formatDateTime: utils.formatDateTime,
    formatCurrency: utils.formatCurrency,
    getCurrentTime: utils.getCurrentTime,
    getLocale: utils.getLocale,
    timezoneLabel: utils.timezoneLabel
  }
}
