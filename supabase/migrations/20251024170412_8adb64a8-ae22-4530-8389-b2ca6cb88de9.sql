-- Fix user_stats view to allow viewing all users' stats
-- Stats are public leaderboard data, not sensitive PII
DROP VIEW IF EXISTS public.user_stats;

CREATE VIEW public.user_stats 
WITH (security_barrier = true)
AS
SELECT 
  mp.profile_id,
  COUNT(*) as total_games,
  COUNT(*) FILTER (WHERE m.winner = mp.color) as wins,
  COUNT(*) FILTER (WHERE m.winner IS NOT NULL AND m.winner != mp.color) as losses,
  ROUND(AVG(EXTRACT(epoch FROM (m.updated_at - m.created_at)) / 60), 2) as avg_game_length_minutes,
  MODE() WITHIN GROUP (ORDER BY m.size) as favorite_board_size,
  MAX(m.updated_at) as last_played_at
FROM match_players mp
JOIN matches m ON m.id = mp.match_id
WHERE m.status = 'finished' AND m.winner IS NOT NULL
GROUP BY mp.profile_id;

-- Grant SELECT to authenticated users (stats are public for leaderboards/profiles)
GRANT SELECT ON public.user_stats TO authenticated;
GRANT SELECT ON public.user_stats TO anon;