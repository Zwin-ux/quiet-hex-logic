import { CheckersEngine } from './engine';
import type { CheckersMove } from './engine';
import type { AIPlayer, GameEngine } from '@/lib/engine/types';
import { CheckersAdapter } from '@/lib/engine/adapters/checkersAdapter';

/**
 * Checkers AI using minimax with alpha-beta pruning.
 */

function materialScore(engine: CheckersEngine, forPlayer: 1 | 2): number {
  let score = 0;
  for (let i = 0; i < 64; i++) {
    const p = engine.pieceAt(i);
    if (p === 0) continue;
    const owner = p === 1 || p === 3 ? 1 : 2;
    const isKing = p === 3 || p === 4;
    const value = isKing ? 3 : 1;
    score += owner === forPlayer ? value : -value;
  }
  return score;
}

function positionScore(engine: CheckersEngine, forPlayer: 1 | 2): number {
  let score = 0;
  for (let i = 0; i < 64; i++) {
    const p = engine.pieceAt(i);
    if (p === 0) continue;
    const owner = p === 1 || p === 3 ? 1 : 2;
    const row = Math.floor(i / 8);
    // Advance bonus: pieces closer to promotion are better
    let advance = 0;
    if (owner === 1) advance = 7 - row; // P1 moves up
    else advance = row; // P2 moves down
    const bonus = advance * 0.1;
    score += owner === forPlayer ? bonus : -bonus;
  }
  return score;
}

function evaluate(engine: CheckersEngine, forPlayer: 1 | 2): number {
  const w = engine.winner();
  if (w === forPlayer) return 1000;
  if (w !== 0) return -1000;
  return materialScore(engine, forPlayer) + positionScore(engine, forPlayer);
}

function alphaBeta(
  engine: CheckersEngine,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  forPlayer: 1 | 2,
): number {
  if (depth === 0 || engine.result() !== null) {
    return evaluate(engine, forPlayer);
  }

  const moves = engine.legalMoves();
  if (moves.length === 0) return evaluate(engine, forPlayer);

  if (maximizing) {
    let value = -Infinity;
    for (const move of moves) {
      const clone = engine.clone();
      clone.play(move);
      value = Math.max(value, alphaBeta(clone, depth - 1, alpha, beta, false, forPlayer));
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  } else {
    let value = Infinity;
    for (const move of moves) {
      const clone = engine.clone();
      clone.play(move);
      value = Math.min(value, alphaBeta(clone, depth - 1, alpha, beta, true, forPlayer));
      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return value;
  }
}

function getBestMove(engine: CheckersEngine, depth: number): { move: CheckersMove; reasoning: string } {
  const moves = engine.legalMoves();
  if (moves.length === 0) throw new Error('No legal moves');
  if (moves.length === 1) return { move: moves[0], reasoning: 'Only move available.' };

  const forPlayer = engine.turn;
  let bestScore = -Infinity;
  let bestMove = moves[0];

  for (const move of moves) {
    const clone = engine.clone();
    clone.play(move);
    const score = alphaBeta(clone, depth - 1, -Infinity, Infinity, false, forPlayer);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  const isCapture = bestMove.path.length > 2 ||
    (bestMove.path.length === 2 && Math.abs(Math.floor(bestMove.path[0] / 8) - Math.floor(bestMove.path[1] / 8)) === 2);
  const reasoning = isCapture ? 'Capturing opponent piece.' : 'Advancing position.';
  return { move: bestMove, reasoning };
}

function getRandomMove(engine: CheckersEngine): { move: CheckersMove; reasoning: string } {
  const moves = engine.legalMoves();
  return { move: moves[Math.floor(Math.random() * moves.length)], reasoning: 'Making a move...' };
}

export function createCheckersAI(difficulty: string): AIPlayer<CheckersMove> | null {
  return {
    getMove(gameEngine: GameEngine<CheckersMove>) {
      const adapter = gameEngine as CheckersAdapter;
      const engine = adapter.checkers;
      switch (difficulty) {
        case 'easy': {
          // 40% random, 60% depth-2
          if (Math.random() < 0.4) return getRandomMove(engine);
          return getBestMove(engine, 2);
        }
        case 'medium': return getBestMove(engine, 4);
        case 'hard': return getBestMove(engine, 6);
        default: return getBestMove(engine, 4);
      }
    },
  };
}
