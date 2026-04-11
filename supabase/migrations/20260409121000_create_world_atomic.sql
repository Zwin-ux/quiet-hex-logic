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

