-- Set default values for ELO system
UPDATE profiles SET elo_rating = 1200 WHERE elo_rating IS NULL;
UPDATE profiles SET games_rated = 0 WHERE games_rated IS NULL;

ALTER TABLE profiles ALTER COLUMN elo_rating SET DEFAULT 1200;
ALTER TABLE profiles ALTER COLUMN games_rated SET DEFAULT 0;

-- Add rating_change column to match_players
ALTER TABLE match_players ADD COLUMN rating_change INTEGER;

COMMENT ON COLUMN match_players.rating_change IS 'The amount of ELO gained or lost in this match';