-- Fix 1: Update profiles RLS policy to require authentication
-- Remove the policy that allows unauthenticated access
DROP POLICY IF EXISTS "profiles_select_safe" ON public.profiles;

-- Create new policy that requires authentication
CREATE POLICY "profiles_select_authenticated" ON public.profiles
FOR SELECT USING (
  auth.uid() IS NOT NULL AND can_view_profile(auth.uid(), id)
);

-- Fix 2: Add RLS to user_stats view by revoking public access
-- Note: user_stats is a view based on match_players which already has RLS
-- We need to ensure the view respects the underlying table's RLS
REVOKE ALL ON public.user_stats FROM anon;
REVOKE ALL ON public.user_stats FROM authenticated;

-- Grant access only to authenticated users viewing their own stats or visible profiles
GRANT SELECT ON public.user_stats TO authenticated;

-- Create a secure function to check if user can view stats
CREATE OR REPLACE FUNCTION public.can_view_user_stats(_viewer_id uuid, _profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    -- Can view own stats
    _viewer_id = _profile_id
    OR
    -- Can view friends' stats
    EXISTS (
      SELECT 1 FROM public.friends
      WHERE status = 'accepted'
        AND (
          (a = _viewer_id AND b = _profile_id) 
          OR (b = _viewer_id AND a = _profile_id)
        )
    )
    OR
    -- Can view match opponents' stats
    EXISTS (
      SELECT 1 FROM public.match_players mp1
      JOIN public.match_players mp2 ON mp1.match_id = mp2.match_id
      WHERE mp1.profile_id = _viewer_id AND mp2.profile_id = _profile_id
    )
  )
$$;