-- Phase 1: Multiplayer hardening - Add idempotency and optimistic concurrency

-- Add version field to matches for optimistic concurrency control
ALTER TABLE matches ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0;

-- Add action_id to moves for idempotency (prevent duplicate moves)
ALTER TABLE moves ADD COLUMN IF NOT EXISTS action_id UUID;

-- Create unique index on (match_id, action_id) to prevent duplicate submissions
CREATE UNIQUE INDEX IF NOT EXISTS moves_match_action_unique ON moves(match_id, action_id) WHERE action_id IS NOT NULL;

-- Add index on version for faster concurrency checks
CREATE INDEX IF NOT EXISTS matches_version_idx ON matches(version);

-- Add rate limiting tracking table
CREATE TABLE IF NOT EXISTS move_rate_limits (
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  last_move_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  move_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (match_id, user_id)
);

CREATE INDEX IF NOT EXISTS move_rate_limits_window_idx ON move_rate_limits(window_start);

-- Function to check rate limit (4 moves per second per match, 10 per user globally)
CREATE OR REPLACE FUNCTION check_move_rate_limit(
  _match_id UUID,
  _user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_window TIMESTAMPTZ := NOW() - INTERVAL '1 second';
  recent_moves INTEGER;
BEGIN
  -- Check per-match rate (4 moves/sec)
  SELECT COUNT(*) INTO recent_moves
  FROM move_rate_limits
  WHERE match_id = _match_id
    AND window_start > current_window;
    
  IF recent_moves >= 4 THEN
    RETURN FALSE;
  END IF;
  
  -- Check per-user global rate (10 moves/sec)
  SELECT COUNT(*) INTO recent_moves
  FROM move_rate_limits
  WHERE user_id = _user_id
    AND window_start > current_window;
    
  IF recent_moves >= 10 THEN
    RETURN FALSE;
  END IF;
  
  -- Update or insert rate limit record
  INSERT INTO move_rate_limits (match_id, user_id, last_move_at, move_count, window_start)
  VALUES (_match_id, _user_id, NOW(), 1, NOW())
  ON CONFLICT (match_id, user_id)
  DO UPDATE SET
    last_move_at = NOW(),
    move_count = CASE 
      WHEN move_rate_limits.window_start < current_window THEN 1
      ELSE move_rate_limits.move_count + 1
    END,
    window_start = CASE
      WHEN move_rate_limits.window_start < current_window THEN NOW()
      ELSE move_rate_limits.window_start
    END;
  
  RETURN TRUE;
END;
$$;

-- Enable RLS on rate limits table
ALTER TABLE move_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can manage rate limits
CREATE POLICY move_rate_limits_service_only ON move_rate_limits
  FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE move_rate_limits IS 'Tracks move submission rates to prevent spam and race conditions';
COMMENT ON COLUMN moves.action_id IS 'Client-generated UUID for idempotency - prevents duplicate move submissions';
COMMENT ON COLUMN matches.version IS 'Optimistic concurrency control version - incremented on each state change';