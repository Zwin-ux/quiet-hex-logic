/**
 * Hex AI Implementation
 * Supports multiple difficulty levels with different strategies
 */

import { Hex, Cell } from './engine';

export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

/**
 * Calculate a heuristic score for a board position
 * Higher is better for the current player
 */
function evaluatePosition(game: Hex, color: 1 | 2): number {
  // Simple heuristic: count cells that are closer to connecting
  let score = 0;
  const n = game.n;

  for (let i = 0; i < n * n; i++) {
    if (game.board[i] === color) {
      const [c, r] = game.coords(i);

      if (color === 1) {
        // Indigo connects W-E, value cells closer to both edges
        const westDist = c;
        const eastDist = n - 1 - c;
        score += Math.max(0, 10 - Math.min(westDist, eastDist));

        // Bonus for center control
        const centerRow = Math.abs(r - n / 2);
        score += Math.max(0, 5 - centerRow);
      } else {
        // Ochre connects N-S, value cells closer to both edges
        const northDist = r;
        const southDist = n - 1 - r;
        score += Math.max(0, 10 - Math.min(northDist, southDist));

        // Bonus for center control
        const centerCol = Math.abs(c - n / 2);
        score += Math.max(0, 5 - centerCol);
      }
    } else if (game.board[i] === (color === 1 ? 2 : 1)) {
      // Penalty for opponent stones
      score -= 5;
    }
  }

  return score;
}

/**
 * Easy AI: Random move with center bias
 */
function getEasyMove(game: Hex): Cell {
  const empty = game.getEmptyCells();
  if (empty.length === 0) return null;

  // Pie swap with 20% probability on second move
  if (game.pieRule && game.ply === 1 && Math.random() < 0.2) {
    return null;
  }

  // 70% chance to pick a center cell, 30% random
  const n = game.n;
  const center = Math.floor(n / 2);

  if (Math.random() < 0.7) {
    const centerCells = empty.filter(cell => {
      const [c, r] = game.coords(cell);
      const dist = Math.abs(c - center) + Math.abs(r - center);
      return dist <= 2;
    });

    if (centerCells.length > 0) {
      return centerCells[Math.floor(Math.random() * centerCells.length)];
    }
  }

  return empty[Math.floor(Math.random() * empty.length)];
}

/**
 * Medium AI: Minimax with limited depth
 */
function getMediumMove(game: Hex): Cell {
  const empty = game.getEmptyCells();
  if (empty.length === 0) return null;

  // Pie swap decision: swap if opponent's first move is in center 3x3
  if (game.pieRule && game.ply === 1) {
    const n = game.n;
    const center = Math.floor(n / 2);

    for (let i = 0; i < n * n; i++) {
      if (game.board[i] !== 0) {
        const [c, r] = game.coords(i);
        const dist = Math.abs(c - center) + Math.abs(r - center);
        if (dist <= 1) {
          return null; // Swap if opponent played center
        }
      }
    }
  }

  const currentColor = game.turn;
  let bestMove: Cell = null;
  let bestScore = -Infinity;

  // Evaluate up to 15 random moves (performance constraint)
  const movesToEvaluate = empty.length > 15
    ? empty.sort(() => Math.random() - 0.5).slice(0, 15)
    : empty;

  for (const move of movesToEvaluate) {
    const clone = game.clone();
    clone.play(move);

    // Check for immediate win
    if (clone.winner() === currentColor) {
      return move;
    }

    // Evaluate position after opponent's best response (depth 2)
    let minScore = Infinity;
    const opponentMoves = clone.getEmptyCells().slice(0, 10);

    for (const oppMove of opponentMoves) {
      const clone2 = clone.clone();
      clone2.play(oppMove);

      if (clone2.winner() === (currentColor === 1 ? 2 : 1)) {
        minScore = -1000; // Opponent wins
        break;
      }

      const score = evaluatePosition(clone2, currentColor);
      minScore = Math.min(minScore, score);
    }

    if (minScore > bestScore) {
      bestScore = minScore;
      bestMove = move;
    }
  }

  return bestMove || empty[0];
}

/**
 * Monte Carlo simulation: play random moves until game ends
 */
function simulate(game: Hex, color: 1 | 2): 1 | 2 | 0 {
  const clone = game.clone();
  let maxPlies = clone.n * clone.n * 2; // Safety limit

  while (clone.winner() === 0 && maxPlies-- > 0) {
    const empty = clone.getEmptyCells();
    if (empty.length === 0) break;

    const move = empty[Math.floor(Math.random() * empty.length)];
    clone.play(move);
  }

  return clone.winner();
}

/**
 * Hard AI: Monte Carlo Tree Search with moderate simulations
 */
function getHardMove(game: Hex): Cell {
  const empty = game.getEmptyCells();
  if (empty.length === 0) return null;

  // Pie swap decision: use evaluation
  if (game.pieRule && game.ply === 1) {
    const n = game.n;
    const center = Math.floor(n / 2);

    for (let i = 0; i < n * n; i++) {
      if (game.board[i] !== 0) {
        const [c, r] = game.coords(i);
        const dist = Math.abs(c - center) + Math.abs(r - center);
        if (dist <= 2) {
          return null; // Swap if opponent played near center
        }
      }
    }
  }

  const currentColor = game.turn;
  const simulations = Math.min(50, empty.length * 5); // Adaptive simulation count
  const scores = new Map<number, number>();
  const counts = new Map<number, number>();

  // Initialize
  for (const move of empty) {
    scores.set(move, 0);
    counts.set(move, 0);
  }

  // Run simulations
  for (let i = 0; i < simulations; i++) {
    const move = empty[Math.floor(Math.random() * empty.length)];
    const clone = game.clone();
    clone.play(move);

    // Check for immediate win
    if (clone.winner() === currentColor) {
      return move;
    }

    const winner = simulate(clone, currentColor);
    const score = winner === currentColor ? 1 : winner === 0 ? 0.5 : 0;

    scores.set(move, (scores.get(move) || 0) + score);
    counts.set(move, (counts.get(move) || 0) + 1);
  }

  // Select move with highest win rate
  let bestMove: Cell = null;
  let bestWinRate = -1;

  for (const move of empty) {
    const count = counts.get(move) || 1;
    const winRate = (scores.get(move) || 0) / count;

    if (winRate > bestWinRate) {
      bestWinRate = winRate;
      bestMove = move;
    }
  }

  return bestMove || empty[0];
}

/**
 * Get AI move for specified difficulty level
 */
export function getAIMove(game: Hex, difficulty: AIDifficulty): Cell {
  switch (difficulty) {
    case 'easy':
      return getEasyMove(game);
    case 'medium':
      return getMediumMove(game);
    case 'hard':
      return getHardMove(game);
    case 'expert':
      // Expert uses LLM (handled separately in edge function)
      throw new Error('Expert difficulty requires LLM - use ai-move edge function');
    default:
      return getEasyMove(game);
  }
}

/**
 * Get AI reasoning for a move (for UI display)
 */
export function getAIReasoning(game: Hex, move: Cell, difficulty: AIDifficulty): string {
  if (move === null) {
    return `Swapping colors - opponent's opening was too strong in the center.`;
  }

  const [c, r] = game.coords(move);
  const n = game.n;
  const center = Math.floor(n / 2);
  const distFromCenter = Math.abs(c - center) + Math.abs(r - center);

  const reasons: string[] = [];

  switch (difficulty) {
    case 'easy':
      if (distFromCenter <= 2) {
        reasons.push('Playing near center for positional advantage');
      } else {
        reasons.push('Making a developing move');
      }
      break;

    case 'medium':
      if (game.turn === 1) {
        reasons.push('Advancing west-east connection');
      } else {
        reasons.push('Building north-south bridge');
      }

      // Check if move blocks opponent
      const opponentColor = game.turn === 1 ? 2 : 1;
      const neighbors = game.neighbors(move);
      const opponentNeighbors = neighbors.filter(nb => game.board[nb] === opponentColor);
      if (opponentNeighbors.length >= 2) {
        reasons.push('blocking opponent threats');
      }
      break;

    case 'hard':
      reasons.push('Simulations show this maximizes win probability');

      if (distFromCenter <= 1) {
        reasons.push('controlling key central territory');
      }
      break;

    default:
      reasons.push('Making a move');
  }

  return reasons.join(', ') + '.';
}
