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

    const { tournamentId } = await req.json();

    // Get tournament details
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();

    if (tournamentError) throw tournamentError;
    if (!tournament) throw new Error('Tournament not found');

    // Check tournament status
    if (tournament.status !== 'registration') {
      throw new Error('Tournament registration is closed');
    }

    // Check registration deadline
    if (tournament.registration_deadline) {
      const deadline = new Date(tournament.registration_deadline);
      if (new Date() > deadline) {
        throw new Error('Registration deadline has passed');
      }
    }

    // Check if already joined
    const { data: existing } = await supabase
      .from('tournament_participants')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('player_id', user.id)
      .single();

    if (existing) {
      throw new Error('You have already joined this tournament');
    }

    // Count current participants
    const { count } = await supabase
      .from('tournament_participants')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId);

    if (count !== null && count >= tournament.max_players) {
      throw new Error('Tournament is full');
    }

    // Join tournament
    const { error: joinError } = await supabase
      .from('tournament_participants')
      .insert({
        tournament_id: tournamentId,
        player_id: user.id
      });

    if (joinError) throw joinError;

    console.log(`Player ${user.id} joined tournament ${tournamentId}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error joining tournament:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
