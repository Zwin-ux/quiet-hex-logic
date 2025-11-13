-- Add guest tracking columns to profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS converted_from_anonymous_id UUID;

-- Create index for guest queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_guest ON profiles(is_guest);

-- Function to create guest profile for anonymous users
CREATE OR REPLACE FUNCTION handle_anonymous_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_anonymous THEN
    INSERT INTO public.profiles (id, username, is_guest, avatar_color)
    VALUES (
      NEW.id, 
      'Guest_' || SUBSTRING(NEW.id::text, 1, 8),
      TRUE,
      'violet'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create guest profile when anonymous user signs up
DROP TRIGGER IF EXISTS on_anonymous_user_created ON auth.users;
CREATE TRIGGER on_anonymous_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.is_anonymous = TRUE)
  EXECUTE FUNCTION handle_anonymous_user();