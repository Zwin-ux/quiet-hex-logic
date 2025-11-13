import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Participant {
  player_id: string;
  seed: number | null;
}

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

    // Only creator can start
    if (tournament.created_by !== user.id) {
      throw new Error('Only tournament creator can start the tournament');
    }

    // Check status
    if (tournament.status !== 'registration') {
      throw new Error('Tournament has already started or been completed');
    }

    // Get participants
    const { data: participants, error: participantsError } = await supabase
      .from('tournament_participants')
      .select('player_id, seed')
      .eq('tournament_id', tournamentId)
      .eq('status', 'active');

    if (participantsError) throw participantsError;
    if (!participants || participants.length < tournament.min_players) {
      throw new Error(`Need at least ${tournament.min_players} players to start`);
    }

    // Update tournament status to seeding
    await supabase
      .from('tournaments')
      .update({ status: 'seeding' })
      .eq('id', tournamentId);

    // Assign seeds (random for now)
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffled.length; i++) {
      await supabase
        .from('tournament_participants')
        .update({ seed: i + 1 })
        .eq('tournament_id', tournamentId)
        .eq('player_id', shuffled[i].player_id);
    }

    // Generate bracket based on format
    if (tournament.format === 'single_elimination') {
      await generateSingleEliminationBracket(supabase, tournament, shuffled as Participant[]);
    }

    // Update tournament status to active
    await supabase
      .from('tournaments')
      .update({ status: 'active' })
      .eq('id', tournamentId);

    console.log(`Tournament ${tournamentId} started with ${participants.length} players`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error starting tournament:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateSingleEliminationBracket(
  supabase: any,
  tournament: any,
  participants: Participant[]
) {
  const playerCount = participants.length;
  
  // Calculate number of rounds (log2 of next power of 2)
  const rounds = Math.ceil(Math.log2(playerCount));
  
  // Create rounds
  const roundNames = ['Finals', 'Semifinals', 'Quarterfinals', 'Round of 16', 'Round of 32'];
  const createdRounds = [];
  
  for (let i = 0; i < rounds; i++) {
    const roundNumber = rounds - i;
    const roundName = i < roundNames.length ? roundNames[i] : `Round ${roundNumber}`;
    
    const { data: round } = await supabase
      .from('tournament_rounds')
      .insert({
        tournament_id: tournament.id,
        round_number: roundNumber,
        round_name: roundName,
        status: roundNumber === 1 ? 'active' : 'pending'
      })
      .select()
      .single();
    
    createdRounds.unshift(round);
  }

  // First round: pair players
  const firstRound = createdRounds[0];
  const matchesInFirstRound = Math.ceil(playerCount / 2);
  const firstRoundMatches = [];
  
  for (let i = 0; i < matchesInFirstRound; i++) {
    const player1 = participants[i * 2];
    const player2 = participants[i * 2 + 1] || null; // May not exist if odd number
    
    const { data: match } = await supabase
      .from('tournament_matches')
      .insert({
        tournament_id: tournament.id,
        round_id: firstRound.id,
        player1_id: player1.player_id,
        player2_id: player2?.player_id || null,
        bracket_position: i,
        status: player2 ? 'ready' : 'completed', // Auto-complete if bye
        winner_id: player2 ? null : player1.player_id // Auto-win if bye
      })
      .select()
      .single();
    
    firstRoundMatches.push(match);
  }

  // Create subsequent rounds and link matches
  for (let roundIdx = 1; roundIdx < rounds; roundIdx++) {
    const round = createdRounds[roundIdx];
    const prevRoundMatches = roundIdx === 1 ? firstRoundMatches : [];
    const matchesInRound = Math.ceil(matchesInFirstRound / Math.pow(2, roundIdx));
    
    for (let i = 0; i < matchesInRound; i++) {
      const { data: match } = await supabase
        .from('tournament_matches')
        .insert({
          tournament_id: tournament.id,
          round_id: round.id,
          bracket_position: i,
          status: 'pending'
        })
        .select()
        .single();
      
      // Link previous round matches to this match
      if (roundIdx === 1 && prevRoundMatches.length > i * 2) {
        await supabase
          .from('tournament_matches')
          .update({ next_match_id: match.id })
          .eq('id', prevRoundMatches[i * 2].id);
        
        if (prevRoundMatches[i * 2 + 1]) {
          await supabase
            .from('tournament_matches')
            .update({ next_match_id: match.id })
            .eq('id', prevRoundMatches[i * 2 + 1].id);
        }
      }
    }
  }
}
