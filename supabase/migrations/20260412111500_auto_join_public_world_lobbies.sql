CREATE OR REPLACE FUNCTION public.join_lobby_by_code_atomic(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := public.require_permanent_account();
  v_lobby public.lobbies%ROWTYPE;
  v_world public.worlds%ROWTYPE;
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
    SELECT *
    INTO v_world
    FROM public.worlds
    WHERE id = v_lobby.world_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'World not found';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.world_members wm
      WHERE wm.world_id = v_lobby.world_id
        AND wm.profile_id = v_user_id
    ) THEN
      IF v_world.visibility = 'private' THEN
        RAISE EXCEPTION 'Private world instances are only available to members';
      END IF;

      INSERT INTO public.world_members (world_id, profile_id, role)
      VALUES (v_lobby.world_id, v_user_id, 'member')
      ON CONFLICT (world_id, profile_id) DO UPDATE
        SET joined_at = public.world_members.joined_at;
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
