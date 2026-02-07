import { describe, it, expect } from 'vitest';
import { Hex, replayMoves } from '../engine';

describe('Hex Engine', () => {
  describe('constructor', () => {
    it('creates a board of the correct size', () => {
      const game = new Hex(7);
      expect(game.board.length).toBe(49);
      expect(game.turn).toBe(1);
      expect(game.ply).toBe(0);
    });

    it('defaults to size 11 with pie rule', () => {
      const game = new Hex();
      expect(game.n).toBe(11);
      expect(game.pieRule).toBe(true);
      expect(game.board.length).toBe(121);
    });
  });

  describe('coords / indexing', () => {
    it('converts index to (col, row) correctly', () => {
      const game = new Hex(5);
      expect(game.coords(0)).toEqual([0, 0]);
      expect(game.coords(4)).toEqual([4, 0]);
      expect(game.coords(5)).toEqual([0, 1]);
      expect(game.coords(12)).toEqual([2, 2]);
    });
  });

  describe('neighbors (odd-q offset)', () => {
    it('returns correct neighbors for even column center cell', () => {
      const game = new Hex(5);
      // Cell at (2, 2) = index 12, col 2 is even
      const nbrs = game.neighbors(12);
      expect(nbrs.length).toBe(6);
      // Even col dirs: NE(+1,-1), SE(+1,0), S(0,+1), SW(-1,0), NW(-1,-1), N(0,-1)
      // (2,2) -> NE(3,1)=8, SE(3,2)=13, S(2,3)=17, SW(1,2)=11, NW(1,1)=6, N(2,1)=7
      expect(nbrs.sort((a, b) => a - b)).toEqual([6, 7, 8, 11, 13, 17]);
    });

    it('returns correct neighbors for odd column center cell', () => {
      const game = new Hex(5);
      // Cell at (1, 2) = index 11, col 1 is odd
      const nbrs = game.neighbors(11);
      expect(nbrs.length).toBe(6);
      // Odd col dirs: NE(+1,0), SE(+1,+1), S(0,+1), SW(-1,+1), NW(-1,0), N(0,-1)
      // (1,2) -> NE(2,2)=12, SE(2,3)=17, S(1,3)=16, SW(0,3)=15, NW(0,2)=10, N(1,1)=6
      expect(nbrs.sort((a, b) => a - b)).toEqual([6, 10, 12, 15, 16, 17]);
    });

    it('returns fewer neighbors for corner cells', () => {
      const game = new Hex(5);
      // Top-left corner (0,0) = index 0, col 0 is even
      const nbrs = game.neighbors(0);
      // Even col at (0,0): NE(1,-1) oob, SE(1,0)=5, S(0,1)=5 wait...
      // (0,0): NE(1,-1) out, SE(1,0)=index 5? col=1,row=0=5. S(0,1)=5? col=0,row=1=5.
      // Actually: idx(c,r) = r*n + c. So idx(1,0) = 0*5+1 = 1. idx(0,1) = 1*5+0 = 5.
      // NE(1,-1): out. SE(1,0): idx(1,0)=1. S(0,1): idx(0,1)=5. SW(-1,0): out. NW(-1,-1): out. N(0,-1): out.
      expect(nbrs.length).toBe(2);
    });
  });

  describe('legal moves', () => {
    it('allows placement on empty cells', () => {
      const game = new Hex(5);
      expect(game.legal(0)).toBe(true);
      expect(game.legal(24)).toBe(true);
    });

    it('rejects placement on occupied cells', () => {
      const game = new Hex(5);
      game.play(0);
      expect(game.legal(0)).toBe(false);
    });

    it('pie swap is legal on ply 1 with pie rule', () => {
      const game = new Hex(5, true);
      game.play(12); // ply 0 -> 1
      expect(game.legal(null)).toBe(true);
    });

    it('pie swap is illegal on ply 0', () => {
      const game = new Hex(5, true);
      expect(game.legal(null)).toBe(false);
    });

    it('pie swap is illegal without pie rule', () => {
      const game = new Hex(5, false);
      game.play(12);
      expect(game.legal(null)).toBe(false);
    });
  });

  describe('play', () => {
    it('alternates turns', () => {
      const game = new Hex(5);
      expect(game.turn).toBe(1);
      game.play(0);
      expect(game.turn).toBe(2);
      game.play(1);
      expect(game.turn).toBe(1);
    });

    it('increments ply', () => {
      const game = new Hex(5);
      game.play(0);
      expect(game.ply).toBe(1);
      game.play(1);
      expect(game.ply).toBe(2);
    });

    it('throws on illegal move', () => {
      const game = new Hex(5);
      game.play(0);
      expect(() => game.play(0)).toThrow('Illegal move');
    });
  });

  describe('pie swap / DSU rebuild', () => {
    it('swaps all stone colors', () => {
      const game = new Hex(5);
      game.play(12); // Player 1 places at 12
      expect(game.board[12]).toBe(1);
      game.play(null); // Pie swap
      expect(game.board[12]).toBe(2); // Swapped to player 2
      expect(game.swapped).toBe(true);
    });

    it('turn remains 1 after swap', () => {
      const game = new Hex(5, true);
      game.play(12);
      game.play(null);
      expect(game.turn).toBe(1);
    });

    it('DSU correctly rebuilt after swap - no false winner', () => {
      const game = new Hex(3, true);
      // Player 1 places at center
      game.play(4); // (1,1) center
      // Player 2 swaps
      game.play(null);
      // After swap: stone at 4 is now color 2
      expect(game.winner()).toBe(0);
    });

    it('can only swap once', () => {
      const game = new Hex(5, true);
      game.play(12);
      game.play(null);
      // Now it's player 1's turn again, ply=2, swapped=true
      game.play(0); // Player 1 plays
      // Player 2's turn, ply=3, swapped=true -> no swap allowed
      expect(game.legal(null)).toBe(false);
    });
  });

  describe('win detection', () => {
    it('detects player 1 (indigo) W-E win', () => {
      // On a 3x3 board: Player 1 connects West to East (column 0 to column 2)
      const game = new Hex(3, false);
      // Grid: idx = row*3 + col. So col=c, row=r, idx(c,r) = r*3+c
      // P1 needs to connect col 0 to col 2
      // Place at (0,0)=0, (1,0)=1, (2,0)=2 - top row left to right
      game.play(0);  // P1 at (0,0)
      game.play(3);  // P2 at (0,1)
      game.play(1);  // P1 at (1,0)
      game.play(4);  // P2 at (1,1)
      game.play(2);  // P1 at (2,0) - completes W-E
      expect(game.winner()).toBe(1);
    });

    it('detects player 2 (ochre) N-S win', () => {
      // On a 3x3 board: Player 2 connects North to South (row 0 to row 2)
      const game = new Hex(3, false);
      // P2 needs to connect row 0 to row 2
      // Place at (0,0)=0, (0,1)=3, (0,2)=6 - left column top to bottom
      game.play(1);  // P1 at (1,0)
      game.play(0);  // P2 at (0,0)
      game.play(2);  // P1 at (2,0)
      game.play(3);  // P2 at (0,1)
      game.play(4);  // P1 at (1,1)
      game.play(6);  // P2 at (0,2) - completes N-S
      expect(game.winner()).toBe(2);
    });

    it('returns 0 when no winner', () => {
      const game = new Hex(5, false);
      game.play(0);
      expect(game.winner()).toBe(0);
    });
  });

  describe('getWinningPath', () => {
    it('returns null when no winner', () => {
      const game = new Hex(5, false);
      expect(game.getWinningPath()).toBeNull();
    });

    it('returns cells in winning connection', () => {
      const game = new Hex(3, false);
      game.play(0);  // P1 at (0,0)
      game.play(3);  // P2
      game.play(1);  // P1 at (1,0)
      game.play(4);  // P2
      game.play(2);  // P1 at (2,0)
      const path = game.getWinningPath();
      expect(path).not.toBeNull();
      expect(path!.sort((a, b) => a - b)).toEqual([0, 1, 2]);
    });
  });

  describe('clone', () => {
    it('creates independent copy', () => {
      const game = new Hex(5, false);
      game.play(0);
      game.play(1);
      const clone = game.clone();
      expect(clone.turn).toBe(game.turn);
      expect(clone.ply).toBe(game.ply);
      expect(Array.from(clone.board)).toEqual(Array.from(game.board));

      // Modifying clone doesn't affect original
      clone.play(2);
      expect(clone.ply).toBe(3);
      expect(game.ply).toBe(2);
    });

    it('preserves DSU state for win detection', () => {
      const game = new Hex(3, false);
      game.play(0);
      game.play(3);
      game.play(1);
      const clone = game.clone();
      // Continue on clone
      clone.play(4); // P2
      clone.play(2); // P1 wins
      expect(clone.winner()).toBe(1);
      // Original not affected
      expect(game.winner()).toBe(0);
    });
  });

  describe('replayMoves', () => {
    it('reconstructs game from move history', () => {
      const moves = [
        { ply: 0, color: 1 as const, cell: 0 as number | null },
        { ply: 1, color: 2 as const, cell: 3 as number | null },
        { ply: 2, color: 1 as const, cell: 1 as number | null },
      ];
      const game = replayMoves(3, false, moves);
      expect(game.ply).toBe(3);
      expect(game.board[0]).toBe(1);
      expect(game.board[3]).toBe(2);
      expect(game.board[1]).toBe(1);
    });
  });
});
