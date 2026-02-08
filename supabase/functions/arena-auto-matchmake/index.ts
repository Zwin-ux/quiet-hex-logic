import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { createValidator } from '../_shared/gameValidators.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const schema = z.object({
  gameKey: z.enum(['hex', 'chess', 'checkers', 'ttt', 'connect4']).optional(),
  count: z.number().int().min(1).max(10).default(1),
  // Safety: do nothing if there are already too many active matches for the game.
  maxActivePerGame: z.number().int().min(1).max(100).default(12),
});

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function enqueueMoveRequest(supabase: any, args: { match: any; botId: string }) {
  const match = args.match;
  const { data: moves } = await supabase
    .from('moves')
    .select('ply,color,cell,move,created_at')
    .eq('match_id', match.id)
    .order('ply', { ascending: true });

  const gameKey = (match as any).game_key ?? 'hex';
  const validator = createValidator(gameKey, match);
  for (const m of moves || []) validator.replayMove(m);
  const legal = validator.listLegalMoves();

  const state = {
    match: {
      id: match.id,
      gameKey,
      size: match.size,
      pieRule: match.pie_rule,
      turn: match.turn,
      rules: (match as any).rules ?? null,
    },
    moves: moves ?? [],
    legal,
  };

  await supabase.from('bot_move_requests').upsert({
    match_id: match.id,
    bot_id: args.botId,
    ply: match.turn,
    game_key: gameKey,
    state,
    status: 'pending',
  }, { onConflict: 'match_id,ply,bot_id' });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Protect this endpoint: only callers with the service role key can trigger it.
    const auth = req.headers.get('Authorization') ?? '';
    const expected = `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''}`;
    if (!expected.endsWith(' ') && auth !== expected) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const parsed = schema.safeParse(body);
    if (!parsed.success) return json({ error: 'Invalid input', details: parsed.error.format() }, 400);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const gameKeys = parsed.data.gameKey
      ? [parsed.data.gameKey]
      : (['hex', 'chess', 'checkers', 'ttt', 'connect4'] as const);

    const created: { gameKey: string; matchId: string; p1BotId: string; p2BotId: string }[] = [];
    const skipped: { gameKey: string; reason: string }[] = [];

    for (const gk of gameKeys) {
      // If too many active matches are already running for this game, do nothing.
      const { count: activeCount } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .eq('is_arena', true)
        .eq('game_key', gk)
        .eq('status', 'active');

      if ((activeCount ?? 0) >= parsed.data.maxActivePerGame) {
        skipped.push({ gameKey: gk, reason: `too_many_active (${activeCount})` });
        continue;
      }

      const { data: bots } = await supabase
        .from('bots')
        .select('id,owner_profile_id,game_key')
        .eq('visibility', 'public')
        .eq('game_key', gk)
        .order('created_at', { ascending: false })
        .limit(200);

      const pool = shuffle((bots as any[] | null) ?? []);
      if (pool.length < 2) {
        skipped.push({ gameKey: gk, reason: 'not_enough_public_bots' });
        continue;
      }

      const toCreate = Math.min(parsed.data.count, Math.floor(pool.length / 2));
      for (let i = 0; i < toCreate; i++) {
        const b1 = pool[i * 2];
        const b2 = pool[i * 2 + 1];

        const owner = b1.owner_profile_id; // required by schema
        const size =
          gk === 'hex' ? 11 :
          gk === 'chess' ? 8 :
          gk === 'checkers' ? 8 :
          gk === 'ttt' ? 3 :
          7; // connect4 cols

        const { data: match, error: matchErr } = await supabase
          .from('matches')
          .insert({
            owner,
            game_key: gk,
            size,
            pie_rule: gk === 'hex',
            status: 'active',
            turn: 1,
            winner: null,
            result: null,
            is_ranked: false,
            ai_difficulty: null,
            is_arena: true,
            rules: { presetKey: 'House League' },
          } as any)
          .select('*')
          .single();

        if (matchErr || !match) {
          skipped.push({ gameKey: gk, reason: matchErr?.message ?? 'match_create_failed' });
          continue;
        }

        const { error: bmErr } = await supabase
          .from('bot_matches')
          .insert({
            match_id: match.id,
            p1_bot_id: b1.id,
            p2_bot_id: b2.id,
            mode: 'bot-vs-bot',
          });

        if (bmErr) {
          // Best effort cleanup to avoid dangling arena matches.
          await supabase.from('matches').delete().eq('id', match.id);
          skipped.push({ gameKey: gk, reason: bmErr.message ?? 'bot_match_link_failed' });
          continue;
        }

        await enqueueMoveRequest(supabase, { match, botId: b1.id });

        created.push({ gameKey: gk, matchId: match.id, p1BotId: b1.id, p2BotId: b2.id });
      }
    }

    return json({ success: true, created, skipped });
  } catch (e) {
    console.error('arena-auto-matchmake error:', e);
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

