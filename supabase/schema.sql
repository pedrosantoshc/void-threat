-- Void Threat Database Schema
-- Based on PRD.md specifications

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Games table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  moderator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  game_code VARCHAR(10) UNIQUE NOT NULL,
  game_url VARCHAR(255) UNIQUE NOT NULL,
  player_count INTEGER NOT NULL CHECK (player_count >= 5 AND player_count <= 75),
  game_mode VARCHAR(20) DEFAULT 'standard' CHECK (game_mode IN ('standard', 'custom')),
  custom_roles JSONB, -- { 'bioscanner': 2, 'alien': 3, ... }
  status VARCHAR(20) DEFAULT 'setup' CHECK (status IN ('setup', 'playing', 'ended')),
  current_phase VARCHAR(20) CHECK (current_phase IN ('night1', 'night2plus', 'day1', 'day2plus')),
  night_number INTEGER DEFAULT 0,
  day_number INTEGER DEFAULT 0,
  winner VARCHAR(20) CHECK (winner IN ('crew', 'aliens', 'rogue_alien', 'predator')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for games
CREATE INDEX idx_games_moderator ON games(moderator_id);
CREATE INDEX idx_games_code ON games(game_code);
CREATE INDEX idx_games_url ON games(game_url);
CREATE INDEX idx_games_status ON games(status);

-- Game players table
CREATE TABLE game_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  username VARCHAR(100) NOT NULL,
  role VARCHAR(50),
  team VARCHAR(20) CHECK (team IN ('crew', 'alien', 'independent')),
  is_alive BOOLEAN DEFAULT TRUE,
  eliminated_by VARCHAR(20) CHECK (eliminated_by IN ('night', 'day')),
  eliminated_at TIMESTAMPTZ,
  position_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, user_id),
  UNIQUE(game_id, position_order)
);

-- Indexes for game_players
CREATE INDEX idx_game_players_game ON game_players(game_id);
CREATE INDEX idx_game_players_role ON game_players(role);
CREATE INDEX idx_game_players_team ON game_players(team);
CREATE INDEX idx_game_players_alive ON game_players(is_alive);

-- Night actions table
CREATE TABLE night_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  night_number INTEGER NOT NULL,
  role VARCHAR(50) NOT NULL,
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('scan', 'protect', 'link', 'silence', 'kill', 'heal', 'hunt', 'choose_action')),
  actor_id UUID REFERENCES game_players(id) ON DELETE SET NULL,
  target_id UUID REFERENCES game_players(id) ON DELETE SET NULL,
  target_ids UUID[], -- For multiple kills
  result VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for night_actions
CREATE INDEX idx_night_actions_game ON night_actions(game_id);
CREATE INDEX idx_night_actions_night ON night_actions(night_number);
CREATE INDEX idx_night_actions_role ON night_actions(role);

-- Day eliminations table
CREATE TABLE day_eliminations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  eliminated_player_id UUID REFERENCES game_players(id) ON DELETE SET NULL,
  reason VARCHAR(50) CHECK (reason IN ('vote', 'tragic_hero', 'link')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for day_eliminations
CREATE INDEX idx_day_eliminations_game ON day_eliminations(game_id);
CREATE INDEX idx_day_eliminations_day ON day_eliminations(day_number);

-- Tragic Hero kills table (separate tracking)
CREATE TABLE tragic_hero_kills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  tragic_hero_id UUID REFERENCES game_players(id) ON DELETE SET NULL,
  victim_id UUID REFERENCES game_players(id) ON DELETE SET NULL,
  killed_at_phase VARCHAR(20) CHECK (killed_at_phase IN ('day', 'night')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for tragic_hero_kills
CREATE INDEX idx_tragic_hero_kills_game ON tragic_hero_kills(game_id);

-- Links table (Cupid, Clone, Parasyte)
CREATE TABLE links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  link_type VARCHAR(50) NOT NULL CHECK (link_type IN ('cupid', 'clone', 'parasyte')),
  player1_id UUID REFERENCES game_players(id) ON DELETE SET NULL,
  player2_id UUID REFERENCES game_players(id) ON DELETE SET NULL, -- NULL for Clone target selection
  is_active BOOLEAN DEFAULT TRUE,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for links
CREATE INDEX idx_links_game ON links(game_id);
CREATE INDEX idx_links_type ON links(link_type);
CREATE INDEX idx_links_active ON links(is_active);

-- Amulets table
CREATE TABLE amulets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  amulet_type VARCHAR(50) NOT NULL CHECK (amulet_type IN ('shielding_device', 'resonance_tracker', 'neural_implant', 'bio_scanner', 'echo_beacon')),
  current_holder_id UUID REFERENCES game_players(id) ON DELETE SET NULL,
  previous_holder_id UUID REFERENCES game_players(id) ON DELETE SET NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  trigger_elimination_count INTEGER, -- For mid-game triggers
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for amulets
CREATE INDEX idx_amulets_game ON amulets(game_id);
CREATE INDEX idx_amulets_type ON amulets(amulet_type);
CREATE INDEX idx_amulets_holder ON amulets(current_holder_id);

-- Game logs table (for replay/history)
CREATE TABLE game_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('night_action', 'day_elimination', 'phase_change', 'link_triggered', 'transformation', 'tragic_hero_kill')),
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for game_logs
CREATE INDEX idx_game_logs_game ON game_logs(game_id);
CREATE INDEX idx_game_logs_type ON game_logs(event_type);
CREATE INDEX idx_game_logs_created ON game_logs(created_at);

-- User profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(100),
  avatar_icon VARCHAR(100), -- Icon name or emoji
  total_minutes_played INTEGER DEFAULT 0,
  total_games_played INTEGER DEFAULT 0,
  average_rounds_survived INTEGER DEFAULT 0,
  most_common_role VARCHAR(100), -- Most frequently assigned role
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for user_profiles
CREATE INDEX idx_user_profiles_username ON user_profiles(username);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE night_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_eliminations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tragic_hero_kills ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
ALTER TABLE amulets ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Games policies
CREATE POLICY "Users can view games they're in" ON games
  FOR SELECT USING (
    auth.uid() = moderator_id OR 
    id IN (SELECT game_id FROM game_players WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create games" ON games
  FOR INSERT WITH CHECK (auth.uid() = moderator_id);

CREATE POLICY "Moderators can update their games" ON games
  FOR UPDATE USING (auth.uid() = moderator_id);

-- Game players policies
CREATE POLICY "Users can view players in their games" ON game_players
  FOR SELECT USING (
    game_id IN (
      SELECT id FROM games WHERE moderator_id = auth.uid()
      UNION
      SELECT game_id FROM game_players WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join games" ON game_players
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR user_id IS NULL -- Allow guest players
  );

CREATE POLICY "Moderators can update players in their games" ON game_players
  FOR UPDATE USING (
    game_id IN (SELECT id FROM games WHERE moderator_id = auth.uid())
  );

-- Night actions policies (moderator only)
CREATE POLICY "Moderators can manage night actions" ON night_actions
  FOR ALL USING (
    game_id IN (SELECT id FROM games WHERE moderator_id = auth.uid())
  );

-- Day eliminations policies (moderator only)
CREATE POLICY "Moderators can manage day eliminations" ON day_eliminations
  FOR ALL USING (
    game_id IN (SELECT id FROM games WHERE moderator_id = auth.uid())
  );

-- Tragic hero kills policies (moderator only)
CREATE POLICY "Moderators can manage tragic hero kills" ON tragic_hero_kills
  FOR ALL USING (
    game_id IN (SELECT id FROM games WHERE moderator_id = auth.uid())
  );

-- Links policies
CREATE POLICY "Players can view links in their games" ON links
  FOR SELECT USING (
    game_id IN (
      SELECT id FROM games WHERE moderator_id = auth.uid()
      UNION
      SELECT game_id FROM game_players WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Moderators can manage links" ON links
  FOR ALL USING (
    game_id IN (SELECT id FROM games WHERE moderator_id = auth.uid())
  );

-- Amulets policies
CREATE POLICY "Players can view amulets in their games" ON amulets
  FOR SELECT USING (
    game_id IN (
      SELECT id FROM games WHERE moderator_id = auth.uid()
      UNION
      SELECT game_id FROM game_players WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Moderators can manage amulets" ON amulets
  FOR ALL USING (
    game_id IN (SELECT id FROM games WHERE moderator_id = auth.uid())
  );

-- Game logs policies (moderator only)
CREATE POLICY "Moderators can manage game logs" ON game_logs
  FOR ALL USING (
    game_id IN (SELECT id FROM games WHERE moderator_id = auth.uid())
  );

-- User profiles policies
CREATE POLICY "Users can view and update their own profile" ON user_profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Anyone can view public profile info" ON user_profiles
  FOR SELECT USING (true);

-- Functions for updating user stats
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user stats when a game ends
  IF NEW.status = 'ended' AND OLD.status != 'ended' THEN
    UPDATE user_profiles 
    SET 
      total_games_played = total_games_played + 1,
      updated_at = NOW()
    WHERE id = NEW.moderator_id;
    
    -- Update stats for all players in the game
    UPDATE user_profiles 
    SET 
      total_games_played = total_games_played + 1,
      updated_at = NOW()
    WHERE id IN (
      SELECT user_id FROM game_players 
      WHERE game_id = NEW.id AND user_id IS NOT NULL
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating user stats
CREATE TRIGGER update_user_stats_trigger
  AFTER UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats();

-- Function to generate unique game codes
CREATE OR REPLACE FUNCTION generate_game_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate VOID + 3 random chars
    code := 'VOID' || (
      SELECT string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', ceil(random() * 33)::integer, 1), '')
      FROM generate_series(1, 3)
    );
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM games WHERE game_code = code) INTO exists;
    
    -- Exit loop if unique
    IF NOT exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically generate game codes
CREATE OR REPLACE FUNCTION set_game_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.game_code IS NULL OR NEW.game_code = '' THEN
    NEW.game_code := generate_game_code();
    NEW.game_url := 'void.app/join/' || NEW.game_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_game_code_trigger
  BEFORE INSERT ON games
  FOR EACH ROW
  EXECUTE FUNCTION set_game_code();