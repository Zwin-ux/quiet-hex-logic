const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Cron-only: verify service-role key
  const authHeader = req.headers.get('Authorization');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.75.0');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[check-turn-timeouts] Checking for timed out turns...');

    // Find all active matches where the turn has expired
    const { data: timedOutMatches, error: fetchError } = await supabase
      .from('matches')
      .select(`
        id,
        turn,
        turn_timer_seconds,
        turn_started_at,
        size,
        ai_difficulty,
        is_ranked,
        game_key,
        match_players!inner(profile_id, color, is_bot)
      `)
      .eq('status', 'active')
      .not('turn_timer_seconds', 'is', null)
      .not('turn_started_at', 'is', null);

    if (fetchError) {
      console.error('[check-turn-timeouts] Error fetching matches:', fetchError);
      throw fetchError;
    }

    if (!timedOutMatches || timedOutMatches.length === 0) {
      console.log('[check-turn-timeouts] No active matches with timers found');
      return new Response(
        JSON.stringify({ message: 'No matches to check', forfeited: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let forfeitedCount = 0;
    const now = new Date();

    for (const match of timedOutMatches) {
      const turnStartedAt = new Date(match.turn_started_at);
      const elapsedSeconds = (now.getTime() - turnStartedAt.getTime()) / 1000;
      const timeoutSeconds = match.turn_timer_seconds;

      // Check if turn has timed out (with 2 second grace period)
      if (elapsedSeconds > timeoutSeconds + 2) {
        console.log(`[check-turn-timeouts] Match ${match.id} timed out: ${elapsedSeconds}s elapsed, ${timeoutSeconds}s limit`);

        // Determine current player color
        const currentColor = match.turn % 2 === 1 ? 1 : 2;
        
        // Skip AI matches (AI should never timeout)
        if (match.ai_difficulty && currentColor === 2) {
          console.log(`[check-turn-timeouts] Skipping AI turn timeout for match ${match.id}`);
          continue;
        }

        // Winner is the opponent
        const winner = currentColor === 1 ? 2 : 1;

        // Winner is p1 or p2
        const result = winner === 1 ? 'p1' : 'p2';

        // Update match to finished with opponent as winner
        const { error: updateError } = await supabase
          .from('matches')
          .update({
            status: 'finished',
            winner: winner,
            result: result,
            updated_at: new Date().toISOString()
          })
          .eq('id', match.id)
          .eq('status', 'active'); // Only update if still active

        if (updateError) {
          console.error(`[check-turn-timeouts] Error forfeiting match ${match.id}:`, updateError);
        } else {
          console.log(`[check-turn-timeouts] Match ${match.id} forfeited due to timeout. Winner: ${winner}`);
          forfeitedCount++;

          // Update ratings for ranked matches
          const gameKey = (match as any).game_key ?? 'hex';
          if ((match as any).is_ranked && gameKey !== 'ttt') {
            try {
              const players = match.match_players as any[];
              if (players && players.length === 2) {
                const botCount = players.filter((p: any) => p.is_bot).length;
                if (botCount === 0 || botCount === 2) {
                  const p1 = players.find((p: any) => p.color === 1);
                  const p2 = players.find((p: any) => p.color === 2);
                  if (p1 && p2) {
                    const updateRatingsUrl = `${supabaseUrl}/functions/v1/update-ratings`;
                    await fetch(updateRatingsUrl, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                      },
                      body: JSON.stringify({
                        matchId: match.id,
                        gameKey,
                        result,
                        p1Id: p1.profile_id,
                        p2Id: p2.profile_id,
                        winner,
                      }),
                    });
                    console.log(`[check-turn-timeouts] Rating update sent for match ${match.id}`);
                  }
                }
              }
            } catch (ratingError) {
              console.error(`[check-turn-timeouts] Error updating ratings for match ${match.id}:`, ratingError);
            }
          }
        }
      }
    }

    console.log(`[check-turn-timeouts] Checked ${timedOutMatches.length} matches, forfeited ${forfeitedCount}`);

    return new Response(
      JSON.stringify({ 
        message: 'Timeout check complete', 
        checked: timedOutMatches.length,
        forfeited: forfeitedCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[check-turn-timeouts] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
