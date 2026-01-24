-- Allow authenticated users to create lobbies
CREATE POLICY "Users can create lobbies"
ON lobbies FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = host_id);

-- Allow hosts to add other players to their lobbies
CREATE POLICY "Hosts can add players to their lobbies"
ON lobby_players FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM lobbies
    WHERE lobbies.id = lobby_id
    AND lobbies.host_id = auth.uid()
  )
);