-- ================================================
-- SECURITY FIX 1: Restrict profiles visibility
-- Only allow viewing: own profile, friends, match opponents, lobby members
-- ================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;

-- Create a more restrictive SELECT policy
CREATE POLICY "profiles_select_restricted"
ON public.profiles
FOR SELECT
USING (
  -- Own profile
  auth.uid() = id
  OR
  -- Friends (accepted)
  EXISTS (
    SELECT 1 FROM public.friends
    WHERE status = 'accepted'
      AND ((a = auth.uid() AND b = profiles.id) OR (b = auth.uid() AND a = profiles.id))
  )
  OR
  -- Match opponents (past or current)
  EXISTS (
    SELECT 1 FROM public.match_players mp1
    JOIN public.match_players mp2 ON mp1.match_id = mp2.match_id
    WHERE mp1.profile_id = auth.uid() AND mp2.profile_id = profiles.id
  )
  OR
  -- Lobby members
  EXISTS (
    SELECT 1 FROM public.lobby_players lp1
    JOIN public.lobby_players lp2 ON lp1.lobby_id = lp2.lobby_id
    WHERE lp1.player_id = auth.uid() AND lp2.player_id = profiles.id
  )
  OR
  -- Leaderboard: allow viewing top 100 by ELO (for leaderboard page)
  EXISTS (
    SELECT 1 FROM (
      SELECT p.id FROM public.profiles p
      WHERE p.is_guest = false OR p.is_guest IS NULL
      ORDER BY p.elo_rating DESC NULLS LAST
      LIMIT 100
    ) top_players WHERE top_players.id = profiles.id
  )
);

-- ================================================
-- SECURITY FIX 2: Restrict rating_history visibility
-- Users can only view their own rating history
-- ================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view rating history" ON public.rating_history;

-- Create restrictive policy - users see only their own history
CREATE POLICY "Users can view own rating history"
ON public.rating_history
FOR SELECT
USING (auth.uid() = profile_id);

-- ================================================
-- SECURITY FIX 3: Fix check_move_rate_limit authorization bypass
-- Add check that _user_id matches authenticated user
-- ================================================

CREATE OR REPLACE FUNCTION public.check_move_rate_limit(_match_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_window TIMESTAMPTZ := NOW() - INTERVAL '1 second';
  recent_moves INTEGER;
BEGIN
  -- SECURITY: Verify the calling user matches the _user_id parameter
  IF _user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Cannot check rate limit for another user';
  END IF;

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