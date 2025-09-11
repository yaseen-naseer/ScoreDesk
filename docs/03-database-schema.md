# ScoreDesk - Database Schema Design

## Schema Overview

The ScoreDesk database is designed for multi-tenancy, real-time collaboration, and comprehensive sports data management. The schema supports both football and futsal formats with flexible tournament structures.

## Core Design Principles

1. **Multi-Tenancy**: Organization-based data isolation using RLS
2. **Auditability**: Complete audit trail for all changes
3. **Flexibility**: Support for multiple game formats and tournament types
4. **Performance**: Optimized for real-time queries and updates
5. **Extensibility**: Easy to add new features and game formats

## Schema Structure

### 1. Organization and User Management

#### organizations
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  logo_url TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address JSONB,
  timezone VARCHAR(50) DEFAULT 'UTC',
  settings JSONB DEFAULT '{}',
  subscription_tier VARCHAR(50) DEFAULT 'basic',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  phone VARCHAR(50),
  preferred_language VARCHAR(10) DEFAULT 'en',
  theme_preference VARCHAR(20) DEFAULT 'system',
  last_seen_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### organization_memberships
```sql
CREATE TABLE organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'referee', 'stats_operator', 'viewer')),
  permissions JSONB DEFAULT '[]',
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);
```

### 2. Tournament Management

#### tournaments
```sql
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  game_format VARCHAR(20) NOT NULL CHECK (game_format IN ('football', 'futsal')),
  tournament_type VARCHAR(20) NOT NULL CHECK (tournament_type IN ('league', 'group', 'knockout', 'standalone')),
  start_date DATE,
  end_date DATE,
  registration_deadline TIMESTAMPTZ,
  max_teams INTEGER,
  min_teams INTEGER DEFAULT 2,
  entry_fee DECIMAL(10,2),
  prize_money DECIMAL(10,2),
  rules JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'registration', 'active', 'completed', 'cancelled')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### tournament_groups
```sql
CREATE TABLE tournament_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  display_order INTEGER DEFAULT 0,
  advance_teams INTEGER DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3. Team and Player Management

#### teams
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(50),
  logo_url TEXT,
  primary_color VARCHAR(7),
  secondary_color VARCHAR(7),
  founded_year INTEGER,
  home_venue VARCHAR(255),
  manager_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### players
```sql
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  full_name VARCHAR(255) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  jersey_number INTEGER,
  date_of_birth DATE,
  nationality VARCHAR(3),
  position VARCHAR(50),
  preferred_foot VARCHAR(10) CHECK (preferred_foot IN ('left', 'right', 'both')),
  height INTEGER, -- in cm
  weight INTEGER, -- in kg
  photo_url TEXT,
  medical_info JSONB DEFAULT '{}',
  emergency_contact JSONB DEFAULT '{}',
  registration_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### tournament_teams
```sql
CREATE TABLE tournament_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  group_id UUID REFERENCES tournament_groups(id) ON DELETE SET NULL,
  registration_date TIMESTAMPTZ DEFAULT now(),
  seed_number INTEGER,
  registration_fee_paid BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(tournament_id, team_id)
);
```

### 4. Match Management

#### matches
```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,
  home_team_id UUID REFERENCES teams(id) ON DELETE RESTRICT,
  away_team_id UUID REFERENCES teams(id) ON DELETE RESTRICT,
  venue VARCHAR(255),
  scheduled_at TIMESTAMPTZ NOT NULL,
  game_format VARCHAR(20) NOT NULL CHECK (game_format IN ('football', 'futsal')),
  match_type VARCHAR(20) DEFAULT 'regular' CHECK (match_type IN ('regular', 'playoff', 'final', 'friendly')),
  round_number INTEGER,
  round_name VARCHAR(100),
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'half_time', 'completed', 'postponed', 'cancelled')),
  referee_id UUID REFERENCES users(id),
  assistant_referees JSONB DEFAULT '[]',
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  home_score_penalties INTEGER,
  away_score_penalties INTEGER,
  match_duration_minutes INTEGER DEFAULT 90,
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  weather_conditions JSONB DEFAULT '{}',
  attendance INTEGER,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (home_team_id != away_team_id)
);
```

#### match_periods
```sql
CREATE TABLE match_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  period_number INTEGER NOT NULL,
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('first_half', 'second_half', 'extra_first', 'extra_second', 'penalties')),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  stoppage_time_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### match_lineups
```sql
CREATE TABLE match_lineups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  position VARCHAR(50) NOT NULL,
  jersey_number INTEGER NOT NULL,
  is_starter BOOLEAN DEFAULT true,
  is_captain BOOLEAN DEFAULT false,
  formation_position JSONB, -- x, y coordinates
  substituted_at INTEGER, -- minute
  substituted_by UUID REFERENCES players(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(match_id, team_id, player_id)
);
```

### 5. Match Events and Statistics

#### match_events
```sql
CREATE TABLE match_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'goal', 'assist', 'yellow_card', 'red_card', 'substitution',
    'foul', 'corner', 'shot_on_target', 'shot_off_target',
    'penalty_awarded', 'penalty_missed', 'offside'
  )),
  event_time INTEGER NOT NULL, -- minute
  stoppage_time INTEGER DEFAULT 0,
  period_number INTEGER DEFAULT 1,
  description TEXT,
  coordinates JSONB, -- field position
  related_player_id UUID REFERENCES players(id), -- for assists, substitutions
  metadata JSONB DEFAULT '{}',
  recorded_by UUID REFERENCES users(id),
  recorded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### match_statistics
```sql
CREATE TABLE match_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  possession_percentage DECIMAL(5,2) DEFAULT 0.00,
  shots_total INTEGER DEFAULT 0,
  shots_on_target INTEGER DEFAULT 0,
  shots_off_target INTEGER DEFAULT 0,
  corners INTEGER DEFAULT 0,
  fouls INTEGER DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  passes_completed INTEGER DEFAULT 0,
  passes_attempted INTEGER DEFAULT 0,
  pass_accuracy DECIMAL(5,2) DEFAULT 0.00,
  offsides INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(match_id, team_id)
);
```

### 6. Tournament Standings

#### tournament_standings
```sql
CREATE TABLE tournament_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  group_id UUID REFERENCES tournament_groups(id) ON DELETE SET NULL,
  position INTEGER,
  matches_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  goal_difference INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  form JSONB DEFAULT '[]', -- last 5 results
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tournament_id, team_id)
);
```

### 7. Real-time Match Control

#### match_sessions
```sql
CREATE TABLE match_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  session_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### match_session_participants
```sql
CREATE TABLE match_session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES match_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  permissions JSONB DEFAULT '[]',
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now(),
  is_online BOOLEAN DEFAULT true,
  UNIQUE(session_id, user_id)
);
```

### 8. Audit and Logging

#### audit_logs
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  user_id UUID REFERENCES users(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Indexes and Performance

### 1. Primary Indexes
```sql
-- Performance critical indexes
CREATE INDEX idx_matches_organization_id ON matches(organization_id);
CREATE INDEX idx_matches_scheduled_at ON matches(scheduled_at);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_match_events_match_id ON match_events(match_id);
CREATE INDEX idx_match_events_event_time ON match_events(event_time);
CREATE INDEX idx_players_team_id ON players(team_id);
CREATE INDEX idx_tournament_teams_tournament_id ON tournament_teams(tournament_id);
CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

### 2. Composite Indexes
```sql
-- Multi-column indexes for common queries
CREATE INDEX idx_match_events_match_team ON match_events(match_id, team_id);
CREATE INDEX idx_match_lineups_match_team ON match_lineups(match_id, team_id);
CREATE INDEX idx_organization_memberships_org_user ON organization_memberships(organization_id, user_id);
```

## Row Level Security (RLS) Policies

### 1. Organization-based Isolation
```sql
-- Users can only access their organization's data
CREATE POLICY "Users access own organization data" ON matches
FOR ALL TO authenticated
USING (organization_id IN (
  SELECT organization_id FROM organization_memberships 
  WHERE user_id = auth.uid() AND is_active = true
));
```

### 2. Role-based Permissions
```sql
-- Referees can update match status
CREATE POLICY "Referees can update matches" ON matches
FOR UPDATE TO authenticated
USING (
  referee_id = auth.uid() OR
  organization_id IN (
    SELECT organization_id FROM organization_memberships 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner') 
    AND is_active = true
  )
);
```

## Triggers and Functions

### 1. Audit Trigger
```sql
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    organization_id,
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    user_id
  ) VALUES (
    COALESCE(NEW.organization_id, OLD.organization_id),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Updated At Trigger
```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Real-time Subscriptions

### 1. Match Updates
```sql
-- Enable real-time for match-related tables
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE match_events;
ALTER PUBLICATION supabase_realtime ADD TABLE match_statistics;
ALTER PUBLICATION supabase_realtime ADD TABLE match_periods;
```

### 2. Filtered Subscriptions
```typescript
// Client-side subscription with filters
const matchSubscription = supabase
  .channel('match_updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'match_events',
    filter: `match_id=eq.${matchId}`
  }, handleMatchEvent)
  .subscribe();
```

## Data Migration Strategy

### 1. Version Control
- All schema changes tracked in migrations
- Rollback scripts for each migration
- Environment-specific configurations
- Data seeding for development

### 2. Migration Files Structure
```
supabase/migrations/
├── 20240101000000_initial_schema.sql
├── 20240101000001_add_audit_system.sql
├── 20240101000002_add_real_time_tables.sql
└── 20240101000003_add_rls_policies.sql
```

## Backup and Recovery

### 1. Backup Strategy
- Daily automated backups
- Point-in-time recovery capability
- Cross-region backup replication
- Backup verification procedures

### 2. Recovery Procedures
- Disaster recovery playbook
- RTO: 4 hours
- RPO: 1 hour
- Failover automation
