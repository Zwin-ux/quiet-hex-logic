-- Create lobby_chat_messages table
CREATE TABLE public.lobby_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_lobby_chat_messages_lobby_id ON public.lobby_chat_messages(lobby_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.lobby_chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages in lobbies they're in
CREATE POLICY "Users can view lobby chat messages"
  ON public.lobby_chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lobby_players
      WHERE lobby_id = lobby_chat_messages.lobby_id
        AND player_id = auth.uid()
    )
  );

-- Policy: Users can send messages in lobbies they're in
CREATE POLICY "Users can send lobby chat messages"
  ON public.lobby_chat_messages
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.lobby_players
      WHERE lobby_id = lobby_chat_messages.lobby_id
        AND player_id = auth.uid()
    )
  );

-- Enable realtime for lobby chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.lobby_chat_messages;