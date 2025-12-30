import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple Glicko-inspired rating calculation
function calculateNewRating(
  winnerRating: number,
  loserRating: number,
  winnerGames: number,
  loserGames: number
): { winnerNew: number; loserNew: number; change: number } {
  // K-factor decreases as games played increases (more stable rating)
  const winnerK = Math.max(16, 40 - Math.min(winnerGames, 30) * 0.8);
  const loserK = Math.max(16, 40 - Math.min(loserGames, 30) * 0.8);

  // Expected score based on rating difference
  const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const expectedLoser = 1 - expectedWinner;

  // Calculate change
  const winnerChange = Math.round(winnerK * (1 - expectedWinner));
  const loserChange = Math.round(loserK * (0 - expectedLoser));

  return {
    winnerNew: winnerRating + winnerChange,
    loserNew: Math.max(100, loserRating + loserChange), // Floor at 100
    change: winnerChange,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { matchId, winnerId, loserId } = await req.json();

    if (!matchId || !winnerId || !loserId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check if this match was already processed
    const { data: existingHistory } = await supabase
      .from('rating_history')
      .select('id')
      .eq('match_id', matchId)
      .limit(1);

    if (existingHistory && existingHistory.length > 0) {
      return new Response(JSON.stringify({ message: 'Match already processed' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get current ratings
    const { data: winnerProfile } = await supabase
      .from('profiles')
      .select('elo_rating, games_rated')
      .eq('id', winnerId)
      .single();

    const { data: loserProfile } = await supabase
      .from('profiles')
      .select('elo_rating, games_rated')
      .eq('id', loserId)
      .single();

    if (!winnerProfile || !loserProfile) {
      return new Response(JSON.stringify({ error: 'Players not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const winnerOld = winnerProfile.elo_rating || 1200;
    const loserOld = loserProfile.elo_rating || 1200;
    const winnerGames = winnerProfile.games_rated || 0;
    const loserGames = loserProfile.games_rated || 0;

    const { winnerNew, loserNew, change } = calculateNewRating(
      winnerOld, loserOld, winnerGames, loserGames
    );

    // Update ratings and record history in transaction
    await supabase.from('profiles').update({
      elo_rating: winnerNew,
      games_rated: winnerGames + 1,
    }).eq('id', winnerId);

    await supabase.from('profiles').update({
      elo_rating: loserNew,
      games_rated: loserGames + 1,
    }).eq('id', loserId);

    // Record history
    await supabase.from('rating_history').insert([
      {
        profile_id: winnerId,
        match_id: matchId,
        old_rating: winnerOld,
        new_rating: winnerNew,
        rating_change: change,
      },
      {
        profile_id: loserId,
        match_id: matchId,
        old_rating: loserOld,
        new_rating: loserNew,
        rating_change: loserNew - loserOld,
      },
    ]);

    // Update match_players with the rating change
    await supabase.from('match_players')
      .update({ rating_change: change })
      .eq('match_id', matchId)
      .eq('profile_id', winnerId);

    await supabase.from('match_players')
      .update({ rating_change: loserNew - loserOld })
      .eq('match_id', matchId)
      .eq('profile_id', loserId);

    console.log(`Ratings updated - Winner: ${winnerOld} -> ${winnerNew} (+${change}), Loser: ${loserOld} -> ${loserNew}`);

    return new Response(JSON.stringify({
      winner: { old: winnerOld, new: winnerNew, change },
      loser: { old: loserOld, new: loserNew, change: loserNew - loserOld },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Rating update error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
