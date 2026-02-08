import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { defaultsForGame } from '../_shared/gameDefaults.ts';

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

    // Service role for atomic operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const body = await req.json().catch(() => ({}));
    const { gameKey } = z.object({ gameKey: z.string().optional() }).parse(body);
    const resolvedGameKey = gameKey ?? 'hex';

    // Check if user is a guest (guests cannot play competitive)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_guest')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile lookup error:', profileError);
      throw new Error('Failed to verify account status');
    }

    if (profile?.is_guest) {
      throw new Error('Guests cannot play competitive mode. Please create an account.');
    }

    // Per-game rating (defaults to 1200).
    let userElo = 1200;
    try {
      const { data: pr } = await supabaseAdmin
        .from('player_ratings')
        .select('elo_rating')
        .eq('profile_id', user.id)
        .eq('game_key', resolvedGameKey)
        .maybeSingle();
      if (pr?.elo_rating) userElo = pr.elo_rating;
    } catch {
      // If migrations aren't applied yet, fall back for hex.
      if (resolvedGameKey === 'hex') {
        const { data: p2 } = await supabaseAdmin
          .from('profiles')
          .select('elo_rating')
          .eq('id', user.id)
          .maybeSingle();
        if ((p2 as any)?.elo_rating) userElo = (p2 as any).elo_rating;
      }
    }

    const matchSize = defaultsForGame(resolvedGameKey).competitiveSize;

    // Find a waiting match (simple approach; can be upgraded to a locking RPC later)
    const { data: waitingMatches, error: manualSearchError } = await supabaseAdmin
      .from('matches')
      .select('id, owner')
      .eq('status', 'waiting')
      .eq('is_ranked', true)
      .eq('size', matchSize)
      .eq('game_key', resolvedGameKey)
      .neq('owner', user.id)
      .order('created_at', { ascending: true })
      .limit(1);

    if (manualSearchError) {
      console.error('Manual search error:', manualSearchError);
    }

    if (waitingMatches && waitingMatches.length > 0) {
      const matchId = waitingMatches[0].id;

      // Check if player already exists (race condition protection)
      const { data: existingPlayer } = await supabaseAdmin
        .from('match_players')
        .select('id')
        .eq('match_id', matchId)
        .eq('profile_id', user.id)
        .maybeSingle();

      if (existingPlayer) {
        // Already joined, just return the match
        return new Response(
          JSON.stringify({ matchId, joined: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check player count
      const { count } = await supabaseAdmin
        .from('match_players')
        .select('*', { count: 'exact', head: true })
        .eq('match_id', matchId);

      if ((count ?? 0) >= 2) {
        // Match is full, try to create a new one instead
        console.log(`Match ${matchId} is full, creating new match for user ${user.id}`);
      } else {
        // Join the match
        const { error: joinError } = await supabaseAdmin
          .from('match_players')
          .insert({
            match_id: matchId,
            profile_id: user.id,
            color: 2,
            is_bot: false
          });

        if (joinError) {
          if (joinError.code === '23505') {
            // Unique constraint violation - already joined
            return new Response(
              JSON.stringify({ matchId, joined: true }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          console.error('Join error:', joinError);
          throw new Error('Failed to join match');
        }

        // Update match to active
        await supabaseAdmin
          .from('matches')
          .update({
            status: 'active',
            turn_started_at: new Date().toISOString()
          })
          .eq('id', matchId);

        console.log(`User ${user.id} joined competitive match ${matchId} (fallback path)`);

        return new Response(
          JSON.stringify({ matchId, joined: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // No match found - create a new one
    const { data: newMatch, error: createError } = await supabaseAdmin
      .from('matches')
      .insert({
        game_key: resolvedGameKey,
        size: matchSize,
        pie_rule: defaultsForGame(resolvedGameKey).pieRule,
        status: 'waiting',
        turn: 1,
        owner: user.id,
        is_ranked: true,
        allow_spectators: true
      })
      .select('id')
      .single();

    if (createError) {
      console.error('Create error:', createError);
      throw new Error('Failed to create match');
    }

    // Add self as player 1
    const { error: playerError } = await supabaseAdmin
      .from('match_players')
      .insert({
        match_id: newMatch.id,
        profile_id: user.id,
        color: 1,
        is_bot: false
      });

    if (playerError) {
      console.error('Player insert error:', playerError);
      // Clean up the match we just created
      await supabaseAdmin.from('matches').delete().eq('id', newMatch.id);
      throw new Error('Failed to join created match');
    }

    console.log(`User ${user.id} created competitive match ${newMatch.id}`);

    return new Response(
      JSON.stringify({ matchId: newMatch.id, joined: false, waiting: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Competitive matchmaking error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
