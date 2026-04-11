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

