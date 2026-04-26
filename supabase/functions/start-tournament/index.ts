import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import {
  buildSeedOrder,
  nextPowerOfTwo,
  roundNameFor,
  syncTournamentBracket,
  type TournamentParticipantRow,
  type TournamentRow,
} from '../_shared/tournamentEngine.ts';

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

    const service = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await service.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    if (user.is_anonymous) {
      throw new Error('Permanent account required');
    }

    const { tournamentId } = await req.json();
    if (!tournamentId) {
      throw new Error('Tournament ID is required');
    }

    const { data: tournamentData, error: tournamentError } = await service
      .from('tournaments')
      .select('id, created_by, status, min_players, max_players, board_size, pie_rule, turn_timer_seconds, world_id, game_key, format, mod_version_id')
      .eq('id', tournamentId)
      .single();

    if (tournamentError || !tournamentData) {
      throw new Error('Tournament not found');
    }

    if (tournamentData.created_by !== user.id) {
      throw new Error('Only the organizer can start this tournament');
    }

    if (tournamentData.status !== 'registration') {
      throw new Error('Tournament has already started or been completed');
    }

    if (tournamentData.format !== 'single_elimination') {
      throw new Error('Only single elimination tournaments can be started right now');
    }

    const { data: participantsData, error: participantsError } = await service
      .from('tournament_participants')
      .select('player_id, seed, joined_at')
      .eq('tournament_id', tournamentId)
      .eq('status', 'active');

    if (participantsError) {
      throw participantsError;
    }

    const participants = (participantsData ?? []) as TournamentParticipantRow[];
    if (participants.length < tournamentData.min_players) {
      throw new Error(`Need at least ${tournamentData.min_players} players to start`);
    }

    const sortedParticipants = [...participants]
      .sort((a, b) => {
        const seedA = a.seed ?? Number.MAX_SAFE_INTEGER;
        const seedB = b.seed ?? Number.MAX_SAFE_INTEGER;
        if (seedA !== seedB) return seedA - seedB;
        const joinedA = a.joined_at ? new Date(a.joined_at).getTime() : 0;
        const joinedB = b.joined_at ? new Date(b.joined_at).getTime() : 0;
        if (joinedA !== joinedB) return joinedA - joinedB;
        return a.player_id.localeCompare(b.player_id);
      })
      .map((participant, index) => ({
        ...participant,
        seed: index + 1,
      }));

    await Promise.all(
      sortedParticipants.map((participant) =>
        service
          .from('tournament_participants')
          .update({ seed: participant.seed })
          .eq('tournament_id', tournamentId)
          .eq('player_id', participant.player_id),
      ),
    );

    await service.from('tournament_matches').delete().eq('tournament_id', tournamentId);
    await service.from('tournament_rounds').delete().eq('tournament_id', tournamentId);

    const bracketSize = nextPowerOfTwo(sortedParticipants.length);
    const totalRounds = Math.log2(bracketSize);
    const seedOrder = buildSeedOrder(bracketSize);
    const slots = seedOrder.map((seed) => sortedParticipants[seed - 1]?.player_id ?? null);

    const roundRows = Array.from({ length: totalRounds }, (_, roundIndex) => ({
      id: crypto.randomUUID(),
      tournament_id: tournamentId,
      round_number: roundIndex + 1,
      round_name: roundNameFor(roundIndex + 1, totalRounds),
      status: 'pending',
    }));

    const matchIdsByRound = Array.from({ length: totalRounds }, (_, roundIndex) => {
      const matchesInRound = bracketSize / 2 ** (roundIndex + 1);
      return Array.from({ length: matchesInRound }, () => crypto.randomUUID());
    });

    const tournamentMatches = [];
    for (let roundIndex = 0; roundIndex < totalRounds; roundIndex += 1) {
      const roundId = roundRows[roundIndex].id;
      const matchIds = matchIdsByRound[roundIndex];

      for (let bracketPosition = 0; bracketPosition < matchIds.length; bracketPosition += 1) {
        const player1 = roundIndex === 0 ? slots[bracketPosition * 2] ?? null : null;
        const player2 = roundIndex === 0 ? slots[bracketPosition * 2 + 1] ?? null : null;
        const soloWinner = player1 && !player2 ? player1 : player2 && !player1 ? player2 : null;

        tournamentMatches.push({
          id: matchIds[bracketPosition],
          tournament_id: tournamentId,
          round_id: roundId,
          player1_id: player1,
          player2_id: player2,
          winner_id: soloWinner,
          bracket_position: bracketPosition,
          next_match_id:
            roundIndex < totalRounds - 1
              ? matchIdsByRound[roundIndex + 1][Math.floor(bracketPosition / 2)]
              : null,
          status: soloWinner ? 'completed' : 'pending',
          completed_at: soloWinner ? new Date().toISOString() : null,
        });
      }
    }

    const { error: roundsInsertError } = await service
      .from('tournament_rounds')
      .insert(roundRows);

    if (roundsInsertError) {
      throw roundsInsertError;
    }

    const { error: matchesInsertError } = await service
      .from('tournament_matches')
      .insert(tournamentMatches);

    if (matchesInsertError) {
      throw matchesInsertError;
    }

    const syncResult = await syncTournamentBracket(service, tournamentData as TournamentRow);

    console.log(`Tournament ${tournamentId} started with ${participants.length} players`);

    return new Response(
      JSON.stringify({
        success: true,
        rounds: totalRounds,
        tournamentCompleted: syncResult.tournamentCompleted,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error starting tournament:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
