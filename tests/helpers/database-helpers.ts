/**
 * Database helper functions for testing
 */

import type {
  DatabaseUser,
  DatabaseOrganization,
  DatabaseOrganizationMembership,
  DatabaseTournament,
  DatabaseTeam,
  DatabasePlayer,
  DatabaseMatch,
  DatabaseMatchEvent,
  DatabaseMatchStatistics,
} from '../fixtures/database-fixtures'

/**
 * Helper to create test user data
 */
export function createTestUser(overrides: Partial<DatabaseUser> = {}): DatabaseUser {
  const now = new Date().toISOString()
  const id = `user-${Math.random().toString(36).substr(2, 9)}`
  
  return {
    id,
    email: `test-${id}@example.com`,
    first_name: 'Test',
    last_name: 'User',
    full_name: 'Test User',
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

/**
 * Helper to create test organization data
 */
export function createTestOrganization(overrides: Partial<DatabaseOrganization> = {}): DatabaseOrganization {
  const now = new Date().toISOString()
  const id = `org-${Math.random().toString(36).substr(2, 9)}`
  
  return {
    id,
    name: `Test Organization ${id}`,
    description: 'A test organization for testing purposes',
    country: 'United States',
    timezone: 'America/New_York',
    is_active: true,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

/**
 * Helper to create test organization membership
 */
export function createTestMembership(
  userId: string,
  organizationId: string,
  overrides: Partial<DatabaseOrganizationMembership> = {}
): DatabaseOrganizationMembership {
  const id = `membership-${Math.random().toString(36).substr(2, 9)}`
  
  return {
    id,
    user_id: userId,
    organization_id: organizationId,
    role: 'viewer',
    is_active: true,
    joined_at: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Helper to create test tournament data
 */
export function createTestTournament(
  organizationId: string,
  overrides: Partial<DatabaseTournament> = {}
): DatabaseTournament {
  const now = new Date().toISOString()
  const id = `tournament-${Math.random().toString(36).substr(2, 9)}`
  
  return {
    id,
    organization_id: organizationId,
    name: `Test Tournament ${id}`,
    description: 'A test tournament',
    sport: 'football',
    format: 'league',
    start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 1 month from now
    max_teams: 16,
    is_active: true,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

/**
 * Helper to create test team data
 */
export function createTestTeam(
  organizationId: string,
  overrides: Partial<DatabaseTeam> = {}
): DatabaseTeam {
  const now = new Date().toISOString()
  const id = `team-${Math.random().toString(36).substr(2, 9)}`
  const teamName = `Test Team ${id}`
  
  return {
    id,
    organization_id: organizationId,
    name: teamName,
    short_name: teamName.split(' ').map(word => word[0]).join('').toUpperCase(),
    primary_color: '#1E40AF',
    secondary_color: '#FFFFFF',
    venue: `${teamName} Stadium`,
    is_active: true,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

/**
 * Helper to create test player data
 */
export function createTestPlayer(
  teamId: string,
  overrides: Partial<DatabasePlayer> = {}
): DatabasePlayer {
  const now = new Date().toISOString()
  const id = `player-${Math.random().toString(36).substr(2, 9)}`
  const firstName = `Player${id.slice(-3)}`
  const lastName = 'Test'
  
  return {
    id,
    team_id: teamId,
    first_name: firstName,
    last_name: lastName,
    full_name: `${firstName} ${lastName}`,
    jersey_number: Math.floor(Math.random() * 99) + 1,
    position: 'midfielder',
    birth_date: '1995-01-01',
    nationality: 'Test Country',
    height: 175,
    weight: 70,
    is_active: true,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

/**
 * Helper to create test match data
 */
export function createTestMatch(
  tournamentId: string,
  homeTeamId: string,
  awayTeamId: string,
  overrides: Partial<DatabaseMatch> = {}
): DatabaseMatch {
  const now = new Date().toISOString()
  const id = `match-${Math.random().toString(36).substr(2, 9)}`
  
  return {
    id,
    tournament_id: tournamentId,
    home_team_id: homeTeamId,
    away_team_id: awayTeamId,
    scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    venue: 'Test Stadium',
    status: 'scheduled',
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

/**
 * Helper to create test match event data
 */
export function createTestMatchEvent(
  matchId: string,
  teamId: string,
  overrides: Partial<DatabaseMatchEvent> = {}
): DatabaseMatchEvent {
  const id = `event-${Math.random().toString(36).substr(2, 9)}`
  
  return {
    id,
    match_id: matchId,
    team_id: teamId,
    event_type: 'goal',
    minute: Math.floor(Math.random() * 90) + 1,
    description: 'Test goal event',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Helper to create test match statistics data
 */
export function createTestMatchStatistics(
  matchId: string,
  teamId: string,
  overrides: Partial<DatabaseMatchStatistics> = {}
): DatabaseMatchStatistics {
  const now = new Date().toISOString()
  const id = `stats-${Math.random().toString(36).substr(2, 9)}`
  
  return {
    id,
    match_id: matchId,
    team_id: teamId,
    possession_percentage: Math.floor(Math.random() * 40) + 30, // 30-70%
    shots_total: Math.floor(Math.random() * 20) + 5, // 5-25
    shots_on_target: Math.floor(Math.random() * 10) + 2, // 2-12
    corners: Math.floor(Math.random() * 10), // 0-10
    fouls: Math.floor(Math.random() * 15) + 5, // 5-20
    offside: Math.floor(Math.random() * 5), // 0-5
    passes_total: Math.floor(Math.random() * 300) + 200, // 200-500
    passes_completed: Math.floor(Math.random() * 200) + 150, // 150-350
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

/**
 * Helper to create a complete test organization with users, teams, and tournament
 */
export function createTestOrganizationSetup() {
  const organization = createTestOrganization()
  
  const owner = createTestUser({
    email: `owner@${organization.name.toLowerCase().replace(/\s+/g, '')}.com`,
    first_name: 'Organization',
    last_name: 'Owner',
    full_name: 'Organization Owner',
  })
  
  const admin = createTestUser({
    email: `admin@${organization.name.toLowerCase().replace(/\s+/g, '')}.com`,
    first_name: 'Organization',
    last_name: 'Admin',
    full_name: 'Organization Admin',
  })
  
  const ownerMembership = createTestMembership(owner.id, organization.id, {
    role: 'owner',
  })
  
  const adminMembership = createTestMembership(admin.id, organization.id, {
    role: 'admin',
    invited_by: owner.id,
  })
  
  const tournament = createTestTournament(organization.id)
  
  const homeTeam = createTestTeam(organization.id, {
    name: 'Home Team',
    short_name: 'HOME',
    primary_color: '#1E40AF',
  })
  
  const awayTeam = createTestTeam(organization.id, {
    name: 'Away Team',
    short_name: 'AWAY',
    primary_color: '#DC2626',
  })
  
  const homePlayers = Array.from({ length: 11 }, (_, index) => 
    createTestPlayer(homeTeam.id, {
      jersey_number: index + 1,
      position: index === 0 ? 'goalkeeper' : index < 4 ? 'defender' : index < 8 ? 'midfielder' : 'forward',
    })
  )
  
  const awayPlayers = Array.from({ length: 11 }, (_, index) => 
    createTestPlayer(awayTeam.id, {
      jersey_number: index + 1,
      position: index === 0 ? 'goalkeeper' : index < 4 ? 'defender' : index < 8 ? 'midfielder' : 'forward',
    })
  )
  
  const match = createTestMatch(tournament.id, homeTeam.id, awayTeam.id)
  
  return {
    organization,
    users: [owner, admin],
    memberships: [ownerMembership, adminMembership],
    tournament,
    teams: [homeTeam, awayTeam],
    players: [...homePlayers, ...awayPlayers],
    match,
  }
}

/**
 * Helper to validate database entity structure
 */
export function validateDatabaseEntity<T extends Record<string, any>>(
  entity: T,
  requiredFields: (keyof T)[]
): boolean {
  return requiredFields.every(field => entity[field] !== undefined && entity[field] !== null)
}

/**
 * Helper to sort entities by creation date
 */
export function sortByCreationDate<T extends { created_at: string }>(entities: T[]): T[] {
  return entities.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}

/**
 * Helper to filter active entities
 */
export function filterActiveEntities<T extends { is_active: boolean }>(entities: T[]): T[] {
  return entities.filter(entity => entity.is_active)
}

/**
 * Helper to generate realistic match statistics
 */
export function generateRealisticMatchStats(
  matchId: string,
  homeTeamId: string,
  awayTeamId: string
): [DatabaseMatchStatistics, DatabaseMatchStatistics] {
  const homeStats = createTestMatchStatistics(matchId, homeTeamId, {
    possession_percentage: 55,
    shots_total: 12,
    shots_on_target: 8,
    corners: 6,
    fouls: 10,
    offside: 3,
    passes_total: 456,
    passes_completed: 389,
  })
  
  const awayStats = createTestMatchStatistics(matchId, awayTeamId, {
    possession_percentage: 45,
    shots_total: 8,
    shots_on_target: 5,
    corners: 3,
    fouls: 12,
    offside: 2,
    passes_total: 378,
    passes_completed: 301,
  })
  
  return [homeStats, awayStats]
}
