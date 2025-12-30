-- Set default values for ELO system
UPDATE profiles SET elo_rating = 1200 WHERE elo_rating IS NULL;
UPDATE profiles SET games_rated = 0 WHERE games_rated IS NULL;

ALTER TABLE profiles ALTER COLUMN elo_rating SET DEFAULT 1200;
ALTER TABLE profiles ALTER COLUMN games_rated SET DEFAULT 0;
