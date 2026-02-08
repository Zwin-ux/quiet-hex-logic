-- Bot Arena MVP: bots + bot tokens + move request queue + arena match metadata
-- Also adds deterministic rules snapshots for matches.

-- 1) Matches: arena flag + rules snapshot
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS is_arena BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS rules JSONB;

COMMENT ON COLUMN public.matches.is_arena IS 'True for Bot Arena matches (always unranked, public spectate).';
COMMENT ON COLUMN public.matches.rules IS 'Snapshot of effective rules/variant for deterministic replays and server validation.';

-- 2) Bots registry (public metadata, tokens handled separately)
CREATE TABLE IF NOT EXISTS public.bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 64),
  game_key TEXT NOT NULL DEFAULT 'hex',
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'unlisted', 'public')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bots_owner_idx ON public.bots(owner_profile_id);
CREATE INDEX IF NOT EXISTS bots_game_visibility_idx ON public.bots(game_key, visibility);

ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bots' AND policyname = 'bots_select'
  ) THEN
    CREATE POLICY bots_select ON public.bots
      FOR SELECT USING (
        visibility = 'public' OR owner_profile_id = auth.uid()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bots' AND policyname = 'bots_insert'
  ) THEN
    CREATE POLICY bots_insert ON public.bots
      FOR INSERT WITH CHECK (owner_profile_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bots' AND policyname = 'bots_update'
  ) THEN
    CREATE POLICY bots_update ON public.bots
      FOR UPDATE USING (owner_profile_id = auth.uid())
      WITH CHECK (owner_profile_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bots' AND policyname = 'bots_delete'
  ) THEN
    CREATE POLICY bots_delete ON public.bots
      FOR DELETE USING (owner_profile_id = auth.uid());
  END IF;
END $$;

-- 3) Bot tokens (hash-only storage). Access via edge functions (service role).
CREATE TABLE IF NOT EXISTS public.bot_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS bot_tokens_hash_unique ON public.bot_tokens(token_hash);
CREATE INDEX IF NOT EXISTS bot_tokens_bot_idx ON public.bot_tokens(bot_id);

ALTER TABLE public.bot_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bot_tokens' AND policyname = 'bot_tokens_service_only'
  ) THEN
    CREATE POLICY bot_tokens_service_only ON public.bot_tokens
      FOR ALL USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- 4) Arena match metadata: maps a match to participating bots.
CREATE TABLE IF NOT EXISTS public.bot_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL UNIQUE REFERENCES public.matches(id) ON DELETE CASCADE,
  p1_bot_id UUID REFERENCES public.bots(id),
  p2_bot_id UUID REFERENCES public.bots(id),
  mode TEXT NOT NULL CHECK (mode IN ('bot-vs-bot', 'human-vs-bot')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bot_matches_p1_idx ON public.bot_matches(p1_bot_id);
CREATE INDEX IF NOT EXISTS bot_matches_p2_idx ON public.bot_matches(p2_bot_id);

ALTER TABLE public.bot_matches ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bot_matches' AND policyname = 'bot_matches_select_arena'
  ) THEN
    CREATE POLICY bot_matches_select_arena ON public.bot_matches
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND m.is_arena = true)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bot_matches' AND policyname = 'bot_matches_service_only'
  ) THEN
    CREATE POLICY bot_matches_service_only ON public.bot_matches
      FOR ALL USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- Allow spectators to view bot metadata when the bot is participating in an arena match.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bots' AND policyname = 'bots_select_arena_participant'
  ) THEN
    CREATE POLICY bots_select_arena_participant ON public.bots
      FOR SELECT USING (
        EXISTS (
          SELECT 1
          FROM public.bot_matches bm
          JOIN public.matches m ON m.id = bm.match_id
          WHERE m.is_arena = true
            AND (bm.p1_bot_id = public.bots.id OR bm.p2_bot_id = public.bots.id)
        )
      );
  END IF;
END $$;

-- 5) Bot move requests queue: bot runners claim work and submit moves.
CREATE TABLE IF NOT EXISTS public.bot_move_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  ply INTEGER NOT NULL,
  game_key TEXT NOT NULL,
  state JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'completed', 'expired', 'failed')),
  action_id UUID,
  claimed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bot_move_requests_bot_status_idx ON public.bot_move_requests(bot_id, status, created_at);
CREATE INDEX IF NOT EXISTS bot_move_requests_match_ply_idx ON public.bot_move_requests(match_id, ply);

ALTER TABLE public.bot_move_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bot_move_requests' AND policyname = 'bot_move_requests_service_only'
  ) THEN
    CREATE POLICY bot_move_requests_service_only ON public.bot_move_requests
      FOR ALL USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- 6) Public spectate access for arena matches and their moves.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'matches' AND policyname = 'matches_select_arena'
  ) THEN
    CREATE POLICY matches_select_arena ON public.matches
      FOR SELECT USING (is_arena = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'moves' AND policyname = 'moves_select_arena'
  ) THEN
    CREATE POLICY moves_select_arena ON public.moves
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND m.is_arena = true)
      );
  END IF;
END $$;
