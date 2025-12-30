-- Add rating_change column to match_players
ALTER TABLE match_players 
ADD COLUMN rating_change INTEGER;

COMMENT ON COLUMN match_players.rating_change IS 'The amount of ELO gained or lost in this match';
