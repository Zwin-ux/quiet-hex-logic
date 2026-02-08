import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { parseBotToken, authenticateBot } from '../_shared/botAuth.ts';
import { createValidator } from '../_shared/gameValidators.ts';
import type { MoveContext } from '../_shared/validators/types.ts';

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

const schema = z.object({
  requestId: z.string().uuid(),
  actionId: z.string().uuid(),
  // Hex convenience
  cell: z.number().int().min(0).max(10000).nullable().optional(),
  // Generic payload for other games
  move: z.unknown().optional(),
}).superRefine((val, ctx) => {
  if (val.cell === undefined && val.move === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Either cell or move must be provided' });
  }
});

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
      gameKey: match.game_key ?? 'hex',
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
    game_key: match.game_key ?? 'hex',
    state,
    status: 'pending',
  }, { onConflict: 'match_id,ply,bot_id' });
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

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return json({ error: 'Invalid input', details: parsed.error.format() }, 400);

    const { requestId, actionId, cell, move } = parsed.data;

    const { data: reqRow, error: reqErr } = await supabase
      .from('bot_move_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (reqErr || !reqRow) return json({ error: 'Request not found' }, 404);
    if (reqRow.bot_id !== authed.botId) return json({ error: 'Forbidden (wrong bot)' }, 403);
    if (reqRow.status === 'completed') {
      return json({ success: true, cached: true });
    }
    if (reqRow.status !== 'pending' && reqRow.status !== 'claimed') {
      return json({ error: `Request not actionable (${reqRow.status})` }, 409);
    }

    const matchId = reqRow.match_id as string;

    // Idempotency via moves(action_id)
    const { data: existingMove } = await supabase
      .from('moves')
      .select('ply')
      .eq('match_id', matchId)
      .eq('action_id', actionId)
      .maybeSingle();

    if (existingMove) {
      await supabase
        .from('bot_move_requests')
        .update({ status: 'completed', completed_at: new Date().toISOString(), action_id: actionId })
        .eq('id', requestId);
      return json({ success: true, cached: true });
    }

    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();
    if (matchErr || !match) return json({ error: 'Match not found' }, 404);
    if (!(match as any).is_arena) return json({ error: 'Not an arena match' }, 400);
    if (match.status !== 'active') return json({ error: 'Match is not active' }, 400);

    const currentVersion = (match as any).version ?? 0;
    const gameKey = (match as any).game_key ?? 'hex';

    // Determine which color this bot controls.
    const { data: botMatch } = await supabase
      .from('bot_matches')
      .select('p1_bot_id,p2_bot_id')
      .eq('match_id', matchId)
      .single();
    if (!botMatch) return json({ error: 'Arena metadata missing' }, 500);

    const expectedColor =
      botMatch.p1_bot_id === authed.botId ? 1 :
      botMatch.p2_bot_id === authed.botId ? 2 : 0;
    if (!expectedColor) return json({ error: 'Bot is not assigned to this match' }, 403);

    const currentPlayerColor = match.turn % 2 === 1 ? 1 : 2;
    if (expectedColor !== currentPlayerColor) {
      return json({ error: 'Not your turn' }, 409);
    }

    const { data: moves, error: movesErr } = await supabase
      .from('moves')
      .select('*')
      .eq('match_id', matchId)
      .order('ply', { ascending: true });
    if (movesErr) return json({ error: 'Failed to fetch moves' }, 500);

    const validator = createValidator(gameKey, match);
    for (const m of moves || []) {
      validator.replayMove(m);
    }

    const ctx: MoveContext = {
      matchId,
      actionId,
      currentTurn: match.turn,
      currentPlayerColor: currentPlayerColor as 1 | 2,
    };

    let moveResult;
    try {
      moveResult = validator.applyProposedMove(move, cell, ctx);
    } catch (e: any) {
      await supabase
        .from('bot_move_requests')
        .update({ status: 'failed', completed_at: new Date().toISOString(), action_id: actionId })
        .eq('id', requestId);
      return json({ error: e?.message ?? 'Illegal move' }, 400);
    }

    const { moveInsert, newTurn, newStatus, winner, result } = moveResult;

    const { error: insErr } = await supabase.from('moves').insert(moveInsert);
    if (insErr) {
      if (insErr.code === '23505') {
        // Duplicate insert race; treat as cached.
        await supabase
          .from('bot_move_requests')
          .update({ status: 'completed', completed_at: new Date().toISOString(), action_id: actionId })
          .eq('id', requestId);
        return json({ success: true, cached: true });
      }
      return json({ error: 'Failed to record move' }, 500);
    }

    const { data: updatedMatch, error: updErr } = await supabase
      .from('matches')
      .update({
        turn: newTurn,
        status: newStatus,
        winner: winner || null,
        result,
        draw_offered_by: null,
        version: currentVersion + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchId)
      .eq('version', currentVersion)
      .select('*')
      .single();

    if (updErr || !updatedMatch) {
      return json({ error: 'Match state changed - please retry' }, 409);
    }

    await supabase
      .from('bot_move_requests')
      .update({ status: 'completed', completed_at: new Date().toISOString(), action_id: actionId })
      .eq('id', requestId);

    // Enqueue next bot request if match continues.
    if (updatedMatch.status === 'active') {
      const nextColor = updatedMatch.turn % 2 === 1 ? 1 : 2;
      const nextBotId = nextColor === 1 ? botMatch.p1_bot_id : botMatch.p2_bot_id;
      if (nextBotId) {
        await enqueueMoveRequest(supabase, { match: updatedMatch, botId: nextBotId });
      }
    }

    // Arena ladder: update bot ratings once the match is finished (idempotent + transactional in DB).
    if (updatedMatch.status === 'finished') {
      try {
        await supabase.rpc('process_arena_bot_ratings', { p_match_id: matchId });
      } catch (e) {
        console.error('Failed to process arena bot ratings:', e);
      }
    }

    return json({
      success: true,
      status: updatedMatch.status,
      turn: updatedMatch.turn,
      winner: updatedMatch.winner ?? null,
      result: (updatedMatch as any).result ?? null,
    });
  } catch (e) {
    console.error('bot-submit-move error:', e);
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
