-- Fix guest/anonymous signup failures by guaranteeing unique, valid usernames

CREATE OR REPLACE FUNCTION public.handle_anonymous_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text;
BEGIN
  -- Only create a profile if one doesn't already exist
  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Deterministic + unique-ish username derived from user id (12 chars: Guest-xxxxxx)
  v_username := 'Guest-' || substring(md5(NEW.id::text), 1, 6);

  INSERT INTO public.profiles (id, username, is_guest)
  VALUES (NEW.id, v_username, true);

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Extremely rare: fallback to uuid-based suffix
    v_username := 'Guest-' || substring(md5(gen_random_uuid()::text), 1, 6);
    INSERT INTO public.profiles (id, username, is_guest)
    VALUES (NEW.id, v_username, true);
    RETURN NEW;
END;
$$;

-- Ensure trigger exists (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_anonymous_user_created'
  ) THEN
    CREATE TRIGGER on_anonymous_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_anonymous_user();
  END IF;
END;
$$;