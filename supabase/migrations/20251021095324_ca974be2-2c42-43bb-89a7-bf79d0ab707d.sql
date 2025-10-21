-- Update matches RLS policies to support guest matches
-- Guest matches have owner = NULL and should be allowed

-- Drop and recreate the insert policy to allow NULL owners
DROP POLICY IF EXISTS "matches_insert" ON public.matches;

CREATE POLICY "matches_insert" 
ON public.matches 
FOR INSERT 
WITH CHECK (
  auth.uid() = owner OR owner IS NULL
);