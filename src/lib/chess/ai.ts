import { ChessEngine } from './engine';
import type { AIPlayer, GameEngine } from '@/lib/engine/types';
import type { ChessMove } from '@/lib/engine/adapters/chessAdapter';
import { ChessAdapter } from '@/lib/engine/adapters/chessAdapter';

/**
 * Simple Chess AI using piece evaluation + basic positional heuristics.
 * For Easy/Medium difficulties. Hard/Expert would ideally use Stockfish WASM.
 */

const PIECE_VALUES: Record<string, number> = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000,
};

function evaluateBoard(engine: ChessEngine, forColor: 'w' | 'b'): number {
  const board = engine.board();
  let score = 0;

  for (const row of board) {
    for (const sq of row) {
      if (!sq) continue;
      const value = PIECE_VALUES[sq.type] || 0;
      score += sq.color === forColor ? value : -value;
    }
  }

  // Small bonus for having the center controlled
  return score;
}

function getAllLegalMoves(engine: ChessEngine): Array<{ uci: string }> {
  const moves: Array<{ uci: string }> = [];
  const board = engine.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = board[r][c];
      if (!sq || sq.color !== engine.turn()) continue;
      const square = String.fromCharCode(97 + c) + (8 - r);
      const legalFromHere = engine.legalMovesFrom(square);
      for (const m of legalFromHere) {
        moves.push({ uci: m.uci });
      }
    }
  }
  return moves;
}

function getRandomMove(engine: ChessEngine): ChessMove {
  const moves = getAllLegalMoves(engine);
  return moves[Math.floor(Math.random() * moves.length)];
}

function getBestMoveDepth1(engine: ChessEngine): { move: ChessMove; reasoning: string } {
  const forColor = engine.turn();
  const moves = getAllLegalMoves(engine);
  if (moves.length === 0) throw new Error('No legal moves');
  if (moves.length === 1) return { move: moves[0], reasoning: 'Only move.' };

  let bestScore = -Infinity;
  let bestMove = moves[0];

  for (const m of moves) {
    const clone = new ChessEngine(engine.fen());
    clone.playUci(m.uci);

    // Check for immediate checkmate
    if (clone.isGameOver() && clone.result() !== 'draw') {
      return { move: m, reasoning: 'Checkmate!' };
    }

    const score = -evaluateBoard(clone, forColor);
    if (score > bestScore) {
      bestScore = score;
      bestMove = m;
    }
  }

  return { move: bestMove, reasoning: 'Best material outcome.' };
}

function getBestMoveDepth2(engine: ChessEngine): { move: ChessMove; reasoning: string } {
  const forColor = engine.turn();
  const moves = getAllLegalMoves(engine);
  if (moves.length === 0) throw new Error('No legal moves');
  if (moves.length === 1) return { move: moves[0], reasoning: 'Only move.' };

  let bestScore = -Infinity;
  let bestMove = moves[0];

  for (const m of moves) {
    const after = new ChessEngine(engine.fen());
    after.playUci(m.uci);

    if (after.isGameOver()) {
      const r = after.result();
      if (r === 'draw') {
        const score = 0;
        if (score > bestScore) { bestScore = score; bestMove = m; }
        continue;
      }
      // Won
      return { move: m, reasoning: 'Checkmate!' };
    }

    // Opponent's best response
    const opponentMoves = getAllLegalMoves(after);
    let worstCase = Infinity;
    for (const opp of opponentMoves) {
      const after2 = new ChessEngine(after.fen());
      after2.playUci(opp.uci);
      const score = evaluateBoard(after2, forColor);
      worstCase = Math.min(worstCase, score);
    }

    if (opponentMoves.length === 0) worstCase = evaluateBoard(after, forColor);

    if (worstCase > bestScore) {
      bestScore = worstCase;
      bestMove = m;
    }
  }

  return { move: bestMove, reasoning: 'Looking 2 moves ahead.' };
}

export function createChessAI(difficulty: string): AIPlayer<ChessMove> | null {
  return {
    getMove(gameEngine: GameEngine<ChessMove>) {
      const adapter = gameEngine as ChessAdapter;
      const engine = adapter.chess;
      switch (difficulty) {
        case 'easy': {
          // 50% random, 50% depth-1
          if (Math.random() < 0.5) {
            return { move: getRandomMove(engine), reasoning: 'Exploring...' };
          }
          return getBestMoveDepth1(engine);
        }
        case 'medium': return getBestMoveDepth2(engine);
        default: return getBestMoveDepth2(engine);
      }
    },
  };
}
