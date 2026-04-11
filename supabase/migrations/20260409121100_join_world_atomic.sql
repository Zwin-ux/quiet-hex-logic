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

