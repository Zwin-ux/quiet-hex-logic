import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

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

    const body = await req.json().catch(() => ({}));
    const { gameKey } = z.object({ gameKey: z.string().optional() }).parse(body);
    const resolvedGameKey = gameKey ?? 'hex';

    const { data, error } = await supabase.rpc('find_or_create_ranked_match_atomic', {
      p_game_key: resolvedGameKey,
    });

    if (error) {
      console.error('Competitive matchmaking error:', error);
      throw new Error(error.message || 'Failed to find match');
    }

    const matchId = (data as any)?.matchId;
    const joined = Boolean((data as any)?.joined);
    const waiting = Boolean((data as any)?.waiting);

    if (!matchId) {
      throw new Error('Failed to find match');
    }

    console.log(`User ${user.id} matched into competitive queue ${matchId}`);

    return new Response(
      JSON.stringify({ matchId, joined, waiting }),
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
