-- Create a security definer function to check if a user is anonymous
-- This follows the existing pattern used by has_role, is_blocked, etc.
CREATE OR REPLACE FUNCTION public.is_anonymous_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id AND is_anonymous = true
  )
$$;

-- Drop the existing insert policy
DROP POLICY IF EXISTS "matches_insert" ON public.matches;

-- Create new policy that prevents anonymous users from creating ranked matches
CREATE POLICY "matches_insert" ON public.matches
FOR INSERT
WITH CHECK (
  -- Authenticated users can create matches
  (
    auth.uid() = owner AND (
      -- Either it's not a ranked match
      is_ranked IS NOT TRUE OR
      -- Or the user is not anonymous (fully authenticated)
      NOT is_anonymous_user(auth.uid())
    )
  ) OR
  -- Guests can still create AI practice matches (unranked only)
  (auth.uid() IS NULL AND owner IS NULL AND ai_difficulty IS NOT NULL)
);

COMMENT ON POLICY "matches_insert" ON public.matches IS
'Allows authenticated users to create matches, but prevents anonymous/guest users from creating ranked matches. Guests can only create AI practice matches.';