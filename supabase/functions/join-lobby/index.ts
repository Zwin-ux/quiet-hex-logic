import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const joinLobbySchema = z.object({
  code: z.string().min(4).max(10).regex(/^[A-Z0-9]+$/i, 'Code must be alphanumeric')
});

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

    const body = await req.json();
    
    // Validate input
    const validationResult = joinLobbySchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input parameters', 
          details: validationResult.error.format() 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { code } = validationResult.data;

    // Find lobby by code
    const { data: lobbyId, error: findError } = await supabase.rpc('find_lobby_by_code', {
      lobby_code: code
    });
    if (findError) throw findError;
    if (!lobbyId) {
      throw new Error('Lobby not found or already started');
    }

    // Check if lobby is full
    const { count, error: countError } = await supabase
      .from('lobby_players')
      .select('*', { count: 'exact', head: true })
      .eq('lobby_id', lobbyId);

    if (countError) throw countError;
    if (count && count >= 2) {
      throw new Error('Lobby is full');
    }

    // Check if already in lobby
    const { data: existing } = await supabase
      .from('lobby_players')
      .select('*')
      .eq('lobby_id', lobbyId)
      .eq('player_id', user.id)
      .single();

    if (existing) {
      // Already in lobby, just update last_seen
      await supabase
        .from('lobby_players')
        .update({ last_seen: new Date().toISOString() })
        .eq('lobby_id', lobbyId)
        .eq('player_id', user.id);

      const { data: lobby } = await supabase
        .from('lobbies')
        .select('*')
        .eq('id', lobbyId)
        .single();

      return new Response(
        JSON.stringify({ lobby }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Join lobby
    const { error: joinError } = await supabase
      .from('lobby_players')
      .insert({
        lobby_id: lobbyId,
        player_id: user.id,
        role: 'guest',
        is_ready: false
      });

    if (joinError) throw joinError;

    // Get full lobby details
    const { data: lobby, error: lobbyError } = await supabase
      .from('lobbies')
      .select('*')
      .eq('id', lobbyId)
      .single();

    if (lobbyError) throw lobbyError;

    console.log(`User ${user.id} joined lobby ${code}`);

    return new Response(
      JSON.stringify({ lobby }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error joining lobby:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
