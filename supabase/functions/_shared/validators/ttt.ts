import type { ServerValidator, MoveContext, MoveResult } from './types.ts';

export class TttServerValidator implements ServerValidator {
  private board: (0 | 1 | 2)[];
  private turn: number;

  constructor() {
    this.board = Array(9).fill(0) as (0 | 1 | 2)[];
    this.turn = 1;
  }

  private legal(cell: number): boolean {
    return Number.isInteger(cell) && cell >= 0 && cell < 9 && this.board[cell] === 0;
  }

  private play(cell: number): void {
    if (!this.legal(cell)) throw new Error('Illegal move');
    const color = this.turn % 2 === 1 ? 1 : 2;
    this.board[cell] = color as 1 | 2;
    this.turn += 1;
  }

  private winner(): 0 | 1 | 2 {
    const b = this.board;
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    for (const [a, c, d] of lines) {
      const v = b[a];
      if (v !== 0 && v === b[c] && v === b[d]) return v;
    }
    return 0;
  }

  private isDraw(): boolean {
    return this.board.every((x) => x !== 0) && this.winner() === 0;
  }

  replayMove(moveRecord: any): void {
    const c = (moveRecord?.move as any)?.cell as number | undefined;
    if (c === undefined || c === null) return;
    this.play(Number(c));
  }

  applyProposedMove(move: unknown, _cell: number | null | undefined, ctx: MoveContext): MoveResult {
    const tttCell = (move as any)?.cell;
    if (tttCell === undefined || tttCell === null) throw new Error('Missing ttt cell');

    if (!this.legal(Number(tttCell))) throw new Error('Illegal move');
    this.play(Number(tttCell));

    const w = this.winner();
    let newStatus: 'active' | 'finished' = 'active';
    let winner: 0 | 1 | 2 = 0;
    let result: 'p1' | 'p2' | 'draw' | null = null;

    if (w) {
      newStatus = 'finished';
      winner = w;
      result = w === 1 ? 'p1' : 'p2';
    } else if (this.isDraw()) {
      newStatus = 'finished';
      result = 'draw';
    }

    return {
      moveInsert: {
        match_id: ctx.matchId,
        ply: ctx.currentTurn,
        color: ctx.currentPlayerColor,
        cell: null,
        move: { cell: Number(tttCell) },
        notation: null,
        action_id: ctx.actionId,
      },
      newTurn: this.turn,
      newStatus,
      winner,
      result,
    };
  }
}
