/**
 * Database fixtures for testing
 * These represent the data structure that will be used in the actual database
 */

import type { UserRole } from '@/lib/auth/types'

export interface DatabaseUser {
  id: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface DatabaseOrganization {
  id: string
  name: string
  description?: string
  logo_url?: string
  website?: string
  country?: string
  timezone: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DatabaseOrganizationMembership {
  id: string
  user_id: string
  organization_id: string
  role: UserRole
  is_active: boolean
  joined_at: string
  invited_by?: string
  invitation_token?: string
  invitation_expires_at?: string
}

export interface DatabaseTournament {
  id: string
  organization_id: string
  name: string
  description?: string
  sport: 'football' | 'futsal'
  format: 'league' | 'knockout' | 'group'
  start_date: string
  end_date: string
  max_teams?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DatabaseTeam {
  id: string
  organization_id: string
  name: string
  short_name: string
  logo_url?: string
  primary_color: string
  secondary_color: string
  venue?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DatabasePlayer {
  id: string
  team_id: string
  first_name: string
  last_name: string
  full_name: string
  jersey_number: number
  position: 'goalkeeper' | 'defender' | 'midfielder' | 'forward'
  birth_date?: string
  nationality?: string
  height?: number
  weight?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DatabaseMatch {
  id: string
  tournament_id: string
  home_team_id: string
  away_team_id: string
  scheduled_date: string
  venue?: string
  status: 'scheduled' | 'live' | 'completed' | 'cancelled' | 'postponed'
  home_score?: number
  away_score?: number
  referee_id?: string
  stats_operator_id?: string
  created_at: string
  updated_at: string
}

export interface DatabaseMatchEvent {
  id: string
  match_id: string
  player_id?: string
  team_id: string
  event_type: 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'own_goal'
  minute: number
  description?: string
  created_at: string
}

export interface DatabaseMatchStatistics {
  id: string
  match_id: string
  team_id: string
  possession_percentage?: number
  shots_total?: number
  shots_on_target?: number
  corners?: number
  fouls?: number
  offside?: number
  passes_total?: number
  passes_completed?: number
  created_at: string
  updated_at: string
}

// Sample database fixtures
export const dbUsers: DatabaseUser[] = [
  {
    id: 'user-owner-1',
    email: 'owner@sampleleague.com',
    first_name: 'John',
    last_name: 'Owner',
    full_name: 'John Owner',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-admin-1',
    email: 'admin@sampleleague.com',
    first_name: 'Jane',
    last_name: 'Admin',
    full_name: 'Jane Admin',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
  {
    id: 'user-manager-1',
    email: 'manager@sampleleague.com',
    first_name: 'Mike',
    last_name: 'Manager',
    full_name: 'Mike Manager',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
  },
]

export const dbOrganizations: DatabaseOrganization[] = [
  {
    id: 'org-sample-league',
    name: 'Sample Football League',
    description: 'A professional football league',
    country: 'United States',
    timezone: 'America/New_York',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'org-futsal-club',
    name: 'Elite Futsal Club',
    description: 'Premier futsal organization',
    country: 'Spain',
    timezone: 'Europe/Madrid',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

export const dbOrganizationMemberships: DatabaseOrganizationMembership[] = [
  {
    id: 'membership-1',
    user_id: 'user-owner-1',
    organization_id: 'org-sample-league',
    role: 'owner',
    is_active: true,
    joined_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'membership-2',
    user_id: 'user-admin-1',
    organization_id: 'org-sample-league',
    role: 'admin',
    is_active: true,
    joined_at: '2024-01-02T00:00:00Z',
    invited_by: 'user-owner-1',
  },
  {
    id: 'membership-3',
    user_id: 'user-manager-1',
    organization_id: 'org-sample-league',
    role: 'manager',
    is_active: true,
    joined_at: '2024-01-03T00:00:00Z',
    invited_by: 'user-admin-1',
  },
]

export const dbTournaments: DatabaseTournament[] = [
  {
    id: 'tournament-summer-2024',
    organization_id: 'org-sample-league',
    name: 'Summer Football League 2024',
    description: 'Annual summer football competition',
    sport: 'football',
    format: 'league',
    start_date: '2024-06-01T00:00:00Z',
    end_date: '2024-08-31T23:59:59Z',
    max_teams: 16,
    is_active: true,
    created_at: '2024-05-01T00:00:00Z',
    updated_at: '2024-05-01T00:00:00Z',
  },
  {
    id: 'tournament-futsal-cup',
    organization_id: 'org-futsal-club',
    name: 'Futsal Championship Cup',
    description: 'Knockout futsal tournament',
    sport: 'futsal',
    format: 'knockout',
    start_date: '2024-09-01T00:00:00Z',
    end_date: '2024-09-30T23:59:59Z',
    max_teams: 8,
    is_active: true,
    created_at: '2024-08-01T00:00:00Z',
    updated_at: '2024-08-01T00:00:00Z',
  },
]

export const dbTeams: DatabaseTeam[] = [
  {
    id: 'team-thunder-bolts',
    organization_id: 'org-sample-league',
    name: 'Thunder Bolts',
    short_name: 'THB',
    primary_color: '#1E40AF',
    secondary_color: '#FFFFFF',
    venue: 'Thunder Stadium',
    is_active: true,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  },
  {
    id: 'team-lightning-strikes',
    organization_id: 'org-sample-league',
    name: 'Lightning Strikes',
    short_name: 'LGS',
    primary_color: '#DC2626',
    secondary_color: '#FBBF24',
    venue: 'Lightning Arena',
    is_active: true,
    created_at: '2024-01-16T00:00:00Z',
    updated_at: '2024-01-16T00:00:00Z',
  },
]

export const dbPlayers: DatabasePlayer[] = [
  {
    id: 'player-silva',
    team_id: 'team-thunder-bolts',
    first_name: 'João',
    last_name: 'Silva',
    full_name: 'João Silva',
    jersey_number: 10,
    position: 'midfielder',
    birth_date: '1995-03-15',
    nationality: 'Brazil',
    height: 175,
    weight: 70,
    is_active: true,
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z',
  },
  {
    id: 'player-garcia',
    team_id: 'team-thunder-bolts',
    first_name: 'Maria',
    last_name: 'Garcia',
    full_name: 'Maria Garcia',
    jersey_number: 9,
    position: 'forward',
    birth_date: '1998-07-22',
    nationality: 'Spain',
    height: 165,
    weight: 60,
    is_active: true,
    created_at: '2024-02-02T00:00:00Z',
    updated_at: '2024-02-02T00:00:00Z',
  },
  {
    id: 'player-johnson',
    team_id: 'team-lightning-strikes',
    first_name: 'David',
    last_name: 'Johnson',
    full_name: 'David Johnson',
    jersey_number: 1,
    position: 'goalkeeper',
    birth_date: '1992-11-08',
    nationality: 'United States',
    height: 185,
    weight: 80,
    is_active: true,
    created_at: '2024-02-03T00:00:00Z',
    updated_at: '2024-02-03T00:00:00Z',
  },
]

export const dbMatches: DatabaseMatch[] = [
  {
    id: 'match-1',
    tournament_id: 'tournament-summer-2024',
    home_team_id: 'team-thunder-bolts',
    away_team_id: 'team-lightning-strikes',
    scheduled_date: '2024-06-15T15:00:00Z',
    venue: 'Thunder Stadium',
    status: 'scheduled',
    created_at: '2024-05-15T00:00:00Z',
    updated_at: '2024-05-15T00:00:00Z',
  },
]

export const dbMatchEvents: DatabaseMatchEvent[] = [
  {
    id: 'event-1',
    match_id: 'match-1',
    player_id: 'player-silva',
    team_id: 'team-thunder-bolts',
    event_type: 'goal',
    minute: 25,
    description: 'Header from corner kick',
    created_at: '2024-06-15T15:25:00Z',
  },
]

export const dbMatchStatistics: DatabaseMatchStatistics[] = [
  {
    id: 'stats-1',
    match_id: 'match-1',
    team_id: 'team-thunder-bolts',
    possession_percentage: 65,
    shots_total: 12,
    shots_on_target: 8,
    corners: 5,
    fouls: 8,
    offside: 2,
    passes_total: 456,
    passes_completed: 389,
    created_at: '2024-06-15T17:00:00Z',
    updated_at: '2024-06-15T17:00:00Z',
  },
]
