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

    // Get lobby
    const { data: lobby, error: lobbyError } = await supabase
      .from('lobbies')
      .select('*')
      .eq('id', lobbyId)
      .single();

    if (lobbyError) throw lobbyError;

    // Remove player
    const { error: deleteError } = await supabase
      .from('lobby_players')
      .delete()
      .eq('lobby_id', lobbyId)
      .eq('player_id', user.id);

    if (deleteError) throw deleteError;

    // Check remaining players
    const { data: remainingPlayers, error: playersError } = await supabase
      .from('lobby_players')
      .select('*')
      .eq('lobby_id', lobbyId);

    if (playersError) throw playersError;

    // If host left and players remain, transfer host
    if (lobby.host_id === user.id && remainingPlayers && remainingPlayers.length > 0) {
      const newHost = remainingPlayers[0];
      await supabase
        .from('lobbies')
        .update({ host_id: newHost.player_id })
        .eq('id', lobbyId);

      await supabase
        .from('lobby_players')
        .update({ role: 'host' })
        .eq('lobby_id', lobbyId)
        .eq('player_id', newHost.player_id);

      console.log(`Host transferred to ${newHost.player_id} in lobby ${lobbyId}`);
    }

    // If no players remain, delete lobby
    if (!remainingPlayers || remainingPlayers.length === 0) {
      await supabase
        .from('lobbies')
        .delete()
        .eq('id', lobbyId);

      console.log(`Lobby ${lobbyId} deleted (empty)`);
    }

    console.log(`User ${user.id} left lobby ${lobbyId}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error leaving lobby:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
