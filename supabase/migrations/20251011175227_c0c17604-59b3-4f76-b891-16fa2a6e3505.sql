-- Fix critical RLS policy bug on moves table
-- The existing policies have 'mp.match_id = mp.match_id' which is always true
-- This allows any authenticated user to access moves in any match

-- Drop existing broken policies
DROP POLICY IF EXISTS "moves_select" ON public.moves;
DROP POLICY IF EXISTS "moves_insert" ON public.moves;

-- Create correct SELECT policy
-- Users can only view moves from matches they are participating in
CREATE POLICY "moves_select" 
ON public.moves 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM public.match_players mp
    WHERE mp.match_id = moves.match_id  -- Fixed: properly reference moves.match_id
      AND mp.profile_id = auth.uid()
  )
);

-- Create correct INSERT policy
-- Users can only insert moves into matches they are participating in
CREATE POLICY "moves_insert" 
ON public.moves 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.match_players mp
    WHERE mp.match_id = moves.match_id  -- Fixed: properly reference moves.match_id
      AND mp.profile_id = auth.uid()
  )
);