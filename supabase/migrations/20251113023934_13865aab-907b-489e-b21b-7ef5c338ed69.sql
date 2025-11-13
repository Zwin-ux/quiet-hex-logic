-- Create tournament tables
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  format TEXT NOT NULL DEFAULT 'single_elimination' CHECK (format IN ('single_elimination', 'round_robin')),
  status TEXT NOT NULL DEFAULT 'registration' CHECK (status IN ('registration', 'seeding', 'active', 'completed', 'cancelled')),
  max_players INTEGER NOT NULL DEFAULT 8,
  min_players INTEGER NOT NULL DEFAULT 4,
  board_size INTEGER NOT NULL DEFAULT 11,
  pie_rule BOOLEAN NOT NULL DEFAULT true,
  turn_timer_seconds INTEGER DEFAULT 45,
  registration_deadline TIMESTAMPTZ,
  start_time TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT valid_player_count CHECK (max_players >= min_players AND max_players >= 2)
);

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active tournaments"
ON tournaments FOR SELECT
USING (status IN ('registration', 'active', 'completed'));

CREATE POLICY "Authenticated users can create tournaments"
ON tournaments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their tournaments"
ON tournaments FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete their tournaments"
ON tournaments FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- Tournament participants
CREATE TABLE tournament_participants (
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  seed INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'eliminated', 'withdrew')),
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT now(),
  
  PRIMARY KEY (tournament_id, player_id)
);

ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tournament participants"
ON tournament_participants FOR SELECT
USING (EXISTS (
  SELECT 1 FROM tournaments 
  WHERE id = tournament_id 
  AND status IN ('registration', 'active', 'completed')
));

CREATE POLICY "Players can join tournaments"
ON tournament_participants FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Players can update their own participation"
ON tournament_participants FOR UPDATE
TO authenticated
USING (auth.uid() = player_id);

CREATE POLICY "Players can leave tournaments"
ON tournament_participants FOR DELETE
TO authenticated
USING (auth.uid() = player_id);

-- Tournament rounds
CREATE TABLE tournament_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  round_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  UNIQUE (tournament_id, round_number)
);

ALTER TABLE tournament_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tournament rounds"
ON tournament_rounds FOR SELECT
USING (EXISTS (
  SELECT 1 FROM tournaments 
  WHERE id = tournament_id 
  AND status IN ('registration', 'active', 'completed')
));

-- Tournament bracket matches
CREATE TABLE tournament_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  round_id UUID REFERENCES tournament_rounds(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  player1_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  player2_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  winner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  bracket_position INTEGER,
  next_match_id UUID REFERENCES tournament_matches(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'active', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tournament matches"
ON tournament_matches FOR SELECT
USING (EXISTS (
  SELECT 1 FROM tournaments 
  WHERE id = tournament_id 
  AND status IN ('registration', 'active', 'completed')
));

-- Add tournament_id to matches table for easy lookup
ALTER TABLE matches ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL;

-- Create index for efficient tournament match queries
CREATE INDEX idx_tournament_matches_tournament ON tournament_matches(tournament_id);
CREATE INDEX idx_tournament_matches_status ON tournament_matches(status);
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_matches_tournament ON matches(tournament_id) WHERE tournament_id IS NOT NULL;