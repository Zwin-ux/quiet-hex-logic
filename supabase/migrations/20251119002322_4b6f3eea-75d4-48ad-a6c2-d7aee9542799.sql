-- Fix anonymous guest profile creation to always provide a non-null username
CREATE OR REPLACE FUNCTION public.handle_anonymous_user()
RETURNS trigger AS $$
DECLARE
  base_username text;
  final_username text;
BEGIN
  -- Only handle anonymous users
  IF NEW.is_anonymous THEN
    -- Prefer a provided username, otherwise generate a friendly guest name
    base_username := COALESCE(NEW.raw_user_meta_data->>'username', 'Guest');

    -- If the base username is still empty, fall back to 'Guest'
    IF base_username IS NULL OR length(trim(base_username)) = 0 THEN
      base_username := 'Guest';
    END IF;

    -- Append a random 4-digit suffix to reduce likelihood of collisions
    final_username := base_username || '-' || lpad((floor(random() * 10000))::int::text, 4, '0');

    -- Insert the guest profile; username is guaranteed to be non-null
    INSERT INTO public.profiles (id, username, is_guest, created_at)
    VALUES (NEW.id, final_username, true, now())
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;