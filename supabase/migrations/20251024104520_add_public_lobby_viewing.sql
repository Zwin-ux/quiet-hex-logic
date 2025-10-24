-- Allow all authenticated users to view waiting lobbies for public browsing
-- This enables the "Open Lobbies" section on the main lobby page

-- Add policy for public viewing of waiting lobbies
-- Note: This adds a SECOND policy. Postgres RLS uses OR logic between policies.
-- Users can see lobbies if EITHER:
-- 1. They're in the lobby or are the host (existing policy), OR
-- 2. The lobby status is 'waiting' (this new policy)

CREATE POLICY "Anyone can view waiting lobbies"
ON public.lobbies
FOR SELECT
USING (status = 'waiting');

-- This allows users to browse and join open lobbies
-- Once a lobby status changes to 'ready' or 'started', only players/host can see it
