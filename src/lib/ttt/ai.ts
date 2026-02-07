import { TicTacToe } from './engine';
import type { AIPlayer, GameEngine } from '@/lib/engine/types';
import { TttAdapter } from '@/lib/engine/adapters/tttAdapter';

/**
 * Perfect TTT AI using minimax. The game tree is tiny (≤9! nodes)
 * so we can search to completion at all difficulties.
 */

function minimax(game: TicTacToe, maximizing: boolean): number {
  const w = game.winner();
  if (w === 1) return maximizing ? -10 : 10; // P1 maximizes? Depends on perspective
  if (w === 2) return maximizing ? 10 : -10;
  if (game.isDraw()) return 0;

  let best = maximizing ? -Infinity : Infinity;
  for (let i = 0; i < 9; i++) {
    if (!game.legal(i)) continue;
    const clone = game.clone();
    clone.play(i);
    const score = minimax(clone, !maximizing);
    best = maximizing ? Math.max(best, score) : Math.min(best, score);
  }
  return best;
}

function getBestMove(game: TicTacToe): number {
  const isMaximizing = game.turn === 2; // AI is always player 2
  let bestScore = isMaximizing ? -Infinity : Infinity;
  let bestMove = -1;

  for (let i = 0; i < 9; i++) {
    if (!game.legal(i)) continue;
    const clone = game.clone();
    clone.play(i);
    const score = minimax(clone, !isMaximizing);
    if (isMaximizing ? score > bestScore : score < bestScore) {
      bestScore = score;
      bestMove = i;
    }
  }
  return bestMove;
}

function getRandomMove(game: TicTacToe): number {
  const empty: number[] = [];
  for (let i = 0; i < 9; i++) {
    if (game.legal(i)) empty.push(i);
  }
  return empty[Math.floor(Math.random() * empty.length)];
}

function getEasyMove(game: TicTacToe): { move: number; reasoning: string } {
  // 50% chance of optimal, 50% random
  if (Math.random() < 0.5) {
    return { move: getBestMove(game), reasoning: 'Thinking carefully...' };
  }
  return { move: getRandomMove(game), reasoning: 'Taking a shot...' };
}

function getMediumMove(game: TicTacToe): { move: number; reasoning: string } {
  // 80% optimal, 20% random
  if (Math.random() < 0.8) {
    return { move: getBestMove(game), reasoning: 'Analyzing the board...' };
  }
  return { move: getRandomMove(game), reasoning: 'Trying something different...' };
}

function getHardMove(game: TicTacToe): { move: number; reasoning: string } {
  // Perfect play
  return { move: getBestMove(game), reasoning: 'Playing optimally.' };
}

export function createTttAI(difficulty: string): AIPlayer<number> | null {
  return {
    getMove(engine: GameEngine<number>) {
      const adapter = engine as TttAdapter;
      const ttt = adapter.ttt;
      switch (difficulty) {
        case 'easy': return getEasyMove(ttt);
        case 'medium': return getMediumMove(ttt);
        case 'hard': return getHardMove(ttt);
        default: return getMediumMove(ttt);
      }
    },
  };
}
