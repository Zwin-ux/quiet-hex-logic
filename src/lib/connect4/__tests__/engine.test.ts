import { describe, it, expect } from 'vitest';
import { Connect4 } from '../engine';

describe('Connect4 Engine', () => {
  describe('constructor', () => {
    it('creates a 7x6 board by default', () => {
      const game = new Connect4();
      expect(game.cols).toBe(7);
      expect(game.rows).toBe(6);
      expect(game.connect).toBe(4);
      expect(game.turn).toBe(1);
      expect(game.ply).toBe(0);
    });
  });

  describe('legal', () => {
    it('accepts valid columns', () => {
      const game = new Connect4();
      for (let c = 0; c < 7; c++) {
        expect(game.legal(c)).toBe(true);
      }
    });

    it('rejects out-of-range columns', () => {
      const game = new Connect4();
      expect(game.legal(-1)).toBe(false);
      expect(game.legal(7)).toBe(false);
    });

    it('rejects full columns', () => {
      // Fill col 0 with alternating pieces (no 4-in-a-row since they alternate)
      const g = new Connect4();
      for (let i = 0; i < 3; i++) {
        g.play(0); // P1@(0, 2i)
        g.play(0); // P2@(0, 2i+1)
      }
      // col 0 now has 6 pieces: P1,P2,P1,P2,P1,P2
      expect(g.legal(0)).toBe(false);
      expect(g.legal(1)).toBe(true);
    });
  });

  describe('play', () => {
    it('alternates turns', () => {
      const game = new Connect4();
      expect(game.turn).toBe(1);
      game.play(0);
      expect(game.turn).toBe(2);
      game.play(1);
      expect(game.turn).toBe(1);
    });

    it('stacks pieces with gravity', () => {
      const game = new Connect4();
      game.play(3); // P1 at (3, 0)
      game.play(3); // P2 at (3, 1)
      game.play(3); // P1 at (3, 2)
      expect(game.get(3, 0)).toBe(1);
      expect(game.get(3, 1)).toBe(2);
      expect(game.get(3, 2)).toBe(1);
    });

    it('throws on illegal move', () => {
      const game = new Connect4();
      expect(() => game.play(7)).toThrow('Illegal move');
    });
  });

  describe('winner', () => {
    it('detects horizontal win', () => {
      const game = new Connect4();
      // P1: cols 0,1,2,3 (bottom row)
      game.play(0); game.play(0); // P1@(0,0), P2@(0,1)
      game.play(1); game.play(1); // P1@(1,0), P2@(1,1)
      game.play(2); game.play(2); // P1@(2,0), P2@(2,1)
      game.play(3); // P1@(3,0) — horizontal win!
      expect(game.winner()).toBe(1);
    });

    it('detects vertical win', () => {
      const game = new Connect4();
      // P1 plays col 0 four times, P2 plays col 1
      game.play(0); game.play(1); // P1@(0,0)
      game.play(0); game.play(1); // P1@(0,1)
      game.play(0); game.play(1); // P1@(0,2)
      game.play(0); // P1@(0,3) — vertical win!
      expect(game.winner()).toBe(1);
    });

    it('detects diagonal win (/)', () => {
      const game = new Connect4();
      // Build a diagonal for P1: (0,0), (1,1), (2,2), (3,3)
      // Scatter P2 filler pieces to avoid P2 forming 4-in-a-row
      game.play(0); // P1@(0,0)
      game.play(1); // P2@(1,0)
      game.play(1); // P1@(1,1)
      game.play(2); // P2@(2,0)
      game.play(2); // P1@(2,1)
      game.play(5); // P2@(5,0) — scatter to col 5
      game.play(2); // P1@(2,2)
      game.play(3); // P2@(3,0)
      game.play(3); // P1@(3,1)
      game.play(3); // P2@(3,2)
      game.play(3); // P1@(3,3) — diagonal win!
      expect(game.winner()).toBe(1);
    });

    it('returns 0 when no winner', () => {
      const game = new Connect4();
      game.play(0);
      expect(game.winner()).toBe(0);
    });

    it('supports connect-3 variant', () => {
      const game = new Connect4(7, 6, 3);
      // P1 connects 3 horizontally on bottom row: 0,1,2
      game.play(0); game.play(0);
      game.play(1); game.play(1);
      game.play(2);
      expect(game.winner()).toBe(1);
    });
  });

  describe('isDraw', () => {
    it('detects draw on full board with no winner', () => {
      // This is hard to construct manually, so just verify the property
      const game = new Connect4(2, 2); // tiny board for testing
      // Fill 2x2: no 4-in-a-row possible, always a draw
      game.play(0); // P1@(0,0)
      game.play(1); // P2@(1,0)
      game.play(0); // P1@(0,1)
      game.play(1); // P2@(1,1)
      expect(game.isDraw()).toBe(true);
      expect(game.winner()).toBe(0);
    });

    it('is not draw when game still in progress', () => {
      const game = new Connect4();
      game.play(0);
      expect(game.isDraw()).toBe(false);
    });
  });

  describe('clone', () => {
    it('creates independent copy', () => {
      const game = new Connect4();
      game.play(3);
      game.play(4);
      const clone = game.clone();
      expect(clone.turn).toBe(game.turn);
      expect(clone.ply).toBe(game.ply);
      expect(clone.get(3, 0)).toBe(1);
      expect(clone.get(4, 0)).toBe(2);

      clone.play(5);
      expect(clone.ply).toBe(3);
      expect(game.ply).toBe(2);
    });
  });

  describe('legalColumns', () => {
    it('returns all columns at start', () => {
      const game = new Connect4();
      expect(game.legalColumns()).toEqual([0, 1, 2, 3, 4, 5, 6]);
    });

    it('excludes full columns', () => {
      const game = new Connect4();
      for (let i = 0; i < 3; i++) {
        game.play(0);
        game.play(0);
      }
      const legal = game.legalColumns();
      expect(legal).not.toContain(0);
      expect(legal.length).toBe(6);
    });
  });
});
