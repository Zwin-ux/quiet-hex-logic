import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const lobbySchema = z.object({
  lobbyId: z.string().uuid('Invalid lobby ID'),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Service client is used to create modded matches with server-enforced rules snapshots.
    // In local dev environments without a service role key, we fall back to the user client,
    // and disallow starting modded matches.
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const service = serviceRoleKey
      ? createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceRoleKey)
      : null;
    const db = service ?? supabase;

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const body = await req.json();
    const parsed = lobbySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: parsed.error.format() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { lobbyId } = parsed.data;

    // Get lobby details
    const { data: lobby, error: lobbyError } = await db
      .from('lobbies')
      .select('*')
      .eq('id', lobbyId)
      .single();

    if (lobbyError) throw lobbyError;
    if (lobby.host_id !== user.id) {
      throw new Error('Only host can start match');
    }
    if (lobby.status !== 'waiting') {
      throw new Error('Lobby already started');
    }

    // Get all players
    const { data: players, error: playersError } = await db
      .from('lobby_players')
      .select('*')
      .eq('lobby_id', lobbyId);

    if (playersError) throw playersError;
    if (!players || players.length !== 2) {
      throw new Error('Need exactly 2 players to start');
    }

    // Check both ready
    const allReady = players.every(p => p.is_ready);
    if (!allReady) {
      throw new Error('All players must be ready');
    }

    // Optional: server-enforced variant rules snapshot from Workshop.
    const lobbyModVersionId = (lobby as any)?.mod_version_id ?? null;
    let rules: any = null;
    let modVersionId: string | null = null;
    if (typeof lobbyModVersionId === 'string' && lobbyModVersionId) {
      if (!service) {
        throw new Error('Server is missing service role key; cannot start a modded match in this environment');
      }

      const { data: ver, error: verErr } = await service
        .from('workshop_mod_versions' as any)
        .select('id, rules, workshop_mods!inner(game_key, is_published)')
        .eq('id', lobbyModVersionId)
        .maybeSingle();

      if (verErr) throw verErr;
      if (!ver) throw new Error('Unknown mod version');

      const modGameKey = (ver as any)?.workshop_mods?.game_key;
      const isPublished = (ver as any)?.workshop_mods?.is_published === true;
      const gameKey = (lobby as any).game_key ?? 'hex';

      if (!isPublished) throw new Error('Mod is not published');
      if (modGameKey !== gameKey) throw new Error('Mod does not match lobby game');

      rules = (ver as any).rules ?? null;
      modVersionId = (ver as any).id ?? null;
    }

    // Create match
    const { data: match, error: matchError } = await db
      .from('matches')
      .insert({
        lobby_id: lobbyId,
        owner: lobby.host_id,
        game_key: (lobby as any).game_key ?? 'hex',
        size: ((lobby as any).game_key ?? 'hex') === 'chess'
          ? 8
          : ((lobby as any).game_key ?? 'hex') === 'checkers'
            ? 8
            : ((lobby as any).game_key ?? 'hex') === 'ttt'
              ? 3
              : ((lobby as any).game_key ?? 'hex') === 'connect4'
                ? 7
                : lobby.board_size,
        pie_rule: (((lobby as any).game_key ?? 'hex') === 'chess' || ((lobby as any).game_key ?? 'hex') === 'checkers' || ((lobby as any).game_key ?? 'hex') === 'ttt' || ((lobby as any).game_key ?? 'hex') === 'connect4') ? false : lobby.pie_rule,
        turn_timer_seconds: lobby.turn_timer_seconds,
        rules: rules ?? null,
        mod_version_id: modVersionId,
        status: 'active'
      })
      .select()
      .single();

    if (matchError) throw matchError;

    // Add players to match
    const hostPlayer = players.find(p => p.role === 'host');
    const guestPlayer = players.find(p => p.role === 'guest');

    const { error: player1Error } = await db
      .from('match_players')
      .insert({
        match_id: match.id,
        profile_id: hostPlayer!.player_id,
        color: 1 // indigo
      });

    if (player1Error) throw player1Error;

    const { error: player2Error } = await db
      .from('match_players')
      .insert({
        match_id: match.id,
        profile_id: guestPlayer!.player_id,
        color: 2 // ochre
      });

    if (player2Error) throw player2Error;

    // Update lobby status and force realtime event
    await db
      .from('lobbies')
      .update({
        status: 'starting',
        updated_at: new Date().toISOString() // Force realtime event trigger
      })
      .eq('id', lobbyId);

    console.log(`Match ${match.id} started from lobby ${lobbyId}`);

    return new Response(
      JSON.stringify({ matchId: match.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error starting match:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
