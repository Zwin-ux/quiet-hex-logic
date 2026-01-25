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

    // Use service role for atomic deletion
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { lobbyId } = await req.json();
    if (!lobbyId) {
      throw new Error('Missing lobbyId');
    }

    // Get lobby and verify user is host
    const { data: lobby, error: lobbyError } = await supabaseAdmin
      .from('lobbies')
      .select('id, host_id, code')
      .eq('id', lobbyId)
      .single();

    if (lobbyError || !lobby) {
      throw new Error('Lobby not found');
    }

    if (lobby.host_id !== user.id) {
      throw new Error('Only the host can close the lobby');
    }

    // Delete all chat messages for this lobby
    await supabaseAdmin
      .from('lobby_chat_messages')
      .delete()
      .eq('lobby_id', lobbyId);

    // Delete all players from the lobby
    await supabaseAdmin
      .from('lobby_players')
      .delete()
      .eq('lobby_id', lobbyId);

    // Delete the lobby itself
    const { error: deleteError } = await supabaseAdmin
      .from('lobbies')
      .delete()
      .eq('id', lobbyId);

    if (deleteError) {
      throw deleteError;
    }

    console.log(`Lobby ${lobbyId} (code: ${lobby.code}) closed by host ${user.id}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error closing lobby:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
