# ScoreDesk - API Specification

## API Overview

The ScoreDesk API is built on Supabase's auto-generated REST API with custom PostgreSQL functions for complex operations. The API follows RESTful principles with real-time WebSocket subscriptions for live data updates.

## Authentication & Authorization

### 1. Authentication Flow
```typescript
// Supabase Auth Integration
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Login with email/password
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

// Get current session
const { data: { session } } = await supabase.auth.getSession()
```

### 2. JWT Token Structure
```json
{
  "aud": "authenticated",
  "exp": 1640995200,
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "authenticated",
  "app_metadata": {
    "provider": "email"
  },
  "user_metadata": {
    "organization_id": "org-uuid",
    "role": "admin"
  }
}
```

### 3. Row Level Security Context
```sql
-- Access user context in RLS policies
auth.uid() -- Current user ID
auth.jwt() ->> 'organization_id' -- Organization from JWT
```

## Core API Endpoints

### 1. Organizations

#### GET /organizations
```typescript
// List user's organizations
const { data: organizations } = await supabase
  .from('organizations')
  .select('*')
  .eq('is_active', true)
```

#### POST /organizations
```typescript
// Create new organization
const { data: organization } = await supabase
  .from('organizations')
  .insert({
    name: 'FC Barcelona',
    slug: 'fc-barcelona',
    contact_email: 'admin@fcbarcelona.com'
  })
  .select()
  .single()
```

#### PUT /organizations/:id
```typescript
// Update organization
const { data: organization } = await supabase
  .from('organizations')
  .update({ 
    name: 'Updated Name',
    updated_at: new Date().toISOString()
  })
  .eq('id', organizationId)
  .select()
  .single()
```

### 2. Teams

#### GET /teams
```typescript
// List teams with filters
const { data: teams } = await supabase
  .from('teams')
  .select(`
    *,
    players:players(count)
  `)
  .eq('organization_id', orgId)
  .eq('is_active', true)
  .order('name')
```

#### POST /teams
```typescript
// Create new team
const { data: team } = await supabase
  .from('teams')
  .insert({
    organization_id: orgId,
    name: 'Team Name',
    short_name: 'TN',
    primary_color: '#FF0000',
    created_by: userId
  })
  .select()
  .single()
```

### 3. Players

#### GET /players
```typescript
// List players with team info
const { data: players } = await supabase
  .from('players')
  .select(`
    *,
    team:teams(id, name, short_name)
  `)
  .eq('organization_id', orgId)
  .eq('is_active', true)
  .order('last_name', 'first_name')
```

#### POST /players
```typescript
// Create new player
const { data: player } = await supabase
  .from('players')
  .insert({
    organization_id: orgId,
    team_id: teamId,
    first_name: 'John',
    last_name: 'Doe',
    jersey_number: 10,
    position: 'midfielder',
    created_by: userId
  })
  .select()
  .single()
```

### 4. Tournaments

#### GET /tournaments
```typescript
// List tournaments with metadata
const { data: tournaments } = await supabase
  .from('tournaments')
  .select(`
    *,
    teams:tournament_teams(count),
    matches:matches(count)
  `)
  .eq('organization_id', orgId)
  .order('created_at', { ascending: false })
```

#### POST /tournaments
```typescript
// Create new tournament
const { data: tournament } = await supabase
  .from('tournaments')
  .insert({
    organization_id: orgId,
    name: 'Summer League 2024',
    game_format: 'football',
    tournament_type: 'league',
    start_date: '2024-06-01',
    end_date: '2024-08-31',
    created_by: userId
  })
  .select()
  .single()
```

### 5. Matches

#### GET /matches
```typescript
// List matches with team and tournament info
const { data: matches } = await supabase
  .from('matches')
  .select(`
    *,
    home_team:teams!home_team_id(id, name, short_name, logo_url),
    away_team:teams!away_team_id(id, name, short_name, logo_url),
    tournament:tournaments(id, name),
    referee:users(id, full_name)
  `)
  .eq('organization_id', orgId)
  .gte('scheduled_at', new Date().toISOString())
  .order('scheduled_at')
```

#### POST /matches
```typescript
// Create new match
const { data: match } = await supabase
  .from('matches')
  .insert({
    organization_id: orgId,
    tournament_id: tournamentId,
    home_team_id: homeTeamId,
    away_team_id: awayTeamId,
    scheduled_at: '2024-06-15T15:00:00Z',
    game_format: 'football',
    venue: 'Stadium Name',
    created_by: userId
  })
  .select()
  .single()
```

#### PUT /matches/:id/status
```typescript
// Update match status
const { data: match } = await supabase
  .from('matches')
  .update({ 
    status: 'live',
    actual_start_time: new Date().toISOString()
  })
  .eq('id', matchId)
  .select()
  .single()
```

### 6. Match Events

#### GET /match-events/:matchId
```typescript
// Get match events with player info
const { data: events } = await supabase
  .from('match_events')
  .select(`
    *,
    player:players(id, full_name, jersey_number),
    related_player:players!related_player_id(id, full_name, jersey_number),
    team:teams(id, name, short_name)
  `)
  .eq('match_id', matchId)
  .order('event_time', 'created_at')
```

#### POST /match-events
```typescript
// Record match event
const { data: event } = await supabase
  .from('match_events')
  .insert({
    match_id: matchId,
    team_id: teamId,
    player_id: playerId,
    event_type: 'goal',
    event_time: 25,
    stoppage_time: 0,
    period_number: 1,
    description: 'Header from corner',
    recorded_by: userId
  })
  .select()
  .single()
```

### 7. Match Statistics

#### GET /match-statistics/:matchId
```typescript
// Get match statistics
const { data: stats } = await supabase
  .from('match_statistics')
  .select(`
    *,
    team:teams(id, name, short_name)
  `)
  .eq('match_id', matchId)
```

#### PUT /match-statistics/:id
```typescript
// Update match statistics
const { data: stats } = await supabase
  .from('match_statistics')
  .update({
    possession_percentage: 65.5,
    shots_total: 12,
    shots_on_target: 8,
    updated_by: userId
  })
  .eq('id', statsId)
  .select()
  .single()
```

## Custom PostgreSQL Functions

### 1. Match Management Functions

#### start_match(match_id, user_id)
```sql
CREATE OR REPLACE FUNCTION start_match(
  p_match_id UUID,
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Update match status
  UPDATE matches 
  SET 
    status = 'live',
    actual_start_time = now(),
    updated_at = now()
  WHERE id = p_match_id;
  
  -- Create first period
  INSERT INTO match_periods (
    match_id,
    period_number,
    period_type,
    start_time
  ) VALUES (
    p_match_id,
    1,
    'first_half',
    now()
  );
  
  -- Return updated match
  SELECT row_to_json(m) INTO result
  FROM matches m
  WHERE m.id = p_match_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### end_match(match_id, user_id)
```sql
CREATE OR REPLACE FUNCTION end_match(
  p_match_id UUID,
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Update match status
  UPDATE matches 
  SET 
    status = 'completed',
    actual_end_time = now(),
    updated_at = now()
  WHERE id = p_match_id;
  
  -- End current period
  UPDATE match_periods
  SET end_time = now()
  WHERE match_id = p_match_id
    AND end_time IS NULL;
  
  -- Update tournament standings if applicable
  PERFORM update_tournament_standings(p_match_id);
  
  -- Return updated match
  SELECT row_to_json(m) INTO result
  FROM matches m
  WHERE m.id = p_match_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Tournament Functions

#### update_tournament_standings(match_id)
```sql
CREATE OR REPLACE FUNCTION update_tournament_standings(
  p_match_id UUID
) RETURNS VOID AS $$
DECLARE
  match_record RECORD;
  home_points INTEGER := 0;
  away_points INTEGER := 0;
BEGIN
  -- Get match details
  SELECT * INTO match_record
  FROM matches
  WHERE id = p_match_id;
  
  -- Calculate points
  IF match_record.home_score > match_record.away_score THEN
    home_points := 3;
    away_points := 0;
  ELSIF match_record.home_score < match_record.away_score THEN
    home_points := 0;
    away_points := 3;
  ELSE
    home_points := 1;
    away_points := 1;
  END IF;
  
  -- Update home team standings
  INSERT INTO tournament_standings (
    tournament_id, team_id, matches_played, wins, draws, losses,
    goals_for, goals_against, goal_difference, points
  ) VALUES (
    match_record.tournament_id,
    match_record.home_team_id,
    1,
    CASE WHEN home_points = 3 THEN 1 ELSE 0 END,
    CASE WHEN home_points = 1 THEN 1 ELSE 0 END,
    CASE WHEN home_points = 0 THEN 1 ELSE 0 END,
    match_record.home_score,
    match_record.away_score,
    match_record.home_score - match_record.away_score,
    home_points
  )
  ON CONFLICT (tournament_id, team_id) DO UPDATE SET
    matches_played = tournament_standings.matches_played + 1,
    wins = tournament_standings.wins + CASE WHEN home_points = 3 THEN 1 ELSE 0 END,
    draws = tournament_standings.draws + CASE WHEN home_points = 1 THEN 1 ELSE 0 END,
    losses = tournament_standings.losses + CASE WHEN home_points = 0 THEN 1 ELSE 0 END,
    goals_for = tournament_standings.goals_for + match_record.home_score,
    goals_against = tournament_standings.goals_against + match_record.away_score,
    goal_difference = tournament_standings.goal_difference + (match_record.home_score - match_record.away_score),
    points = tournament_standings.points + home_points,
    updated_at = now();
  
  -- Update away team standings (similar logic)
  -- ... (similar INSERT/UPDATE for away team)
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Statistics Functions

#### calculate_match_statistics(match_id)
```sql
CREATE OR REPLACE FUNCTION calculate_match_statistics(
  p_match_id UUID
) RETURNS TABLE(
  team_id UUID,
  goals INTEGER,
  shots_on_target INTEGER,
  shots_off_target INTEGER,
  corners INTEGER,
  fouls INTEGER,
  yellow_cards INTEGER,
  red_cards INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    me.team_id,
    COUNT(*) FILTER (WHERE me.event_type = 'goal')::INTEGER as goals,
    COUNT(*) FILTER (WHERE me.event_type = 'shot_on_target')::INTEGER as shots_on_target,
    COUNT(*) FILTER (WHERE me.event_type = 'shot_off_target')::INTEGER as shots_off_target,
    COUNT(*) FILTER (WHERE me.event_type = 'corner')::INTEGER as corners,
    COUNT(*) FILTER (WHERE me.event_type = 'foul')::INTEGER as fouls,
    COUNT(*) FILTER (WHERE me.event_type = 'yellow_card')::INTEGER as yellow_cards,
    COUNT(*) FILTER (WHERE me.event_type = 'red_card')::INTEGER as red_cards
  FROM match_events me
  WHERE me.match_id = p_match_id
  GROUP BY me.team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Real-time Subscriptions

### 1. Match Live Updates
```typescript
// Subscribe to match events
const matchSubscription = supabase
  .channel(`match:${matchId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'match_events',
    filter: `match_id=eq.${matchId}`
  }, (payload) => {
    console.log('Match event:', payload)
    // Update UI with new event
  })
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'matches',
    filter: `id=eq.${matchId}`
  }, (payload) => {
    console.log('Match updated:', payload)
    // Update match status in UI
  })
  .subscribe()
```

### 2. Tournament Standings Updates
```typescript
// Subscribe to standings changes
const standingsSubscription = supabase
  .channel(`tournament:${tournamentId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'tournament_standings',
    filter: `tournament_id=eq.${tournamentId}`
  }, (payload) => {
    console.log('Standings updated:', payload)
    // Refresh standings table
  })
  .subscribe()
```

### 3. User Presence
```typescript
// Track online users in match session
const presenceChannel = supabase.channel(`presence:match:${matchId}`)

presenceChannel
  .on('presence', { event: 'sync' }, () => {
    const state = presenceChannel.presenceState()
    console.log('Online users:', state)
  })
  .on('presence', { event: 'join' }, ({ key, newPresences }) => {
    console.log('User joined:', newPresences)
  })
  .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
    console.log('User left:', leftPresences)
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await presenceChannel.track({
        user_id: userId,
        role: userRole,
        joined_at: new Date().toISOString()
      })
    }
  })
```

## Error Handling

### 1. Standard Error Responses
```typescript
interface APIError {
  error: {
    message: string
    code?: string
    details?: any
  }
}

// Example error responses
{
  "error": {
    "message": "Insufficient permissions",
    "code": "FORBIDDEN",
    "details": "User does not have admin role"
  }
}
```

### 2. Error Handling Patterns
```typescript
// Centralized error handling
const handleSupabaseError = (error: any) => {
  if (error.code === 'PGRST301') {
    return 'Resource not found'
  }
  if (error.code === '42501') {
    return 'Insufficient permissions'
  }
  return error.message || 'An unexpected error occurred'
}

// Usage in API calls
try {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single()
  
  if (error) throw error
  return data
} catch (error) {
  throw new Error(handleSupabaseError(error))
}
```

## Rate Limiting

### 1. Supabase Rate Limits
- API requests: 1000 requests per minute per API key
- Real-time connections: 100 concurrent connections
- Database connections: 60 concurrent connections

### 2. Client-side Rate Limiting
```typescript
// Debounced API calls for real-time updates
import { debounce } from 'lodash'

const updateStatistics = debounce(async (matchId: string, stats: any) => {
  await supabase
    .from('match_statistics')
    .update(stats)
    .eq('match_id', matchId)
}, 1000) // Update at most once per second
```

## API Documentation

### 1. OpenAPI Specification
```yaml
openapi: 3.0.0
info:
  title: ScoreDesk API
  version: 1.0.0
  description: Football and Futsal Management System API

paths:
  /matches:
    get:
      summary: List matches
      parameters:
        - name: organization_id
          in: query
          required: true
          schema:
            type: string
            format: uuid
      responses:
        200:
          description: List of matches
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Match'
```

### 2. TypeScript Types
```typescript
// Generated types from Supabase
export interface Database {
  public: {
    Tables: {
      matches: {
        Row: {
          id: string
          organization_id: string
          tournament_id?: string
          home_team_id: string
          away_team_id: string
          scheduled_at: string
          status: 'scheduled' | 'live' | 'completed'
          // ... other fields
        }
        Insert: {
          // Insert type definition
        }
        Update: {
          // Update type definition
        }
      }
      // ... other tables
    }
  }
}
```
