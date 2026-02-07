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
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role key for admin operations (advancing brackets, creating matches)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Authenticate the caller
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { matchId } = await req.json();

    if (!matchId) {
      return new Response(
        JSON.stringify({ error: 'matchId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Look up the tournament_match that references this match_id
    const { data: tournamentMatch, error: tmError } = await supabase
      .from('tournament_matches')
      .select('*, tournament_rounds!inner(id, tournament_id, round_number, status)')
      .eq('match_id', matchId)
      .single();

    if (tmError || !tournamentMatch) {
      return new Response(
        JSON.stringify({ error: 'No tournament match found for this match' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tournamentId = tournamentMatch.tournament_id;
    const roundId = tournamentMatch.round_id;
    const currentRoundNumber = tournamentMatch.tournament_rounds.round_number;

    // Step 4: Get the winner_id from the matches table
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('id, status, winner')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      return new Response(
        JSON.stringify({ error: 'Match not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (match.status !== 'finished' || !match.winner) {
      return new Response(
        JSON.stringify({ error: 'Match is not finished or has no winner' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // match.winner is a color (1 or 2), resolve to profile_id via match_players
    const { data: winnerPlayer, error: winnerError } = await supabase
      .from('match_players')
      .select('profile_id')
      .eq('match_id', matchId)
      .eq('color', match.winner)
      .single();

    if (winnerError || !winnerPlayer) {
      return new Response(
        JSON.stringify({ error: 'Could not determine winner profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const winnerId = winnerPlayer.profile_id;

    // Determine the loser
    const loserId = tournamentMatch.player1_id === winnerId
      ? tournamentMatch.player2_id
      : tournamentMatch.player1_id;

    // Step 5: Update the tournament_match with winner_id and status='completed'
    const { error: updateTmError } = await supabase
      .from('tournament_matches')
      .update({
        winner_id: winnerId,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', tournamentMatch.id);

    if (updateTmError) {
      console.error('Error updating tournament match:', updateTmError);
      return new Response(
        JSON.stringify({ error: 'Failed to update tournament match' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 6: Update tournament_participant wins/losses
    if (winnerId) {
      // Increment winner's wins
      const { data: winnerParticipant } = await supabase
        .from('tournament_participants')
        .select('wins')
        .eq('tournament_id', tournamentId)
        .eq('player_id', winnerId)
        .single();

      if (winnerParticipant) {
        await supabase
          .from('tournament_participants')
          .update({ wins: (winnerParticipant.wins || 0) + 1 })
          .eq('tournament_id', tournamentId)
          .eq('player_id', winnerId);
      }
    }

    if (loserId) {
      // Increment loser's losses
      const { data: loserParticipant } = await supabase
        .from('tournament_participants')
        .select('losses')
        .eq('tournament_id', tournamentId)
        .eq('player_id', loserId)
        .single();

      if (loserParticipant) {
        await supabase
          .from('tournament_participants')
          .update({ losses: (loserParticipant.losses || 0) + 1 })
          .eq('tournament_id', tournamentId)
          .eq('player_id', loserId);
      }

      // Mark eliminated player
      await supabase
        .from('tournament_participants')
        .update({ status: 'eliminated' })
        .eq('tournament_id', tournamentId)
        .eq('player_id', loserId);
    }

    // Step 7: Check if all matches in the current round are completed
    const { data: roundMatches, error: roundMatchesError } = await supabase
      .from('tournament_matches')
      .select('id, status, winner_id, next_match_id, bracket_position')
      .eq('round_id', roundId);

    if (roundMatchesError) {
      console.error('Error fetching round matches:', roundMatchesError);
      return new Response(
        JSON.stringify({ error: 'Failed to check round status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allRoundMatchesCompleted = roundMatches.every(m => m.status === 'completed');

    if (allRoundMatchesCompleted) {
      // Step 8a: Mark the round as 'completed'
      await supabase
        .from('tournament_rounds')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', roundId);

      // Step 8b: Find the next round (round_number + 1)
      // Note: In the bracket, round_number decreases toward finals (round 1 = finals)
      // The start-tournament creates rounds with round_number counting down
      // So the "next" round is round_number - 1 (closer to finals)
      const { data: nextRound, error: nextRoundError } = await supabase
        .from('tournament_rounds')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('round_number', currentRoundNumber - 1)
        .single();

      if (nextRoundError || !nextRound) {
        // Step 9: No next round means this was the final — mark tournament as completed
        const { data: tournament } = await supabase
          .from('tournaments')
          .select('id')
          .eq('id', tournamentId)
          .single();

        if (tournament) {
          // The winner of the final match is the tournament winner
          // Find the single completed match in this round (the final)
          const finalMatch = roundMatches.find(m => m.winner_id);

          await supabase
            .from('tournaments')
            .update({
              status: 'completed',
              updated_at: new Date().toISOString()
            })
            .eq('id', tournamentId);

          console.log(`Tournament ${tournamentId} completed. Winner: ${finalMatch?.winner_id}`);
        }

        return new Response(
          JSON.stringify({
            success: true,
            tournamentCompleted: true,
            winnerId: winnerId
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Step 8c: For each completed match with a next_match_id, advance the winner
      const { data: nextRoundMatches, error: nextRoundMatchesError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('round_id', nextRound.id);

      if (nextRoundMatchesError) {
        console.error('Error fetching next round matches:', nextRoundMatchesError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch next round matches' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      for (const completedMatch of roundMatches) {
        if (!completedMatch.next_match_id || !completedMatch.winner_id) continue;

        // Even bracket_position fills player1, odd fills player2
        const isEvenPosition = completedMatch.bracket_position % 2 === 0;

        const updateData = isEvenPosition
          ? { player1_id: completedMatch.winner_id }
          : { player2_id: completedMatch.winner_id };

        await supabase
          .from('tournament_matches')
          .update(updateData)
          .eq('id', completedMatch.next_match_id);
      }

      // Step 8d: Re-fetch next round matches to check if both players are set
      const { data: updatedNextRoundMatches } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('round_id', nextRound.id);

      // Get tournament settings for creating matches
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('board_size, pie_rule, turn_timer_seconds')
        .eq('id', tournamentId)
        .single();

      if (tournament && updatedNextRoundMatches) {
        for (const nextMatch of updatedNextRoundMatches) {
          if (nextMatch.player1_id && nextMatch.player2_id && nextMatch.status !== 'ready') {
            // Create the actual game match in the matches table
            const { data: newMatch, error: newMatchError } = await supabase
              .from('matches')
              .insert({
                size: tournament.board_size,
                pie_rule: tournament.pie_rule,
                turn_timer_seconds: tournament.turn_timer_seconds,
                status: 'active',
                tournament_id: tournamentId,
                owner: nextMatch.player1_id
              })
              .select()
              .single();

            if (newMatchError || !newMatch) {
              console.error('Error creating match for next round:', newMatchError);
              continue;
            }

            // Insert player 1 (color 1 = indigo)
            await supabase
              .from('match_players')
              .insert({
                match_id: newMatch.id,
                profile_id: nextMatch.player1_id,
                color: 1
              });

            // Insert player 2 (color 2 = ochre)
            await supabase
              .from('match_players')
              .insert({
                match_id: newMatch.id,
                profile_id: nextMatch.player2_id,
                color: 2
              });

            // Update tournament_match: set match_id and status to 'ready'
            await supabase
              .from('tournament_matches')
              .update({
                match_id: newMatch.id,
                status: 'ready'
              })
              .eq('id', nextMatch.id);

            console.log(`Created match ${newMatch.id} for tournament match ${nextMatch.id}`);
          }
        }
      }

      // Step 8e: Mark the next round as 'active'
      await supabase
        .from('tournament_rounds')
        .update({
          status: 'active',
          started_at: new Date().toISOString()
        })
        .eq('id', nextRound.id);

      console.log(`Round ${currentRoundNumber} completed. Advanced to round ${currentRoundNumber - 1} in tournament ${tournamentId}`);

      return new Response(
        JSON.stringify({
          success: true,
          roundCompleted: true,
          nextRoundId: nextRound.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Round not yet complete — just the single match was updated
    console.log(`Tournament match ${tournamentMatch.id} completed. Round ${currentRoundNumber} still in progress.`);

    return new Response(
      JSON.stringify({
        success: true,
        roundCompleted: false,
        winnerId: winnerId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in advance-tournament:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
