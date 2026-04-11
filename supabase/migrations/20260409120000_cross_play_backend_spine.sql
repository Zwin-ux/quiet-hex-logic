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
