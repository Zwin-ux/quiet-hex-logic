ALTER TABLE public.worlds
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS accent_color text,
  ADD COLUMN IF NOT EXISTS public_status text NOT NULL DEFAULT 'draft'
    CHECK (public_status IN ('draft', 'live'));

ALTER TABLE public.workshop_mods
  ALTER COLUMN author_id DROP NOT NULL;

ALTER TABLE public.workshop_mods
  ADD COLUMN IF NOT EXISTS world_id uuid REFERENCES public.worlds(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'public_registry'
    CHECK (scope IN ('official_global', 'public_registry', 'world_private')),
  ADD COLUMN IF NOT EXISTS is_official boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_rank integer,
  ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT 'hosted'
    CHECK (availability IN ('hosted', 'self_host', 'beta')),
  ADD COLUMN IF NOT EXISTS engine_mode text NOT NULL DEFAULT 'standard'
    CHECK (engine_mode IN ('standard', 'freestyle_chess', 'reverse_hex', 'international_draughts', 'popout')),
  ADD COLUMN IF NOT EXISTS validation_status text NOT NULL DEFAULT 'published'
    CHECK (validation_status IN ('draft', 'validating', 'published', 'rejected'));

ALTER TABLE public.workshop_mod_versions
  ADD COLUMN IF NOT EXISTS source_kind text NOT NULL DEFAULT 'package_upload'
    CHECK (source_kind IN ('official_seed', 'simple_editor', 'package_upload', 'engine_pack')),
  ADD COLUMN IF NOT EXISTS start_fen text,
  ADD COLUMN IF NOT EXISTS start_seed text,
  ADD COLUMN IF NOT EXISTS capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS validation_notes jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS mod_version_id uuid REFERENCES public.workshop_mod_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variant_seed text,
  ADD COLUMN IF NOT EXISTS registration_url text,
  ADD COLUMN IF NOT EXISTS access_type text NOT NULL DEFAULT 'public'
    CHECK (access_type IN ('public', 'world_members', 'access_code')),
  ADD COLUMN IF NOT EXISTS access_code_hash text;

CREATE INDEX IF NOT EXISTS workshop_mods_scope_world_game_idx
  ON public.workshop_mods(scope, world_id, game_key, created_at DESC);

CREATE INDEX IF NOT EXISTS workshop_mods_official_rank_idx
  ON public.workshop_mods(is_official, featured_rank);

CREATE INDEX IF NOT EXISTS tournaments_mod_version_idx
  ON public.tournaments(mod_version_id)
  WHERE mod_version_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS tournaments_access_type_idx
  ON public.tournaments(access_type);

DROP POLICY IF EXISTS workshop_mods_select ON public.workshop_mods;
CREATE POLICY workshop_mods_select ON public.workshop_mods
  FOR SELECT
  USING (
    (
      scope IN ('official_global', 'public_registry')
      AND is_published = true
    )
    OR author_id = auth.uid()
    OR (
      world_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.world_members wm
        WHERE wm.world_id = workshop_mods.world_id
          AND wm.profile_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS workshop_mods_insert ON public.workshop_mods;
CREATE POLICY workshop_mods_insert ON public.workshop_mods
  FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND (
      world_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.world_members wm
        WHERE wm.world_id = workshop_mods.world_id
          AND wm.profile_id = auth.uid()
          AND wm.role IN ('owner', 'admin')
      )
    )
  );

DROP POLICY IF EXISTS workshop_mods_update ON public.workshop_mods;
DROP POLICY IF EXISTS workshop_mods_update_moderator ON public.workshop_mods;
CREATE POLICY workshop_mods_update ON public.workshop_mods
  FOR UPDATE
  USING (
    author_id = auth.uid()
    OR has_role(auth.uid(), 'moderator'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (
      world_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.world_members wm
        WHERE wm.world_id = workshop_mods.world_id
          AND wm.profile_id = auth.uid()
          AND wm.role IN ('owner', 'admin')
      )
    )
  )
  WITH CHECK (
    author_id = auth.uid()
    OR has_role(auth.uid(), 'moderator'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (
      world_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.world_members wm
        WHERE wm.world_id = workshop_mods.world_id
          AND wm.profile_id = auth.uid()
          AND wm.role IN ('owner', 'admin')
      )
    )
  );

DROP POLICY IF EXISTS workshop_mods_delete ON public.workshop_mods;
CREATE POLICY workshop_mods_delete ON public.workshop_mods
  FOR DELETE
  USING (
    author_id = auth.uid()
    OR (
      world_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.world_members wm
        WHERE wm.world_id = workshop_mods.world_id
          AND wm.profile_id = auth.uid()
          AND wm.role IN ('owner', 'admin')
      )
    )
  );

DROP POLICY IF EXISTS workshop_mod_versions_select ON public.workshop_mod_versions;
CREATE POLICY workshop_mod_versions_select ON public.workshop_mod_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.workshop_mods m
      WHERE m.id = workshop_mod_versions.mod_id
        AND (
          ((m.scope IN ('official_global', 'public_registry')) AND m.is_published = true)
          OR m.author_id = auth.uid()
          OR (
            m.world_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.world_members wm
              WHERE wm.world_id = m.world_id
                AND wm.profile_id = auth.uid()
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS workshop_mod_versions_insert ON public.workshop_mod_versions;
CREATE POLICY workshop_mod_versions_insert ON public.workshop_mod_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workshop_mods m
      WHERE m.id = workshop_mod_versions.mod_id
        AND (
          m.author_id = auth.uid()
          OR (
            m.world_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.world_members wm
              WHERE wm.world_id = m.world_id
                AND wm.profile_id = auth.uid()
                AND wm.role IN ('owner', 'admin')
            )
          )
        )
    )
  );

CREATE OR REPLACE FUNCTION public.create_tournament_atomic(
  p_name text,
  p_description text DEFAULT NULL,
  p_game_key text DEFAULT 'hex',
  p_world_id uuid DEFAULT NULL,
  p_format text DEFAULT 'single_elimination',
  p_competitive_mode boolean DEFAULT false,
  p_max_players integer DEFAULT 8,
  p_min_players integer DEFAULT 4,
  p_board_size integer DEFAULT NULL,
  p_pie_rule boolean DEFAULT NULL,
  p_turn_timer_seconds integer DEFAULT 45,
  p_registration_deadline timestamptz DEFAULT NULL,
  p_start_time timestamptz DEFAULT NULL,
  p_mod_version_id uuid DEFAULT NULL,
  p_variant_seed text DEFAULT NULL,
  p_registration_url text DEFAULT NULL,
  p_access_type text DEFAULT 'public',
  p_access_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := public.require_permanent_account();
  v_game_key text := COALESCE(NULLIF(trim(p_game_key), ''), 'hex');
  v_defaults jsonb := public.game_defaults(v_game_key);
  v_format text := COALESCE(NULLIF(trim(p_format), ''), 'single_elimination');
  v_access_type text := COALESCE(NULLIF(trim(p_access_type), ''), 'public');
  v_tournament public.tournaments%ROWTYPE;
  v_variant_game_key text;
BEGIN
  IF NULLIF(trim(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'Tournament name is required';
  END IF;

  IF v_format NOT IN ('single_elimination', 'double_elimination', 'round_robin') THEN
    RAISE EXCEPTION 'Invalid tournament format';
  END IF;

  IF v_access_type NOT IN ('public', 'world_members', 'access_code') THEN
    RAISE EXCEPTION 'Invalid tournament access type';
  END IF;

  IF COALESCE(p_max_players, 0) < COALESCE(p_min_players, 0) OR COALESCE(p_min_players, 0) < 2 THEN
    RAISE EXCEPTION 'Invalid player count configuration';
  END IF;

  IF p_world_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.world_members wm
      WHERE wm.world_id = p_world_id
        AND wm.profile_id = v_user_id
        AND wm.role IN ('owner', 'admin')
    ) THEN
      RAISE EXCEPTION 'Only world organizers can create events inside this world';
    END IF;
  END IF;

  IF p_mod_version_id IS NOT NULL THEN
    SELECT m.game_key
    INTO v_variant_game_key
    FROM public.workshop_mod_versions mv
    JOIN public.workshop_mods m ON m.id = mv.mod_id
    WHERE mv.id = p_mod_version_id;

    IF v_variant_game_key IS NULL THEN
      RAISE EXCEPTION 'Variant not found';
    END IF;

    IF v_variant_game_key <> v_game_key THEN
      RAISE EXCEPTION 'Variant does not match tournament game';
    END IF;
  END IF;

  INSERT INTO public.tournaments (
    name,
    description,
    game_key,
    world_id,
    format,
    competitive_mode,
    max_players,
    min_players,
    board_size,
    pie_rule,
    turn_timer_seconds,
    registration_deadline,
    start_time,
    mod_version_id,
    variant_seed,
    registration_url,
    access_type,
    access_code_hash,
    created_by,
    status
  )
  VALUES (
    trim(p_name),
    NULLIF(trim(p_description), ''),
    v_game_key,
    p_world_id,
    v_format,
    COALESCE(p_competitive_mode, false),
    LEAST(GREATEST(p_max_players, 2), 128),
    LEAST(GREATEST(p_min_players, 2), 128),
    CASE
      WHEN v_game_key = 'hex' THEN LEAST(GREATEST(COALESCE(p_board_size, (v_defaults ->> 'board_size')::integer), 3), 19)
      ELSE (v_defaults ->> 'board_size')::integer
    END,
    CASE
      WHEN (v_defaults ->> 'pie_rule')::boolean THEN COALESCE(p_pie_rule, true)
      ELSE false
    END,
    LEAST(GREATEST(COALESCE(p_turn_timer_seconds, 45), 10), 600),
    p_registration_deadline,
    p_start_time,
    p_mod_version_id,
    NULLIF(trim(p_variant_seed), ''),
    NULLIF(trim(p_registration_url), ''),
    v_access_type,
    CASE
      WHEN v_access_type = 'access_code' AND NULLIF(trim(p_access_code), '') IS NOT NULL
        THEN encode(digest(trim(p_access_code), 'sha256'), 'hex')
      ELSE NULL
    END,
    v_user_id,
    'registration'
  )
  RETURNING * INTO v_tournament;

  INSERT INTO public.tournament_participants (
    tournament_id,
    player_id,
    seed,
    status
  )
  VALUES (
    v_tournament.id,
    v_user_id,
    1,
    'active'
  )
  ON CONFLICT (tournament_id, player_id) DO NOTHING;

  RETURN jsonb_build_object('tournament', to_jsonb(v_tournament));
END;
$$;

CREATE OR REPLACE FUNCTION public.join_tournament_atomic(
  p_tournament_id uuid,
  p_access_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := public.require_permanent_account();
  v_tournament public.tournaments%ROWTYPE;
  v_participant_count integer;
  v_private_world boolean := false;
  v_access_hash text := CASE
    WHEN NULLIF(trim(p_access_code), '') IS NOT NULL
      THEN encode(digest(trim(p_access_code), 'sha256'), 'hex')
    ELSE NULL
  END;
BEGIN
  SELECT *
  INTO v_tournament
  FROM public.tournaments
  WHERE id = p_tournament_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  IF v_tournament.status <> 'registration' THEN
    RAISE EXCEPTION 'Tournament registration is closed';
  END IF;

  IF v_tournament.registration_deadline IS NOT NULL
    AND now() > v_tournament.registration_deadline
  THEN
    RAISE EXCEPTION 'Registration deadline has passed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.tournament_participants tp
    WHERE tp.tournament_id = p_tournament_id
      AND tp.player_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'You have already joined this tournament';
  END IF;

  IF v_tournament.world_id IS NOT NULL THEN
    SELECT w.visibility = 'private'
    INTO v_private_world
    FROM public.worlds w
    WHERE w.id = v_tournament.world_id;

    IF v_private_world
      AND NOT EXISTS (
        SELECT 1
        FROM public.world_members wm
        WHERE wm.world_id = v_tournament.world_id
          AND wm.profile_id = v_user_id
      )
    THEN
      RAISE EXCEPTION 'Private world events are only available to members';
    END IF;
  END IF;

  IF v_tournament.access_type = 'world_members'
    AND (
      v_tournament.world_id IS NULL
      OR NOT EXISTS (
        SELECT 1
        FROM public.world_members wm
        WHERE wm.world_id = v_tournament.world_id
          AND wm.profile_id = v_user_id
      )
    )
  THEN
    RAISE EXCEPTION 'This event is only open to world members';
  END IF;

  IF v_tournament.access_type = 'access_code'
    AND (
      v_tournament.access_code_hash IS NULL
      OR v_access_hash IS NULL
      OR v_access_hash <> v_tournament.access_code_hash
    )
  THEN
    RAISE EXCEPTION 'Valid access code required';
  END IF;

  IF COALESCE(v_tournament.competitive_mode, false)
    AND NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = v_user_id
        AND p.is_verified_human IS TRUE
    )
  THEN
    RAISE EXCEPTION 'Competitive events require human verification';
  END IF;

  SELECT COUNT(*)::integer
  INTO v_participant_count
  FROM public.tournament_participants tp
  WHERE tp.tournament_id = p_tournament_id;

  IF v_participant_count >= v_tournament.max_players THEN
    RAISE EXCEPTION 'Tournament is full';
  END IF;

  INSERT INTO public.tournament_participants (
    tournament_id,
    player_id,
    status
  )
  VALUES (
    p_tournament_id,
    v_user_id,
    'active'
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

DO $$
DECLARE
  mod_hex_13 uuid := gen_random_uuid();
  ver_hex_13 uuid := gen_random_uuid();
  mod_hex_no_pie uuid := gen_random_uuid();
  ver_hex_no_pie uuid := gen_random_uuid();
  mod_checkers_chill uuid := gen_random_uuid();
  ver_checkers_chill uuid := gen_random_uuid();
  mod_connect4_blitz uuid := gen_random_uuid();
  ver_connect4_blitz uuid := gen_random_uuid();
  mod_chess_endgame uuid := gen_random_uuid();
  ver_chess_endgame uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.workshop_mods (
    id, manifest_id, game_key, name, description, author_id, rules, latest_version_id,
    is_featured, is_published, world_id, scope, is_official, featured_rank,
    availability, engine_mode, validation_status
  ) VALUES
    (
      mod_hex_13, 'official-hex-13x13', 'hex', '13x13 Championship',
      'Long-form Hex with the classic swap rule intact.', NULL,
      '{"boardSize":13,"pieRule":true}'::jsonb, NULL,
      true, true, NULL, 'official_global', true, 10, 'hosted', 'standard', 'published'
    ),
    (
      mod_hex_no_pie, 'official-hex-no-pie', 'hex', 'No Pie Classic',
      'Pure opening pressure. No color swap after move one.', NULL,
      '{"pieRule":false}'::jsonb, NULL,
      true, true, NULL, 'official_global', true, 20, 'hosted', 'standard', 'published'
    ),
    (
      mod_checkers_chill, 'official-checkers-chill', 'checkers', 'Chill Checkers',
      'No forced captures and a shorter no-capture draw window.', NULL,
      '{"mandatoryCapture":false,"draw":{"threefoldRepetition":true,"noCaptureHalfMoves":20}}'::jsonb, NULL,
      true, true, NULL, 'official_global', true, 30, 'hosted', 'standard', 'published'
    ),
    (
      mod_connect4_blitz, 'official-connect4-blitz', 'connect4', 'Connect 3 Blitz',
      'First to connect three. Fast, noisy, immediate.', NULL,
      '{"connect":3}'::jsonb, NULL,
      true, true, NULL, 'official_global', true, 40, 'hosted', 'standard', 'published'
    ),
    (
      mod_chess_endgame, 'official-chess-endgame-arena', 'chess', 'Endgame Arena',
      'Loads a stripped king-and-pawn endgame from the first move.', NULL,
      '{"startFen":"8/8/8/8/8/2k5/2P5/2K5 w - - 0 1"}'::jsonb, NULL,
      true, true, NULL, 'official_global', true, 50, 'hosted', 'standard', 'published'
    )
  ON CONFLICT (manifest_id, game_key) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        rules = EXCLUDED.rules,
        latest_version_id = NULL,
        is_featured = EXCLUDED.is_featured,
        is_published = EXCLUDED.is_published,
        scope = EXCLUDED.scope,
        is_official = EXCLUDED.is_official,
        featured_rank = EXCLUDED.featured_rank,
        availability = EXCLUDED.availability,
        engine_mode = EXCLUDED.engine_mode,
        validation_status = EXCLUDED.validation_status,
        updated_at = now();

  INSERT INTO public.workshop_mod_versions (
    id, mod_id, version, manifest, rules, source_kind, start_fen, capabilities, validation_notes
  ) VALUES
    (
      ver_hex_13, mod_hex_13, '1.0.0',
      '{"id":"official-hex-13x13","name":"13x13 Championship","version":"1.0.0","description":"Long-form Hex with the classic swap rule intact.","author":"BOARD","games":{"hex":{"rules":{"boardSize":13,"pieRule":true}}}}'::jsonb,
      '{"boardSize":13,"pieRule":true}'::jsonb, 'official_seed', NULL, '{}'::jsonb, '{}'::jsonb
    ),
    (
      ver_hex_no_pie, mod_hex_no_pie, '1.0.0',
      '{"id":"official-hex-no-pie","name":"No Pie Classic","version":"1.0.0","description":"Pure opening pressure. No color swap after move one.","author":"BOARD","games":{"hex":{"rules":{"pieRule":false}}}}'::jsonb,
      '{"pieRule":false}'::jsonb, 'official_seed', NULL, '{}'::jsonb, '{}'::jsonb
    ),
    (
      ver_checkers_chill, mod_checkers_chill, '1.0.0',
      '{"id":"official-checkers-chill","name":"Chill Checkers","version":"1.0.0","description":"No forced captures and a shorter no-capture draw window.","author":"BOARD","games":{"checkers":{"rules":{"mandatoryCapture":false,"draw":{"threefoldRepetition":true,"noCaptureHalfMoves":20}}}}}'::jsonb,
      '{"mandatoryCapture":false,"draw":{"threefoldRepetition":true,"noCaptureHalfMoves":20}}'::jsonb, 'official_seed', NULL, '{}'::jsonb, '{}'::jsonb
    ),
    (
      ver_connect4_blitz, mod_connect4_blitz, '1.0.0',
      '{"id":"official-connect4-blitz","name":"Connect 3 Blitz","version":"1.0.0","description":"First to connect three. Fast, noisy, immediate.","author":"BOARD","games":{"connect4":{"rules":{"connect":3}}}}'::jsonb,
      '{"connect":3}'::jsonb, 'official_seed', NULL, '{}'::jsonb, '{}'::jsonb
    ),
    (
      ver_chess_endgame, mod_chess_endgame, '1.0.0',
      '{"id":"official-chess-endgame-arena","name":"Endgame Arena","version":"1.0.0","description":"Loads a stripped king-and-pawn endgame from the first move.","author":"BOARD","games":{"chess":{"rules":{"startFen":"8/8/8/8/8/2k5/2P5/2K5 w - - 0 1"}}}}'::jsonb,
      '{"startFen":"8/8/8/8/8/2k5/2P5/2K5 w - - 0 1"}'::jsonb, 'official_seed', '8/8/8/8/8/2k5/2P5/2K5 w - - 0 1', '{}'::jsonb, '{}'::jsonb
    )
  ON CONFLICT (mod_id, version) DO UPDATE
    SET manifest = EXCLUDED.manifest,
        rules = EXCLUDED.rules,
        source_kind = EXCLUDED.source_kind,
        start_fen = EXCLUDED.start_fen,
        capabilities = EXCLUDED.capabilities,
        validation_notes = EXCLUDED.validation_notes;

  UPDATE public.workshop_mods
  SET latest_version_id = CASE manifest_id
    WHEN 'official-hex-13x13' THEN ver_hex_13
    WHEN 'official-hex-no-pie' THEN ver_hex_no_pie
    WHEN 'official-checkers-chill' THEN ver_checkers_chill
    WHEN 'official-connect4-blitz' THEN ver_connect4_blitz
    WHEN 'official-chess-endgame-arena' THEN ver_chess_endgame
    ELSE latest_version_id
  END
  WHERE manifest_id IN (
    'official-hex-13x13',
    'official-hex-no-pie',
    'official-checkers-chill',
    'official-connect4-blitz',
    'official-chess-endgame-arena'
  );
END $$;
