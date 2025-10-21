-- Fix RLS policies to allow guest match creation
DROP POLICY IF EXISTS "matches_insert" ON matches;

-- Allow users to insert their own matches OR create guest matches (null owner)
CREATE POLICY "matches_insert" ON matches
FOR INSERT
WITH CHECK (
  (owner IS NULL) OR (auth.uid() = owner)
);

-- Also ensure matches can be selected properly for guest matches
DROP POLICY IF EXISTS "matches_select" ON matches;

CREATE POLICY "matches_select" ON matches
FOR SELECT
USING (
  (EXISTS (
    SELECT 1
    FROM match_players mp
    WHERE mp.match_id = matches.id
      AND mp.profile_id = auth.uid()
  ))
  OR (status = 'waiting')
  OR (owner = auth.uid())
  OR (owner IS NULL) -- Allow viewing guest matches
);