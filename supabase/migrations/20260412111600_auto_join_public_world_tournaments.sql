CREATE OR REPLACE FUNCTION public.join_tournament_atomic(p_tournament_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := public.require_permanent_account();
  v_tournament public.tournaments%ROWTYPE;
  v_world public.worlds%ROWTYPE;
  v_participant_count integer;
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
    SELECT *
    INTO v_world
    FROM public.worlds
    WHERE id = v_tournament.world_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'World not found';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.world_members wm
      WHERE wm.world_id = v_tournament.world_id
        AND wm.profile_id = v_user_id
    ) THEN
      IF v_world.visibility = 'private' THEN
        RAISE EXCEPTION 'Private world events are only available to members';
      END IF;

      INSERT INTO public.world_members (world_id, profile_id, role)
      VALUES (v_tournament.world_id, v_user_id, 'member')
      ON CONFLICT (world_id, profile_id) DO UPDATE
        SET joined_at = public.world_members.joined_at;
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
