import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { parseBotToken, authenticateBot } from '../_shared/botAuth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-bot-token',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const token = parseBotToken(req);
    if (!token) return json({ error: 'Unauthorized (missing bot token)' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const authed = await authenticateBot(supabase, token);
    if (!authed) return json({ error: 'Unauthorized (invalid bot token)' }, 401);

    const now = Date.now();
    const claimTimeoutMs = 30_000;
    const claimCutoff = new Date(now - claimTimeoutMs).toISOString();

    // Find requests that are either pending or claim-expired, and that match the live match turn.
    const { data: reqs, error } = await supabase
      .from('bot_move_requests')
      .select('id,match_id,ply,game_key,state,status,created_at,claimed_at,matches!inner(turn,status)')
      .eq('bot_id', authed.botId)
      .in('status', ['pending', 'claimed'])
      .order('created_at', { ascending: true })
      .limit(20);

    if (error) return json({ error: error.message ?? 'Failed to fetch requests' }, 500);
    if (!reqs || reqs.length === 0) return json({ success: true, requests: [] });

    const actionable: any[] = [];
    const expireIds: string[] = [];

    for (const r of reqs as any[]) {
      const m = (r as any).matches;
      if (!m || m.status !== 'active' || m.turn !== r.ply) {
        // Stale request: match advanced or ended.
        expireIds.push(r.id);
        continue;
      }
      if (r.status === 'claimed') {
        // Only re-serve claimed requests if claim is old (runner crashed).
        if (r.claimed_at && String(r.claimed_at) > claimCutoff) continue;
      }
      actionable.push(r);
      if (actionable.length >= 3) break;
    }

    if (expireIds.length) {
      await supabase
        .from('bot_move_requests')
        .update({ status: 'expired', completed_at: new Date().toISOString() })
        .in('id', expireIds);
    }

    if (actionable.length === 0) return json({ success: true, requests: [] });

    const ids = actionable.map((r: any) => r.id);

    // Soft-claim: mark as claimed. If multiple runners race, both might receive, but bot-submit-move is idempotent.
    await supabase
      .from('bot_move_requests')
      .update({ status: 'claimed', claimed_at: new Date().toISOString() })
      .in('id', ids);

    return json({
      success: true,
      bot: { id: authed.botId, name: authed.botName, gameKey: authed.gameKey },
      requests: actionable.map((r: any) => ({
        id: r.id,
        matchId: r.match_id,
        ply: r.ply,
        gameKey: r.game_key,
        state: r.state,
      })),
    });
  } catch (e) {
    console.error('bot-poll error:', e);
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
