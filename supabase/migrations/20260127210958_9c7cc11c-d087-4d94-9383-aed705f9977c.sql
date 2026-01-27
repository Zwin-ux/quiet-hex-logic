-- Add World ID verification columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_verified_human boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS world_id_nullifier text UNIQUE,
ADD COLUMN IF NOT EXISTS world_id_verified_at timestamptz;

-- Create index for faster nullifier lookups
CREATE INDEX IF NOT EXISTS idx_profiles_world_id_nullifier ON public.profiles(world_id_nullifier) WHERE world_id_nullifier IS NOT NULL;