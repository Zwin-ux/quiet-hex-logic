-- Public Mod Registry (Workshop)
-- Publish/install mods via Supabase and allow server-enforced rules snapshots for online matches.

-- 1) Workshop tables
CREATE TABLE IF NOT EXISTS public.workshop_mods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manifest_id TEXT NOT NULL,
  game_key TEXT NOT NULL CHECK (game_key IN ('hex', 'chess', 'checkers', 'ttt', 'connect4')),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  description TEXT,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Latest effective rules for quick browsing. Canonical history lives in workshop_mod_versions.
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  latest_version_id UUID,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS workshop_mods_manifest_game_unique
  ON public.workshop_mods(manifest_id, game_key);
CREATE INDEX IF NOT EXISTS workshop_mods_published_created_idx
  ON public.workshop_mods(is_published, created_at DESC);
CREATE INDEX IF NOT EXISTS workshop_mods_game_created_idx
  ON public.workshop_mods(game_key, created_at DESC);

CREATE TABLE IF NOT EXISTS public.workshop_mod_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mod_id UUID NOT NULL REFERENCES public.workshop_mods(id) ON DELETE CASCADE,
  version TEXT NOT NULL CHECK (length(version) BETWEEN 1 AND 32),
  -- Stored for install/export back to .openboardmod.
  manifest JSONB NOT NULL,
  -- Rules snapshot used for online match enforcement.
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS workshop_mod_versions_unique
  ON public.workshop_mod_versions(mod_id, version);
CREATE INDEX IF NOT EXISTS workshop_mod_versions_mod_created_idx
  ON public.workshop_mod_versions(mod_id, created_at DESC);

-- Link workshop_mods.latest_version_id -> workshop_mod_versions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'workshop_mods'
      AND constraint_name = 'workshop_mods_latest_version_fkey'
  ) THEN
    ALTER TABLE public.workshop_mods
      ADD CONSTRAINT workshop_mods_latest_version_fkey
      FOREIGN KEY (latest_version_id) REFERENCES public.workshop_mod_versions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2) Match + lobby pointers for server-enforced modded games
ALTER TABLE public.lobbies
  ADD COLUMN IF NOT EXISTS mod_version_id UUID;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS mod_version_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'lobbies'
      AND constraint_name = 'lobbies_mod_version_fkey'
  ) THEN
    ALTER TABLE public.lobbies
      ADD CONSTRAINT lobbies_mod_version_fkey
      FOREIGN KEY (mod_version_id) REFERENCES public.workshop_mod_versions(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'matches'
      AND constraint_name = 'matches_mod_version_fkey'
  ) THEN
    ALTER TABLE public.matches
      ADD CONSTRAINT matches_mod_version_fkey
      FOREIGN KEY (mod_version_id) REFERENCES public.workshop_mod_versions(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.lobbies.mod_version_id IS 'Optional rules variant (Workshop mod version) for this lobby.';
COMMENT ON COLUMN public.matches.mod_version_id IS 'Optional Workshop mod version that produced matches.rules.';

-- 3) RLS policies
ALTER TABLE public.workshop_mods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_mod_versions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- workshop_mods
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workshop_mods' AND policyname = 'workshop_mods_select'
  ) THEN
    CREATE POLICY workshop_mods_select ON public.workshop_mods
      FOR SELECT USING (is_published = true OR author_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workshop_mods' AND policyname = 'workshop_mods_insert'
  ) THEN
    CREATE POLICY workshop_mods_insert ON public.workshop_mods
      FOR INSERT WITH CHECK (author_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workshop_mods' AND policyname = 'workshop_mods_update'
  ) THEN
    CREATE POLICY workshop_mods_update ON public.workshop_mods
      FOR UPDATE USING (author_id = auth.uid())
      WITH CHECK (author_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workshop_mods' AND policyname = 'workshop_mods_delete'
  ) THEN
    CREATE POLICY workshop_mods_delete ON public.workshop_mods
      FOR DELETE USING (author_id = auth.uid());
  END IF;

  -- workshop_mod_versions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workshop_mod_versions' AND policyname = 'workshop_mod_versions_select'
  ) THEN
    CREATE POLICY workshop_mod_versions_select ON public.workshop_mod_versions
      FOR SELECT USING (
        EXISTS (
          SELECT 1
          FROM public.workshop_mods m
          WHERE m.id = workshop_mod_versions.mod_id
            AND (m.is_published = true OR m.author_id = auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workshop_mod_versions' AND policyname = 'workshop_mod_versions_insert'
  ) THEN
    CREATE POLICY workshop_mod_versions_insert ON public.workshop_mod_versions
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.workshop_mods m
          WHERE m.id = workshop_mod_versions.mod_id
            AND m.author_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 4) Prevent clients from setting matches.rules directly.
-- Rules snapshots should come from server-known Workshop mod versions via edge functions (service role).
DROP POLICY IF EXISTS "matches_insert" ON public.matches;

CREATE POLICY "matches_insert" ON public.matches
FOR INSERT
WITH CHECK (
  (
    auth.uid() = owner
    AND rules IS NULL
    AND mod_version_id IS NULL
    AND (
      is_ranked IS NOT TRUE OR
      NOT public.is_anonymous_user(auth.uid())
    )
  )
  OR
  (
    auth.uid() IS NULL
    AND owner IS NULL
    AND ai_difficulty IS NOT NULL
    AND rules IS NULL
    AND mod_version_id IS NULL
  )
  OR
  (auth.role() = 'service_role')
);

COMMENT ON POLICY "matches_insert" ON public.matches IS
'Disallows clients from writing matches.rules/mod_version_id directly. Use edge functions (service role) to create modded matches. Guests can only create AI practice matches.';

