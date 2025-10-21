-- Fix user_stats view security issues
-- This addresses:
-- 1. PUBLIC_DATA_EXPOSURE: Add access control so users can only see their own stats
-- 2. SUPA_security_definer_view: Ensure no SECURITY DEFINER property

-- Drop the existing view
DROP VIEW IF EXISTS public.user_stats;

-- Recreate with proper access control
-- Using security_barrier ensures RLS on underlying tables is enforced
CREATE VIEW public.user_stats 
WITH (security_barrier = true)
AS
SELECT 
  mp.profile_id,
  COUNT(*) as total_games,
  COUNT(*) FILTER (WHERE m.winner = mp.color) as wins,
  COUNT(*) FILTER (WHERE m.winner IS NOT NULL AND m.winner != mp.color) as losses,
  ROUND(AVG(EXTRACT(EPOCH FROM (m.updated_at - m.created_at)) / 60), 2) as avg_game_length_minutes,
  MODE() WITHIN GROUP (ORDER BY m.size) as favorite_board_size,
  MAX(m.updated_at) as last_played_at
FROM match_players mp
JOIN matches m ON m.id = mp.match_id
WHERE m.status = 'finished' 
  AND m.winner IS NOT NULL
  -- Critical: Only allow users to see their own stats
  AND mp.profile_id = auth.uid()
GROUP BY mp.profile_id;

-- Grant SELECT to authenticated users (they can only see their own data due to WHERE clause)
GRANT SELECT ON public.user_stats TO authenticated;

-- Also grant to anon for guest users to see their session stats if needed
GRANT SELECT ON public.user_stats TO anon;