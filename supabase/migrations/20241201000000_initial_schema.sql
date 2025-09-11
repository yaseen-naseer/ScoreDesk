-- ScoreDesk Initial Database Schema
-- This migration creates all core tables for the ScoreDesk application

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types/enums
CREATE TYPE user_role AS ENUM (
  'owner',
  'admin', 
  'manager',
  'referee',
  'stats_operator',
  'viewer'
);

CREATE TYPE sport_type AS ENUM (
  'football',
  'futsal'
);

CREATE TYPE tournament_format AS ENUM (
  'league',
  'group',
  'knockout',
  'standalone'
);

CREATE TYPE match_status AS ENUM (
  'scheduled',
  'live',
  'paused',
  'completed',
  'cancelled',
  'postponed'
);

CREATE TYPE player_position AS ENUM (
  'goalkeeper',
  'defender',
  'midfielder',
  'forward'
);

CREATE TYPE lineup_status AS ENUM (
  'starting',
  'substitute',
  'bench'
);

CREATE TYPE event_type AS ENUM (
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
);

CREATE TYPE audit_action AS ENUM (
  'create',
  'update',
  'delete',
  'login',
  'logout',
  'invite',
  'join',
  'leave',
  'start_match',
  'end_match',
  'pause_match',
  'resume_match',
  'add_event',
  'update_stats'
);

-- 1. Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  logo_url TEXT,
  country VARCHAR(100),
  website TEXT,
  timezone VARCHAR(50) DEFAULT 'UTC',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. User profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  full_name VARCHAR(255) GENERATED ALWAYS AS (COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) STORED,
  avatar_url TEXT,
  date_of_birth DATE,
  nationality VARCHAR(3),
  phone VARCHAR(50),
  language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50),
  preferences JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Organization memberships table
CREATE TABLE organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  invitation_expires_at TIMESTAMPTZ,
  invitation_token TEXT,
  invited_by UUID REFERENCES user_profiles(id),
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- 4. Teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(50),
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#000000',
  secondary_color VARCHAR(7) DEFAULT '#FFFFFF',
  founded_year INTEGER,
  venue VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  full_name VARCHAR(255) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  jersey_number INTEGER,
  birth_date DATE,
  nationality VARCHAR(3),
  position player_position,
  height INTEGER, -- in cm
  weight INTEGER, -- in kg
  photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Tournaments table
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sport sport_type NOT NULL,
  format tournament_format NOT NULL,
  start_date DATE,
  end_date DATE,
  registration_deadline TIMESTAMPTZ,
  max_teams INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Tournament groups table
CREATE TABLE tournament_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  display_order INTEGER DEFAULT 0,
  advance_teams INTEGER DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Tournament teams table
CREATE TABLE tournament_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  group_id UUID REFERENCES tournament_groups(id) ON DELETE SET NULL,
  registration_date TIMESTAMPTZ DEFAULT now(),
  seed_number INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tournament_id, team_id)
);

-- 9. Matches table
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,
  home_team_id UUID REFERENCES teams(id) ON DELETE RESTRICT,
  away_team_id UUID REFERENCES teams(id) ON DELETE RESTRICT,
  venue VARCHAR(255),
  scheduled_date TIMESTAMPTZ NOT NULL,
  match_duration INTEGER DEFAULT 90, -- in minutes
  notes TEXT,
  referee_id UUID REFERENCES user_profiles(id),
  round_name VARCHAR(100),
  status match_status DEFAULT 'scheduled',
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (home_team_id != away_team_id)
);

-- 10. Match lineups table
CREATE TABLE match_lineups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  position player_position,
  jersey_number INTEGER NOT NULL,
  status lineup_status DEFAULT 'starting',
  is_captain BOOLEAN DEFAULT false,
  substituted_at INTEGER, -- minute
  substituted_by UUID REFERENCES players(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(match_id, team_id, player_id)
);

-- 11. Match events table
CREATE TABLE match_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  event_type event_type NOT NULL,
  minute INTEGER NOT NULL,
  second_minute INTEGER,
  description TEXT,
  assist_player_id UUID REFERENCES players(id),
  substituted_player_id UUID REFERENCES players(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Match statistics table
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
  passes_total INTEGER DEFAULT 0,
  pass_accuracy DECIMAL(5,2) DEFAULT 0.00,
  offside INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  goals_conceded INTEGER DEFAULT 0,
  tackles_successful INTEGER DEFAULT 0,
  tackles_total INTEGER DEFAULT 0,
  crosses_completed INTEGER DEFAULT 0,
  crosses_total INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(match_id, team_id)
);

-- 13. Tournament standings table
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
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tournament_id, team_id)
);

-- 14. Match sessions table (for real-time collaboration)
CREATE TABLE match_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  session_name VARCHAR(255) NOT NULL,
  created_by UUID REFERENCES user_profiles(id),
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 15. Match session participants table
CREATE TABLE match_session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES match_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  permissions JSONB DEFAULT '[]',
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_activity TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(session_id, user_id)
);

-- 16. Player statistics table
CREATE TABLE player_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  minutes_played INTEGER DEFAULT 0,
  passes_completed INTEGER DEFAULT 0,
  passes_total INTEGER DEFAULT 0,
  shots_total INTEGER DEFAULT 0,
  shots_on_target INTEGER DEFAULT 0,
  tackles_successful INTEGER DEFAULT 0,
  tackles_total INTEGER DEFAULT 0,
  fouls_committed INTEGER DEFAULT 0,
  fouls_suffered INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  goals_conceded INTEGER DEFAULT 0,
  rating DECIMAL(3,1), -- player rating out of 10
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(match_id, player_id)
);

-- 17. Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  resource_type VARCHAR(100) NOT NULL,
  resource_id UUID,
  action audit_action NOT NULL,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB DEFAULT '{}',
  user_id UUID REFERENCES user_profiles(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_organizations_name ON organizations(name);
CREATE INDEX idx_teams_organization_id ON teams(organization_id);
CREATE INDEX idx_teams_name ON teams(name);
CREATE INDEX idx_players_team_id ON players(team_id);
CREATE INDEX idx_players_jersey_number ON players(team_id, jersey_number);
CREATE INDEX idx_tournaments_organization_id ON tournaments(organization_id);
CREATE INDEX idx_tournaments_sport ON tournaments(sport);
CREATE INDEX idx_matches_tournament_id ON matches(tournament_id);
CREATE INDEX idx_matches_scheduled_date ON matches(scheduled_date);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_match_events_match_id ON match_events(match_id);
CREATE INDEX idx_match_events_event_time ON match_events(minute);
CREATE INDEX idx_match_lineups_match_id ON match_lineups(match_id);
CREATE INDEX idx_match_lineups_team_id ON match_lineups(team_id);
CREATE INDEX idx_match_statistics_match_id ON match_statistics(match_id);
CREATE INDEX idx_tournament_standings_tournament_id ON tournament_standings(tournament_id);
CREATE INDEX idx_tournament_standings_position ON tournament_standings(tournament_id, position);
CREATE INDEX idx_organization_memberships_org_user ON organization_memberships(organization_id, user_id);
CREATE INDEX idx_organization_memberships_user_id ON organization_memberships(user_id);
CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER set_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_organization_memberships_updated_at BEFORE UPDATE ON organization_memberships FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_players_updated_at BEFORE UPDATE ON players FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_tournaments_updated_at BEFORE UPDATE ON tournaments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_tournament_teams_updated_at BEFORE UPDATE ON tournament_teams FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_match_lineups_updated_at BEFORE UPDATE ON match_lineups FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_match_statistics_updated_at BEFORE UPDATE ON match_statistics FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_tournament_standings_updated_at BEFORE UPDATE ON tournament_standings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_player_statistics_updated_at BEFORE UPDATE ON player_statistics FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Add comments for documentation
COMMENT ON TABLE organizations IS 'Sports organizations using the ScoreDesk system';
COMMENT ON TABLE user_profiles IS 'User profile information linked to auth.users';
COMMENT ON TABLE organization_memberships IS 'User memberships in organizations with roles';
COMMENT ON TABLE teams IS 'Teams belonging to organizations';
COMMENT ON TABLE players IS 'Players belonging to teams';
COMMENT ON TABLE tournaments IS 'Tournaments organized by organizations';
COMMENT ON TABLE tournament_groups IS 'Groups within tournaments (for group stage format)';
COMMENT ON TABLE tournament_teams IS 'Teams registered in tournaments';
COMMENT ON TABLE matches IS 'Individual matches between teams';
COMMENT ON TABLE match_lineups IS 'Player lineups for specific matches';
COMMENT ON TABLE match_events IS 'Events that occur during matches (goals, cards, etc.)';
COMMENT ON TABLE match_statistics IS 'Statistical data for teams in matches';
COMMENT ON TABLE tournament_standings IS 'Standings/rankings for teams in tournaments';
COMMENT ON TABLE match_sessions IS 'Real-time collaboration sessions for matches';
COMMENT ON TABLE match_session_participants IS 'Users participating in match sessions';
COMMENT ON TABLE player_statistics IS 'Individual player performance in matches';
COMMENT ON TABLE audit_logs IS 'Audit trail for all system actions';
