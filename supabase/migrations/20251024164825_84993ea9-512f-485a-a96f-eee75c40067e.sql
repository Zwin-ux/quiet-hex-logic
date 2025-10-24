-- Create helper to avoid recursion in lobby_players policy
CREATE OR REPLACE FUNCTION public.user_in_lobby(_lobby_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lobby_players
    WHERE lobby_id = _lobby_id AND player_id = _user_id
  );
$$;

-- Fix lobby_players SELECT policy to avoid self-reference recursion
DROP POLICY IF EXISTS "Users can view lobby players in their lobbies" ON public.lobby_players;
CREATE POLICY "Users can view lobby players in their lobbies" ON public.lobby_players
FOR SELECT USING (
  player_id = auth.uid() OR public.user_in_lobby(lobby_players.lobby_id, auth.uid())
);
