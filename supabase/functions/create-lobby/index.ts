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

    const { boardSize, pieRule, turnTimer } = await req.json();

    // Generate unique code
    const { data: code, error: codeError } = await supabase.rpc('generate_lobby_code');
    if (codeError) throw codeError;

    // Create lobby
    const { data: lobby, error: lobbyError } = await supabase
      .from('lobbies')
      .insert({
        code,
        host_id: user.id,
        board_size: boardSize || 11,
        pie_rule: pieRule !== false,
        turn_timer_seconds: turnTimer || 45,
        status: 'waiting'
      })
      .select()
      .single();

    if (lobbyError) throw lobbyError;

    // Add host as first player
    const { error: playerError } = await supabase
      .from('lobby_players')
      .insert({
        lobby_id: lobby.id,
        player_id: user.id,
        role: 'host',
        is_ready: false
      });

    if (playerError) throw playerError;

    console.log(`Lobby created: ${code} by ${user.id}`);

    return new Response(
      JSON.stringify({ lobby, code }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating lobby:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
