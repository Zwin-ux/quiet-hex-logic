-- Add timeout_limit to matches table (configurable per match, default 3)
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS timeout_limit INTEGER DEFAULT 3;

-- Add number_of_timeouts to match_players table (tracks each player's timeouts)
ALTER TABLE match_players
ADD COLUMN IF NOT EXISTS number_of_timeouts INTEGER DEFAULT 0;