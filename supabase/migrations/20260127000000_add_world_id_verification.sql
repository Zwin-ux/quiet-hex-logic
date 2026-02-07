-- Add World ID verification columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_verified_human boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS world_id_nullifier text UNIQUE,
ADD COLUMN IF NOT EXISTS world_id_verified_at timestamptz;

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_profiles_world_id_nullifier
ON public.profiles(world_id_nullifier)
WHERE world_id_nullifier IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.profiles.is_verified_human IS 'Whether user has verified via World ID';
COMMENT ON COLUMN public.profiles.world_id_nullifier IS 'Unique World ID nullifier hash to prevent duplicate verifications';
COMMENT ON COLUMN public.profiles.world_id_verified_at IS 'Timestamp of World ID verification';
