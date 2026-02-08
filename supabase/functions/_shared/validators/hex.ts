import type { ServerValidator, MoveContext, MoveResult } from './types.ts';

class DSU {
  parent: number[];

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }

  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }

  union(x: number, y: number): void {
    const rootX = this.find(x);
    const rootY = this.find(y);
    if (rootX !== rootY) {
      this.parent[rootY] = rootX;
    }
  }
}

export class HexServerValidator implements ServerValidator {
  private n: number;
  private board: (0 | 1 | 2)[];
  private turn: number;
  private pieRule: boolean;
  private dsu1: DSU;
  private dsu2: DSU;

  constructor(size: number, pieRule: boolean) {
    this.n = size;
    this.pieRule = pieRule;
    this.board = Array(size * size).fill(0);
    this.turn = 1;
    this.dsu1 = new DSU(size * size + 2);
    this.dsu2 = new DSU(size * size + 2);
  }

  private getNeighbors(cell: number): number[] {
    const row = Math.floor(cell / this.n);
    const col = cell % this.n;
    const neighbors: number[] = [];
    const deltasEven = [[1, -1], [1, 0], [0, 1], [-1, 0], [-1, -1], [0, -1]];
    const deltasOdd = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [0, -1]];
    const deltas = col % 2 === 0 ? deltasEven : deltasOdd;

    for (const [dc, dr] of deltas) {
      const newRow = row + dr;
      const newCol = col + dc;
      if (newRow >= 0 && newRow < this.n && newCol >= 0 && newCol < this.n) {
        neighbors.push(newRow * this.n + newCol);
      }
    }
    return neighbors;
  }

  private legal(cell: number | null): boolean {
    if (cell === null) return this.turn === 2 && this.pieRule;
    return cell >= 0 && cell < this.board.length && this.board[cell] === 0;
  }

  private play(cell: number | null): void {
    if (!this.legal(cell)) throw new Error('Illegal move');

    if (cell === null) {
      this.board = this.board.map(c => c === 1 ? 2 : c === 2 ? 1 : 0) as (0 | 1 | 2)[];
      this.rebuildDSU();
      this.turn++;
      return;
    }

    const color = this.turn % 2 === 1 ? 1 : 2;
    this.board[cell] = color;
    const dsu = color === 1 ? this.dsu1 : this.dsu2;

    for (const nb of this.getNeighbors(cell)) {
      if (this.board[nb] === color) dsu.union(cell, nb);
    }

    if (color === 1) {
      const col = cell % this.n;
      if (col === 0) dsu.union(cell, this.board.length);
      if (col === this.n - 1) dsu.union(cell, this.board.length + 1);
    } else {
      const row = Math.floor(cell / this.n);
      if (row === 0) dsu.union(cell, this.board.length);
      if (row === this.n - 1) dsu.union(cell, this.board.length + 1);
    }

    this.turn++;
  }

  private rebuildDSU(): void {
    this.dsu1 = new DSU(this.n * this.n + 2);
    this.dsu2 = new DSU(this.n * this.n + 2);

    for (let r = 0; r < this.n; r++) {
      this.dsu1.union(r * this.n, this.board.length);
      this.dsu1.union(r * this.n + this.n - 1, this.board.length + 1);
    }
    for (let c = 0; c < this.n; c++) {
      this.dsu2.union(c, this.board.length);
      this.dsu2.union((this.n - 1) * this.n + c, this.board.length + 1);
    }

    for (let i = 0; i < this.board.length; i++) {
      if (this.board[i] === 0) continue;
      const color = this.board[i];
      const dsu = color === 1 ? this.dsu1 : this.dsu2;
      const row = Math.floor(i / this.n);
      const col = i % this.n;

      for (const nb of this.getNeighbors(i)) {
        if (this.board[nb] === color) dsu.union(i, nb);
      }
      if (color === 1) {
        if (col === 0) dsu.union(i, this.board.length);
        if (col === this.n - 1) dsu.union(i, this.board.length + 1);
      } else {
        if (row === 0) dsu.union(i, this.board.length);
        if (row === this.n - 1) dsu.union(i, this.board.length + 1);
      }
    }
  }

  private winner(): 0 | 1 | 2 {
    const left = this.board.length;
    const right = this.board.length + 1;
    if (this.dsu1.find(left) === this.dsu1.find(right)) return 1;
    if (this.dsu2.find(left) === this.dsu2.find(right)) return 2;
    return 0;
  }

  replayMove(moveRecord: any): void {
    this.play(moveRecord.cell);
  }

  listLegalMoves(): unknown[] {
    const out: any[] = [];
    // Pie swap is encoded as cell=null and is only legal on turn 2 if enabled.
    if (this.legal(null)) out.push({ kind: 'hex', cell: null });

    for (let i = 0; i < this.board.length; i++) {
      if (this.board[i] === 0) out.push({ kind: 'hex', cell: i });
    }
    return out;
  }

  applyProposedMove(move: unknown, cell: number | null | undefined, ctx: MoveContext): MoveResult {
    if (cell === undefined) throw new Error('Missing hex cell');
    const proposedCell = cell === undefined ? null : cell;

    if (!this.legal(proposedCell as any)) throw new Error('Illegal move');
    this.play(proposedCell as any);

    const winner = this.winner();
    return {
      moveInsert: {
        match_id: ctx.matchId,
        ply: ctx.currentTurn,
        color: ctx.currentPlayerColor,
        cell: proposedCell,
        action_id: ctx.actionId,
      },
      newTurn: this.turn,
      newStatus: winner ? 'finished' : 'active',
      winner,
      result: winner ? (winner === 1 ? 'p1' : 'p2') : null,
    };
  }
}
