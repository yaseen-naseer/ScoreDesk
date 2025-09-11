/**
 * Timezone utilities for ScoreDesk
 * Handles timezone conversion, formatting, and display
 */

export interface TimezoneInfo {
  value: string
  label: string
  offset: string
  region: string
}

// Comprehensive timezone list with additional metadata
export const TIMEZONES: TimezoneInfo[] = [
  // UTC and GMT
  { value: 'UTC', label: 'UTC', offset: '+00:00', region: 'Universal' },
  { value: 'GMT', label: 'Greenwich Mean Time (GMT)', offset: '+00:00', region: 'Universal' },
  
  // North America
  { value: 'America/New_York', label: 'Eastern Time (EST/EDT)', offset: '-05:00/-04:00', region: 'North America' },
  { value: 'America/Chicago', label: 'Central Time (CST/CDT)', offset: '-06:00/-05:00', region: 'North America' },
  { value: 'America/Denver', label: 'Mountain Time (MST/MDT)', offset: '-07:00/-06:00', region: 'North America' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PST/PDT)', offset: '-08:00/-07:00', region: 'North America' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKST/AKDT)', offset: '-09:00/-08:00', region: 'North America' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)', offset: '-10:00', region: 'North America' },
  { value: 'America/Toronto', label: 'Toronto (EST/EDT)', offset: '-05:00/-04:00', region: 'North America' },
  { value: 'America/Vancouver', label: 'Vancouver (PST/PDT)', offset: '-08:00/-07:00', region: 'North America' },
  
  // Europe
  { value: 'Europe/London', label: 'London (GMT/BST)', offset: '+00:00/+01:00', region: 'Europe' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)', offset: '+01:00/+02:00', region: 'Europe' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)', offset: '+01:00/+02:00', region: 'Europe' },
  { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)', offset: '+01:00/+02:00', region: 'Europe' },
  { value: 'Europe/Rome', label: 'Rome (CET/CEST)', offset: '+01:00/+02:00', region: 'Europe' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (CET/CEST)', offset: '+01:00/+02:00', region: 'Europe' },
  { value: 'Europe/Zurich', label: 'Zurich (CET/CEST)', offset: '+01:00/+02:00', region: 'Europe' },
  { value: 'Europe/Stockholm', label: 'Stockholm (CET/CEST)', offset: '+01:00/+02:00', region: 'Europe' },
  { value: 'Europe/Moscow', label: 'Moscow (MSK)', offset: '+03:00', region: 'Europe' },
  
  // Asia
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)', offset: '+09:00', region: 'Asia' },
  { value: 'Asia/Seoul', label: 'Seoul (KST)', offset: '+09:00', region: 'Asia' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)', offset: '+08:00', region: 'Asia' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)', offset: '+08:00', region: 'Asia' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)', offset: '+08:00', region: 'Asia' },
  { value: 'Asia/Bangkok', label: 'Bangkok (ICT)', offset: '+07:00', region: 'Asia' },
  { value: 'Asia/Mumbai', label: 'Mumbai (IST)', offset: '+05:30', region: 'Asia' },
  { value: 'Asia/Kolkata', label: 'Kolkata (IST)', offset: '+05:30', region: 'Asia' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)', offset: '+04:00', region: 'Asia' },
  { value: 'Asia/Riyadh', label: 'Riyadh (AST)', offset: '+03:00', region: 'Asia' },
  
  // Australia & Oceania
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)', offset: '+10:00/+11:00', region: 'Australia' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)', offset: '+10:00/+11:00', region: 'Australia' },
  { value: 'Australia/Brisbane', label: 'Brisbane (AEST)', offset: '+10:00', region: 'Australia' },
  { value: 'Australia/Perth', label: 'Perth (AWST)', offset: '+08:00', region: 'Australia' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)', offset: '+12:00/+13:00', region: 'Oceania' },
  
  // South America
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT/BRST)', offset: '-03:00/-02:00', region: 'South America' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (ART)', offset: '-03:00', region: 'South America' },
  { value: 'America/Santiago', label: 'Santiago (CLT/CLST)', offset: '-04:00/-03:00', region: 'South America' },
  { value: 'America/Lima', label: 'Lima (PET)', offset: '-05:00', region: 'South America' },
  { value: 'America/Bogota', label: 'Bogotá (COT)', offset: '-05:00', region: 'South America' },
  { value: 'America/Caracas', label: 'Caracas (VET)', offset: '-04:00', region: 'South America' },
  
  // Central America & Mexico
  { value: 'America/Mexico_City', label: 'Mexico City (CST/CDT)', offset: '-06:00/-05:00', region: 'Central America' },
  { value: 'America/Guatemala', label: 'Guatemala City (CST)', offset: '-06:00', region: 'Central America' },
  { value: 'America/Costa_Rica', label: 'San José (CST)', offset: '-06:00', region: 'Central America' },
  { value: 'America/Panama', label: 'Panama City (EST)', offset: '-05:00', region: 'Central America' },
  
  // Africa
  { value: 'Africa/Cairo', label: 'Cairo (EET/EEST)', offset: '+02:00/+03:00', region: 'Africa' },
  { value: 'Africa/Lagos', label: 'Lagos (WAT)', offset: '+01:00', region: 'Africa' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST)', offset: '+02:00', region: 'Africa' },
  { value: 'Africa/Nairobi', label: 'Nairobi (EAT)', offset: '+03:00', region: 'Africa' },
  { value: 'Africa/Casablanca', label: 'Casablanca (WET/WEST)', offset: '+00:00/+01:00', region: 'Africa' }
]

/**
 * Get timezone options for select inputs
 */
export function getTimezoneOptions() {
  return TIMEZONES.map(tz => ({
    label: tz.label,
    value: tz.value
  }))
}

/**
 * Get timezone options grouped by region
 */
export function getTimezoneOptionsByRegion() {
  const regions = new Map<string, TimezoneInfo[]>()
  
  TIMEZONES.forEach(tz => {
    if (!regions.has(tz.region)) {
      regions.set(tz.region, [])
    }
    regions.get(tz.region)!.push(tz)
  })
  
  return Array.from(regions.entries()).map(([region, timezones]) => ({
    label: region,
    options: timezones.map(tz => ({
      label: tz.label,
      value: tz.value
    }))
  }))
}

/**
 * Get timezone info by value
 */
export function getTimezoneInfo(timezone: string): TimezoneInfo | undefined {
  return TIMEZONES.find(tz => tz.value === timezone)
}

/**
 * Format date in organization's timezone
 */
export function formatDateInTimezone(
  date: Date | string,
  timezone: string,
  format: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' = 'DD/MM/YYYY'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }
    
    const formatted = new Intl.DateTimeFormat('en-CA', options).format(dateObj)
    const [year, month, day] = formatted.split('-')
    
    switch (format) {
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`
      default:
        return formatted
    }
  } catch (error) {
    console.error('Error formatting date in timezone:', error)
    return dateObj.toLocaleDateString()
  }
}

/**
 * Format time in organization's timezone
 */
export function formatTimeInTimezone(
  date: Date | string,
  timezone: string,
  format: '12' | '24' = '24'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: format === '12'
    }
    
    return new Intl.DateTimeFormat('en-US', options).format(dateObj)
  } catch (error) {
    console.error('Error formatting time in timezone:', error)
    return dateObj.toLocaleTimeString()
  }
}

/**
 * Format datetime in organization's timezone
 */
export function formatDateTimeInTimezone(
  date: Date | string,
  timezone: string,
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' = 'DD/MM/YYYY',
  timeFormat: '12' | '24' = '24'
): string {
  const formattedDate = formatDateInTimezone(date, timezone, dateFormat)
  const formattedTime = formatTimeInTimezone(date, timezone, timeFormat)
  
  return `${formattedDate} ${formattedTime}`
}

/**
 * Get current time in organization's timezone
 */
export function getCurrentTimeInTimezone(timezone: string): Date {
  try {
    const now = new Date()
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
    
    // This is a simplified approach - in production, you'd want to use a proper timezone library
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }
    
    const formatted = new Intl.DateTimeFormat('sv-SE', options).format(now)
    return new Date(formatted)
  } catch (error) {
    console.error('Error getting current time in timezone:', error)
    return new Date()
  }
}

/**
 * Convert UTC date to organization timezone
 */
export function convertUTCToTimezone(utcDate: Date | string, timezone: string): Date {
  const dateObj = typeof utcDate === 'string' ? new Date(utcDate) : utcDate
  
  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }
    
    const formatted = new Intl.DateTimeFormat('sv-SE', options).format(dateObj)
    return new Date(formatted)
  } catch (error) {
    console.error('Error converting UTC to timezone:', error)
    return dateObj
  }
}

/**
 * Get timezone offset string (e.g., "+05:30", "-08:00")
 */
export function getTimezoneOffset(timezone: string): string {
  try {
    const now = new Date()
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }))
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
    
    const offset = (tzDate.getTime() - utcDate.getTime()) / (1000 * 60)
    const hours = Math.floor(Math.abs(offset) / 60)
    const minutes = Math.abs(offset) % 60
    
    const sign = offset >= 0 ? '+' : '-'
    return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  } catch (error) {
    console.error('Error getting timezone offset:', error)
    return '+00:00'
  }
}

/**
 * Check if timezone supports daylight saving time
 */
export function supportsDST(timezone: string): boolean {
  try {
    const jan = new Date(2024, 0, 1)
    const jul = new Date(2024, 6, 1)
    
    const janOffset = getTimezoneOffset(timezone)
    const julOffset = getTimezoneOffset(timezone)
    
    return janOffset !== julOffset
  } catch (error) {
    console.error('Error checking DST support:', error)
    return false
  }
}

/**
 * Get user's current timezone
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch (error) {
    console.error('Error getting user timezone:', error)
    return 'UTC'
  }
}

/**
 * Validate timezone string
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone })
    return true
  } catch (error) {
    return false
  }
}
