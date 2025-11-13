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

    const {
      name,
      description,
      format,
      maxPlayers,
      minPlayers,
      boardSize,
      pieRule,
      turnTimerSeconds,
      registrationDeadline,
      startTime
    } = await req.json();

    // Validation
    if (!name || name.trim().length === 0) {
      throw new Error('Tournament name is required');
    }
    if (maxPlayers < minPlayers) {
      throw new Error('Max players must be greater than or equal to min players');
    }
    if (minPlayers < 2) {
      throw new Error('Minimum players must be at least 2');
    }

    // Create tournament
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        format: format || 'single_elimination',
        max_players: maxPlayers || 8,
        min_players: minPlayers || 4,
        board_size: boardSize || 11,
        pie_rule: pieRule !== false,
        turn_timer_seconds: turnTimerSeconds || 45,
        registration_deadline: registrationDeadline || null,
        start_time: startTime || null,
        created_by: user.id,
        status: 'registration'
      })
      .select()
      .single();

    if (tournamentError) throw tournamentError;

    // Automatically join creator as first participant
    const { error: participantError } = await supabase
      .from('tournament_participants')
      .insert({
        tournament_id: tournament.id,
        player_id: user.id,
        seed: 1
      });

    if (participantError) {
      console.error('Failed to add creator as participant:', participantError);
    }

    console.log(`Tournament ${tournament.id} created by ${user.id}`);

    return new Response(
      JSON.stringify({ tournament }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating tournament:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
