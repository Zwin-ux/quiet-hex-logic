import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const updateLobbySettingsSchema = z.object({
  lobbyId: z.string().uuid('Invalid lobby ID'),
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
    const validationResult = updateLobbySettingsSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input parameters', 
          details: validationResult.error.format() 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { lobbyId, boardSize, pieRule, turnTimer } = validationResult.data;

    // Verify user is host
    const { data: lobby, error: lobbyError } = await supabase
      .from('lobbies')
      .select('*')
      .eq('id', lobbyId)
      .single();

    if (lobbyError) throw lobbyError;
    if (lobby.host_id !== user.id) {
      throw new Error('Only host can update settings');
    }

    // Update settings
    const updates: any = {};
    if (boardSize) updates.board_size = boardSize;
    if (pieRule !== undefined) updates.pie_rule = pieRule;
    if (turnTimer) updates.turn_timer_seconds = turnTimer;

    const { data: updated, error: updateError } = await supabase
      .from('lobbies')
      .update(updates)
      .eq('id', lobbyId)
      .select()
      .single();

    if (updateError) throw updateError;

    console.log(`Lobby ${lobbyId} settings updated by ${user.id}`);

    return new Response(
      JSON.stringify({ lobby: updated }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating lobby settings:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
