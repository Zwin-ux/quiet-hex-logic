/**
 * Hex Game Engine
 * Implements the game of Hex with Disjoint Set Union (DSU) for win detection
 * and support for the pie rule.
 */

export type Color = 1 | 2; // 1 = indigo (W-E), 2 = ochre (N-S)
export type Cell = number | null; // null represents pie swap

const DIRS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
  [-1, 1],
  [1, -1],
] as const;

/**
 * Disjoint Set Union (Union-Find) data structure
 * Used for efficient connectivity tracking
 */
class DSU {
  p: number[]; // parent array
  r: number[]; // rank array

  constructor(n: number) {
    this.p = Array.from({ length: n }, (_, i) => i);
    this.r = Array(n).fill(0);
  }

  // Find with path compression
  find(x: number): number {
    while (this.p[x] !== x) {
      this.p[x] = this.p[this.p[x]]; // path compression
      x = this.p[x];
    }
    return x;
  }

  // Union by rank
  union(a: number, b: number): void {
    a = this.find(a);
    b = this.find(b);
    if (a === b) return;

    if (this.r[a] < this.r[b]) [a, b] = [b, a];
    this.p[b] = a;
    if (this.r[a] === this.r[b]) this.r[a]++;
  }
}

/**
 * Hex Game Engine
 */
export class Hex {
  n: number; // board size
  board: Uint8Array; // 0 = empty, 1 = indigo, 2 = ochre
  turn: Color = 1;
  ply: number = 0;
  swapped: boolean = false;
  pieRule: boolean;

  // DSU structures for each color
  private dsu1: DSU; // indigo (connects W-E)
  private dsu2: DSU; // ochre (connects N-S)

  // Virtual nodes for borders
  private v1a: number; // indigo west border
  private v1b: number; // indigo east border
  private v2a: number; // ochre north border
  private v2b: number; // ochre south border

  constructor(n: number = 11, pieRule: boolean = true) {
    this.n = n;
    this.pieRule = pieRule;
    const N = n * n;
    this.board = new Uint8Array(N);

    // Initialize DSU with virtual nodes
    this.dsu1 = new DSU(N + 2);
    this.dsu2 = new DSU(N + 2);
    this.v1a = N;
    this.v1b = N + 1;
    this.v2a = N;
    this.v2b = N + 1;

    // Connect border cells to virtual nodes
    for (let r = 0; r < n; r++) {
      this.dsu1.union(this.idx(0, r), this.v1a); // west border
      this.dsu1.union(this.idx(n - 1, r), this.v1b); // east border
    }
    for (let c = 0; c < n; c++) {
      this.dsu2.union(this.idx(c, 0), this.v2a); // north border
      this.dsu2.union(this.idx(c, n - 1), this.v2b); // south border
    }
  }

  // Convert (col, row) to linear index
  private idx(c: number, r: number): number {
    return r * this.n + c;
  }

  // Convert linear index to (col, row)
  coords(i: number): readonly [number, number] {
    return [i % this.n, Math.floor(i / this.n)] as const;
  }

  // Get all neighbors of a cell
  neighbors(i: number): number[] {
    const [c, r] = this.coords(i);
    const out: number[] = [];
    for (const [dc, dr] of DIRS) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc >= 0 && nr >= 0 && nc < this.n && nr < this.n) {
        out.push(this.idx(nc, nr));
      }
    }
    return out;
  }

  // Check if a move is legal
  legal(cell: Cell): boolean {
    if (cell === null) {
      // Pie swap only legal on ply 1
      return this.pieRule && this.ply === 1 && !this.swapped;
    }
    return this.board[cell] === 0;
  }

  // Execute a move
  play(cell: Cell): void {
    if (!this.legal(cell)) {
      throw new Error(`Illegal move: cell=${cell}, ply=${this.ply}`);
    }

    // Handle pie swap
    if (cell === null) {
      this.swapped = true;
      this.turn = 1; // indigo plays again after swap
      this.ply++;
      return;
    }

    const color = this.turn;
    this.board[cell] = color;
    this.ply++;

    // Union with same-color neighbors
    const dsu = color === 1 ? this.dsu1 : this.dsu2;
    for (const nb of this.neighbors(cell)) {
      if (this.board[nb] === color) {
        dsu.union(cell, nb);
      }
    }

    // Connect to borders if on edge
    const [c, r] = this.coords(cell);
    if (color === 1) {
      if (c === 0) dsu.union(cell, this.v1a);
      if (c === this.n - 1) dsu.union(cell, this.v1b);
    } else {
      if (r === 0) dsu.union(cell, this.v2a);
      if (r === this.n - 1) dsu.union(cell, this.v2b);
    }

    // Toggle turn
    this.turn = color === 1 ? 2 : 1;
  }

  // Check for winner
  winner(): Color | 0 {
    if (this.dsu1.find(this.v1a) === this.dsu1.find(this.v1b)) return 1;
    if (this.dsu2.find(this.v2a) === this.dsu2.find(this.v2b)) return 2;
    return 0;
  }

  // Get winning path using BFS
  getWinningPath(): number[] | null {
    const w = this.winner();
    if (w === 0) return null;

    const dsu = w === 1 ? this.dsu1 : this.dsu2;
    const startVirtual = w === 1 ? this.v1a : this.v2a;
    const endVirtual = w === 1 ? this.v1b : this.v2b;

    // Find all cells connected to start border
    const startCells: number[] = [];
    for (let i = 0; i < this.n * this.n; i++) {
      if (this.board[i] === w && dsu.find(i) === dsu.find(startVirtual)) {
        startCells.push(i);
      }
    }

    // BFS from start border to end border
    const queue: number[] = [...startCells];
    const parent = new Map<number, number>();
    const visited = new Set<number>(startCells);

    while (queue.length > 0) {
      const current = queue.shift()!;
      
      // Check if connected to end border
      if (dsu.find(current) === dsu.find(endVirtual)) {
        // Reconstruct path
        const path: number[] = [current];
        let node = current;
        while (parent.has(node)) {
          node = parent.get(node)!;
          path.unshift(node);
        }
        return path;
      }

      // Explore neighbors
      for (const nb of this.neighbors(current)) {
        if (!visited.has(nb) && this.board[nb] === w) {
          visited.add(nb);
          parent.set(nb, current);
          queue.push(nb);
        }
      }
    }

    return null;
  }

  // Get all empty cells
  getEmptyCells(): number[] {
    const empty: number[] = [];
    for (let i = 0; i < this.board.length; i++) {
      if (this.board[i] === 0) empty.push(i);
    }
    return empty;
  }

  // Create a deep copy of the game state
  clone(): Hex {
    const copy = new Hex(this.n, this.pieRule);
    copy.board = new Uint8Array(this.board);
    copy.turn = this.turn;
    copy.ply = this.ply;
    copy.swapped = this.swapped;

    // Rebuild DSU state from board position
    for (let i = 0; i < this.board.length; i++) {
      const color = this.board[i];
      if (color === 0) continue;

      const dsu = color === 1 ? copy.dsu1 : copy.dsu2;

      // Union with same-color neighbors
      for (const nb of copy.neighbors(i)) {
        if (copy.board[nb] === color) {
          dsu.union(i, nb);
        }
      }

      // Connect to borders if on edge
      const [c, r] = copy.coords(i);
      if (color === 1) {
        if (c === 0) dsu.union(i, copy.v1a);
        if (c === this.n - 1) dsu.union(i, copy.v1b);
      } else {
        if (r === 0) dsu.union(i, copy.v2a);
        if (r === this.n - 1) dsu.union(i, copy.v2b);
      }
    }

    return copy;
  }

  // Export game state
  toJSON() {
    return {
      n: this.n,
      board: Array.from(this.board),
      turn: this.turn,
      ply: this.ply,
      swapped: this.swapped,
      pieRule: this.pieRule,
      winner: this.winner(),
    };
  }
}

/**
 * Reconstruct game state from move history
 */
export function replayMoves(
  size: number,
  pieRule: boolean,
  moves: Array<{ ply: number; color: Color; cell: Cell }>
): Hex {
  const game = new Hex(size, pieRule);
  const sorted = moves.sort((a, b) => a.ply - b.ply);
  
  for (const move of sorted) {
    game.play(move.cell);
  }
  
  return game;
}
