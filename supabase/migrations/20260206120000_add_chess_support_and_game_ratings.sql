-- Add multi-game support (hex + chess) and per-game ratings

-- 1) Game identity on lobbies/matches
ALTER TABLE public.lobbies
  ADD COLUMN IF NOT EXISTS game_key TEXT NOT NULL DEFAULT 'hex';

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS game_key TEXT NOT NULL DEFAULT 'hex';

-- Result is stored separately from winner so we can represent draws (winner stays NULL for draws)
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS result TEXT;

-- 2) Moves: keep legacy `cell` for hex, add generic `move` payload for chess and future games
ALTER TABLE public.moves
  ADD COLUMN IF NOT EXISTS move JSONB;

ALTER TABLE public.moves
  ADD COLUMN IF NOT EXISTS notation TEXT;

-- 3) rating_history becomes per-game
ALTER TABLE public.rating_history
  ADD COLUMN IF NOT EXISTS game_key TEXT NOT NULL DEFAULT 'hex';

UPDATE public.rating_history
SET game_key = 'hex'
WHERE game_key IS NULL;

-- 4) Per-game ratings table
CREATE TABLE IF NOT EXISTS public.player_ratings (
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  game_key TEXT NOT NULL,
  elo_rating INTEGER NOT NULL DEFAULT 1200,
  games_rated INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (profile_id, game_key)
);

CREATE INDEX IF NOT EXISTS idx_player_ratings_game_elo ON public.player_ratings(game_key, elo_rating DESC);

-- Backfill existing profile ratings into hex rating rows
INSERT INTO public.player_ratings (profile_id, game_key, elo_rating, games_rated)
SELECT id, 'hex', COALESCE(elo_rating, 1200), COALESCE(games_rated, 0)
FROM public.profiles
ON CONFLICT (profile_id, game_key) DO NOTHING;

-- RLS
ALTER TABLE public.player_ratings ENABLE ROW LEVEL SECURITY;

-- Public leaderboard needs SELECT access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'player_ratings' AND policyname = 'player_ratings_select'
  ) THEN
    CREATE POLICY player_ratings_select ON public.player_ratings
      FOR SELECT USING (true);
  END IF;
END $$;

-- Only service role can write ratings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'player_ratings' AND policyname = 'player_ratings_service_write'
  ) THEN
    CREATE POLICY player_ratings_service_write ON public.player_ratings
      FOR ALL USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

