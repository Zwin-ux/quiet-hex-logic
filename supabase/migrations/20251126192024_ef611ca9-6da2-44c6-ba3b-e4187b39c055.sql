-- Add Discord-related columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS discord_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS discord_username TEXT;

-- Create index for faster Discord user lookups
CREATE INDEX IF NOT EXISTS idx_profiles_discord_id ON public.profiles(discord_id) WHERE discord_id IS NOT NULL;