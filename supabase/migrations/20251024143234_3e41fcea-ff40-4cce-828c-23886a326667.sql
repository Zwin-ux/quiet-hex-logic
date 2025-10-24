-- Fix infinite recursion by updating policies to use existing user_in_match function

-- Update matches_select policy
DROP POLICY IF EXISTS "matches_select" ON public.matches;
CREATE POLICY "matches_select" ON public.matches
FOR SELECT USING (
  (auth.uid() IS NOT NULL AND public.user_in_match(id, auth.uid())) OR
  (status = 'waiting') OR
  (auth.uid() = owner) OR
  (owner IS NULL AND ai_difficulty IS NOT NULL) OR
  (status = 'active' AND allow_spectators = true)
);

-- Update matches_update policy
DROP POLICY IF EXISTS "matches_update" ON public.matches;
CREATE POLICY "matches_update" ON public.matches
FOR UPDATE USING (
  (auth.role() = 'service_role') OR
  (auth.uid() IS NOT NULL AND public.user_in_match(id, auth.uid()))
);

-- Update match_players_select policy
DROP POLICY IF EXISTS "match_players_select" ON public.match_players;
CREATE POLICY "match_players_select" ON public.match_players
FOR SELECT USING (
  (auth.uid() IS NOT NULL AND public.user_in_match(match_id, auth.uid())) OR
  (EXISTS(SELECT 1 FROM public.matches m WHERE m.id = match_id AND m.allow_spectators = true)) OR
  (auth.uid() IS NULL AND EXISTS(SELECT 1 FROM public.matches m WHERE m.id = match_id AND m.owner IS NULL AND m.ai_difficulty IS NOT NULL))
);

-- Update moves_insert policy
DROP POLICY IF EXISTS "moves_insert" ON public.moves;
CREATE POLICY "moves_insert" ON public.moves
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND public.user_in_match(match_id, auth.uid())
);

-- Update moves_select policy
DROP POLICY IF EXISTS "moves_select" ON public.moves;
CREATE POLICY "moves_select" ON public.moves
FOR SELECT USING (
  (auth.uid() IS NOT NULL AND public.user_in_match(match_id, auth.uid())) OR
  (EXISTS(SELECT 1 FROM public.matches m WHERE m.id = match_id AND m.allow_spectators = true)) OR
  (auth.uid() IS NULL AND EXISTS(SELECT 1 FROM public.matches m WHERE m.id = match_id AND m.owner IS NULL AND m.ai_difficulty IS NOT NULL))
);