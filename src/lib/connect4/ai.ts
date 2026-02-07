import { Connect4 } from './engine';
import type { AIPlayer, GameEngine } from '@/lib/engine/types';
import { Connect4Adapter } from '@/lib/engine/adapters/connect4Adapter';

/**
 * Connect 4 AI using minimax with alpha-beta pruning.
 * Center columns are preferred as they provide more opportunities.
 */

function evaluate(game: Connect4, forPlayer: 1 | 2): number {
  const w = game.winner();
  if (w === forPlayer) return 100000;
  if (w !== 0) return -100000;

  let score = 0;
  const center = Math.floor(game.cols / 2);

  // Center column bonus
  for (let r = 0; r < game.rows; r++) {
    if (game.get(center, r) === forPlayer) score += 3;
  }

  // Evaluate all windows of 4
  const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (let c = 0; c < game.cols; c++) {
    for (let r = 0; r < game.rows; r++) {
      for (const [dc, dr] of dirs) {
        const cells: (0 | 1 | 2)[] = [];
        for (let i = 0; i < 4; i++) {
          const nc = c + dc * i;
          const nr = r + dr * i;
          if (nc < 0 || nc >= game.cols || nr < 0 || nr >= game.rows) break;
          cells.push(game.get(nc, nr));
        }
        if (cells.length < 4) continue;

        const mine = cells.filter(v => v === forPlayer).length;
        const opp = cells.filter(v => v !== 0 && v !== forPlayer).length;
        const empty = cells.filter(v => v === 0).length;

        if (opp === 0) {
          if (mine === 3 && empty === 1) score += 50;
          else if (mine === 2 && empty === 2) score += 5;
        }
        if (mine === 0) {
          if (opp === 3 && empty === 1) score -= 40;
          else if (opp === 2 && empty === 2) score -= 3;
        }
      }
    }
  }

  return score;
}

function alphaBeta(
  game: Connect4,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  forPlayer: 1 | 2,
): number {
  if (depth === 0 || game.isGameOver()) {
    return evaluate(game, forPlayer);
  }

  const legal = game.legalColumns();

  // Search center columns first for better pruning
  const center = Math.floor(game.cols / 2);
  legal.sort((a, b) => Math.abs(a - center) - Math.abs(b - center));

  if (maximizing) {
    let value = -Infinity;
    for (const col of legal) {
      const clone = game.clone();
      clone.play(col);
      value = Math.max(value, alphaBeta(clone, depth - 1, alpha, beta, false, forPlayer));
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  } else {
    let value = Infinity;
    for (const col of legal) {
      const clone = game.clone();
      clone.play(col);
      value = Math.min(value, alphaBeta(clone, depth - 1, alpha, beta, true, forPlayer));
      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return value;
  }
}

function getBestMove(game: Connect4, depth: number): { move: number; reasoning: string } {
  const legal = game.legalColumns();
  if (legal.length === 0) throw new Error('No legal moves');
  if (legal.length === 1) return { move: legal[0], reasoning: 'Only column available.' };

  const forPlayer = game.turn;
  const center = Math.floor(game.cols / 2);
  legal.sort((a, b) => Math.abs(a - center) - Math.abs(b - center));

  let bestScore = -Infinity;
  let bestMove = legal[0];

  for (const col of legal) {
    const clone = game.clone();
    clone.play(col);

    // Check immediate win
    if (clone.winner() === forPlayer) {
      return { move: col, reasoning: 'Winning move!' };
    }

    const score = alphaBeta(clone, depth - 1, -Infinity, Infinity, false, forPlayer);
    if (score > bestScore) {
      bestScore = score;
      bestMove = col;
    }
  }

  const reasoning = bestMove === center ? 'Controlling the center.' : 'Best position found.';
  return { move: bestMove, reasoning };
}

function getRandomMove(game: Connect4): number {
  const legal = game.legalColumns();
  // Bias toward center
  const center = Math.floor(game.cols / 2);
  if (Math.random() < 0.4 && legal.includes(center)) return center;
  return legal[Math.floor(Math.random() * legal.length)];
}

export function createConnect4AI(difficulty: string): AIPlayer<number> | null {
  return {
    getMove(gameEngine: GameEngine<number>) {
      const adapter = gameEngine as Connect4Adapter;
      const game = adapter.c4;
      switch (difficulty) {
        case 'easy': {
          if (Math.random() < 0.4) {
            return { move: getRandomMove(game), reasoning: 'Just dropping in...' };
          }
          return getBestMove(game, 2);
        }
        case 'medium': return getBestMove(game, 4);
        case 'hard': return getBestMove(game, 8);
        default: return getBestMove(game, 4);
      }
    },
  };
}
