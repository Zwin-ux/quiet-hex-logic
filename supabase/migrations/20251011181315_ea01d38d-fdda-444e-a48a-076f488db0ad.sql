-- 1. Create server-side function to find match by code (eliminates enumeration attack)
CREATE OR REPLACE FUNCTION public.find_match_by_code(code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM matches
  WHERE status = 'waiting'
    AND upper(substring(
      encode(decode(replace(id::text, '-', ''), 'hex'), 'base32'),
      1, 6
    )) = upper(code)
  LIMIT 1;
$$;

-- 2. Fix blocks table policies - ensure DELETE works explicitly
DROP POLICY IF EXISTS blocks_all ON blocks;

CREATE POLICY blocks_insert ON blocks
FOR INSERT
WITH CHECK (blocker = auth.uid());

CREATE POLICY blocks_select ON blocks
FOR SELECT
USING (blocker = auth.uid() OR blocked = auth.uid());

CREATE POLICY blocks_delete ON blocks
FOR DELETE
USING (blocker = auth.uid());

-- 3. Add UNIQUE constraint to prevent duplicate players in matches
ALTER TABLE match_players 
ADD CONSTRAINT match_players_unique_player UNIQUE (match_id, profile_id);

-- 4. Tighten match_players policies - only owner can add players
DROP POLICY IF EXISTS match_players_insert ON match_players;

CREATE POLICY match_players_insert ON match_players
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = match_players.match_id 
    AND (m.owner = auth.uid() OR profile_id = auth.uid())
  )
);