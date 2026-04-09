-- Introduce host-owned worlds as the container for events and instances.
CREATE TABLE public.worlds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.world_members (
  world_id UUID NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (world_id, profile_id)
);

ALTER TABLE public.lobbies
  ADD COLUMN IF NOT EXISTS world_id UUID REFERENCES public.worlds(id) ON DELETE SET NULL;

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS world_id UUID REFERENCES public.worlds(id) ON DELETE SET NULL;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS world_id UUID REFERENCES public.worlds(id) ON DELETE SET NULL;

CREATE INDEX idx_worlds_created_by ON public.worlds(created_by);
CREATE INDEX idx_world_members_profile_id ON public.world_members(profile_id);
CREATE INDEX idx_lobbies_world_id ON public.lobbies(world_id) WHERE world_id IS NOT NULL;
CREATE INDEX idx_tournaments_world_id ON public.tournaments(world_id) WHERE world_id IS NOT NULL;
CREATE INDEX idx_matches_world_id ON public.matches(world_id) WHERE world_id IS NOT NULL;

ALTER TABLE public.worlds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public worlds are visible"
  ON public.worlds
  FOR SELECT
  USING (
    visibility = 'public'
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.world_members
      WHERE world_id = worlds.id
        AND profile_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create worlds"
  ON public.worlds
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "World owners and admins can update worlds"
  ON public.worlds
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.world_members
      WHERE world_id = worlds.id
        AND profile_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "World owners can delete worlds"
  ON public.worlds
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "World memberships are visible"
  ON public.world_members
  FOR SELECT
  USING (true);

CREATE POLICY "Users can join worlds as themselves"
  ON public.world_members
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can leave their own memberships"
  ON public.world_members
  FOR DELETE
  TO authenticated
  USING (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.world_members owner_membership
      WHERE owner_membership.world_id = world_members.world_id
        AND owner_membership.profile_id = auth.uid()
        AND owner_membership.role IN ('owner', 'admin')
    )
  );

CREATE TRIGGER update_worlds_updated_at
BEFORE UPDATE ON public.worlds
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.worlds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.world_members;

CREATE POLICY "Public world lobbies are visible"
  ON public.lobbies
  FOR SELECT
  USING (
    world_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.worlds
        WHERE id = lobbies.world_id
          AND visibility = 'public'
      )
      OR EXISTS (
        SELECT 1
        FROM public.world_members
        WHERE world_id = lobbies.world_id
          AND profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "Public world matches are visible"
  ON public.matches
  FOR SELECT
  USING (
    world_id IS NOT NULL
    AND status = 'active'
    AND COALESCE(allow_spectators, true)
    AND (
      EXISTS (
        SELECT 1
        FROM public.worlds
        WHERE id = matches.world_id
          AND visibility = 'public'
      )
      OR EXISTS (
        SELECT 1
        FROM public.world_members
        WHERE world_id = matches.world_id
          AND profile_id = auth.uid()
      )
    )
  );
