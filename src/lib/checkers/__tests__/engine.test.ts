import { describe, it, expect } from 'vitest';
import { CheckersEngine } from '../engine';

// Helper: idx = row*8 + col. Dark squares have (row+col)%2 === 1.
function idx(r: number, c: number) { return r * 8 + c; }
function isDark(i: number) { return (Math.floor(i / 8) + i % 8) % 2 === 1; }

describe('Checkers Engine', () => {
  describe('constructor / reset', () => {
    it('sets up initial position correctly', () => {
      const engine = new CheckersEngine();
      expect(engine.turn).toBe(1);
      expect(engine.ply).toBe(1);

      // Player 2 pieces on rows 0-2, dark squares only
      expect(engine.pieceAt(idx(0, 1))).toBe(2);
      expect(engine.pieceAt(idx(0, 3))).toBe(2);
      expect(engine.pieceAt(idx(0, 5))).toBe(2);
      expect(engine.pieceAt(idx(0, 7))).toBe(2);
      expect(engine.pieceAt(idx(1, 0))).toBe(2);
      expect(engine.pieceAt(idx(1, 2))).toBe(2);
      expect(engine.pieceAt(idx(2, 1))).toBe(2);

      // Player 1 pieces on rows 5-7, dark squares only
      expect(engine.pieceAt(idx(5, 0))).toBe(1);
      expect(engine.pieceAt(idx(5, 2))).toBe(1);
      expect(engine.pieceAt(idx(6, 1))).toBe(1);
      expect(engine.pieceAt(idx(7, 0))).toBe(1);

      // Empty middle rows
      expect(engine.pieceAt(idx(3, 0))).toBe(0);
      expect(engine.pieceAt(idx(3, 2))).toBe(0);
      expect(engine.pieceAt(idx(4, 1))).toBe(0);
    });

    it('has 12 pieces per side', () => {
      const engine = new CheckersEngine();
      let p1 = 0, p2 = 0;
      for (let i = 0; i < 64; i++) {
        if (engine.pieceAt(i) === 1) p1++;
        if (engine.pieceAt(i) === 2) p2++;
      }
      expect(p1).toBe(12);
      expect(p2).toBe(12);
    });
  });

  describe('legal moves', () => {
    it('generates moves for player 1 at start', () => {
      const engine = new CheckersEngine();
      const moves = engine.legalMoves();
      expect(moves.length).toBeGreaterThan(0);
      // All moves should be simple (path length 2)
      for (const m of moves) {
        expect(m.path.length).toBe(2);
      }
    });

    it('player 1 men move up (decreasing row)', () => {
      const engine = new CheckersEngine();
      const moves = engine.legalMoves();
      for (const m of moves) {
        const fromRow = Math.floor(m.path[0] / 8);
        const toRow = Math.floor(m.path[1] / 8);
        expect(toRow).toBeLessThan(fromRow);
      }
    });
  });

  describe('mandatory capture', () => {
    it('forces capture when available', () => {
      const engine = new CheckersEngine();
      engine.board.fill(0);
      engine.turn = 1;
      // P1 man at (4,3) = idx 35
      engine.board[idx(4, 3)] = 1;
      // P2 man at (3,4) = idx 28
      engine.board[idx(3, 4)] = 2;
      // Landing at (2,5) = idx 21 should be empty and dark: (2+5)%2=1 ✓

      const moves = engine.legalMoves();
      expect(moves.length).toBeGreaterThan(0);
      for (const m of moves) {
        expect(engine.isCaptureMove(m)).toBe(true);
      }
    });
  });

  describe('king promotion', () => {
    it('promotes player 1 man reaching row 0', () => {
      const engine = new CheckersEngine();
      engine.board.fill(0);
      engine.turn = 1;
      // P1 man at (1,2) = idx 10, which is dark: (1+2)%2=1 ✓
      engine.board[idx(1, 2)] = 1;
      const moves = engine.legalMoves();
      expect(moves.length).toBeGreaterThan(0);
      const move = moves[0];
      engine.play(move);
      const dest = move.path[move.path.length - 1];
      expect(engine.pieceAt(dest)).toBe(3); // promoted to P1 king
    });

    it('promotes player 2 man reaching row 7', () => {
      const engine = new CheckersEngine();
      engine.board.fill(0);
      engine.turn = 2;
      // P2 man at (6,1) = idx 49, dark: (6+1)%2=1 ✓
      engine.board[idx(6, 1)] = 2;
      const moves = engine.legalMoves();
      expect(moves.length).toBeGreaterThan(0);
      const move = moves[0];
      engine.play(move);
      const dest = move.path[move.path.length - 1];
      expect(engine.pieceAt(dest)).toBe(4); // promoted to P2 king
    });
  });

  describe('king movement', () => {
    it('kings can move backwards', () => {
      const engine = new CheckersEngine();
      engine.board.fill(0);
      engine.turn = 1;
      // P1 king at (3,4) = idx 28, dark: (3+4)%2=1 ✓
      engine.board[idx(3, 4)] = 3;
      const moves = engine.legalMoves();
      const destinations = moves.map(m => m.path[1]);
      const forwardMoves = destinations.filter(d => Math.floor(d / 8) < 3);
      const backwardMoves = destinations.filter(d => Math.floor(d / 8) > 3);
      expect(forwardMoves.length).toBeGreaterThan(0);
      expect(backwardMoves.length).toBeGreaterThan(0);
    });
  });

  describe('play', () => {
    it('moves piece and toggles turn', () => {
      const engine = new CheckersEngine();
      const moves = engine.legalMoves();
      engine.play(moves[0]);
      expect(engine.turn).toBe(2);
      expect(engine.ply).toBe(2);
    });

    it('throws on illegal move', () => {
      const engine = new CheckersEngine();
      expect(() => engine.play({ path: [0, 1] })).toThrow('Illegal move');
    });

    it('throws when game is over', () => {
      const engine = new CheckersEngine();
      engine.board.fill(0);
      engine.turn = 1;
      // P1 man at (1,0) = idx 8, dark: (1+0)%2=1 ✓, can capture P2 at (0,1)
      // P2 man at a dark square where P1 can capture and land on row 0
      // This will end game after the capture since P2 has no pieces left
      engine.board[idx(1, 0)] = 1;
      engine.board[idx(0, 1)] = 2; // dark: (0+1)%2=1 ✓
      // Wait, (1,0) capturing to (-1,2) is out of bounds. Let me think...
      // P1 at (2,1), P2 at (1,2), land at (0,3)
      engine.board.fill(0);
      engine.board[idx(2, 1)] = 1; // dark: (2+1)%2=1 ✓
      engine.board[idx(1, 2)] = 2; // dark: (1+2)%2=1 ✓
      // Landing at (0,3) dark: (0+3)%2=1 ✓
      const moves = engine.legalMoves();
      expect(moves.length).toBe(1);
      engine.play(moves[0]);
      // Game should be over - P2 has no pieces
      expect(engine.winner()).not.toBe(0);
      // Try to play again
      expect(() => engine.play({ path: [idx(0, 3), idx(1, 4)] })).toThrow('Game is over');
    });
  });

  describe('winner via play', () => {
    it('detects win when capture removes last opponent piece', () => {
      const engine = new CheckersEngine();
      engine.board.fill(0);
      engine.turn = 1;
      // P1 man at (2,1), P2 man at (1,2), P1 captures to (0,3) and promotes
      engine.board[idx(2, 1)] = 1;
      engine.board[idx(1, 2)] = 2;
      const moves = engine.legalMoves();
      engine.play(moves[0]);
      // P2 has no pieces
      expect(engine.winner()).toBe(1);
      expect(engine.result()).toBe('p1');
    });

    it('returns 0 at game start', () => {
      const engine = new CheckersEngine();
      expect(engine.winner()).toBe(0);
      expect(engine.result()).toBeNull();
    });
  });

  describe('clone', () => {
    it('creates independent copy', () => {
      const engine = new CheckersEngine();
      const moves = engine.legalMoves();
      engine.play(moves[0]);

      const clone = engine.clone();
      expect(clone.turn).toBe(engine.turn);
      expect(clone.ply).toBe(engine.ply);
      expect(Array.from(clone.board)).toEqual(Array.from(engine.board));

      const cloneMoves = clone.legalMoves();
      clone.play(cloneMoves[0]);
      expect(clone.ply).toBe(engine.ply + 1);
      expect(engine.ply).toBe(2);
    });
  });

  describe('hash', () => {
    it('produces consistent hashes', () => {
      const engine = new CheckersEngine();
      const h1 = engine.hash();
      expect(h1).toBe(engine.hash());
    });

    it('changes after a move', () => {
      const engine = new CheckersEngine();
      const h1 = engine.hash();
      const moves = engine.legalMoves();
      engine.play(moves[0]);
      expect(engine.hash()).not.toBe(h1);
    });
  });

  describe('multi-jump capture', () => {
    it('captures multiple pieces in a chain', () => {
      const engine = new CheckersEngine();
      engine.board.fill(0);
      engine.turn = 1;
      // P1 man at (4,3), dark: (4+3)%2=1 ✓
      engine.board[idx(4, 3)] = 1;
      // P2 men at (3,4) and (1,4) — but we need landing squares to be dark too
      // (4,3)->(2,5)->(0,7)?  (3,4) midpoint, (2,5) landing, dark: (2+5)%2=1 ✓
      // Then (2,5)->(0,3)? midpoint (1,4), dark: (1+4)%2=1 ✓. Landing (0,3) dark: (0+3)%2=1 ✓
      engine.board[idx(3, 4)] = 2; // dark: (3+4)%2=1 ✓
      engine.board[idx(1, 4)] = 2; // dark: (1+4)%2=1 ✓

      const moves = engine.legalMoves();
      const multiJump = moves.find(m => m.path.length === 3);
      expect(multiJump).toBeDefined();
      if (multiJump) {
        engine.play(multiJump);
        expect(engine.pieceAt(idx(3, 4))).toBe(0); // captured
        expect(engine.pieceAt(idx(1, 4))).toBe(0); // captured
      }
    });
  });
});
