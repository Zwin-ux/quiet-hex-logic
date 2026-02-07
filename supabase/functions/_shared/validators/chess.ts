import { Chess } from 'https://esm.sh/chess.js@1.4.0';
import type { ServerValidator, MoveContext, MoveResult } from './types.ts';

export class ChessServerValidator implements ServerValidator {
  private chess: Chess;

  constructor() {
    this.chess = new Chess();
  }

  replayMove(moveRecord: any): void {
    const uci = (moveRecord?.move as any)?.uci as string | undefined;
    if (!uci) return;
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length === 5 ? uci[4] : undefined;
    const ok = this.chess.move({ from, to, promotion } as any);
    if (!ok) throw new Error('Invalid move history');
  }

  applyProposedMove(move: unknown, _cell: number | null | undefined, ctx: MoveContext): MoveResult {
    if (!(move as any)?.uci) throw new Error('Missing chess move');

    const uci = (move as any).uci;
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = ((move as any).promotion ?? (uci.length === 5 ? (uci[4] as any) : undefined)) as any;
    const applied = this.chess.move({ from, to, promotion } as any);
    if (!applied) throw new Error('Illegal move');

    let newStatus: 'active' | 'finished' = 'active';
    let winner: 0 | 1 | 2 = 0;
    let result: 'p1' | 'p2' | 'draw' | null = null;

    if (this.chess.isGameOver()) {
      newStatus = 'finished';
      if (this.chess.isCheckmate()) {
        result = this.chess.turn() === 'w' ? 'p2' : 'p1';
        winner = result === 'p1' ? 1 : 2;
      } else {
        result = 'draw';
      }
    }

    return {
      moveInsert: {
        match_id: ctx.matchId,
        ply: ctx.currentTurn,
        color: ctx.currentPlayerColor,
        cell: null,
        move: { uci: `${applied.from}${applied.to}${(applied as any).promotion ?? ''}` },
        notation: (applied as any).san ?? null,
        action_id: ctx.actionId,
      },
      newTurn: ctx.currentTurn + 1,
      newStatus,
      winner,
      result,
    };
  }
}
