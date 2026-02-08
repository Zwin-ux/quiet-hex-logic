import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { HexServerValidator } from '../_shared/validators/hex.ts';
import { ChessServerValidator } from '../_shared/validators/chess.ts';
import { TttServerValidator } from '../_shared/validators/ttt.ts';
import { CheckersServerValidator } from '../_shared/validators/checkers.ts';
import { Connect4ServerValidator } from '../_shared/validators/connect4.ts';
import type { ServerValidator, MoveContext } from '../_shared/validators/types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const applyMoveSchema = z.object({
  matchId: z.string().uuid('Invalid match ID'),
  cell: z.number().int().min(0).max(10000).nullable().optional(),
  move: z.unknown().optional(),
  actionId: z.string().uuid('Invalid action ID'),
}).superRefine((val, ctx) => {
  if (val.cell === undefined && val.move === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Either cell or move must be provided' });
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Create the correct server-side validator for a game key. */
function createValidator(gameKey: string, match: any): ServerValidator {
  switch (gameKey) {
    case 'chess': return new ChessServerValidator();
    case 'ttt': return new TttServerValidator();
    case 'checkers': return new CheckersServerValidator();
    case 'connect4': return new Connect4ServerValidator();
    default: return new HexServerValidator(match.size, match.pie_rule);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const validationResult = applyMoveSchema.safeParse(body);
    if (!validationResult.success) {
      return json({ error: 'Invalid input parameters', details: validationResult.error.format() }, 400);
    }

    const { matchId, cell, move, actionId } = validationResult.data;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    // Rate limit
    const { count: recentMoveCount } = await supabase
      .from('move_rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('match_id', matchId)
      .eq('user_id', user.id)
      .gte('window_start', new Date(Date.now() - 1000).toISOString());

    if (recentMoveCount !== null && recentMoveCount >= 4) {
      return json({ error: 'Rate limit exceeded - too many moves' }, 429);
    }

    // Update rate limit tracking
    await supabase
      .from('move_rate_limits')
      .upsert({
        match_id: matchId,
        user_id: user.id,
        last_move_at: new Date().toISOString(),
        move_count: 1,
        window_start: new Date().toISOString()
      }, {
        onConflict: 'match_id,user_id'
      });

    // Idempotency check
    const { data: existingMove } = await supabase
      .from('moves')
      .select('ply')
      .eq('match_id', matchId)
      .eq('action_id', actionId)
      .maybeSingle();

    if (existingMove) {
      const { data: currentMatch } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();
      return json({
        success: true,
        turn: currentMatch.turn,
        winner: currentMatch.winner,
        result: (currentMatch as any).result ?? null,
        status: currentMatch.status,
        cached: true,
      });
    }

    // Verify player
    const { data: player, error: playerError } = await supabase
      .from('match_players')
      .select('color, is_bot')
      .eq('match_id', matchId)
      .eq('profile_id', user.id)
      .single();

    if (playerError || !player) return json({ error: 'Not authorized for this match' }, 403);

    // Fetch match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (matchError || !match) return json({ error: 'Match not found' }, 404);
    const currentVersion = match?.version || 0;

    if (match.status === 'finished' || match.status === 'aborted') {
      return json({ error: 'Match is already finished' }, 400);
    }

    const currentPlayerColor = match.turn % 2 === 1 ? 1 : 2;
    if (player.color !== currentPlayerColor) return json({ error: 'Not your turn' }, 400);

    // Fetch moves
    const { data: moves, error: movesError } = await supabase
      .from('moves')
      .select('*')
      .eq('match_id', matchId)
      .order('ply', { ascending: true });

    if (movesError) {
      console.error('Error fetching moves:', movesError);
      return json({ error: 'Failed to fetch moves' }, 500);
    }

    const gameKey = (match as any).game_key ?? 'hex';

    // Create validator, replay history, and apply new move
    const validator = createValidator(gameKey, match);

    for (const m of moves || []) {
      try {
        validator.replayMove(m);
      } catch (e) {
        console.error('Error replaying move:', e);
        return json({ error: 'Invalid move history' }, 500);
      }
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
      return json({ valid: false, error: e.message || 'Illegal move' }, 400);
    }

    const { moveInsert, newTurn, newStatus, winner, result } = moveResult;

    // Insert move
    const { error: moveInsertError } = await supabase.from('moves').insert(moveInsert);

    if (moveInsertError) {
      console.error('Error inserting move:', moveInsertError);
      if (moveInsertError.code === '23505') {
        const { data: existingMoveAtPly } = await supabase
          .from('moves')
          .select('cell, move')
          .eq('match_id', matchId)
          .eq('ply', match.turn)
          .maybeSingle();

        const same =
          (gameKey === 'hex' && existingMoveAtPly && (existingMoveAtPly as any).cell === moveInsert.cell) ||
          (gameKey !== 'hex' && existingMoveAtPly && JSON.stringify((existingMoveAtPly as any).move ?? null) === JSON.stringify(moveInsert.move ?? null));

        if (same) {
          const { data: currentMatch } = await supabase
            .from('matches')
            .select('turn, winner, status, result')
            .eq('id', matchId)
            .single();
          return json({
            success: true,
            turn: currentMatch?.turn || newTurn,
            winner: currentMatch?.winner || null,
            result: (currentMatch as any)?.result ?? null,
            status: currentMatch?.status || newStatus,
            cached: true,
          });
        }
        return json({ error: 'Move already made - refresh to see current state' }, 409);
      }
      return json({ error: 'Failed to record move' }, 500);
    }

    // Update match with optimistic concurrency
    const { data: updatedMatch, error: matchUpdateError } = await supabase
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
      .select()
      .single();

    if (matchUpdateError || !updatedMatch) {
      console.error('Error updating match (concurrency conflict):', matchUpdateError);
      return json({ error: 'Match state changed - please retry' }, 409);
    }

    // Update ratings for finished ranked matches
    if (gameKey !== 'ttt' && updatedMatch.is_ranked && newStatus === 'finished' && (result === 'draw' || !!winner)) {
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
                result,
                p1Id: p1.profile_id,
                p2Id: p2.profile_id,
                winner: winner || null,
              }),
            });
          }
        }
      } catch (error) {
        console.error('Error in rating update:', error);
      }
    }

    return json({ success: true, turn: newTurn, winner: winner || null, result, status: newStatus });
  } catch (error) {
    console.error('Error in apply-move:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: errorMessage }, 500);
  }
});
