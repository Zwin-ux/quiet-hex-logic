import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const respondDrawSchema = z.object({
  matchId: z.string().uuid('Invalid match ID'),
  accept: z.boolean(),
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
    const validationResult = respondDrawSchema.safeParse(body);
    if (!validationResult.success) {
      return json({ error: 'Invalid input', details: validationResult.error.format() }, 400);
    }

    const { matchId, accept } = validationResult.data;

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

    const drawOfferedBy = (match as any).draw_offered_by;
    if (drawOfferedBy == null) return json({ error: 'No draw offer pending' }, 400);

    // Responder must be the OTHER player (not the one who offered)
    if (player.color === drawOfferedBy) {
      return json({ error: 'You cannot respond to your own draw offer' }, 400);
    }

    const currentVersion = match.version || 0;
    const gameKey = (match as any).game_key ?? 'hex';

    if (accept) {
      // Accept draw: finish the match
      const { error: updateError } = await supabase
        .from('matches')
        .update({
          status: 'finished',
          winner: null,
          result: 'draw',
          draw_offered_by: null,
          version: currentVersion + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', matchId)
        .eq('version', currentVersion);

      if (updateError) {
        return json({ error: 'Failed to accept draw — please retry' }, 409);
      }

      // Update ratings for ranked matches
      if (match.is_ranked && gameKey !== 'ttt') {
        try {
          const { data: players } = await supabase
            .from('match_players')
            .select('profile_id, color')
            .eq('match_id', matchId)
            .eq('is_bot', false);

          if (players && players.length === 2) {
            const p1 = players.find(p => p.color === 1);
            const p2 = players.find(p => p.color === 2);
            if (p1 && p2) {
              const updateRatingsUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/update-ratings`;
              await fetch(updateRatingsUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                },
                body: JSON.stringify({
                  matchId,
                  gameKey,
                  result: 'draw',
                  p1Id: p1.profile_id,
                  p2Id: p2.profile_id,
                  winner: null,
                }),
              });
            }
          }
        } catch (error) {
          console.error('Error updating ratings after draw:', error);
        }
      }

      return json({ success: true, accepted: true });
    } else {
      // Decline draw: clear the offer
      const { error: updateError } = await supabase
        .from('matches')
        .update({
          draw_offered_by: null,
          version: currentVersion + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', matchId)
        .eq('version', currentVersion);

      if (updateError) {
        return json({ error: 'Failed to decline draw — please retry' }, 409);
      }

      return json({ success: true, accepted: false });
    }
  } catch (error) {
    console.error('Error in respond-draw:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: message }, 500);
  }
});
