/**
 * Test data fixtures for E2E tests
 */

export const testUsers = {
  owner: {
    email: 'owner@scoredesk.test',
    password: 'password123',
    firstName: 'John',
    lastName: 'Owner',
    role: 'owner' as const,
  },
  admin: {
    email: 'admin@scoredesk.test',
    password: 'password123',
    firstName: 'Jane',
    lastName: 'Admin',
    role: 'admin' as const,
  },
  manager: {
    email: 'manager@scoredesk.test',
    password: 'password123',
    firstName: 'Mike',
    lastName: 'Manager',
    role: 'manager' as const,
  },
  referee: {
    email: 'referee@scoredesk.test',
    password: 'password123',
    firstName: 'Bob',
    lastName: 'Referee',
    role: 'referee' as const,
  },
  statsOperator: {
    email: 'stats@scoredesk.test',
    password: 'password123',
    firstName: 'Alice',
    lastName: 'Stats',
    role: 'stats_operator' as const,
  },
  viewer: {
    email: 'viewer@scoredesk.test',
    password: 'password123',
    firstName: 'Tom',
    lastName: 'Viewer',
    role: 'viewer' as const,
  },
}

export const testOrganizations = {
  sampleLeague: {
    id: 'org-1',
    name: 'Sample Football League',
    description: 'A test football league for E2E testing',
    timezone: 'America/New_York',
    country: 'United States',
    logo: null,
  },
  futsalClub: {
    id: 'org-2',
    name: 'Elite Futsal Club',
    description: 'A test futsal club for E2E testing',
    timezone: 'Europe/London',
    country: 'United Kingdom',
    logo: null,
  },
}

export const testTeams = {
  teamA: {
    id: 'team-1',
    name: 'Thunder Bolts',
    shortName: 'THB',
    colors: {
      primary: '#1E40AF',
      secondary: '#FFFFFF',
    },
    logo: null,
    venue: 'Thunder Stadium',
    organizationId: 'org-1',
  },
  teamB: {
    id: 'team-2',
    name: 'Lightning Strikes',
    shortName: 'LGS',
    colors: {
      primary: '#DC2626',
      secondary: '#FBBF24',
    },
    logo: null,
    venue: 'Lightning Arena',
    organizationId: 'org-1',
  },
  futsalTeamA: {
    id: 'team-3',
    name: 'Futsal Masters',
    shortName: 'FMA',
    colors: {
      primary: '#059669',
      secondary: '#FFFFFF',
    },
    logo: null,
    venue: 'Indoor Sports Center',
    organizationId: 'org-2',
  },
}

export const testPlayers = {
  player1: {
    id: 'player-1',
    firstName: 'João',
    lastName: 'Silva',
    jerseyNumber: 10,
    position: 'midfielder',
    teamId: 'team-1',
    birthDate: '1995-03-15',
    nationality: 'Brazil',
  },
  player2: {
    id: 'player-2',
    firstName: 'Maria',
    lastName: 'Garcia',
    jerseyNumber: 9,
    position: 'forward',
    teamId: 'team-1',
    birthDate: '1998-07-22',
    nationality: 'Spain',
  },
  player3: {
    id: 'player-3',
    firstName: 'David',
    lastName: 'Johnson',
    jerseyNumber: 1,
    position: 'goalkeeper',
    teamId: 'team-2',
    birthDate: '1992-11-08',
    nationality: 'United States',
  },
}

export const testTournaments = {
  summerLeague: {
    id: 'tournament-1',
    name: 'Summer Football League 2024',
    description: 'Annual summer football competition',
    format: 'league',
    sport: 'football',
    startDate: '2024-06-01',
    endDate: '2024-08-31',
    organizationId: 'org-1',
    maxTeams: 16,
    isActive: true,
  },
  futsalCup: {
    id: 'tournament-2',
    name: 'Futsal Championship Cup',
    description: 'Knockout futsal tournament',
    format: 'knockout',
    sport: 'futsal',
    startDate: '2024-09-15',
    endDate: '2024-10-15',
    organizationId: 'org-2',
    maxTeams: 8,
    isActive: true,
  },
}

export const testMatches = {
  match1: {
    id: 'match-1',
    homeTeamId: 'team-1',
    awayTeamId: 'team-2',
    tournamentId: 'tournament-1',
    scheduledDate: '2024-06-15T15:00:00Z',
    venue: 'Thunder Stadium',
    status: 'scheduled',
    homeScore: null,
    awayScore: null,
  },
  match2: {
    id: 'match-2',
    homeTeamId: 'team-3',
    awayTeamId: 'team-1', // Cross-sport for testing
    tournamentId: 'tournament-2',
    scheduledDate: '2024-09-20T18:00:00Z',
    venue: 'Indoor Sports Center',
    status: 'scheduled',
    homeScore: null,
    awayScore: null,
  },
}

export const invalidTestData = {
  invalidEmail: 'not-an-email',
  shortPassword: '123',
  longPassword: 'a'.repeat(129),
  invalidDate: '2024-13-45',
  negativeNumber: -1,
  emptyString: '',
  whitespaceOnly: '   ',
  specialChars: '!@#$%^&*()',
}

export const formValidationMessages = {
  required: /required|this field is required/i,
  invalidEmail: /invalid email|enter a valid email/i,
  passwordTooShort: /password must be at least 8 characters/i,
  passwordsDoNotMatch: /passwords do not match/i,
  invalidDate: /invalid date/i,
  numberTooLow: /must be greater than/i,
  numberTooHigh: /must be less than/i,
}
