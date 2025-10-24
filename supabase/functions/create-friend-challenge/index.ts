import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const createFriendChallengeSchema = z.object({
  friendId: z.string().uuid('Invalid friend ID'),
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
    const validationResult = createFriendChallengeSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid input parameters',
          details: validationResult.error.format()
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { friendId, boardSize, pieRule, turnTimer } = validationResult.data;

    // Verify friend exists and is not blocked
    const { data: friendProfile, error: friendError } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('id', friendId)
      .single();

    if (friendError || !friendProfile) {
      throw new Error('Friend not found');
    }

    // Check if users are friends
    const { data: friendship } = await supabase
      .from('friends')
      .select('status')
      .or(`and(a.eq.${user.id},b.eq.${friendId}),and(a.eq.${friendId},b.eq.${user.id})`)
      .eq('status', 'accepted')
      .single();

    if (!friendship) {
      throw new Error('You can only challenge accepted friends');
    }

    // Generate unique lobby code
    const { data: code, error: codeError } = await supabase.rpc('generate_lobby_code');
    if (codeError) throw codeError;

    // Create lobby with challenger as host
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

    // Add challenger as host player
    const { error: playerError } = await supabase
      .from('lobby_players')
      .insert({
        lobby_id: lobby.id,
        player_id: user.id,
        role: 'host',
        is_ready: false
      });

    if (playerError) throw playerError;

    // Get challenger's username for notification
    const { data: challengerProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    const challengerName = challengerProfile?.username || 'Someone';

    // Send notification to friend with lobby details
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        type: 'friend_challenge',
        sender_id: user.id,
        receiver_id: friendId,
        payload: {
          sender_name: challengerName,
          lobby_id: lobby.id,
          lobby_code: code,
          board_size: lobby.board_size
        }
      });

    if (notifError) {
      console.error('Failed to send notification:', notifError);
      // Don't fail the entire request if notification fails
    }

    console.log(`Challenge created: ${user.id} → ${friendId} (lobby: ${lobby.id}, code: ${code})`);

    return new Response(
      JSON.stringify({
        lobby_id: lobby.id,
        code,
        success: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating friend challenge:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
