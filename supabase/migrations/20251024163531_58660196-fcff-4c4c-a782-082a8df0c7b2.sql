-- Fix lobby creation by allowing host to view their own lobby
DROP POLICY IF EXISTS "Users can view lobbies they're in" ON public.lobbies;
CREATE POLICY "Users can view lobbies they're in" ON public.lobbies
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM lobby_players
    WHERE lobby_players.lobby_id = lobbies.id
    AND lobby_players.player_id = auth.uid()
  ) OR auth.uid() = host_id
);