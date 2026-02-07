import { describe, it, expect } from 'vitest';
import { TicTacToe } from '../engine';

describe('TicTacToe Engine', () => {
  describe('constructor', () => {
    it('creates an empty 3x3 board', () => {
      const game = new TicTacToe();
      expect(game.board.length).toBe(9);
      expect(Array.from(game.board)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
      expect(game.turn).toBe(1);
      expect(game.ply).toBe(0);
    });
  });

  describe('legal', () => {
    it('accepts valid empty cells', () => {
      const game = new TicTacToe();
      for (let i = 0; i < 9; i++) {
        expect(game.legal(i)).toBe(true);
      }
    });

    it('rejects occupied cells', () => {
      const game = new TicTacToe();
      game.play(4);
      expect(game.legal(4)).toBe(false);
    });

    it('rejects out-of-range cells', () => {
      const game = new TicTacToe();
      expect(game.legal(-1)).toBe(false);
      expect(game.legal(9)).toBe(false);
      expect(game.legal(1.5)).toBe(false);
    });
  });

  describe('play', () => {
    it('alternates turns', () => {
      const game = new TicTacToe();
      expect(game.turn).toBe(1);
      game.play(0);
      expect(game.turn).toBe(2);
      game.play(1);
      expect(game.turn).toBe(1);
    });

    it('places correct piece', () => {
      const game = new TicTacToe();
      game.play(4); // P1
      expect(game.board[4]).toBe(1);
      game.play(0); // P2
      expect(game.board[0]).toBe(2);
    });

    it('throws on illegal move', () => {
      const game = new TicTacToe();
      game.play(0);
      expect(() => game.play(0)).toThrow('Illegal move');
    });
  });

  describe('winner', () => {
    it('detects row win', () => {
      const game = new TicTacToe();
      // P1: 0,1,2 (top row)
      game.play(0); game.play(3); game.play(1); game.play(4); game.play(2);
      expect(game.winner()).toBe(1);
    });

    it('detects column win', () => {
      const game = new TicTacToe();
      // P1: 0,3,6 (left column)
      game.play(0); game.play(1); game.play(3); game.play(4); game.play(6);
      expect(game.winner()).toBe(1);
    });

    it('detects diagonal win', () => {
      const game = new TicTacToe();
      // P1: 0,4,8 (main diagonal)
      game.play(0); game.play(1); game.play(4); game.play(2); game.play(8);
      expect(game.winner()).toBe(1);
    });

    it('detects anti-diagonal win', () => {
      const game = new TicTacToe();
      // P1: 2,4,6 (anti-diagonal)
      game.play(2); game.play(0); game.play(4); game.play(1); game.play(6);
      expect(game.winner()).toBe(1);
    });

    it('detects player 2 win', () => {
      const game = new TicTacToe();
      // P2: 3,4,5 (middle row)
      game.play(0); game.play(3); game.play(1); game.play(4); game.play(8); game.play(5);
      expect(game.winner()).toBe(2);
    });

    it('returns 0 when no winner', () => {
      const game = new TicTacToe();
      game.play(0);
      expect(game.winner()).toBe(0);
    });
  });

  describe('isDraw', () => {
    it('detects draw', () => {
      const game = new TicTacToe();
      // Classic drawn game:
      // X O X
      // X X O
      // O X O
      game.play(0); // X
      game.play(1); // O
      game.play(2); // X
      game.play(5); // O
      game.play(3); // X
      game.play(6); // O
      game.play(4); // X
      game.play(8); // O
      game.play(7); // X
      expect(game.winner()).toBe(0);
      expect(game.isDraw()).toBe(true);
    });

    it('is not draw when game still in progress', () => {
      const game = new TicTacToe();
      game.play(0);
      expect(game.isDraw()).toBe(false);
    });
  });

  describe('clone', () => {
    it('creates independent copy', () => {
      const game = new TicTacToe();
      game.play(4);
      const clone = game.clone();
      expect(clone.board[4]).toBe(1);
      expect(clone.turn).toBe(2);
      expect(clone.ply).toBe(1);

      clone.play(0);
      expect(clone.ply).toBe(2);
      expect(game.ply).toBe(1);
    });
  });
});
