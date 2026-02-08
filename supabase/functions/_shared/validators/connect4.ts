import type { ServerValidator, MoveContext, MoveResult } from './types.ts';

/**
 * Server-side Connect 4 validator.
 * Minimal reimplementation for move validation on the server.
 */
export class Connect4ServerValidator implements ServerValidator {
  private cols: number;
  private rows: number;
  private connect: number;
  private board: Uint8Array;
  private heights: number[];
  private turn: number;
  private winner_: 0 | 1 | 2 = 0;

  constructor(cols = 7, rows = 6, connect = 4) {
    this.cols = cols;
    this.rows = rows;
    this.connect = Math.max(3, Math.min(6, Math.floor(connect)));
    this.board = new Uint8Array(cols * rows);
    this.heights = Array(cols).fill(0);
    this.turn = 1;
  }

  private idx(col: number, row: number): number {
    return col * this.rows + row;
  }

  private get(col: number, row: number): 0 | 1 | 2 {
    return this.board[this.idx(col, row)] as 0 | 1 | 2;
  }

  private legal(col: number): boolean {
    return Number.isInteger(col) && col >= 0 && col < this.cols &&
      this.heights[col] < this.rows && this.winner_ === 0;
  }

  private play(col: number): void {
    if (!this.legal(col)) throw new Error(`Illegal move: col=${col}`);
    const color = (this.turn % 2 === 1 ? 1 : 2) as 1 | 2;
    const row = this.heights[col];
    this.board[this.idx(col, row)] = color;
    this.heights[col] = row + 1;

    if (this.checkWinAt(col, row, color)) {
      this.winner_ = color;
    }
    this.turn += 1;
  }

  private checkWinAt(col: number, row: number, player: 1 | 2): boolean {
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (const [dc, dr] of dirs) {
      let count = 1;
      for (let i = 1; i < this.connect; i++) {
        const c = col + dc * i, r = row + dr * i;
        if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) break;
        if (this.get(c, r) !== player) break;
        count++;
      }
      for (let i = 1; i < this.connect; i++) {
        const c = col - dc * i, r = row - dr * i;
        if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) break;
        if (this.get(c, r) !== player) break;
        count++;
      }
      if (count >= this.connect) return true;
    }
    return false;
  }

  private isDraw(): boolean {
    return this.winner_ === 0 && (this.turn - 1) >= this.cols * this.rows;
  }

  replayMove(moveRecord: any): void {
    const col = (moveRecord?.move as any)?.col;
    if (col === undefined || col === null) return;
    this.play(Number(col));
  }

  listLegalMoves(): unknown[] {
    const out: any[] = [];
    for (let c = 0; c < this.cols; c++) {
      if (this.legal(c)) out.push({ kind: 'connect4', col: c });
    }
    return out;
  }

  applyProposedMove(move: unknown, _cell: number | null | undefined, ctx: MoveContext): MoveResult {
    const col = (move as any)?.col;
    if (col === undefined || col === null) throw new Error('Missing connect4 col');

    if (!this.legal(Number(col))) throw new Error('Illegal move');
    this.play(Number(col));

    const w = this.winner_;
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
        move: { col: Number(col) },
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
