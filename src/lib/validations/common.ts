import { z } from 'zod'

/**
 * Common validation schemas for ScoreDesk
 */

// Basic types
export const uuidSchema = z.string().uuid('Invalid ID format')
export const emailSchema = z.string().email('Invalid email address')
export const phoneSchema = z.string().regex(
  /^[\+]?[\d\s\-\(\)]+$/,
  'Invalid phone number format'
)
export const urlSchema = z.string().url('Invalid URL format')

// Text fields with common constraints
export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z\s\-\.\']+$/, 'Name contains invalid characters')

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be less than 30 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores')

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number')

export const slugSchema = z
  .string()
  .min(3, 'Slug must be at least 3 characters')
  .max(50, 'Slug must be less than 50 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')

// Numbers with sports-specific constraints
export const scoreSchema = z
  .number()
  .int('Score must be a whole number')
  .min(0, 'Score cannot be negative')
  .max(999, 'Score cannot exceed 999')

export const jerseyNumberSchema = z
  .number()
  .int('Jersey number must be a whole number')
  .min(1, 'Jersey number must be at least 1')
  .max(99, 'Jersey number cannot exceed 99')

export const durationSchema = z
  .number()
  .int('Duration must be a whole number')
  .min(0, 'Duration cannot be negative')
  .max(300, 'Duration cannot exceed 300 minutes') // 5 hours max

export const yearSchema = z
  .number()
  .int('Year must be a whole number')
  .min(1900, 'Year must be after 1900')
  .max(new Date().getFullYear() + 10, 'Year cannot be more than 10 years in the future')

// Dates
export const dateSchema = z.date({
  required_error: 'Date is required',
  invalid_type_error: 'Invalid date format'
})

export const futureDateSchema = dateSchema.refine(
  (date) => date > new Date(),
  'Date must be in the future'
)

export const pastDateSchema = dateSchema.refine(
  (date) => date < new Date(),
  'Date must be in the past'
)

export const birthDateSchema = dateSchema
  .refine(
    (date) => {
      const age = new Date().getFullYear() - date.getFullYear()
      return age >= 5 && age <= 100
    },
    'Age must be between 5 and 100 years'
  )

// Sports-specific enums
export const sportTypeSchema = z.enum(['football', 'futsal'], {
  required_error: 'Sport type is required',
  invalid_type_error: 'Invalid sport type'
})

export const tournamentFormatSchema = z.enum(['league', 'knockout', 'group'], {
  required_error: 'Tournament format is required',
  invalid_type_error: 'Invalid tournament format'
})

export const matchStatusSchema = z.enum([
  'scheduled', 
  'live', 
  'paused', 
  'completed', 
  'cancelled', 
  'postponed'
], {
  required_error: 'Match status is required',
  invalid_type_error: 'Invalid match status'
})

export const playerPositionSchema = z.enum([
  'goalkeeper', 
  'defender', 
  'midfielder', 
  'forward'
], {
  required_error: 'Player position is required',
  invalid_type_error: 'Invalid player position'
})

export const userRoleSchema = z.enum([
  'owner',
  'admin', 
  'manager', 
  'referee', 
  'stats_operator', 
  'viewer'
], {
  required_error: 'User role is required',
  invalid_type_error: 'Invalid user role'
})

export const eventTypeSchema = z.enum([
  'goal',
  'own_goal',
  'penalty_goal',
  'yellow_card',
  'red_card',
  'second_yellow_card',
  'substitution',
  'corner',
  'free_kick',
  'penalty_miss',
  'offside',
  'foul'
], {
  required_error: 'Event type is required',
  invalid_type_error: 'Invalid event type'
})

// File uploads
export const imageFileSchema = z
  .instanceof(File)
  .refine((file) => file.size <= 5 * 1024 * 1024, 'File size must be less than 5MB')
  .refine(
    (file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
    'File must be a JPEG, PNG, or WebP image'
  )

export const documentFileSchema = z
  .instanceof(File)
  .refine((file) => file.size <= 10 * 1024 * 1024, 'File size must be less than 10MB')
  .refine(
    (file) => ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type),
    'File must be a PDF or Word document'
  )

// Colors
export const colorSchema = z
  .string()
  .regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color (e.g., #FF0000)')

export const teamColorsSchema = z.object({
  primary: colorSchema,
  secondary: colorSchema.optional(),
  accent: colorSchema.optional()
})

// Coordinates for venue locations
export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
})

// Address
export const addressSchema = z.object({
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State/Province is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
  coordinates: coordinatesSchema.optional()
})

// Contact information
export const contactInfoSchema = z.object({
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  website: urlSchema.optional()
}).refine(
  (data) => data.email || data.phone,
  {
    message: 'At least one contact method (email or phone) is required',
    path: ['email']
  }
)

// Social media links
export const socialLinksSchema = z.object({
  facebook: urlSchema.optional(),
  twitter: urlSchema.optional(),
  instagram: urlSchema.optional(),
  youtube: urlSchema.optional(),
  website: urlSchema.optional()
})

// Time-related schemas
export const timeSchema = z.object({
  hours: z.number().int().min(0).max(23),
  minutes: z.number().int().min(0).max(59)
})

export const matchTimeSchema = z.object({
  period: z.enum(['1', '2', 'extra_1', 'extra_2', 'penalty']),
  minute: z.number().int().min(0).max(120),
  second: z.number().int().min(0).max(59).optional().default(0)
})

// Statistics schemas
export const playerStatsSchema = z.object({
  goals: z.number().int().min(0).default(0),
  assists: z.number().int().min(0).default(0),
  yellowCards: z.number().int().min(0).default(0),
  redCards: z.number().int().min(0).default(0),
  minutesPlayed: z.number().int().min(0).default(0),
  saves: z.number().int().min(0).default(0), // for goalkeepers
  tackles: z.number().int().min(0).default(0),
  passes: z.number().int().min(0).default(0),
  passAccuracy: z.number().min(0).max(100).default(0),
  shots: z.number().int().min(0).default(0),
  shotsOnTarget: z.number().int().min(0).default(0),
  fouls: z.number().int().min(0).default(0)
})

export const teamStatsSchema = z.object({
  possession: z.number().min(0).max(100).default(0),
  shots: z.number().int().min(0).default(0),
  shotsOnTarget: z.number().int().min(0).default(0),
  corners: z.number().int().min(0).default(0),
  fouls: z.number().int().min(0).default(0),
  yellowCards: z.number().int().min(0).default(0),
  redCards: z.number().int().min(0).default(0),
  passes: z.number().int().min(0).default(0),
  passAccuracy: z.number().min(0).max(100).default(0),
  offsides: z.number().int().min(0).default(0)
})

// Helper functions for conditional validation
export function createOptionalSchema<T extends z.ZodType>(schema: T, condition?: boolean) {
  return condition ? schema : schema.optional()
}

export function createConditionalSchema<T extends z.ZodType>(
  schema: T,
  condition: (data: any) => boolean,
  errorMessage?: string
) {
  return z.any().superRefine((data, ctx) => {
    if (condition(data)) {
      const result = schema.safeParse(data)
      if (!result.success) {
        result.error.errors.forEach(error => {
          ctx.addIssue({
            ...error,
            message: errorMessage || error.message
          })
        })
      }
    }
  })
}

// Reusable form field schemas
export const requiredString = (field: string, min = 1, max = 255) =>
  z.string()
    .min(min, `${field} is required`)
    .max(max, `${field} must be less than ${max} characters`)

export const optionalString = (max = 255) =>
  z.string()
    .max(max, `Must be less than ${max} characters`)
    .optional()

export const requiredNumber = (field: string, min = 0, max = Number.MAX_SAFE_INTEGER) =>
  z.number({
    required_error: `${field} is required`,
    invalid_type_error: `${field} must be a number`
  })
  .min(min, `${field} must be at least ${min}`)
  .max(max, `${field} cannot exceed ${max}`)

export const optionalNumber = (min = 0, max = Number.MAX_SAFE_INTEGER) =>
  z.number()
    .min(min, `Must be at least ${min}`)
    .max(max, `Cannot exceed ${max}`)
    .optional()
