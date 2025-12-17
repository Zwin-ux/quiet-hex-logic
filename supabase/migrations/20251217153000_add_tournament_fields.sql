-- Add prize_pool and is_featured columns to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS prize_pool TEXT,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Create an index for featured tournaments for faster lookups
CREATE INDEX IF NOT EXISTS idx_tournaments_is_featured ON public.tournaments(is_featured) WHERE is_featured = true;
