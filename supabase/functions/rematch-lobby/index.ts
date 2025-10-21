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

    const { matchId } = await req.json();

    // Get the match and its players
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*, lobby_id')
      .eq('id', matchId)
      .single();

    if (matchError) throw matchError;

    // Get original lobby settings if available
    let lobbySettings = {
      board_size: match.size,
      pie_rule: match.pie_rule,
      turn_timer_seconds: 45
    };

    if (match.lobby_id) {
      const { data: lobby } = await supabase
        .from('lobbies')
        .select('board_size, pie_rule, turn_timer_seconds')
        .eq('id', match.lobby_id)
        .single();
      
      if (lobby) {
        lobbySettings = lobby;
      }
    }

    // Get players from the match
    const { data: matchPlayers, error: playersError } = await supabase
      .from('match_players')
      .select('profile_id')
      .eq('match_id', matchId)
      .eq('is_bot', false);

    if (playersError) throw playersError;
    if (!matchPlayers || matchPlayers.length !== 2) {
      throw new Error('Cannot rematch - invalid player count');
    }

    // Verify requesting user was in the match
    if (!matchPlayers.some(p => p.profile_id === user.id)) {
      throw new Error('Only players can request rematch');
    }

    // Generate new lobby code
    const { data: code, error: codeError } = await supabase.rpc('generate_lobby_code');
    if (codeError) throw codeError;

    // Create new lobby with same settings
    const { data: newLobby, error: lobbyError } = await supabase
      .from('lobbies')
      .insert({
        code,
        host_id: user.id,
        board_size: lobbySettings.board_size,
        pie_rule: lobbySettings.pie_rule,
        turn_timer_seconds: lobbySettings.turn_timer_seconds,
        status: 'waiting'
      })
      .select()
      .single();

    if (lobbyError) throw lobbyError;

    // Add both players to the new lobby
    const lobbyPlayers = matchPlayers.map((mp, idx) => ({
      lobby_id: newLobby.id,
      player_id: mp.profile_id,
      role: mp.profile_id === user.id ? 'host' : 'guest',
      is_ready: false
    }));

    const { error: playersInsertError } = await supabase
      .from('lobby_players')
      .insert(lobbyPlayers);

    if (playersInsertError) throw playersInsertError;

    console.log(`Rematch lobby created: ${code} from match ${matchId}`);

    return new Response(
      JSON.stringify({ lobby: newLobby, code }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating rematch:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
