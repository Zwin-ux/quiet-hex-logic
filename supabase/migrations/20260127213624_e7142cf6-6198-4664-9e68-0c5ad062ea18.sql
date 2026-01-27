-- Add wallet address and Base-related columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS wallet_address text,
ADD COLUMN IF NOT EXISTS base_name text,
ADD COLUMN IF NOT EXISTS base_attestation_uid text,
ADD COLUMN IF NOT EXISTS wallet_connected_at timestamptz;

-- Create unique index on wallet_address to prevent multi-accounting
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_wallet_address 
ON public.profiles(wallet_address) 
WHERE wallet_address IS NOT NULL;

-- Create index for basename lookups
CREATE INDEX IF NOT EXISTS idx_profiles_base_name 
ON public.profiles(base_name) 
WHERE base_name IS NOT NULL;