export type TttPlayer = 1 | 2;

export class TicTacToe {
  board: Uint8Array; // 0 empty, 1 p1, 2 p2
  turn: TttPlayer = 1;
  ply = 0;

  constructor() {
    this.board = new Uint8Array(9);
  }

  clone(): TicTacToe {
    const t = new TicTacToe();
    t.board = new Uint8Array(this.board);
    t.turn = this.turn;
    t.ply = this.ply;
    return t;
  }

  legal(cell: number): boolean {
    return Number.isInteger(cell) && cell >= 0 && cell < 9 && this.board[cell] === 0;
  }

  play(cell: number): void {
    if (!this.legal(cell)) throw new Error('Illegal move');
    this.board[cell] = this.turn;
    this.ply += 1;
    this.turn = this.turn === 1 ? 2 : 1;
  }

  winner(): 0 | 1 | 2 {
    const b = this.board;
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ] as const;
    for (const [a, c, d] of lines) {
      const v = b[a];
      if (v !== 0 && v === b[c] && v === b[d]) return v as 1 | 2;
    }
    return 0;
  }

  isDraw(): boolean {
    return this.ply >= 9 && this.winner() === 0;
  }
}

