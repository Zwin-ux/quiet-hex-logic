-- Fix infinite recursion in RLS policies by using security definer function

-- Create security definer function to check if user is in a match
CREATE OR REPLACE FUNCTION public.user_in_match(_match_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.match_players
    WHERE match_id = _match_id
      AND profile_id = _user_id
  )
$$;

-- Drop and recreate policies using the security definer function

-- Matches policies
DROP POLICY IF EXISTS "matches_select" ON public.matches;
DROP POLICY IF EXISTS "matches_update" ON public.matches;

CREATE POLICY "matches_select" ON public.matches
FOR SELECT USING (
  -- Can see if you're a player in the match
  (auth.uid() IS NOT NULL AND public.user_in_match(id, auth.uid())) OR
  -- Can see waiting matches (to join)
  (status = 'waiting') OR
  -- Can see your own matches
  (auth.uid() = owner) OR
  -- Guests can see AI-only guest matches
  (owner IS NULL AND ai_difficulty IS NOT NULL) OR
  -- Can see spectatable active matches
  (status = 'active' AND allow_spectators = true)
);

CREATE POLICY "matches_update" ON public.matches
FOR UPDATE USING (
  -- Service role can update (for edge functions)
  (auth.role() = 'service_role') OR
  -- Authenticated players in the match can update
  (auth.uid() IS NOT NULL AND public.user_in_match(id, auth.uid()))
);

-- Match Players policies
DROP POLICY IF EXISTS "match_players_insert" ON public.match_players;
DROP POLICY IF EXISTS "match_players_select" ON public.match_players;

CREATE POLICY "match_players_insert" ON public.match_players
FOR INSERT 
WITH CHECK (
  -- Must be authenticated
  auth.uid() IS NOT NULL AND
  (
    -- You're adding yourself to a match
    (profile_id = auth.uid()) OR
    -- Or you're the match owner adding a player
    (EXISTS(
      SELECT 1 FROM public.matches m 
      WHERE m.id = match_id AND m.owner = auth.uid()
    ))
  )
);

CREATE POLICY "match_players_select" ON public.match_players
FOR SELECT USING (
  -- Can see if authenticated and in the match
  (auth.uid() IS NOT NULL AND public.user_in_match(match_id, auth.uid())) OR
  -- Can see if match allows spectators
  (EXISTS(
    SELECT 1 FROM public.matches m 
    WHERE m.id = match_id AND m.allow_spectators = true
  )) OR
  -- Guests can see players in AI-only matches
  (auth.uid() IS NULL AND EXISTS(
    SELECT 1 FROM public.matches m 
    WHERE m.id = match_id AND m.owner IS NULL AND m.ai_difficulty IS NOT NULL
  ))
);

-- Moves policies
DROP POLICY IF EXISTS "moves_insert" ON public.moves;
DROP POLICY IF EXISTS "moves_select" ON public.moves;

CREATE POLICY "moves_insert" ON public.moves
FOR INSERT 
WITH CHECK (
  -- Must be authenticated and in the match
  auth.uid() IS NOT NULL AND public.user_in_match(match_id, auth.uid())
);

CREATE POLICY "moves_select" ON public.moves
FOR SELECT USING (
  -- Can see if authenticated and in the match
  (auth.uid() IS NOT NULL AND public.user_in_match(match_id, auth.uid())) OR
  -- Can see if match allows spectators
  (EXISTS(
    SELECT 1 FROM public.matches m 
    WHERE m.id = match_id AND m.allow_spectators = true
  )) OR
  -- Guests can see moves in AI-only guest matches
  (auth.uid() IS NULL AND EXISTS(
    SELECT 1 FROM public.matches m 
    WHERE m.id = match_id AND m.owner IS NULL AND m.ai_difficulty IS NOT NULL
  ))
);