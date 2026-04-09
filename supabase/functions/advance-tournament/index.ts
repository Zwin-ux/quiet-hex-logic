import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { syncTournamentBracket, type TournamentRow } from '../_shared/tournamentEngine.ts';

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
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const service = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await service.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (user.is_anonymous) {
      return new Response(
        JSON.stringify({ error: 'Permanent account required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { matchId } = await req.json();
    if (!matchId) {
      return new Response(
        JSON.stringify({ error: 'matchId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: tournamentMatch, error: tournamentMatchError } = await service
      .from('tournament_matches')
      .select('id, tournament_id, round_id, player1_id, player2_id, winner_id, status, match_id')
      .eq('match_id', matchId)
      .single();

    if (tournamentMatchError || !tournamentMatch) {
      return new Response(
        JSON.stringify({ error: 'No tournament match found for this match' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (tournamentMatch.status === 'completed' && tournamentMatch.winner_id) {
      const { data: tournament } = await service
        .from('tournaments')
        .select('id, board_size, pie_rule, turn_timer_seconds, world_id, game_key, status')
        .eq('id', tournamentMatch.tournament_id)
        .single();

      return new Response(
        JSON.stringify({
          success: true,
          alreadyAdvanced: true,
          tournamentCompleted: tournament?.status === 'completed',
          winnerId: tournamentMatch.winner_id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: match, error: matchError } = await service
      .from('matches')
      .select('id, status, winner, tournament_id')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      return new Response(
        JSON.stringify({ error: 'Match not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (match.status !== 'finished' || !match.winner) {
      return new Response(
        JSON.stringify({ error: 'Match is not finished or has no winner' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: winnerPlayer, error: winnerPlayerError } = await service
      .from('match_players')
      .select('profile_id')
      .eq('match_id', matchId)
      .eq('color', match.winner)
      .single();

    if (winnerPlayerError || !winnerPlayer) {
      return new Response(
        JSON.stringify({ error: 'Could not determine winner profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const winnerId = winnerPlayer.profile_id;
    const loserId =
      tournamentMatch.player1_id === winnerId
        ? tournamentMatch.player2_id
        : tournamentMatch.player1_id;

    const { data: updatedTournamentMatch, error: updateError } = await service
      .from('tournament_matches')
      .update({
        winner_id: winnerId,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .is('winner_id', null)
      .eq('id', tournamentMatch.id)
      .select('id')
      .maybeSingle();

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to update tournament match' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!updatedTournamentMatch) {
      const { data: latestTournament } = await service
        .from('tournaments')
        .select('status')
        .eq('id', tournamentMatch.tournament_id)
        .maybeSingle();

      return new Response(
        JSON.stringify({
          success: true,
          alreadyAdvanced: true,
          winnerId,
          tournamentCompleted: latestTournament?.status === 'completed',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: winnerParticipant } = await service
      .from('tournament_participants')
      .select('wins')
      .eq('tournament_id', tournamentMatch.tournament_id)
      .eq('player_id', winnerId)
      .maybeSingle();

    await service
      .from('tournament_participants')
      .update({ wins: (winnerParticipant?.wins ?? 0) + 1 })
      .eq('tournament_id', tournamentMatch.tournament_id)
      .eq('player_id', winnerId);

    if (loserId) {
      const { data: loserParticipant } = await service
        .from('tournament_participants')
        .select('losses')
        .eq('tournament_id', tournamentMatch.tournament_id)
        .eq('player_id', loserId)
        .maybeSingle();

      await service
        .from('tournament_participants')
        .update({
          losses: (loserParticipant?.losses ?? 0) + 1,
          status: 'eliminated',
        })
        .eq('tournament_id', tournamentMatch.tournament_id)
        .eq('player_id', loserId);
    }

    const { data: tournament, error: tournamentError } = await service
      .from('tournaments')
      .select('id, board_size, pie_rule, turn_timer_seconds, world_id, game_key, status')
      .eq('id', tournamentMatch.tournament_id)
      .single();

    if (tournamentError || !tournament) {
      return new Response(
        JSON.stringify({ error: 'Tournament not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const syncResult = await syncTournamentBracket(service, tournament as TournamentRow);

    return new Response(
      JSON.stringify({
        success: true,
        winnerId,
        tournamentCompleted: syncResult.tournamentCompleted,
        finalWinnerId: syncResult.finalWinnerId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in advance-tournament:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
