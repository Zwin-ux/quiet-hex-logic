-- Cross-play backend spine:
-- - atomic world/lobby/tournament/ranked-match mutations
-- - backend-owned world and match snapshot read contracts
-- - permanent-account enforcement using JWT is_anonymous
-- - guest progress merge helper for linking into an existing account

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS game_key TEXT NOT NULL DEFAULT 'hex';

CREATE OR REPLACE FUNCTION public.jwt_is_anonymous()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;

CREATE OR REPLACE FUNCTION public.require_permanent_account()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized'
      USING ERRCODE = '42501';
  END IF;

  IF public.jwt_is_anonymous() THEN
    RAISE EXCEPTION 'Permanent account required'
      USING ERRCODE = '42501';
  END IF;

  RETURN v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.game_defaults(p_game_key text)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE COALESCE(NULLIF(trim(p_game_key), ''), 'hex')
    WHEN 'hex' THEN jsonb_build_object(
      'game_key', 'hex',
      'board_size', 11,
      'pie_rule', true,
      'competitive_size', 13
    )
    WHEN 'chess' THEN jsonb_build_object(
      'game_key', 'chess',
      'board_size', 8,
      'pie_rule', false,
      'competitive_size', 8
    )
    WHEN 'checkers' THEN jsonb_build_object(
      'game_key', 'checkers',
      'board_size', 8,
      'pie_rule', false,
      'competitive_size', 8
    )
    WHEN 'ttt' THEN jsonb_build_object(
      'game_key', 'ttt',
      'board_size', 3,
      'pie_rule', false,
      'competitive_size', 3
    )
    WHEN 'connect4' THEN jsonb_build_object(
      'game_key', 'connect4',
      'board_size', 7,
      'pie_rule', false,
      'competitive_size', 7
    )
    ELSE jsonb_build_object(
      'game_key', COALESCE(NULLIF(trim(p_game_key), ''), 'hex'),
      'board_size', 8,
      'pie_rule', false,
      'competitive_size', 8
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.slugify_world_name(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    NULLIF(
      regexp_replace(
        regexp_replace(lower(COALESCE(p_name, '')), '[^a-z0-9]+', '-', 'g'),
        '(^-+|-+$)',
        '',
        'g'
      ),
      ''
    ),
    'world'
  );
$$;

CREATE OR REPLACE FUNCTION public.assert_world_visibility(p_world_id uuid, p_viewer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.worlds w
    WHERE w.id = p_world_id
      AND (
        w.visibility = 'public'
        OR w.created_by = p_viewer_id
        OR EXISTS (
          SELECT 1
          FROM public.world_members wm
          WHERE wm.world_id = w.id
            AND wm.profile_id = p_viewer_id
        )
      )
  ) THEN
    RAISE EXCEPTION 'World not found or unavailable'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.world_summary_payload(p_world_id uuid, p_viewer_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', w.id,
    'slug', w.slug,
    'name', w.name,
    'description', w.description,
    'visibility', w.visibility,
    'createdBy', w.created_by,
    'createdAt', w.created_at,
    'updatedAt', w.updated_at,
    'ownerName', COALESCE(NULLIF(trim(owner.username), ''), 'Host'),
    'ownerAvatarColor', owner.avatar_color,
    'memberCount', (
      SELECT COUNT(*)::int
      FROM public.world_members wm
      WHERE wm.world_id = w.id
    ),
    'eventCount', (
      SELECT COUNT(*)::int
      FROM public.tournaments t
      WHERE t.world_id = w.id
    ),
    'instanceCount', (
      SELECT COUNT(*)::int
      FROM public.lobbies l
      WHERE l.world_id = w.id
        AND l.status IN ('waiting', 'starting')
    ) + (
      SELECT COUNT(*)::int
      FROM public.matches m
      WHERE m.world_id = w.id
        AND m.status = 'active'
    ),
    'userRole', (
      SELECT wm.role
      FROM public.world_members wm
      WHERE wm.world_id = w.id
        AND wm.profile_id IS NOT DISTINCT FROM p_viewer_id
      LIMIT 1
    )
  )
  FROM public.worlds w
  LEFT JOIN public.profiles owner
    ON owner.id = w.created_by
  WHERE w.id = p_world_id;
$$;

CREATE OR REPLACE FUNCTION public.list_worlds()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(public.world_summary_payload(world_rows.id, auth.uid()) ORDER BY world_rows.created_at DESC),
    '[]'::jsonb
  )
  FROM (
    SELECT w.id, w.created_at
    FROM public.worlds w
    WHERE
      w.visibility = 'public'
      OR w.created_by = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.world_members wm
        WHERE wm.world_id = w.id
          AND wm.profile_id = auth.uid()
      )
    ORDER BY w.created_at DESC
  ) AS world_rows;
$$;

CREATE OR REPLACE FUNCTION public.list_manageable_worlds()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', w.id,
        'name', w.name
      )
      ORDER BY w.name ASC
    ),
    '[]'::jsonb
  )
  FROM public.worlds w
  WHERE EXISTS (
    SELECT 1
    FROM public.world_members wm
    WHERE wm.world_id = w.id
      AND wm.profile_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_world_overview(p_world_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_world jsonb;
  v_events jsonb;
  v_lobbies jsonb;
  v_matches jsonb;
BEGIN
  PERFORM public.assert_world_visibility(p_world_id, auth.uid());

  v_world := public.world_summary_payload(p_world_id, auth.uid());

  IF v_world IS NULL THEN
    RAISE EXCEPTION 'World not found'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'description', t.description,
        'status', t.status,
        'format', t.format,
        'maxPlayers', t.max_players,
        'participantCount', (
          SELECT COUNT(*)::int
          FROM public.tournament_participants tp
          WHERE tp.tournament_id = t.id
        ),
        'createdAt', t.created_at,
        'startTime', t.start_time
      )
      ORDER BY t.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_events
  FROM public.tournaments t
  WHERE t.world_id = p_world_id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', l.id,
        'code', l.code,
        'hostId', l.host_id,
        'hostUsername', COALESCE(NULLIF(trim(host.username), ''), 'Host'),
        'gameKey', COALESCE(l.game_key, 'hex'),
        'boardSize', l.board_size,
        'pieRule', l.pie_rule,
        'status', l.status,
        'playerCount', (
          SELECT COUNT(*)::int
          FROM public.lobby_players lp
          WHERE lp.lobby_id = l.id
        ),
        'createdAt', l.created_at
      )
      ORDER BY l.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_lobbies
  FROM public.lobbies l
  LEFT JOIN public.profiles host
    ON host.id = l.host_id
  WHERE l.world_id = p_world_id
    AND l.status IN ('waiting', 'starting');

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'gameKey', COALESCE(m.game_key, 'hex'),
        'size', m.size,
        'updatedAt', m.updated_at,
        'allowSpectators', COALESCE(m.allow_spectators, true),
        'status', m.status
      )
      ORDER BY m.updated_at DESC NULLS LAST
    ),
    '[]'::jsonb
  )
  INTO v_matches
  FROM public.matches m
  WHERE m.world_id = p_world_id
    AND m.status = 'active';

  RETURN jsonb_build_object(
    'world', v_world,
    'events', v_events,
    'lobbies', v_lobbies,
    'matches', v_matches
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_world_atomic(
  p_name text,
  p_description text DEFAULT NULL,
  p_visibility text DEFAULT 'public'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := public.require_permanent_account();
  v_name text := NULLIF(trim(p_name), '');
  v_description text := NULLIF(trim(p_description), '');
  v_visibility text := COALESCE(NULLIF(trim(p_visibility), ''), 'public');
  v_slug_base text;
  v_slug text;
  v_world public.worlds%ROWTYPE;
  v_attempt integer := 0;
BEGIN
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'World name is required';
  END IF;

  IF v_visibility NOT IN ('public', 'private') THEN
    RAISE EXCEPTION 'Invalid world visibility';
  END IF;

  v_slug_base := public.slugify_world_name(v_name);

  LOOP
    v_slug := CASE
      WHEN v_attempt = 0 THEN v_slug_base
      ELSE v_slug_base || '-' || substring(replace(gen_random_uuid()::text, '-', '') FROM 1 FOR 4)
    END;

    BEGIN
      INSERT INTO public.worlds (
        slug,
        name,
        description,
        visibility,
        created_by
      )
      VALUES (
        v_slug,
        v_name,
        v_description,
        v_visibility,
        v_user_id
      )
      RETURNING * INTO v_world;

      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        v_attempt := v_attempt + 1;
        IF v_attempt > 10 THEN
          RAISE EXCEPTION 'Unable to generate a unique world slug';
        END IF;
    END;
  END LOOP;

  INSERT INTO public.world_members (world_id, profile_id, role)
  VALUES (v_world.id, v_user_id, 'owner')
  ON CONFLICT (world_id, profile_id) DO UPDATE
    SET role = 'owner';

  RETURN to_jsonb(v_world);
END;
$$;

CREATE OR REPLACE FUNCTION public.join_world_atomic(p_world_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := public.require_permanent_account();
  v_world public.worlds%ROWTYPE;
  v_membership public.world_members%ROWTYPE;
BEGIN
  SELECT *
  INTO v_world
  FROM public.worlds
  WHERE id = p_world_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'World not found';
  END IF;

  IF v_world.visibility = 'private'
    AND NOT EXISTS (
      SELECT 1
      FROM public.world_members wm
      WHERE wm.world_id = v_world.id
        AND wm.profile_id = v_user_id
    )
  THEN
    RAISE EXCEPTION 'Private worlds require an invitation';
  END IF;

  INSERT INTO public.world_members (world_id, profile_id, role)
  VALUES (v_world.id, v_user_id, 'member')
  ON CONFLICT (world_id, profile_id) DO UPDATE
    SET joined_at = public.world_members.joined_at
  RETURNING * INTO v_membership;

  RETURN to_jsonb(v_membership);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_lobby_atomic(
  p_game_key text DEFAULT 'hex',
  p_world_id uuid DEFAULT NULL,
  p_board_size integer DEFAULT NULL,
  p_pie_rule boolean DEFAULT NULL,
  p_turn_timer_seconds integer DEFAULT 45
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
  v_board_size integer;
  v_pie_rule boolean;
  v_code text;
  v_lobby public.lobbies%ROWTYPE;
BEGIN
  IF p_world_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.world_members wm
      WHERE wm.world_id = p_world_id
        AND wm.profile_id = v_user_id
        AND wm.role IN ('owner', 'admin')
    ) THEN
      RAISE EXCEPTION 'Only world organizers can create instances inside this world';
    END IF;
  END IF;

  v_board_size := CASE
    WHEN v_game_key = 'hex' THEN LEAST(GREATEST(COALESCE(p_board_size, (v_defaults ->> 'board_size')::integer), 5), 19)
    ELSE (v_defaults ->> 'board_size')::integer
  END;

  v_pie_rule := CASE
    WHEN (v_defaults ->> 'pie_rule')::boolean THEN COALESCE(p_pie_rule, true)
    ELSE false
  END;

  v_code := public.generate_lobby_code();

  INSERT INTO public.lobbies (
    code,
    host_id,
    world_id,
    game_key,
    board_size,
    pie_rule,
    turn_timer_seconds,
    status
  )
  VALUES (
    v_code,
    v_user_id,
    p_world_id,
    v_game_key,
    v_board_size,
    v_pie_rule,
    LEAST(GREATEST(COALESCE(p_turn_timer_seconds, 45), 10), 600),
    'waiting'
  )
  RETURNING * INTO v_lobby;

  INSERT INTO public.lobby_players (
    lobby_id,
    player_id,
    role,
    is_ready
  )
  VALUES (
    v_lobby.id,
    v_user_id,
    'host',
    false
  )
  ON CONFLICT (lobby_id, player_id) DO NOTHING;

  RETURN jsonb_build_object(
    'lobby', to_jsonb(v_lobby),
    'code', v_code
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.join_lobby_by_code_atomic(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := public.require_permanent_account();
  v_lobby public.lobbies%ROWTYPE;
  v_private_world boolean := false;
  v_player_count integer;
BEGIN
  SELECT *
  INTO v_lobby
  FROM public.lobbies
  WHERE code = upper(trim(p_code))
    AND status = 'waiting'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lobby not found or already started';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.lobby_players lp
    WHERE lp.lobby_id = v_lobby.id
      AND lp.player_id = v_user_id
  ) THEN
    UPDATE public.lobby_players
    SET last_seen = now()
    WHERE lobby_id = v_lobby.id
      AND player_id = v_user_id;

    RETURN jsonb_build_object('lobby', to_jsonb(v_lobby));
  END IF;

  IF v_lobby.world_id IS NOT NULL THEN
    SELECT w.visibility = 'private'
    INTO v_private_world
    FROM public.worlds w
    WHERE w.id = v_lobby.world_id;

    IF v_private_world
      AND NOT EXISTS (
        SELECT 1
        FROM public.world_members wm
        WHERE wm.world_id = v_lobby.world_id
          AND wm.profile_id = v_user_id
      )
    THEN
      RAISE EXCEPTION 'Private world instances are only available to members';
    END IF;
  END IF;

  SELECT COUNT(*)::integer
  INTO v_player_count
  FROM public.lobby_players lp
  WHERE lp.lobby_id = v_lobby.id;

  IF v_player_count >= 2 THEN
    RAISE EXCEPTION 'Lobby is full';
  END IF;

  INSERT INTO public.lobby_players (
    lobby_id,
    player_id,
    role,
    is_ready
  )
  VALUES (
    v_lobby.id,
    v_user_id,
    'guest',
    false
  );

  RETURN jsonb_build_object('lobby', to_jsonb(v_lobby));
END;
$$;

CREATE OR REPLACE FUNCTION public.create_tournament_atomic(
  p_name text,
  p_description text DEFAULT NULL,
  p_game_key text DEFAULT 'hex',
  p_world_id uuid DEFAULT NULL,
  p_format text DEFAULT 'single_elimination',
  p_max_players integer DEFAULT 8,
  p_min_players integer DEFAULT 4,
  p_board_size integer DEFAULT NULL,
  p_pie_rule boolean DEFAULT NULL,
  p_turn_timer_seconds integer DEFAULT 45,
  p_registration_deadline timestamptz DEFAULT NULL,
  p_start_time timestamptz DEFAULT NULL
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
  v_tournament public.tournaments%ROWTYPE;
BEGIN
  IF NULLIF(trim(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'Tournament name is required';
  END IF;

  IF v_format NOT IN ('single_elimination', 'double_elimination', 'round_robin') THEN
    RAISE EXCEPTION 'Invalid tournament format';
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

  INSERT INTO public.tournaments (
    name,
    description,
    game_key,
    world_id,
    format,
    max_players,
    min_players,
    board_size,
    pie_rule,
    turn_timer_seconds,
    registration_deadline,
    start_time,
    created_by,
    status
  )
  VALUES (
    trim(p_name),
    NULLIF(trim(p_description), ''),
    v_game_key,
    p_world_id,
    v_format,
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

CREATE OR REPLACE FUNCTION public.join_tournament_atomic(p_tournament_id uuid)
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

CREATE OR REPLACE FUNCTION public.find_or_create_ranked_match_atomic(
  p_game_key text DEFAULT 'hex'
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
  v_match_size integer := (v_defaults ->> 'competitive_size')::integer;
  v_match public.matches%ROWTYPE;
  v_player_count integer;
BEGIN
  SELECT m.*
  INTO v_match
  FROM public.matches m
  JOIN public.match_players mp
    ON mp.match_id = m.id
  WHERE mp.profile_id = v_user_id
    AND m.is_ranked IS TRUE
    AND COALESCE(m.game_key, 'hex') = v_game_key
    AND m.status IN ('waiting', 'active')
  ORDER BY m.created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'matchId', v_match.id,
      'joined', v_match.status = 'active',
      'waiting', v_match.status = 'waiting'
    );
  END IF;

  SELECT *
  INTO v_match
  FROM public.matches m
  WHERE m.status = 'waiting'
    AND m.is_ranked IS TRUE
    AND COALESCE(m.game_key, 'hex') = v_game_key
    AND m.size = v_match_size
    AND m.owner <> v_user_id
  ORDER BY m.created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF FOUND THEN
    SELECT COUNT(*)::integer
    INTO v_player_count
    FROM public.match_players mp
    WHERE mp.match_id = v_match.id;

    IF v_player_count < 2 THEN
      INSERT INTO public.match_players (
        match_id,
        profile_id,
        color,
        is_bot
      )
      VALUES (
        v_match.id,
        v_user_id,
        2,
        false
      )
      ON CONFLICT (match_id, profile_id) DO NOTHING;

      UPDATE public.matches
      SET
        status = 'active',
        turn_started_at = COALESCE(turn_started_at, now())
      WHERE id = v_match.id;

      RETURN jsonb_build_object(
        'matchId', v_match.id,
        'joined', true,
        'waiting', false
      );
    END IF;
  END IF;

  INSERT INTO public.matches (
    game_key,
    size,
    pie_rule,
    status,
    turn,
    owner,
    is_ranked,
    allow_spectators
  )
  VALUES (
    v_game_key,
    v_match_size,
    (v_defaults ->> 'pie_rule')::boolean,
    'waiting',
    1,
    v_user_id,
    true,
    true
  )
  RETURNING * INTO v_match;

  INSERT INTO public.match_players (
    match_id,
    profile_id,
    color,
    is_bot
  )
  VALUES (
    v_match.id,
    v_user_id,
    1,
    false
  );

  RETURN jsonb_build_object(
    'matchId', v_match.id,
    'joined', false,
    'waiting', true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_match_snapshot(p_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.matches%ROWTYPE;
  v_world public.worlds%ROWTYPE;
  v_tournament public.tournaments%ROWTYPE;
  v_players jsonb;
  v_moves jsonb;
  v_rating_history jsonb;
  v_spectators jsonb;
  v_arena jsonb;
  v_viewer_role text := 'viewer';
  v_allow boolean := false;
BEGIN
  SELECT *
  INTO v_match
  FROM public.matches
  WHERE id = p_match_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF auth.uid() IS NOT NULL AND (
    v_match.owner = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.match_players mp
      WHERE mp.match_id = v_match.id
        AND mp.profile_id = auth.uid()
    )
  ) THEN
    v_allow := true;
  ELSIF COALESCE(v_match.allow_spectators, true) THEN
    IF v_match.world_id IS NULL THEN
      v_allow := true;
    ELSE
      SELECT *
      INTO v_world
      FROM public.worlds
      WHERE id = v_match.world_id;

      IF FOUND AND (
        v_world.visibility = 'public'
        OR EXISTS (
          SELECT 1
          FROM public.world_members wm
          WHERE wm.world_id = v_world.id
            AND wm.profile_id = auth.uid()
        )
      ) THEN
        v_allow := true;
      END IF;
    END IF;
  END IF;

  IF NOT v_allow THEN
    RAISE EXCEPTION 'Match not found or unavailable'
      USING ERRCODE = '42501';
  END IF;

  IF auth.uid() IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.match_players mp
      WHERE mp.match_id = v_match.id
        AND mp.profile_id = auth.uid()
    ) THEN
      v_viewer_role := 'player';
    ELSIF EXISTS (
      SELECT 1
      FROM public.spectators s
      WHERE s.match_id = v_match.id
        AND s.profile_id = auth.uid()
    ) THEN
      v_viewer_role := 'spectator';
    ELSIF v_match.owner = auth.uid() THEN
      v_viewer_role := 'owner';
    END IF;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'profile_id', mp.profile_id,
        'color', mp.color,
        'is_bot', mp.is_bot,
        'username', COALESCE(NULLIF(trim(p.username), ''), 'Player'),
        'avatar_color', p.avatar_color,
        'elo', pr.elo_rating,
        'rating_change', mp.rating_change
      )
      ORDER BY mp.color
    ),
    '[]'::jsonb
  )
  INTO v_players
  FROM public.match_players mp
  LEFT JOIN public.profiles p
    ON p.id = mp.profile_id
  LEFT JOIN public.player_ratings pr
    ON pr.profile_id = mp.profile_id
   AND pr.game_key = COALESCE(v_match.game_key, 'hex')
  WHERE mp.match_id = v_match.id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'ply', mv.ply,
        'move', mv.move,
        'cell', mv.cell,
        'color', mv.color,
        'notation', mv.notation
      )
      ORDER BY mv.ply
    ),
    '[]'::jsonb
  )
  INTO v_moves
  FROM public.moves mv
  WHERE mv.match_id = v_match.id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'profile_id', rh.profile_id,
        'old_rating', rh.old_rating,
        'new_rating', rh.new_rating,
        'rating_change', rh.rating_change,
        'game_key', rh.game_key
      )
      ORDER BY rh.created_at ASC NULLS LAST
    ),
    '[]'::jsonb
  )
  INTO v_rating_history
  FROM public.rating_history rh
  WHERE rh.match_id = v_match.id
    AND COALESCE(rh.game_key, COALESCE(v_match.game_key, 'hex')) = COALESCE(v_match.game_key, 'hex');

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'profile_id', s.profile_id,
        'username', COALESCE(NULLIF(trim(p.username), ''), 'Viewer'),
        'avatar_color', p.avatar_color,
        'joined_at', s.joined_at
      )
      ORDER BY s.joined_at ASC
    ),
    '[]'::jsonb
  )
  INTO v_spectators
  FROM public.spectators s
  LEFT JOIN public.profiles p
    ON p.id = s.profile_id
  WHERE s.match_id = v_match.id;

  SELECT jsonb_build_object(
    'p1BotId', bm.p1_bot_id,
    'p2BotId', bm.p2_bot_id,
    'p1Name', p1.name,
    'p2Name', p2.name
  )
  INTO v_arena
  FROM public.bot_matches bm
  LEFT JOIN public.bots p1
    ON p1.id = bm.p1_bot_id
  LEFT JOIN public.bots p2
    ON p2.id = bm.p2_bot_id
  WHERE bm.match_id = v_match.id;

  IF v_match.world_id IS NOT NULL AND v_world.id IS NULL THEN
    SELECT *
    INTO v_world
    FROM public.worlds
    WHERE id = v_match.world_id;
  END IF;

  IF v_match.tournament_id IS NOT NULL THEN
    SELECT *
    INTO v_tournament
    FROM public.tournaments
    WHERE id = v_match.tournament_id;
  END IF;

  RETURN jsonb_build_object(
    'match', to_jsonb(v_match),
    'players', v_players,
    'moves', v_moves,
    'ratingHistory', v_rating_history,
    'spectators', v_spectators,
    'viewerRole', v_viewer_role,
    'world', CASE
      WHEN v_world.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'id', v_world.id,
        'slug', v_world.slug,
        'name', v_world.name,
        'visibility', v_world.visibility
      )
    END,
    'tournament', CASE
      WHEN v_tournament.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'id', v_tournament.id,
        'name', v_tournament.name,
        'status', v_tournament.status,
        'format', v_tournament.format,
        'world_id', v_tournament.world_id,
        'game_key', COALESCE(v_tournament.game_key, COALESCE(v_match.game_key, 'hex'))
      )
    END,
    'arena', v_arena
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.merge_guest_progress_into_account(
  p_guest_user_id uuid,
  p_target_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_target_user_id THEN
    RAISE EXCEPTION 'You can only merge into the active account'
      USING ERRCODE = '42501';
  END IF;

  IF p_guest_user_id IS NULL OR p_target_user_id IS NULL OR p_guest_user_id = p_target_user_id THEN
    RAISE EXCEPTION 'Invalid merge request';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_guest_user_id
      AND is_guest = true
  ) THEN
    RAISE EXCEPTION 'Guest profile not found';
  END IF;

  UPDATE public.matches
  SET owner = p_target_user_id
  WHERE owner = p_guest_user_id;

  INSERT INTO public.match_players (match_id, profile_id, color, is_bot, created_at, rating_change)
  SELECT
    mp.match_id,
    p_target_user_id,
    mp.color,
    mp.is_bot,
    mp.created_at,
    mp.rating_change
  FROM public.match_players mp
  WHERE mp.profile_id = p_guest_user_id
  ON CONFLICT (match_id, profile_id) DO NOTHING;
  DELETE FROM public.match_players WHERE profile_id = p_guest_user_id;

  INSERT INTO public.lobby_players (lobby_id, player_id, role, is_ready, last_seen)
  SELECT
    lp.lobby_id,
    p_target_user_id,
    lp.role,
    lp.is_ready,
    lp.last_seen
  FROM public.lobby_players lp
  WHERE lp.player_id = p_guest_user_id
  ON CONFLICT (lobby_id, player_id) DO UPDATE
    SET
      is_ready = excluded.is_ready OR public.lobby_players.is_ready,
      last_seen = GREATEST(excluded.last_seen, public.lobby_players.last_seen);
  DELETE FROM public.lobby_players WHERE player_id = p_guest_user_id;

  UPDATE public.lobbies
  SET host_id = p_target_user_id
  WHERE host_id = p_guest_user_id;

  INSERT INTO public.tournament_participants (tournament_id, player_id, seed, status, wins, losses, points, joined_at)
  SELECT
    tp.tournament_id,
    p_target_user_id,
    tp.seed,
    tp.status,
    tp.wins,
    tp.losses,
    tp.points,
    tp.joined_at
  FROM public.tournament_participants tp
  WHERE tp.player_id = p_guest_user_id
  ON CONFLICT (tournament_id, player_id) DO NOTHING;
  DELETE FROM public.tournament_participants WHERE player_id = p_guest_user_id;

  UPDATE public.tournament_matches
  SET
    player1_id = CASE WHEN player1_id = p_guest_user_id THEN p_target_user_id ELSE player1_id END,
    player2_id = CASE WHEN player2_id = p_guest_user_id THEN p_target_user_id ELSE player2_id END,
    winner_id = CASE WHEN winner_id = p_guest_user_id THEN p_target_user_id ELSE winner_id END
  WHERE
    player1_id = p_guest_user_id
    OR player2_id = p_guest_user_id
    OR winner_id = p_guest_user_id;

  UPDATE public.tournaments
  SET created_by = p_target_user_id
  WHERE created_by = p_guest_user_id;

  INSERT INTO public.world_members (world_id, profile_id, role, joined_at)
  SELECT
    wm.world_id,
    p_target_user_id,
    wm.role,
    wm.joined_at
  FROM public.world_members wm
  WHERE wm.profile_id = p_guest_user_id
  ON CONFLICT (world_id, profile_id) DO UPDATE
    SET role = CASE
      WHEN public.world_members.role = 'owner' OR excluded.role = 'owner' THEN 'owner'
      WHEN public.world_members.role = 'admin' OR excluded.role = 'admin' THEN 'admin'
      ELSE public.world_members.role
    END;
  DELETE FROM public.world_members WHERE profile_id = p_guest_user_id;

  UPDATE public.worlds
  SET created_by = p_target_user_id
  WHERE created_by = p_guest_user_id;

  INSERT INTO public.spectators (match_id, profile_id, joined_at)
  SELECT
    s.match_id,
    p_target_user_id,
    s.joined_at
  FROM public.spectators s
  WHERE s.profile_id = p_guest_user_id
  ON CONFLICT (match_id, profile_id) DO NOTHING;
  DELETE FROM public.spectators WHERE profile_id = p_guest_user_id;

  INSERT INTO public.user_presence (profile_id, match_id, status, updated_at)
  SELECT
    p_target_user_id,
    up.match_id,
    up.status,
    up.updated_at
  FROM public.user_presence up
  WHERE up.profile_id = p_guest_user_id
  ON CONFLICT (profile_id) DO UPDATE
    SET
      match_id = excluded.match_id,
      status = excluded.status,
      updated_at = excluded.updated_at;
  DELETE FROM public.user_presence WHERE profile_id = p_guest_user_id;

  INSERT INTO public.player_ratings (profile_id, game_key, elo_rating, games_rated, updated_at)
  SELECT
    p_target_user_id,
    pr.game_key,
    pr.elo_rating,
    pr.games_rated,
    pr.updated_at
  FROM public.player_ratings pr
  WHERE pr.profile_id = p_guest_user_id
  ON CONFLICT (profile_id, game_key) DO NOTHING;
  DELETE FROM public.player_ratings WHERE profile_id = p_guest_user_id;

  UPDATE public.rating_history
  SET profile_id = p_target_user_id
  WHERE profile_id = p_guest_user_id;

  INSERT INTO public.tutorial_progress (profile_id, step, completed_at)
  SELECT
    p_target_user_id,
    tp.step,
    tp.completed_at
  FROM public.tutorial_progress tp
  WHERE tp.profile_id = p_guest_user_id
  ON CONFLICT (profile_id, step) DO NOTHING;
  DELETE FROM public.tutorial_progress WHERE profile_id = p_guest_user_id;

  INSERT INTO public.user_achievements (achievement_id, user_id, earned_at)
  SELECT
    ua.achievement_id,
    p_target_user_id,
    ua.earned_at
  FROM public.user_achievements ua
  WHERE ua.user_id = p_guest_user_id
  ON CONFLICT DO NOTHING;
  DELETE FROM public.user_achievements WHERE user_id = p_guest_user_id;

  UPDATE public.bots
  SET owner_profile_id = p_target_user_id
  WHERE owner_profile_id = p_guest_user_id;

  UPDATE public.profiles
  SET
    converted_from_anonymous_id = COALESCE(converted_from_anonymous_id, p_guest_user_id),
    is_guest = false
  WHERE id = p_target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'guestUserId', p_guest_user_id,
    'targetUserId', p_target_user_id
  );
END;
$$;
