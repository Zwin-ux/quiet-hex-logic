-- Bot ladder (Season 0) + fix draw compatibility.
-- Goals:
-- - Allow finished matches to be draws (winner NULL, result='draw')
-- - Add bot seasons/ratings/history for the Arena ladder
-- - Add a transactional, idempotent server-side processor for arena bot ratings

-- 1) Draw compatibility: old constraint required winner for all finished matches.
ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS finished_must_have_winner;

-- Finished matches must have either a winner OR an explicit draw result.
ALTER TABLE public.matches
  ADD CONSTRAINT finished_must_have_winner_or_draw
  CHECK (
    status <> 'finished'
    OR winner IS NOT NULL
    OR result = 'draw'
  );

-- 2) Seasons
CREATE TABLE IF NOT EXISTS public.bot_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enforce at most one active season.
CREATE UNIQUE INDEX IF NOT EXISTS bot_seasons_one_active
  ON public.bot_seasons (is_active)
  WHERE (is_active);

ALTER TABLE public.bot_seasons ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bot_seasons' AND policyname = 'bot_seasons_select'
  ) THEN
    CREATE POLICY bot_seasons_select ON public.bot_seasons
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bot_seasons' AND policyname = 'bot_seasons_service_write'
  ) THEN
    CREATE POLICY bot_seasons_service_write ON public.bot_seasons
      FOR ALL USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- 3) Ratings
CREATE TABLE IF NOT EXISTS public.bot_ratings (
  bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE NOT NULL,
  season_id UUID REFERENCES public.bot_seasons(id) ON DELETE CASCADE NOT NULL,
  game_key TEXT NOT NULL,
  elo_rating INTEGER NOT NULL DEFAULT 1200,
  games_rated INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (bot_id, season_id, game_key)
);

CREATE INDEX IF NOT EXISTS idx_bot_ratings_season_game_elo
  ON public.bot_ratings (season_id, game_key, elo_rating DESC);

ALTER TABLE public.bot_ratings ENABLE ROW LEVEL SECURITY;

-- Select: public bots (and owners for private/unlisted).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bot_ratings' AND policyname = 'bot_ratings_select'
  ) THEN
    CREATE POLICY bot_ratings_select ON public.bot_ratings
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.bots b
          WHERE b.id = bot_id
            AND (b.visibility = 'public' OR b.owner_profile_id = auth.uid())
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bot_ratings' AND policyname = 'bot_ratings_service_write'
  ) THEN
    CREATE POLICY bot_ratings_service_write ON public.bot_ratings
      FOR ALL USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- 4) Rating history
CREATE TABLE IF NOT EXISTS public.bot_rating_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE NOT NULL,
  season_id UUID REFERENCES public.bot_seasons(id) ON DELETE CASCADE NOT NULL,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  game_key TEXT NOT NULL,
  old_rating INTEGER NOT NULL,
  new_rating INTEGER NOT NULL,
  rating_change INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, game_key, bot_id)
);

CREATE INDEX IF NOT EXISTS idx_bot_rating_history_bot_created
  ON public.bot_rating_history (bot_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bot_rating_history_season_game_created
  ON public.bot_rating_history (season_id, game_key, created_at DESC);

ALTER TABLE public.bot_rating_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bot_rating_history' AND policyname = 'bot_rating_history_select'
  ) THEN
    CREATE POLICY bot_rating_history_select ON public.bot_rating_history
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.bots b
          WHERE b.id = bot_id
            AND (b.visibility = 'public' OR b.owner_profile_id = auth.uid())
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bot_rating_history' AND policyname = 'bot_rating_history_service_write'
  ) THEN
    CREATE POLICY bot_rating_history_service_write ON public.bot_rating_history
      FOR ALL USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- 5) Transactional processor for Arena bot ratings (idempotent).
-- Called from Edge Functions using the service role key.
CREATE OR REPLACE FUNCTION public.process_arena_bot_ratings(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m public.matches%ROWTYPE;
  bm public.bot_matches%ROWTYPE;
  season_id UUID;
  r1 INTEGER;
  r2 INTEGER;
  g1 INTEGER;
  g2 INTEGER;
  s1 NUMERIC;
  s2 NUMERIC;
  e1 NUMERIC;
  e2 NUMERIC;
  k1 NUMERIC;
  k2 NUMERIC;
  d1 INTEGER;
  d2 INTEGER;
  n1 INTEGER;
  n2 INTEGER;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- One processor per match (prevents rare concurrent double-processing).
  PERFORM pg_advisory_xact_lock(hashtext(p_match_id::text));

  SELECT * INTO m FROM public.matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'match_not_found');
  END IF;

  IF COALESCE(m.is_arena, false) <> true THEN
    RETURN jsonb_build_object('ok', true, 'skipped', 'not_arena');
  END IF;

  IF m.status <> 'finished' OR m.result IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'skipped', 'not_finished_or_no_result');
  END IF;

  SELECT * INTO bm FROM public.bot_matches WHERE match_id = p_match_id;
  IF NOT FOUND OR bm.p1_bot_id IS NULL OR bm.p2_bot_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bot_match_missing');
  END IF;

  -- Idempotency: if any history exists for this match+game, treat as processed.
  IF EXISTS (
    SELECT 1 FROM public.bot_rating_history h
    WHERE h.match_id = p_match_id AND h.game_key = m.game_key
    LIMIT 1
  ) THEN
    RETURN jsonb_build_object('ok', true, 'skipped', 'already_processed');
  END IF;

  -- Active season (create Season 0 if missing).
  SELECT id INTO season_id FROM public.bot_seasons WHERE is_active = true LIMIT 1;
  IF season_id IS NULL THEN
    INSERT INTO public.bot_seasons (name, is_active)
    VALUES ('Season 0', true)
    ON CONFLICT (name) DO UPDATE SET is_active = EXCLUDED.is_active
    RETURNING id INTO season_id;

    -- Ensure only one active season.
    UPDATE public.bot_seasons SET is_active = false WHERE id <> season_id AND is_active = true;
  END IF;

  -- Ensure rating rows exist.
  INSERT INTO public.bot_ratings (bot_id, season_id, game_key)
  VALUES (bm.p1_bot_id, season_id, m.game_key)
  ON CONFLICT (bot_id, season_id, game_key) DO NOTHING;

  INSERT INTO public.bot_ratings (bot_id, season_id, game_key)
  VALUES (bm.p2_bot_id, season_id, m.game_key)
  ON CONFLICT (bot_id, season_id, game_key) DO NOTHING;

  -- Lock current ratings.
  SELECT elo_rating, games_rated INTO r1, g1
  FROM public.bot_ratings
  WHERE bot_id = bm.p1_bot_id AND season_id = season_id AND game_key = m.game_key
  FOR UPDATE;

  SELECT elo_rating, games_rated INTO r2, g2
  FROM public.bot_ratings
  WHERE bot_id = bm.p2_bot_id AND season_id = season_id AND game_key = m.game_key
  FOR UPDATE;

  IF m.result = 'p1' THEN s1 := 1;
  ELSIF m.result = 'p2' THEN s1 := 0;
  ELSE s1 := 0.5;
  END IF;
  s2 := 1 - s1;

  e1 := 1 / (1 + power(10::numeric, ((r2 - r1)::numeric) / 400));
  e2 := 1 / (1 + power(10::numeric, ((r1 - r2)::numeric) / 400));

  k1 := greatest(16::numeric, 40::numeric - (least(g1, 30)::numeric * 0.8::numeric));
  k2 := greatest(16::numeric, 40::numeric - (least(g2, 30)::numeric * 0.8::numeric));

  d1 := round(k1 * (s1 - e1));
  d2 := round(k2 * (s2 - e2));

  n1 := greatest(100, r1 + d1);
  n2 := greatest(100, r2 + d2);

  UPDATE public.bot_ratings
  SET elo_rating = n1, games_rated = g1 + 1, updated_at = now()
  WHERE bot_id = bm.p1_bot_id AND season_id = season_id AND game_key = m.game_key;

  UPDATE public.bot_ratings
  SET elo_rating = n2, games_rated = g2 + 1, updated_at = now()
  WHERE bot_id = bm.p2_bot_id AND season_id = season_id AND game_key = m.game_key;

  INSERT INTO public.bot_rating_history (bot_id, season_id, match_id, game_key, old_rating, new_rating, rating_change)
  VALUES
    (bm.p1_bot_id, season_id, p_match_id, m.game_key, r1, n1, n1 - r1),
    (bm.p2_bot_id, season_id, p_match_id, m.game_key, r2, n2, n2 - r2);

  RETURN jsonb_build_object(
    'ok', true,
    'seasonId', season_id,
    'gameKey', m.game_key,
    'p1', jsonb_build_object('old', r1, 'new', n1, 'change', n1 - r1),
    'p2', jsonb_build_object('old', r2, 'new', n2, 'change', n2 - r2)
  );
END;
$$;

