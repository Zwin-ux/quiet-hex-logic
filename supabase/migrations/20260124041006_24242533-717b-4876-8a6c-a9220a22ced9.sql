-- Allow players to update their own match_players rows
CREATE POLICY "Players can update their own match_players rows"
ON match_players
FOR UPDATE
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);