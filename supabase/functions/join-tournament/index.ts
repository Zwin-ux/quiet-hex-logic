import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const joinTournamentSchema = z.object({
  tournamentId: z.string().uuid('Invalid tournament ID format')
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
    const validationResult = joinTournamentSchema.safeParse(body);
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
    
    const { tournamentId } = validationResult.data;

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
