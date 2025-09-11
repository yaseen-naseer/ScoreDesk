import { z } from 'zod'
import {
  nameSchema,
  emailSchema,
  phoneSchema,
  slugSchema,
  passwordSchema,
  jerseyNumberSchema,
  sportTypeSchema,
  tournamentFormatSchema,
  playerPositionSchema,
  userRoleSchema,
  addressSchema,
  contactInfoSchema,
  socialLinksSchema,
  teamColorsSchema,
  birthDateSchema,
  futureDateSchema,
  imageFileSchema,
  requiredString,
  optionalString,
  requiredNumber,
  optionalNumber
} from './common'

/**
 * Entity validation schemas for ScoreDesk
 */

// User Authentication
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  fullName: nameSchema,
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions'
  })
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false)
})

export const resetPasswordSchema = z.object({
  email: emailSchema
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

// User Profile
export const userProfileSchema = z.object({
  fullName: nameSchema,
  email: emailSchema,
  phone: phoneSchema.optional(),
  bio: optionalString(500),
  avatar: imageFileSchema.optional(),
  timezone: z.string().min(1, 'Timezone is required'),
  language: z.string().min(1, 'Language is required').default('en'),
  notifications: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(true),
    matchUpdates: z.boolean().default(true),
    teamUpdates: z.boolean().default(true)
  }).optional().default({
    email: true,
    push: true,
    matchUpdates: true,
    teamUpdates: true
  })
})

// Organization
export const organizationSchema = z.object({
  name: requiredString('Organization name', 2, 100),
  slug: slugSchema,
  description: optionalString(1000),
  website: z.string().url().optional().or(z.literal('')),
  logo: imageFileSchema.optional(),
  address: addressSchema,
  contactInfo: contactInfoSchema,
  socialLinks: socialLinksSchema.optional(),
  settings: z.object({
    defaultSport: sportTypeSchema,
    timezone: z.string().min(1, 'Timezone is required'),
    language: z.string().min(1, 'Language is required').default('en'),
    currency: z.string().length(3, 'Currency must be 3 characters').default('USD'),
    dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).default('DD/MM/YYYY'),
    timeFormat: z.enum(['12', '24']).default('24')
  }).optional()
})

export const organizationMemberSchema = z.object({
  email: emailSchema,
  role: userRoleSchema,
  message: optionalString(500)
})

// Team
export const teamSchema = z.object({
  name: requiredString('Team name', 2, 100),
  shortName: requiredString('Short name', 2, 10),
  slug: slugSchema,
  description: optionalString(1000),
  founded: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  logo: imageFileSchema.optional(),
  colors: teamColorsSchema,
  venue: z.object({
    name: requiredString('Venue name', 2, 100),
    address: addressSchema,
    capacity: requiredNumber('Capacity', 1, 200000).optional()
  }).optional(),
  contactInfo: contactInfoSchema.optional(),
  socialLinks: socialLinksSchema.optional(),
  isActive: z.boolean().default(true)
})

// Player
export const playerSchema = z.object({
  firstName: requiredString('First name', 2, 50),
  lastName: requiredString('Last name', 2, 50),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  dateOfBirth: birthDateSchema,
  nationality: requiredString('Nationality', 2, 50),
  height: requiredNumber('Height (cm)', 100, 250).optional(),
  weight: requiredNumber('Weight (kg)', 30, 200).optional(),
  position: playerPositionSchema,
  jerseyNumber: jerseyNumberSchema,
  photo: imageFileSchema.optional(),
  medicalInfo: z.object({
    allergies: optionalString(500),
    medications: optionalString(500),
    emergencyContact: z.object({
      name: nameSchema,
      relationship: requiredString('Relationship', 2, 50),
      phone: phoneSchema
    }),
    notes: optionalString(1000)
  }).optional(),
  eligibility: z.object({
    isEligible: z.boolean().default(true),
    suspensionEnd: z.date().optional(),
    notes: optionalString(500)
  }).optional().default({ isEligible: true }),
  isActive: z.boolean().default(true)
})

// Tournament
export const tournamentSchema = z.object({
  name: requiredString('Tournament name', 2, 100),
  slug: slugSchema,
  description: optionalString(2000),
  sport: sportTypeSchema,
  format: tournamentFormatSchema,
  startDate: futureDateSchema,
  endDate: futureDateSchema,
  registrationDeadline: futureDateSchema,
  maxTeams: requiredNumber('Maximum teams', 2, 64),
  entryFee: requiredNumber('Entry fee', 0, 100000).optional(),
  prizePool: requiredNumber('Prize pool', 0, 1000000).optional(),
  logo: imageFileSchema.optional(),
  venue: z.object({
    name: requiredString('Venue name', 2, 100),
    address: addressSchema
  }),
  rules: optionalString(5000),
  isPublic: z.boolean().default(true),
  allowRegistration: z.boolean().default(true)
}).refine(data => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate']
}).refine(data => data.registrationDeadline <= data.startDate, {
  message: 'Registration deadline must be before or on start date',
  path: ['registrationDeadline']
})

// Match
export const matchSchema = z.object({
  homeTeamId: z.string().uuid('Invalid home team'),
  awayTeamId: z.string().uuid('Invalid away team'),
  tournamentId: z.string().uuid('Invalid tournament').optional(),
  scheduledAt: futureDateSchema,
  venue: z.object({
    name: requiredString('Venue name', 2, 100),
    address: addressSchema
  }),
  referee: z.object({
    name: nameSchema,
    email: emailSchema.optional(),
    phone: phoneSchema.optional()
  }).optional(),
  format: z.object({
    periods: requiredNumber('Number of periods', 2, 4).default(2),
    periodDuration: requiredNumber('Period duration (minutes)', 5, 60).default(45),
    hasExtraTime: z.boolean().default(false),
    extraTimeDuration: requiredNumber('Extra time duration (minutes)', 5, 30).default(15),
    hasPenalties: z.boolean().default(true)
  }).optional(),
  notes: optionalString(1000),
  isPublic: z.boolean().default(true)
}).refine(data => data.homeTeamId !== data.awayTeamId, {
  message: 'Home team and away team must be different',
  path: ['awayTeamId']
})

// Match Lineup
export const matchLineupSchema = z.object({
  matchId: z.string().uuid('Invalid match'),
  teamId: z.string().uuid('Invalid team'),
  players: z.array(z.object({
    playerId: z.string().uuid('Invalid player'),
    position: playerPositionSchema,
    jerseyNumber: jerseyNumberSchema,
    status: z.enum(['starting', 'substitute', 'bench']),
    captain: z.boolean().default(false)
  })).min(11, 'Must have at least 11 players').max(23, 'Cannot have more than 23 players'),
  formation: requiredString('Formation', 3, 10),
  notes: optionalString(500)
}).refine(data => {
  const starting = data.players.filter(p => p.status === 'starting')
  return starting.length === 11
}, {
  message: 'Must have exactly 11 starting players',
  path: ['players']
}).refine(data => {
  const captains = data.players.filter(p => p.captain)
  return captains.length === 1
}, {
  message: 'Must have exactly one captain',
  path: ['players']
}).refine(data => {
  const jerseyNumbers = data.players.map(p => p.jerseyNumber)
  return new Set(jerseyNumbers).size === jerseyNumbers.length
}, {
  message: 'Jersey numbers must be unique',
  path: ['players']
})

// Match Event
export const matchEventSchema = z.object({
  matchId: z.string().uuid('Invalid match'),
  playerId: z.string().uuid('Invalid player').optional(),
  teamId: z.string().uuid('Invalid team'),
  type: z.enum([
    'goal', 'own_goal', 'penalty_goal', 'yellow_card', 'red_card',
    'second_yellow_card', 'substitution', 'corner', 'free_kick',
    'penalty_miss', 'offside', 'foul'
  ]),
  minute: requiredNumber('Minute', 0, 120),
  second: requiredNumber('Second', 0, 59).optional().default(0),
  period: z.enum(['1', '2', 'extra_1', 'extra_2', 'penalty']).default('1'),
  description: optionalString(500),
  metadata: z.record(z.any()).optional()
})

// Statistics Input
export const statisticsInputSchema = z.object({
  matchId: z.string().uuid('Invalid match'),
  period: z.enum(['1', '2', 'extra_1', 'extra_2', 'full_time']),
  teamStats: z.object({
    homeTeam: z.object({
      possession: requiredNumber('Possession %', 0, 100),
      shots: requiredNumber('Shots', 0, 50).default(0),
      shotsOnTarget: requiredNumber('Shots on target', 0, 50).default(0),
      corners: requiredNumber('Corners', 0, 20).default(0),
      fouls: requiredNumber('Fouls', 0, 30).default(0),
      yellowCards: requiredNumber('Yellow cards', 0, 10).default(0),
      redCards: requiredNumber('Red cards', 0, 5).default(0),
      passes: requiredNumber('Passes', 0, 1000).default(0),
      passAccuracy: requiredNumber('Pass accuracy %', 0, 100).default(0),
      offsides: requiredNumber('Offsides', 0, 20).default(0)
    }),
    awayTeam: z.object({
      possession: requiredNumber('Possession %', 0, 100),
      shots: requiredNumber('Shots', 0, 50).default(0),
      shotsOnTarget: requiredNumber('Shots on target', 0, 50).default(0),
      corners: requiredNumber('Corners', 0, 20).default(0),
      fouls: requiredNumber('Fouls', 0, 30).default(0),
      yellowCards: requiredNumber('Yellow cards', 0, 10).default(0),
      redCards: requiredNumber('Red cards', 0, 5).default(0),
      passes: requiredNumber('Passes', 0, 1000).default(0),
      passAccuracy: requiredNumber('Pass accuracy %', 0, 100).default(0),
      offsides: requiredNumber('Offsides', 0, 20).default(0)
    })
  })
}).refine(data => {
  const homePossession = data.teamStats.homeTeam.possession
  const awayPossession = data.teamStats.awayTeam.possession
  return Math.abs((homePossession + awayPossession) - 100) <= 1 // Allow 1% tolerance
}, {
  message: 'Total possession must equal 100%',
  path: ['teamStats']
})

// Search and Filter schemas
export const searchSchema = z.object({
  query: z.string().max(100, 'Search query too long').optional(),
  filters: z.record(z.any()).optional(),
  sort: z.object({
    field: z.string(),
    direction: z.enum(['asc', 'desc']).default('asc')
  }).optional(),
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20)
  }).optional()
})

// Bulk operations
export const bulkOperationSchema = z.object({
  action: z.enum(['delete', 'update', 'activate', 'deactivate']),
  ids: z.array(z.string().uuid()).min(1, 'Must select at least one item'),
  data: z.record(z.any()).optional()
})

// Import/Export schemas
export const importDataSchema = z.object({
  type: z.enum(['players', 'teams', 'matches', 'tournaments']),
  file: z.instanceof(File).refine(
    (file) => file.type === 'text/csv' || file.type === 'application/vnd.ms-excel',
    'File must be CSV or Excel format'
  ),
  options: z.object({
    hasHeaders: z.boolean().default(true),
    delimiter: z.enum([',', ';', '\t']).default(','),
    encoding: z.enum(['utf-8', 'latin1']).default('utf-8')
  }).optional()
})

export const exportDataSchema = z.object({
  type: z.enum(['players', 'teams', 'matches', 'tournaments', 'statistics']),
  format: z.enum(['csv', 'excel', 'pdf']).default('csv'),
  filters: z.record(z.any()).optional(),
  fields: z.array(z.string()).optional()
})
