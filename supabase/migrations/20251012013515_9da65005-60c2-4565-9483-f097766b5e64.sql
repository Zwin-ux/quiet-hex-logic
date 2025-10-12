-- Create achievements table
CREATE TABLE public.achievements (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL,
  icon text NOT NULL,
  criteria jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create user_achievements table
CREATE TABLE public.user_achievements (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Anyone can view achievements
CREATE POLICY "achievements_select"
ON public.achievements
FOR SELECT
USING (true);

-- Users can view their own achievements
CREATE POLICY "user_achievements_select"
ON public.user_achievements
FOR SELECT
USING (auth.uid() = user_id);

-- System can insert achievements (via trigger)
CREATE POLICY "user_achievements_insert_service"
ON public.user_achievements
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Create function to check and award achievements
CREATE OR REPLACE FUNCTION public.check_and_award_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  player_record RECORD;
  achievement RECORD;
  user_stats RECORD;
BEGIN
  -- Only process finished matches
  IF NEW.status != 'finished' OR NEW.winner IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check achievements for each player
  FOR player_record IN 
    SELECT profile_id FROM match_players WHERE match_id = NEW.id
  LOOP
    -- Calculate user stats
    SELECT 
      COUNT(*) FILTER (WHERE m.winner = mp.color) as wins,
      COUNT(*) as total_games,
      COUNT(DISTINCT m.size) as different_board_sizes
    INTO user_stats
    FROM match_players mp
    JOIN matches m ON m.id = mp.match_id
    WHERE mp.profile_id = player_record.profile_id
      AND m.status = 'finished'
      AND m.winner IS NOT NULL;

    -- Check each achievement
    FOR achievement IN SELECT * FROM achievements
    LOOP
      -- Skip if already earned
      IF EXISTS (
        SELECT 1 FROM user_achievements 
        WHERE user_id = player_record.profile_id 
        AND achievement_id = achievement.id
      ) THEN
        CONTINUE;
      END IF;

      -- Check criteria
      IF achievement.criteria->>'type' = 'first_win' AND user_stats.wins >= 1 THEN
        INSERT INTO user_achievements (user_id, achievement_id) 
        VALUES (player_record.profile_id, achievement.id);
      ELSIF achievement.criteria->>'type' = 'win_streak' AND user_stats.wins >= (achievement.criteria->>'count')::int THEN
        INSERT INTO user_achievements (user_id, achievement_id) 
        VALUES (player_record.profile_id, achievement.id);
      ELSIF achievement.criteria->>'type' = 'games_played' AND user_stats.total_games >= (achievement.criteria->>'count')::int THEN
        INSERT INTO user_achievements (user_id, achievement_id) 
        VALUES (player_record.profile_id, achievement.id);
      ELSIF achievement.criteria->>'type' = 'board_explorer' AND user_stats.different_board_sizes >= (achievement.criteria->>'count')::int THEN
        INSERT INTO user_achievements (user_id, achievement_id) 
        VALUES (player_record.profile_id, achievement.id);
      END IF;
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger to award achievements
CREATE TRIGGER award_achievements_on_match_finish
AFTER UPDATE ON public.matches
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'finished')
EXECUTE FUNCTION public.check_and_award_achievements();

-- Insert initial achievements
INSERT INTO public.achievements (name, description, icon, criteria) VALUES
('First Victory', 'Win your first match', '🏆', '{"type": "first_win"}'),
('Dedicated Player', 'Complete 10 matches', '🎯', '{"type": "games_played", "count": 10}'),
('Veteran', 'Complete 50 matches', '⭐', '{"type": "games_played", "count": 50}'),
('Winning Streak', 'Win 5 matches', '🔥', '{"type": "win_streak", "count": 5}'),
('Champion', 'Win 20 matches', '👑', '{"type": "win_streak", "count": 20}'),
('Board Explorer', 'Play on 3 different board sizes', '🗺️', '{"type": "board_explorer", "count": 3}'),
('Hexpert', 'Play on all 4 board sizes', '💎', '{"type": "board_explorer", "count": 4}');

-- Create view for user stats
CREATE OR REPLACE VIEW public.user_stats AS
SELECT 
  mp.profile_id,
  COUNT(*) as total_games,
  COUNT(*) FILTER (WHERE m.winner = mp.color) as wins,
  COUNT(*) FILTER (WHERE m.winner IS NOT NULL AND m.winner != mp.color) as losses,
  ROUND(AVG(EXTRACT(EPOCH FROM (m.updated_at - m.created_at)) / 60)::numeric, 1) as avg_game_length_minutes,
  MODE() WITHIN GROUP (ORDER BY m.size) as favorite_board_size,
  MAX(m.updated_at) as last_played_at
FROM match_players mp
JOIN matches m ON m.id = mp.match_id
WHERE m.status = 'finished' AND m.winner IS NOT NULL
GROUP BY mp.profile_id;

-- Grant access to the view
GRANT SELECT ON public.user_stats TO authenticated;