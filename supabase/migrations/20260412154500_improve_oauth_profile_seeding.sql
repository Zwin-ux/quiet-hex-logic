-- Improve profile seeding for OAuth-first accounts.
-- Prefer a readable provider handle or email local-part before falling back to player_<id>.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw_username text;
  v_base_username text;
  v_username text;
  v_suffix text;
BEGIN
  IF NEW.is_anonymous = true THEN
    RETURN NEW;
  END IF;

  v_raw_username := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'username', ''),
    NULLIF(NEW.raw_user_meta_data->>'preferred_username', ''),
    NULLIF(NEW.raw_user_meta_data->>'user_name', ''),
    NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
    NULLIF(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'name', ''), '[^a-zA-Z0-9_]+', '', 'g'), ''),
    'player_' || substr(NEW.id::text, 1, 8)
  );

  v_base_username := lower(regexp_replace(v_raw_username, '[^a-zA-Z0-9_]+', '', 'g'));
  IF v_base_username = '' THEN
    v_base_username := 'player_' || substr(NEW.id::text, 1, 8);
  END IF;

  v_username := left(v_base_username, 24);
  IF length(v_username) < 2 THEN
    v_username := 'player_' || substr(NEW.id::text, 1, 8);
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) THEN
    v_suffix := '_' || substr(replace(NEW.id::text, '-', ''), 1, 4);
    v_username := left(v_base_username, 24 - length(v_suffix)) || v_suffix;
  END IF;

  INSERT INTO public.profiles (id, username, avatar_color)
  VALUES (
    NEW.id,
    v_username,
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_color',
      'indigo'
    )
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
