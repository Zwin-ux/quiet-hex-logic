-- Add turn timer fields to matches table
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS turn_timer_seconds integer DEFAULT 45,
ADD COLUMN IF NOT EXISTS turn_started_at timestamp with time zone DEFAULT now();

-- Create index for efficient timeout queries
CREATE INDEX IF NOT EXISTS idx_matches_turn_timeout 
ON matches(status, turn_started_at) 
WHERE status = 'active';

-- Update turn_started_at whenever turn changes (via trigger)
CREATE OR REPLACE FUNCTION update_turn_started_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.turn IS DISTINCT FROM OLD.turn THEN
    NEW.turn_started_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE TRIGGER trigger_update_turn_started_at
BEFORE UPDATE ON matches
FOR EACH ROW
EXECUTE FUNCTION update_turn_started_at();

-- When creating a match from a lobby, copy the timer setting
-- This will be handled in the start-lobby-match edge function