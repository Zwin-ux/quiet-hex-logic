import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const offerDrawSchema = z.object({
  matchId: z.string().uuid('Invalid match ID'),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const validationResult = offerDrawSchema.safeParse(body);
    if (!validationResult.success) {
      return json({ error: 'Invalid input', details: validationResult.error.format() }, 400);
    }

    const { matchId } = validationResult.data;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    // Verify player is in this match
    const { data: player, error: playerError } = await supabase
      .from('match_players')
      .select('color')
      .eq('match_id', matchId)
      .eq('profile_id', user.id)
      .single();

    if (playerError || !player) return json({ error: 'Not a player in this match' }, 403);

    // Fetch match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (matchError || !match) return json({ error: 'Match not found' }, 404);
    if (match.status !== 'active') return json({ error: 'Match is not active' }, 400);
    if ((match as any).draw_offered_by != null) return json({ error: 'A draw offer is already pending' }, 400);

    const currentVersion = match.version || 0;

    // Set draw_offered_by to this player's color
    const { error: updateError } = await supabase
      .from('matches')
      .update({
        draw_offered_by: player.color,
        version: currentVersion + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchId)
      .eq('version', currentVersion);

    if (updateError) {
      return json({ error: 'Failed to offer draw — please retry' }, 409);
    }

    return json({ success: true });
  } catch (error) {
    console.error('Error in offer-draw:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: message }, 500);
  }
});
