import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const schema = z.object({
  gameKey: z.enum(['hex', 'chess', 'checkers', 'ttt', 'connect4']).default('hex'),
  // Only used for hex. Keep constrained to known-safe DB sizes to avoid legacy CHECK constraints.
  boardSize: z.number().int().refine((n) => [7, 9, 11, 13].includes(n), 'Board size must be one of 7, 9, 11, 13').optional(),
  // Rules snapshot for arena variants (future-proof). For now we accept but default to null.
  rules: z.unknown().optional(),
  p1BotId: z.string().uuid(),
  p2BotId: z.string().uuid(),
});

async function enqueueMoveRequest(supabase: any, args: { match: any; botId: string }) {
  const match = args.match;

  const { data: moves } = await supabase
    .from('moves')
    .select('ply,color,cell,move,created_at')
    .eq('match_id', match.id)
    .order('ply', { ascending: true });

  // Compute legal moves server-side for easy bot implementations.
  const gameKey = (match as any).game_key ?? 'hex';
  const validator = (await import('../_shared/gameValidators.ts')).createValidator(gameKey, match);
  for (const m of moves || []) validator.replayMove(m);
  const legal = validator.listLegalMoves();

  const state = {
    match: {
      id: match.id,
      gameKey: match.game_key ?? 'hex',
      size: match.size,
      pieRule: match.pie_rule,
      turn: match.turn,
      rules: (match as any).rules ?? null,
    },
    // Keep raw move records; bot runners can replay using the same serialization contracts.
    moves: moves ?? [],
    legal,
  };

  await supabase
    .from('bot_move_requests')
    .upsert({
      match_id: match.id,
      bot_id: args.botId,
      ply: match.turn,
      game_key: match.game_key ?? 'hex',
      state,
      status: 'pending',
    }, { onConflict: 'match_id,ply,bot_id' });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return json({ error: 'Invalid input', details: parsed.error.format() }, 400);

    const { gameKey, boardSize, rules, p1BotId, p2BotId } = parsed.data;

    const { data: p1Bot } = await supabase.from('bots').select('id, game_key').eq('id', p1BotId).single();
    const { data: p2Bot } = await supabase.from('bots').select('id, game_key').eq('id', p2BotId).single();
    if (!p1Bot || !p2Bot) return json({ error: 'Bot not found' }, 404);
    if (p1Bot.game_key !== gameKey || p2Bot.game_key !== gameKey) {
      return json({ error: 'Bots must match the selected game' }, 400);
    }

    // Create arena match. Always unranked.
    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .insert({
        owner: user.id,
        game_key: gameKey,
        size: gameKey === 'hex'
          ? (boardSize ?? 11)
          : gameKey === 'chess'
            ? 8
            : gameKey === 'checkers'
              ? 8
              : gameKey === 'ttt'
                ? 3
                : 7, // connect4 cols
        pie_rule: gameKey === 'hex',
        status: 'active',
        turn: 1,
        winner: null,
        result: null,
        is_ranked: false,
        ai_difficulty: null,
        is_arena: true,
        rules: (rules ?? null) as any,
      } as any)
      .select('*')
      .single();

    if (matchErr || !match) return json({ error: matchErr?.message ?? 'Failed to create match' }, 500);

    const { error: bmErr } = await supabase
      .from('bot_matches')
      .insert({
        match_id: match.id,
        p1_bot_id: p1BotId,
        p2_bot_id: p2BotId,
        mode: 'bot-vs-bot',
      });

    if (bmErr) return json({ error: bmErr.message ?? 'Failed to link bots to match' }, 500);

    // Enqueue the first request for P1.
    await enqueueMoveRequest(supabase, { match, botId: p1BotId });

    return json({ success: true, matchId: match.id });
  } catch (e) {
    console.error('arena-create-match error:', e);
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
