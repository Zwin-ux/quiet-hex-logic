-- Add allow_spectators flag to matches table
ALTER TABLE public.matches 
ADD COLUMN allow_spectators boolean NOT NULL DEFAULT true;

-- Create spectators table
CREATE TABLE public.spectators (
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, profile_id)
);

-- Enable RLS on spectators table
ALTER TABLE public.spectators ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view spectators of a match they can see
CREATE POLICY "spectators_select"
ON public.spectators
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = spectators.match_id
      AND (
        m.status IN ('active', 'finished')
        OR EXISTS (
          SELECT 1 FROM public.match_players mp
          WHERE mp.match_id = m.id AND mp.profile_id = auth.uid()
        )
      )
  )
);

-- Allow users to join as spectators
CREATE POLICY "spectators_insert"
ON public.spectators
FOR INSERT
WITH CHECK (
  auth.uid() = profile_id
  AND EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = spectators.match_id
      AND m.allow_spectators = true
      AND m.status IN ('active', 'finished')
      AND NOT EXISTS (
        SELECT 1 FROM public.match_players mp
        WHERE mp.match_id = m.id AND mp.profile_id = auth.uid()
      )
  )
);

-- Allow users to leave as spectators
CREATE POLICY "spectators_delete"
ON public.spectators
FOR DELETE
USING (auth.uid() = profile_id);

-- Enable Realtime for spectators table
ALTER PUBLICATION supabase_realtime ADD TABLE public.spectators;