-- Fix: Make handle_new_user skip anonymous users (they're handled by handle_anonymous_user)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip anonymous users - they're handled by handle_anonymous_user trigger
  IF NEW.is_anonymous = true THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (id, username, avatar_color)
  VALUES (
    NEW.id, 
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      'player_' || substr(NEW.id::text, 1, 8)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_color',
      'indigo'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Fix: Make handle_anonymous_user only process anonymous users
CREATE OR REPLACE FUNCTION public.handle_anonymous_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text;
BEGIN
  -- Only handle anonymous/guest users
  IF NEW.is_anonymous IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Skip if profile already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Generate unique guest username
  v_username := 'Guest-' || substring(md5(NEW.id::text), 1, 6);

  INSERT INTO public.profiles (id, username, is_guest)
  VALUES (NEW.id, v_username, true)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Fallback for username collision
    v_username := 'Guest-' || substring(md5(gen_random_uuid()::text), 1, 6);
    INSERT INTO public.profiles (id, username, is_guest)
    VALUES (NEW.id, v_username, true)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;