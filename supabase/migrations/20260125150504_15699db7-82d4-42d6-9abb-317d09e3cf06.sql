-- Create security definer function to check profile visibility without recursion
CREATE OR REPLACE FUNCTION public.can_view_profile(_viewer_id uuid, _profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    -- Always allow viewing own profile
    _viewer_id = _profile_id
    OR
    -- Friends (accepted status)
    EXISTS (
      SELECT 1 FROM public.friends
      WHERE status = 'accepted'
        AND (
          (a = _viewer_id AND b = _profile_id) 
          OR (b = _viewer_id AND a = _profile_id)
        )
    )
    OR
    -- Match opponents (current or past)
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
    -- Top 100 leaderboard players (non-guest only, no recursive query)
    EXISTS (
      SELECT 1 FROM (
        SELECT id FROM public.profiles
        WHERE is_guest IS NOT TRUE
        ORDER BY elo_rating DESC NULLS LAST
        LIMIT 100
      ) top_players
      WHERE top_players.id = _profile_id
    )
    OR
    -- Allow viewing profiles of players in spectatable matches
    EXISTS (
      SELECT 1 FROM public.match_players mp
      JOIN public.matches m ON m.id = mp.match_id
      WHERE mp.profile_id = _profile_id
        AND m.allow_spectators = true
        AND m.status IN ('active', 'finished')
    )
  )
$$;

-- Drop any prior policies
DROP POLICY IF EXISTS "profiles_select_restricted" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_safe" ON public.profiles;

-- Create new non-recursive policy using the security definer function
CREATE POLICY "profiles_select_safe"
ON public.profiles
FOR SELECT
USING (
  -- Allow if viewer can view this profile OR if no auth context (for joins)
  auth.uid() IS NULL 
  OR public.can_view_profile(auth.uid(), id)
);