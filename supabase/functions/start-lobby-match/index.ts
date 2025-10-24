import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { lobbyId } = await req.json();

    // Get lobby details
    const { data: lobby, error: lobbyError } = await supabase
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
    const { data: players, error: playersError } = await supabase
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

    // Create match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        lobby_id: lobbyId,
        owner: lobby.host_id,
        size: lobby.board_size,
        pie_rule: lobby.pie_rule,
        status: 'active'
      })
      .select()
      .single();

    if (matchError) throw matchError;

    // Add players to match
    const hostPlayer = players.find(p => p.role === 'host');
    const guestPlayer = players.find(p => p.role === 'guest');

    const { error: player1Error } = await supabase
      .from('match_players')
      .insert({
        match_id: match.id,
        profile_id: hostPlayer!.player_id,
        color: 1 // indigo
      });

    if (player1Error) throw player1Error;

    const { error: player2Error } = await supabase
      .from('match_players')
      .insert({
        match_id: match.id,
        profile_id: guestPlayer!.player_id,
        color: 2 // ochre
      });

    if (player2Error) throw player2Error;

    // Update lobby status and force realtime event
    await supabase
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
