ALTER TABLE public.tournaments
DROP CONSTRAINT IF EXISTS tournaments_access_type_check;

ALTER TABLE public.tournaments
ADD CONSTRAINT tournaments_access_type_check
CHECK (access_type IN ('public', 'world_members', 'access_code', 'pass_required'));

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

  IF v_access_type NOT IN ('public', 'world_members', 'access_code', 'pass_required') THEN
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
  v_user_id uuid := public.require_play_account();
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

  IF v_tournament.access_type = 'pass_required'
    AND NOT EXISTS (
      SELECT 1
      FROM public.world_app_identities wai
      WHERE wai.profile_id = v_user_id
        AND wai.wallet_auth_at IS NOT NULL
    )
  THEN
    RAISE EXCEPTION 'Pass-gated events require a bound World wallet';
  END IF;

  IF v_tournament.access_type = 'pass_required'
    AND COALESCE(v_tournament.competitive_mode, false)
    AND NOT EXISTS (
      SELECT 1
      FROM public.world_app_identities wai
      WHERE wai.profile_id = v_user_id
        AND wai.idkit_verified_at IS NOT NULL
    )
  THEN
    RAISE EXCEPTION 'Competitive events require human verification';
  END IF;

  IF v_tournament.access_type = 'pass_required'
    AND NOT EXISTS (
      SELECT 1
      FROM public.world_app_identities wai,
      LATERAL jsonb_array_elements(
        COALESCE(wai.verification_metadata -> 'solanaCompetitive' -> 'roomPasses', '[]'::jsonb)
      ) AS pass
      WHERE wai.profile_id = v_user_id
        AND pass ->> 'scope' = 'event_series'
        AND pass ->> 'accessMode' = 'pass_required'
        AND pass ->> 'tournamentId' = p_tournament_id::text
        AND pass ->> 'status' IN ('issued', 'finalized')
    )
  THEN
    RAISE EXCEPTION 'Valid event pass required';
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
