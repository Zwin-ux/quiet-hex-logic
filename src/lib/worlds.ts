import { supabase } from '@/integrations/supabase/client';

export type WorldVisibility = 'public' | 'private';
export type WorldRole = 'owner' | 'admin' | 'member';

export type WorldSummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  visibility: WorldVisibility;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  ownerName: string;
  ownerAvatarColor: string | null;
  memberCount: number;
  eventCount: number;
  instanceCount: number;
  userRole: WorldRole | null;
};

export type WorldEventSummary = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  format: string;
  competitiveMode: boolean;
  maxPlayers: number;
  participantCount: number;
  createdAt: string;
  startTime: string | null;
};

export type WorldLobbySummary = {
  id: string;
  code: string;
  hostId: string;
  hostUsername: string;
  gameKey: string;
  boardSize: number;
  pieRule: boolean;
  status: string;
  playerCount: number;
  createdAt: string;
};

export type WorldMatchSummary = {
  id: string;
  gameKey: string;
  size: number;
  updatedAt: string;
  allowSpectators: boolean;
  status: string;
};

export type WorldOverview = {
  world: WorldSummary;
  events: WorldEventSummary[];
  lobbies: WorldLobbySummary[];
  matches: WorldMatchSummary[];
};

export type WorldOption = {
  id: string;
  name: string;
};

type WorldRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  visibility: WorldVisibility;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  username: string | null;
  avatar_color: string | null;
};

type MembershipRow = {
  world_id: string;
  profile_id: string;
  role: WorldRole;
};

type TournamentRow = {
  id: string;
  world_id?: string | null;
  name: string;
  description: string | null;
  status: string;
  format: string;
  competitive_mode: boolean;
  max_players: number;
  created_at: string;
  start_time: string | null;
};

type TournamentParticipantRow = {
  tournament_id: string;
};

type LobbyRow = {
  id: string;
  world_id?: string | null;
  code: string;
  host_id: string;
  game_key: string | null;
  board_size: number;
  pie_rule: boolean;
  status: string;
  created_at: string;
};

type LobbyPlayerRow = {
  lobby_id: string;
};

type MatchRow = {
  id: string;
  world_id?: string | null;
  game_key: string | null;
  size: number;
  updated_at: string;
  allow_spectators: boolean | null;
  status: string;
};

function db() {
  return supabase as any;
}

function shouldFallbackToLegacy(error: any) {
  const message = typeof error?.message === 'string' ? error.message : '';
  return (
    error?.code === 'PGRST202' ||
    error?.code === '42883' ||
    message.includes('Could not find the function') ||
    message.includes('function public.')
  );
}

async function callRpc<T>(fn: string, args?: Record<string, unknown>) {
  const { data, error } = await db().rpc(fn, args ?? {});

  if (error) {
    if (shouldFallbackToLegacy(error)) {
      return null;
    }
    throw error;
  }

  return (data ?? null) as T | null;
}

export function slugifyWorldName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return base || 'world';
}

function uniqueSlug(base: string, attempt: number): string {
  if (attempt === 0) return base;

  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

async function fetchProfiles(ids: string[]) {
  if (ids.length === 0) return new Map<string, ProfileRow>();

  const { data, error } = await db()
    .from('profiles')
    .select('id, username, avatar_color')
    .in('id', ids);

  if (error) throw error;

  return new Map<string, ProfileRow>(
    ((data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]),
  );
}

function buildWorldSummary(args: {
  world: WorldRow;
  profiles: Map<string, ProfileRow>;
  memberships: MembershipRow[];
  tournaments: TournamentRow[];
  lobbies: LobbyRow[];
  matches: MatchRow[];
  currentUserId?: string;
}): WorldSummary {
  const owner = args.world.created_by ? args.profiles.get(args.world.created_by) : null;
  const userMembership = args.currentUserId
    ? args.memberships.find(
        (membership) =>
          membership.world_id === args.world.id &&
          membership.profile_id === args.currentUserId,
      )
    : null;

  const lobbiesInWorld = args.lobbies.filter((lobby) => lobby.world_id === args.world.id);
  const matchesInWorld = args.matches.filter((match) => match.world_id === args.world.id);
  const tournamentsInWorld = args.tournaments.filter(
    (tournament: any) => tournament.world_id === args.world.id,
  );
  const membersInWorld = args.memberships.filter(
    (membership) => membership.world_id === args.world.id,
  );

  return {
    id: args.world.id,
    slug: args.world.slug,
    name: args.world.name,
    description: args.world.description,
    visibility: args.world.visibility,
    createdBy: args.world.created_by,
    createdAt: args.world.created_at,
    updatedAt: args.world.updated_at,
    ownerName: owner?.username?.trim() || 'Host',
    ownerAvatarColor: owner?.avatar_color ?? null,
    memberCount: membersInWorld.length,
    eventCount: tournamentsInWorld.length,
    instanceCount: lobbiesInWorld.length + matchesInWorld.length,
    userRole: userMembership?.role ?? null,
  };
}

export async function listWorlds(currentUserId?: string) {
  const rpcWorlds = await callRpc<WorldSummary[]>('list_worlds');
  if (rpcWorlds) {
    return rpcWorlds;
  }

  const { data: worldsData, error: worldsError } = await db()
    .from('worlds')
    .select('id, slug, name, description, visibility, created_by, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (worldsError) throw worldsError;

  const worlds = (worldsData ?? []) as WorldRow[];
  const worldIds = worlds.map((world) => world.id);
  const ownerIds = worlds
    .map((world) => world.created_by)
    .filter((value): value is string => Boolean(value));

  const [profiles, membershipsResult, tournamentsResult, lobbiesResult, matchesResult] =
    await Promise.all([
      fetchProfiles(ownerIds),
      worldIds.length
        ? db()
            .from('world_members')
            .select('world_id, profile_id, role')
            .in('world_id', worldIds)
        : Promise.resolve({ data: [], error: null }),
      worldIds.length
        ? db()
            .from('tournaments')
            .select('id, world_id, name, description, status, format, competitive_mode, max_players, created_at, start_time')
            .in('world_id', worldIds)
        : Promise.resolve({ data: [], error: null }),
      worldIds.length
        ? db()
            .from('lobbies')
            .select('id, world_id, code, host_id, game_key, board_size, pie_rule, status, created_at')
            .in('world_id', worldIds)
        : Promise.resolve({ data: [], error: null }),
      worldIds.length
        ? db()
            .from('matches')
            .select('id, world_id, game_key, size, updated_at, allow_spectators, status')
            .in('world_id', worldIds)
            .eq('status', 'active')
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (membershipsResult.error) throw membershipsResult.error;
  if (tournamentsResult.error) throw tournamentsResult.error;
  if (lobbiesResult.error) throw lobbiesResult.error;
  if (matchesResult.error) throw matchesResult.error;

  const memberships = (membershipsResult.data ?? []) as MembershipRow[];
  const tournaments = (tournamentsResult.data ?? []) as (TournamentRow & { world_id: string })[];
  const lobbies = (lobbiesResult.data ?? []) as (LobbyRow & { world_id: string })[];
  const matches = (matchesResult.data ?? []) as (MatchRow & { world_id: string })[];

  return worlds.map((world) =>
    buildWorldSummary({
      world,
      profiles,
      memberships,
      tournaments,
      lobbies,
      matches,
      currentUserId,
    }),
  );
}

export async function loadWorldOverview(worldId: string, currentUserId?: string) {
  const rpcOverview = await callRpc<WorldOverview>('get_world_overview', {
    p_world_id: worldId,
  });
  if (rpcOverview) {
    return rpcOverview;
  }

  const { data: worldData, error: worldError } = await db()
    .from('worlds')
    .select('id, slug, name, description, visibility, created_by, created_at, updated_at')
    .eq('id', worldId)
    .single();

  if (worldError) throw worldError;
  if (!worldData) throw new Error('World not found');

  const world = worldData as WorldRow;

  const [membershipsResult, tournamentsResult, lobbiesResult, matchesResult] = await Promise.all([
    db()
      .from('world_members')
      .select('world_id, profile_id, role')
      .eq('world_id', worldId),
    db()
      .from('tournaments')
      .select('id, world_id, name, description, status, format, competitive_mode, max_players, created_at, start_time')
      .eq('world_id', worldId)
      .order('created_at', { ascending: false }),
    db()
      .from('lobbies')
      .select('id, world_id, code, host_id, game_key, board_size, pie_rule, status, created_at')
      .eq('world_id', worldId)
      .in('status', ['waiting', 'starting'])
      .order('created_at', { ascending: false }),
    db()
      .from('matches')
      .select('id, world_id, game_key, size, updated_at, allow_spectators, status')
      .eq('world_id', worldId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false }),
  ]);

  if (membershipsResult.error) throw membershipsResult.error;
  if (tournamentsResult.error) throw tournamentsResult.error;
  if (lobbiesResult.error) throw lobbiesResult.error;
  if (matchesResult.error) throw matchesResult.error;

  const memberships = (membershipsResult.data ?? []) as MembershipRow[];
  const ownerIds = [
    world.created_by,
    ...((lobbiesResult.data ?? []) as LobbyRow[]).map((lobby) => lobby.host_id),
  ].filter((value): value is string => Boolean(value));
  const profiles = await fetchProfiles(Array.from(new Set(ownerIds)));

  const tournaments = (tournamentsResult.data ?? []) as TournamentRow[];
  const lobbies = (lobbiesResult.data ?? []) as LobbyRow[];
  const matches = (matchesResult.data ?? []) as MatchRow[];

  const tournamentIds = tournaments.map((tournament) => tournament.id);
  const lobbyIds = lobbies.map((lobby) => lobby.id);

  const [participantsResult, lobbyPlayersResult] = await Promise.all([
    tournamentIds.length
      ? db()
          .from('tournament_participants')
          .select('tournament_id')
          .in('tournament_id', tournamentIds)
      : Promise.resolve({ data: [], error: null }),
    lobbyIds.length
      ? db()
          .from('lobby_players')
          .select('lobby_id')
          .in('lobby_id', lobbyIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (participantsResult.error) throw participantsResult.error;
  if (lobbyPlayersResult.error) throw lobbyPlayersResult.error;

  const participants = (participantsResult.data ?? []) as TournamentParticipantRow[];
  const lobbyPlayers = (lobbyPlayersResult.data ?? []) as LobbyPlayerRow[];

  const worldSummary = buildWorldSummary({
    world,
    profiles,
    memberships,
    tournaments: tournaments.map((item) => ({ ...item, world_id: worldId })),
    lobbies: lobbies.map((item) => ({ ...item, world_id: worldId })),
    matches: matches.map((item) => ({ ...item, world_id: worldId })),
    currentUserId,
  });

  return {
    world: worldSummary,
    events: tournaments.map((tournament) => ({
      id: tournament.id,
      name: tournament.name,
      description: tournament.description,
      status: tournament.status,
      format: tournament.format,
      competitiveMode: tournament.competitive_mode,
      maxPlayers: tournament.max_players,
      participantCount: participants.filter(
        (participant) => participant.tournament_id === tournament.id,
      ).length,
      createdAt: tournament.created_at,
      startTime: tournament.start_time,
    })),
    lobbies: lobbies.map((lobby) => ({
      id: lobby.id,
      code: lobby.code,
      hostId: lobby.host_id,
      hostUsername: profiles.get(lobby.host_id)?.username?.trim() || 'Host',
      gameKey: lobby.game_key ?? 'hex',
      boardSize: lobby.board_size,
      pieRule: lobby.pie_rule,
      status: lobby.status,
      playerCount: lobbyPlayers.filter((player) => player.lobby_id === lobby.id).length,
      createdAt: lobby.created_at,
    })),
    matches: matches.map((match) => ({
      id: match.id,
      gameKey: match.game_key ?? 'hex',
      size: match.size,
      updatedAt: match.updated_at,
      allowSpectators: match.allow_spectators !== false,
      status: match.status,
    })),
  } as WorldOverview;
}

export async function createWorld(input: {
  userId: string;
  name: string;
  description?: string;
  visibility?: WorldVisibility;
}) {
  const rpcWorld = await callRpc<WorldRow>('create_world_atomic', {
    p_name: input.name,
    p_description: input.description ?? null,
    p_visibility: input.visibility ?? 'public',
  });
  if (rpcWorld) {
    return rpcWorld;
  }

  const name = input.name.trim();
  const description = input.description?.trim() || null;
  const visibility = input.visibility ?? 'public';
  const baseSlug = slugifyWorldName(name);

  let world: WorldRow | null = null;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = uniqueSlug(baseSlug, attempt);
    const { data, error } = await db()
      .from('worlds')
      .insert({
        name,
        slug,
        description,
        visibility,
        created_by: input.userId,
      })
      .select('id, slug, name, description, visibility, created_by, created_at, updated_at')
      .single();

    if (!error && data) {
      world = data as WorldRow;
      break;
    }

    lastError = error;

    if (error?.code !== '23505') {
      throw error;
    }
  }

  if (!world) {
    throw lastError instanceof Error
      ? lastError
      : new Error('Failed to create world');
  }

  const { error: membershipError } = await db()
    .from('world_members')
    .insert({
      world_id: world.id,
      profile_id: input.userId,
      role: 'owner',
    });

  if (membershipError) throw membershipError;

  return world;
}

export async function listManageableWorlds(userId: string) {
  const rpcWorlds = await callRpc<WorldOption[]>('list_manageable_worlds');
  if (rpcWorlds) {
    return rpcWorlds;
  }

  const { data: memberships, error: membershipsError } = await db()
    .from('world_members')
    .select('world_id, role')
    .eq('profile_id', userId)
    .in('role', ['owner', 'admin']);

  if (membershipsError) throw membershipsError;

  const worldIds = ((memberships ?? []) as Array<{ world_id: string }>).map(
    (membership) => membership.world_id,
  );

  if (worldIds.length === 0) return [] as WorldOption[];

  const { data: worlds, error: worldsError } = await db()
    .from('worlds')
    .select('id, name')
    .in('id', worldIds)
    .order('name', { ascending: true });

  if (worldsError) throw worldsError;

  return ((worlds ?? []) as WorldOption[]).map((world) => ({
    id: world.id,
    name: world.name,
  }));
}

export async function joinWorld(worldId: string, userId: string) {
  const rpcMembership = await callRpc('join_world_atomic', {
    p_world_id: worldId,
  });
  if (rpcMembership) {
    return;
  }

  const { error } = await db()
    .from('world_members')
    .upsert(
      {
        world_id: worldId,
        profile_id: userId,
        role: 'member',
      },
      { onConflict: 'world_id,profile_id' },
    );

  if (error) throw error;
}

export function canManageWorld(world: WorldSummary) {
  return world.userRole === 'owner' || world.userRole === 'admin';
}
