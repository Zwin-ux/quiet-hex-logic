-- Create lobbies table for pre-game rooms
CREATE TABLE public.lobbies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  host_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  board_size INTEGER NOT NULL DEFAULT 11,
  pie_rule BOOLEAN NOT NULL DEFAULT true,
  turn_timer_seconds INTEGER NOT NULL DEFAULT 45,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create lobby_players table to track who's in each lobby
CREATE TABLE public.lobby_players (
  lobby_id UUID REFERENCES public.lobbies(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'guest',
  is_ready BOOLEAN NOT NULL DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (lobby_id, player_id)
);

-- Add lobby reference to matches table
ALTER TABLE public.matches ADD COLUMN lobby_id UUID REFERENCES public.lobbies(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobby_players ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lobbies
CREATE POLICY "Users can view lobbies they're in"
ON public.lobbies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lobby_players
    WHERE lobby_id = lobbies.id
    AND player_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can create lobbies"
ON public.lobbies
FOR INSERT
WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host can update lobby settings"
ON public.lobbies
FOR UPDATE
USING (auth.uid() = host_id);

-- RLS Policies for lobby_players
CREATE POLICY "Users can view lobby players in their lobbies"
ON public.lobby_players
FOR SELECT
USING (
  player_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.lobby_players lp2
    WHERE lp2.lobby_id = lobby_players.lobby_id
    AND lp2.player_id = auth.uid()
  )
);

CREATE POLICY "Users can join lobbies"
ON public.lobby_players
FOR INSERT
WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Users can leave lobbies"
ON public.lobby_players
FOR DELETE
USING (auth.uid() = player_id);

CREATE POLICY "Users can update their own ready state"
ON public.lobby_players
FOR UPDATE
USING (auth.uid() = player_id);

-- Create function to generate unique 6-character lobby codes
CREATE OR REPLACE FUNCTION public.generate_lobby_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random 6-character uppercase alphanumeric code
    new_code := upper(substring(encode(gen_random_bytes(4), 'base32'), 1, 6));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM lobbies WHERE code = new_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Create function to find lobby by code
CREATE OR REPLACE FUNCTION public.find_lobby_by_code(lobby_code TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM lobbies
  WHERE code = upper(lobby_code)
  AND status = 'waiting'
  LIMIT 1;
$$;

-- Add trigger for updated_at
CREATE TRIGGER update_lobbies_updated_at
BEFORE UPDATE ON public.lobbies
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for lobbies
ALTER PUBLICATION supabase_realtime ADD TABLE public.lobbies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lobby_players;