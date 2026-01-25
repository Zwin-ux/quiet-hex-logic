-- ================================================
-- FIX: Profiles RLS infinite recursion
-- The previous policy had a subquery on profiles within the profiles policy,
-- causing infinite recursion. This fix uses a SECURITY DEFINER function
-- to safely check profile visibility.
-- ================================================

-- Drop the recursive policy
DROP POLICY IF EXISTS "profiles_select_restricted" ON public.profiles;

-- Create a helper function to check profile visibility
-- Uses SECURITY DEFINER to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.can_view_profile(_viewer_id uuid, _profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    -- Own profile
    _viewer_id = _profile_id
    OR
    -- Friends (accepted)
    EXISTS (
      SELECT 1 FROM public.friends
      WHERE status = 'accepted'
        AND (
          (a = _viewer_id AND b = _profile_id)
          OR (b = _viewer_id AND a = _profile_id)
        )
    )
    OR
    -- Match opponents (past or current)
    EXISTS (
      SELECT 1 FROM public.match_players mp1
      JOIN public.match_players mp2 ON mp1.match_id = mp2.match_id
      WHERE mp1.profile_id = _viewer_id AND mp2.profile_id = _profile_id
    )
    OR
    -- Lobby members
    EXISTS (
      SELECT 1 FROM public.lobby_players lp1
      JOIN public.lobby_players lp2 ON lp1.lobby_id = lp2.lobby_id
      WHERE lp1.player_id = _viewer_id AND lp2.player_id = _profile_id
    )
    OR
    -- Tournament co-participants
    EXISTS (
      SELECT 1 FROM public.tournament_players tp1
      JOIN public.tournament_players tp2 ON tp1.tournament_id = tp2.tournament_id
      WHERE tp1.profile_id = _viewer_id AND tp2.profile_id = _profile_id
    )
  )
$$;

-- Create a helper function to get top 100 player IDs (for leaderboard)
-- This avoids the recursive subquery issue
CREATE OR REPLACE FUNCTION public.get_leaderboard_profile_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles
  WHERE is_guest IS NOT TRUE
  ORDER BY elo_rating DESC NULLS LAST
  LIMIT 100
$$;

-- Create the safe profiles SELECT policy
CREATE POLICY "profiles_select_safe"
ON public.profiles
FOR SELECT
USING (
  public.can_view_profile(auth.uid(), id)
  OR
  id IN (SELECT public.get_leaderboard_profile_ids())
);

-- ================================================
-- Also ensure service role has full access (for edge functions)
-- ================================================
DROP POLICY IF EXISTS "Service role full access to profiles" ON public.profiles;
CREATE POLICY "Service role full access to profiles"
ON public.profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
