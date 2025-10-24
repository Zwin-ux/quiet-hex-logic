import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const createLobbySchema = z.object({
  boardSize: z.number().int().min(5).max(19).optional(),
  pieRule: z.boolean().optional(),
  turnTimer: z.number().int().min(10).max(300).optional()
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    console.log('Getting user...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Unauthorized');
    }
    console.log('User authenticated:', user.id);

    const body = await req.json();
    
    // Validate input
    const validationResult = createLobbySchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input parameters', 
          details: validationResult.error.format() 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { boardSize, pieRule, turnTimer } = validationResult.data;
    console.log('Lobby settings:', { boardSize, pieRule, turnTimer });

    // Generate unique code
    console.log('Generating lobby code...');
    const { data: code, error: codeError } = await supabase.rpc('generate_lobby_code');
    if (codeError) {
      console.error('Code generation error:', codeError);
      throw codeError;
    }
    console.log('Code generated:', code);

    // Create lobby
    console.log('Creating lobby...');
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

    if (lobbyError) {
      console.error('Lobby creation error:', lobbyError);
      throw lobbyError;
    }
    console.log('Lobby created:', lobby.id);

    // Add host as first player
    console.log('Adding host to lobby_players...');
    const { error: playerError } = await supabase
      .from('lobby_players')
      .insert({
        lobby_id: lobby.id,
        player_id: user.id,
        role: 'host',
        is_ready: false
      });

    if (playerError) {
      console.error('Player insertion error:', playerError);
      throw playerError;
    }
    console.log('Host added to lobby');

    console.log(`Lobby created successfully: ${code} by ${user.id}`);

    return new Response(
      JSON.stringify({ lobby, code }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating lobby:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const details = error instanceof Error ? error : { error: 'Unknown error' };
    console.error('Error details:', JSON.stringify(details));
    return new Response(
      JSON.stringify({ error: message, details }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
