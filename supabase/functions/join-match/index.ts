import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { matchId } = body;

    // Validate input
    if (!matchId || typeof matchId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid match ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get authenticated user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify the user is authenticated
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Join attempt: user=${user.id}, match=${matchId}`);

    // Atomic transaction: join match and update status
    // First, check if match exists and is waiting
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('id, owner, status')
      .eq('id', matchId)
      .eq('status', 'waiting')
      .single();

    if (matchError || !match) {
      return new Response(
        JSON.stringify({ error: 'Match not available' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is blocked by match owner
    const { data: blocked } = await supabase.rpc('is_blocked', {
      _blocker: match.owner,
      _blocked: user.id
    });

    if (blocked) {
      return new Response(
        JSON.stringify({ error: 'Cannot join match' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is already in the match
    const { data: existingPlayer } = await supabase
      .from('match_players')
      .select('profile_id')
      .eq('match_id', matchId)
      .eq('profile_id', user.id)
      .maybeSingle();

    if (existingPlayer) {
      return new Response(
        JSON.stringify({ error: 'Already joined' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Atomic insert player and update match status
    // Using service role to bypass RLS
    const { error: insertError } = await supabase
      .from('match_players')
      .insert({
        match_id: matchId,
        profile_id: user.id,
        color: 2,
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      // Check if it's a duplicate
      if (insertError.code === '23505') {
        return new Response(
          JSON.stringify({ error: 'Match already full' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw insertError;
    }

    // Update match status to active
    const { error: updateError } = await supabase
      .from('matches')
      .update({ status: 'active' })
      .eq('id', matchId)
      .eq('status', 'waiting'); // Only update if still waiting

    if (updateError) {
      console.error('Update error:', updateError);
      // Rollback player insert
      await supabase
        .from('match_players')
        .delete()
        .eq('match_id', matchId)
        .eq('profile_id', user.id);
      throw updateError;
    }

    console.log(`Join successful: user=${user.id}, match=${matchId}`);

    return new Response(
      JSON.stringify({ success: true, matchId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in join-match:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Request failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});