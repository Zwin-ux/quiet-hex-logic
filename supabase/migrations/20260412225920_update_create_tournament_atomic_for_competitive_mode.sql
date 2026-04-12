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
    competitive_mode,
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
