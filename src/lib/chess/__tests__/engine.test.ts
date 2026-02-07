import { describe, it, expect } from 'vitest';
import { ChessEngine, isUci, parseUci } from '../engine';

describe('Chess Engine', () => {
  describe('isUci', () => {
    it('accepts valid UCI strings', () => {
      expect(isUci('e2e4')).toBe(true);
      expect(isUci('e7e8q')).toBe(true);
      expect(isUci('a1h8')).toBe(true);
    });

    it('rejects invalid UCI strings', () => {
      expect(isUci('e2')).toBe(false);
      expect(isUci('e2e9')).toBe(false);
      expect(isUci('hello')).toBe(false);
      expect(isUci('')).toBe(false);
    });
  });

  describe('parseUci', () => {
    it('parses simple moves', () => {
      expect(parseUci('e2e4')).toEqual({ from: 'e2', to: 'e4', promotion: undefined });
    });

    it('parses promotion moves', () => {
      expect(parseUci('e7e8q')).toEqual({ from: 'e7', to: 'e8', promotion: 'q' });
    });

    it('throws on invalid UCI', () => {
      expect(() => parseUci('xx')).toThrow('Invalid UCI');
    });
  });

  describe('ChessEngine', () => {
    it('starts with white to move', () => {
      const engine = new ChessEngine();
      expect(engine.turn()).toBe('w');
      expect(engine.currentColorNumber()).toBe(1);
    });

    it('accepts legal opening moves', () => {
      const engine = new ChessEngine();
      expect(engine.legalUci('e2e4')).toBe(true);
      expect(engine.legalUci('d2d4')).toBe(true);
    });

    it('rejects illegal moves', () => {
      const engine = new ChessEngine();
      expect(engine.legalUci('e2e5')).toBe(false);
      expect(engine.legalUci('e1e2')).toBe(false);
    });

    it('alternates turns after a move', () => {
      const engine = new ChessEngine();
      engine.playUci('e2e4');
      expect(engine.turn()).toBe('b');
      expect(engine.currentColorNumber()).toBe(2);
    });

    it('returns SAN notation from playUci', () => {
      const engine = new ChessEngine();
      const result = engine.playUci('e2e4');
      expect(result.san).toBe('e4');
    });

    it('throws on illegal playUci', () => {
      const engine = new ChessEngine();
      expect(() => engine.playUci('e2e5')).toThrow();
    });

    it('detects game not over at start', () => {
      const engine = new ChessEngine();
      expect(engine.isGameOver()).toBe(false);
      expect(engine.result()).toBeNull();
    });

    it('detects Scholar\'s Mate', () => {
      const engine = new ChessEngine();
      engine.playUci('e2e4');
      engine.playUci('e7e5');
      engine.playUci('d1h5');
      engine.playUci('b8c6');
      engine.playUci('f1c4');
      engine.playUci('g8f6');
      engine.playUci('h5f7'); // Checkmate
      expect(engine.isGameOver()).toBe(true);
      expect(engine.inCheck()).toBe(true);
      expect(engine.result()).toBe('p1'); // White wins
    });

    it('detects draw (stalemate via FEN)', () => {
      // King + King position where black is stalemated
      const engine = new ChessEngine('k7/8/1K6/8/8/8/8/8 b - - 0 1');
      // Black king at a8, White king at b6 — not stalemate. Let me use a real stalemate:
      const engine2 = new ChessEngine('k7/8/2K5/8/8/8/8/8 b - - 0 1');
      // Actually, let me construct a proper stalemate
      const engine3 = new ChessEngine('8/8/8/8/8/5k2/5p2/5K2 w - - 0 1');
      // White king at f1, black king at f3, black pawn at f2 — white is stalemated
      expect(engine3.isGameOver()).toBe(true);
      expect(engine3.result()).toBe('draw');
    });

    it('provides legal moves from a square', () => {
      const engine = new ChessEngine();
      const moves = engine.legalMovesFrom('e2');
      expect(moves.length).toBe(2); // e3 and e4
      expect(moves.map(m => m.to).sort()).toEqual(['e3', 'e4']);
    });

    it('returns board representation', () => {
      const engine = new ChessEngine();
      const board = engine.board();
      expect(board.length).toBe(8);
      // First rank should have white pieces
      expect(board[7][0]?.color).toBe('w');
      expect(board[7][0]?.type).toBe('r');
    });

    it('constructs from FEN', () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
      const engine = new ChessEngine(fen);
      expect(engine.turn()).toBe('b');
      expect(engine.fen()).toBe(fen);
    });
  });
});
