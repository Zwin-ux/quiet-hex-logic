import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Comprehensive input validation schema
const createLobbySchema = z.object({
  gameKey: z.string().optional().default('hex'),
  worldId: z.string().uuid('Invalid world ID').optional(),
  boardSize: z.number()
    .int('Board size must be an integer')
    .min(5, 'Board size must be at least 5')
    .max(19, 'Board size cannot exceed 19')
    .optional()
    .default(11),
  pieRule: z.boolean()
    .optional()
    .default(true),
  turnTimer: z.number()
    .int('Turn timer must be an integer')
    .min(10, 'Turn timer must be at least 10 seconds')
    .max(600, 'Turn timer cannot exceed 600 seconds (10 minutes)')
    .optional()
    .default(45)
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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Unauthorized');
    }

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
    
    const { gameKey, worldId, boardSize, pieRule, turnTimer } = validationResult.data;

    const { data: lobbyResult, error: lobbyError } = await supabase.rpc('create_lobby_atomic', {
      p_game_key: gameKey,
      p_world_id: worldId ?? null,
      p_board_size: boardSize,
      p_pie_rule: pieRule,
      p_turn_timer_seconds: turnTimer,
    });

    if (lobbyError) {
      console.error('Lobby creation error:', lobbyError);
      throw lobbyError;
    }

    const lobby = (lobbyResult as any)?.lobby;
    const code = (lobbyResult as any)?.code;

    if (!lobby || !code) {
      throw new Error('Failed to create lobby');
    }

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
