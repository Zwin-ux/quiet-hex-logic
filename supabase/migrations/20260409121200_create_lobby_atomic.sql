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

