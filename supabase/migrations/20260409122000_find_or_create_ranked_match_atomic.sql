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

