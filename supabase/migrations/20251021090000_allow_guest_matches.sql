-- Allow guest users to create and play matches
-- This migration relaxes RLS policies to support guest play

-- Drop existing policies for matches
DROP POLICY IF EXISTS "matches_insert" ON public.matches;
DROP POLICY IF EXISTS "matches_select" ON public.matches;
DROP POLICY IF EXISTS "matches_update" ON public.matches;

-- New policy: Allow anyone (including guests) to insert matches
CREATE POLICY "matches_insert" ON public.matches
  FOR INSERT WITH CHECK (
    -- Allow if authenticated and owner matches
    (auth.uid() = owner) OR
    -- Allow if not authenticated (guest mode)
    (auth.uid() IS NULL)
  );

-- New policy: Allow anyone to view waiting matches or their own matches
CREATE POLICY "matches_select" ON public.matches
  FOR SELECT USING (
    -- Can see waiting matches
    status = 'waiting' OR
    -- Can see own matches if authenticated
    (auth.uid() IS NOT NULL AND EXISTS(
      SELECT 1 FROM public.match_players mp 
      WHERE mp.match_id = id AND mp.profile_id = auth.uid()
    )) OR
    -- Can see matches where owner is null (guest matches)
    owner IS NULL OR
    -- Can see matches with allow_spectators enabled
    (status = 'active' AND allow_spectators = true)
  );

-- New policy: Allow updates for players in the match or guests
CREATE POLICY "matches_update" ON public.matches
  FOR UPDATE USING (
    -- Allow if authenticated and in the match
    (auth.uid() IS NOT NULL AND EXISTS(
      SELECT 1 FROM public.match_players mp 
      WHERE mp.match_id = id AND mp.profile_id = auth.uid()
    )) OR
    -- Allow if owner is null (guest match)
    owner IS NULL
  );

-- Update match_players policies to support guest mode
DROP POLICY IF EXISTS "match_players_insert" ON public.match_players;
DROP POLICY IF EXISTS "match_players_select" ON public.match_players;

-- Allow anyone to insert match players for guest matches
CREATE POLICY "match_players_insert" ON public.match_players
  FOR INSERT WITH CHECK (
    -- Allow if authenticated and owner of match
    (auth.uid() IS NOT NULL AND EXISTS(
      SELECT 1 FROM public.matches m 
      WHERE m.id = match_id AND m.owner = auth.uid()
    )) OR
    -- Allow if match owner is null (guest match)
    EXISTS(
      SELECT 1 FROM public.matches m 
      WHERE m.id = match_id AND m.owner IS NULL
    )
  );

-- Allow viewing match players for matches you're in or guest matches
CREATE POLICY "match_players_select" ON public.match_players
  FOR SELECT USING (
    -- Can see if authenticated and in the match
    (auth.uid() IS NOT NULL AND EXISTS(
      SELECT 1 FROM public.match_players mp 
      WHERE mp.match_id = match_id AND mp.profile_id = auth.uid()
    )) OR
    -- Can see if match owner is null (guest match)
    EXISTS(
      SELECT 1 FROM public.matches m 
      WHERE m.id = match_id AND m.owner IS NULL
    ) OR
    -- Can see if match allows spectators
    EXISTS(
      SELECT 1 FROM public.matches m 
      WHERE m.id = match_id AND m.allow_spectators = true
    )
  );

-- Update moves policies to support guest mode
DROP POLICY IF EXISTS "moves_insert" ON public.moves;
DROP POLICY IF EXISTS "moves_select" ON public.moves;

-- Allow inserting moves in guest matches
CREATE POLICY "moves_insert" ON public.moves
  FOR INSERT WITH CHECK (
    -- Allow if authenticated and in the match
    (auth.uid() IS NOT NULL AND EXISTS(
      SELECT 1 FROM public.match_players mp 
      WHERE mp.match_id = match_id AND mp.profile_id = auth.uid()
    )) OR
    -- Allow if match owner is null (guest match)
    EXISTS(
      SELECT 1 FROM public.matches m 
      WHERE m.id = match_id AND m.owner IS NULL
    )
  );

-- Allow viewing moves in guest matches
CREATE POLICY "moves_select" ON public.moves
  FOR SELECT USING (
    -- Can see if authenticated and in the match
    (auth.uid() IS NOT NULL AND EXISTS(
      SELECT 1 FROM public.match_players mp 
      WHERE mp.match_id = match_id AND mp.profile_id = auth.uid()
    )) OR
    -- Can see if match owner is null (guest match)
    EXISTS(
      SELECT 1 FROM public.matches m 
      WHERE m.id = match_id AND m.owner IS NULL
    ) OR
    -- Can see if match allows spectators
    EXISTS(
      SELECT 1 FROM public.matches m 
      WHERE m.id = match_id AND m.allow_spectators = true
    )
  );

-- Make owner nullable in matches table to support guest mode
ALTER TABLE public.matches ALTER COLUMN owner DROP NOT NULL;
