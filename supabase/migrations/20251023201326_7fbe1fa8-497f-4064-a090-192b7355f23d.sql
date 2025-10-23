-- Fix guest mode security: Restrict unauthenticated access to AI-only matches
-- This prevents abuse while maintaining "try before you sign up" experience

-- Drop existing guest-permissive policies
DROP POLICY IF EXISTS "matches_insert" ON public.matches;
DROP POLICY IF EXISTS "matches_select" ON public.matches;
DROP POLICY IF EXISTS "matches_update" ON public.matches;
DROP POLICY IF EXISTS "match_players_insert" ON public.match_players;
DROP POLICY IF EXISTS "match_players_select" ON public.match_players;
DROP POLICY IF EXISTS "moves_insert" ON public.moves;
DROP POLICY IF EXISTS "moves_select" ON public.moves;

-- Matches: Allow insert only for authenticated users OR guest AI-only matches
CREATE POLICY "matches_insert" ON public.matches
FOR INSERT 
WITH CHECK (
  -- Authenticated users can create any match
  (auth.uid() = owner) OR
  -- Guests can only create AI practice matches (with valid difficulty)
  (auth.uid() IS NULL AND owner IS NULL AND ai_difficulty IS NOT NULL)
);

-- Matches: Allow select for participants, waiting matches, and guest AI matches
CREATE POLICY "matches_select" ON public.matches
FOR SELECT USING (
  -- Can see if you're a player in the match
  (auth.uid() IS NOT NULL AND EXISTS(
    SELECT 1 FROM public.match_players mp 
    WHERE mp.match_id = id AND mp.profile_id = auth.uid()
  )) OR
  -- Can see waiting matches (to join)
  (status = 'waiting') OR
  -- Can see your own matches
  (auth.uid() = owner) OR
  -- Guests can see AI-only guest matches
  (owner IS NULL AND ai_difficulty IS NOT NULL) OR
  -- Can see spectatable active matches
  (status = 'active' AND allow_spectators = true)
);

-- Matches: Allow updates only for authenticated participants or service role
CREATE POLICY "matches_update" ON public.matches
FOR UPDATE USING (
  -- Service role can update (for edge functions)
  (auth.role() = 'service_role') OR
  -- Authenticated players in the match can update
  (auth.uid() IS NOT NULL AND EXISTS(
    SELECT 1 FROM public.match_players mp 
    WHERE mp.match_id = id AND mp.profile_id = auth.uid()
  ))
);

-- Match Players: Restrict to authenticated users only (no guest multiplayer)
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

-- Match Players: Allow viewing for participants and spectators
CREATE POLICY "match_players_select" ON public.match_players
FOR SELECT USING (
  -- Can see if authenticated and in the match
  (auth.uid() IS NOT NULL AND EXISTS(
    SELECT 1 FROM public.match_players mp 
    WHERE mp.match_id = match_id AND mp.profile_id = auth.uid()
  )) OR
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

-- Moves: Restrict inserts to authenticated players only
CREATE POLICY "moves_insert" ON public.moves
FOR INSERT 
WITH CHECK (
  -- Must be authenticated and in the match
  auth.uid() IS NOT NULL AND EXISTS(
    SELECT 1 FROM public.match_players mp 
    WHERE mp.match_id = match_id AND mp.profile_id = auth.uid()
  )
);

-- Moves: Allow viewing for participants, spectators, and guest AI matches
CREATE POLICY "moves_select" ON public.moves
FOR SELECT USING (
  -- Can see if authenticated and in the match
  (auth.uid() IS NOT NULL AND EXISTS(
    SELECT 1 FROM public.match_players mp 
    WHERE mp.match_id = match_id AND mp.profile_id = auth.uid()
  )) OR
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