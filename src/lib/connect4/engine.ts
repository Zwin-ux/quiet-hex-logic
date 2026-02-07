export type C4Player = 1 | 2;

/**
 * Connect 4 engine.
 * Standard 7 columns x 6 rows board. Gravity drops pieces to the lowest empty row.
 * Player 1 (red) goes first. Win by connecting 4 in a row/column/diagonal.
 */
export class Connect4 {
  readonly cols: number;
  readonly rows: number;
  readonly connect: number;
  /** Board stored column-major: board[col][row], row 0 = bottom. 0=empty, 1=P1, 2=P2. */
  board: Uint8Array;
  /** Next available row per column (index of lowest empty cell). -1 if column full. */
  heights: number[];
  turn: C4Player = 1;
  ply = 0;
  private _winner: 0 | 1 | 2 = 0;

  constructor(cols = 7, rows = 6, connect = 4) {
    this.cols = cols;
    this.rows = rows;
    this.connect = Math.max(3, Math.min(6, Math.floor(connect)));
    this.board = new Uint8Array(cols * rows);
    this.heights = Array(cols).fill(0);
  }

  private idx(col: number, row: number): number {
    return col * this.rows + row;
  }

  get(col: number, row: number): 0 | 1 | 2 {
    return this.board[this.idx(col, row)] as 0 | 1 | 2;
  }

  legal(col: number): boolean {
    return Number.isInteger(col) && col >= 0 && col < this.cols && this.heights[col] < this.rows && this._winner === 0;
  }

  play(col: number): void {
    if (!this.legal(col)) throw new Error(`Illegal move: col=${col}`);

    const row = this.heights[col];
    this.board[this.idx(col, row)] = this.turn;
    this.heights[col] = row + 1;

    if (this.checkWinAt(col, row, this.turn)) {
      this._winner = this.turn;
    }

    this.turn = this.turn === 1 ? 2 : 1;
    this.ply++;
  }

  winner(): 0 | 1 | 2 {
    return this._winner;
  }

  isDraw(): boolean {
    return this._winner === 0 && this.ply >= this.cols * this.rows;
  }

  isGameOver(): boolean {
    return this._winner !== 0 || this.isDraw();
  }

  clone(): Connect4 {
    const copy = new Connect4(this.cols, this.rows, this.connect);
    copy.board = new Uint8Array(this.board);
    copy.heights = [...this.heights];
    copy.turn = this.turn;
    copy.ply = this.ply;
    copy._winner = this._winner;
    return copy;
  }

  /** Get all legal columns. */
  legalColumns(): number[] {
    const out: number[] = [];
    for (let c = 0; c < this.cols; c++) {
      if (this.legal(c)) out.push(c);
    }
    return out;
  }

  private checkWinAt(col: number, row: number, player: C4Player): boolean {
    const directions = [
      [1, 0],   // horizontal
      [0, 1],   // vertical
      [1, 1],   // diagonal /
      [1, -1],  // diagonal \
    ];

    for (const [dc, dr] of directions) {
      let count = 1;
      // Count in positive direction
      for (let i = 1; i < this.connect; i++) {
        const c = col + dc * i;
        const r = row + dr * i;
        if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) break;
        if (this.get(c, r) !== player) break;
        count++;
      }
      // Count in negative direction
      for (let i = 1; i < this.connect; i++) {
        const c = col - dc * i;
        const r = row - dr * i;
        if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) break;
        if (this.get(c, r) !== player) break;
        count++;
      }
      if (count >= this.connect) return true;
    }
    return false;
  }
}
