-- Update handle_new_user function to include avatar_color from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_color)
  VALUES (
    new.id, 
    COALESCE(
      new.raw_user_meta_data->>'username',
      'player_' || substr(new.id::text, 1, 8)
    ),
    COALESCE(
      new.raw_user_meta_data->>'avatar_color',
      'indigo'
    )
  );
  RETURN new;
END;
$$;