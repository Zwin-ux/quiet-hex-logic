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
 * MCTS Node for tree-based search
 */
class MCTSNode {
  visits: number = 0;
  wins: number = 0;
  move: Cell;
  parent: MCTSNode | null;
  children: MCTSNode[] = [];
  untriedMoves: number[];

  constructor(move: Cell, parent: MCTSNode | null, untriedMoves: number[]) {
    this.move = move;
    this.parent = parent;
    this.untriedMoves = [...untriedMoves];
  }

  /**
   * UCB1 formula: balances exploration vs exploitation
   * Higher C = more exploration, Lower C = more exploitation
   */
  ucb1(parentVisits: number, explorationConstant: number = 1.41): number {
    if (this.visits === 0) return Infinity;
    
    const exploitation = this.wins / this.visits;
    const exploration = Math.sqrt(Math.log(parentVisits) / this.visits);
    
    return exploitation + explorationConstant * exploration;
  }

  /**
   * Select best child using UCB1
   */
  selectBestChild(explorationConstant: number = 1.41): MCTSNode {
    return this.children.reduce((best, child) => {
      const childUCB = child.ucb1(this.visits, explorationConstant);
      const bestUCB = best.ucb1(this.visits, explorationConstant);
      return childUCB > bestUCB ? child : best;
    });
  }

  /**
   * Expand by adding a child node for an untried move
   */
  expand(game: Hex): MCTSNode {
    const move = this.untriedMoves.pop()!;
    const clone = game.clone();
    clone.play(move);
    
    const childNode = new MCTSNode(
      move,
      this,
      clone.getEmptyCells()
    );
    
    this.children.push(childNode);
    return childNode;
  }

  /**
   * Check if node is fully expanded
   */
  isFullyExpanded(): boolean {
    return this.untriedMoves.length === 0;
  }

  /**
   * Check if node is terminal (game over)
   */
  isTerminal(game: Hex): boolean {
    return game.winner() !== 0 || game.getEmptyCells().length === 0;
  }
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
 * Hard AI: UCB1-based MCTS with 200+ iterations
 * Significantly stronger than basic Monte Carlo
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
  
  // Check for immediate wins first
  for (const move of empty) {
    const clone = game.clone();
    clone.play(move);
    if (clone.winner() === currentColor) {
      return move; // Immediate win
    }
  }

  // Adaptive iteration count based on board complexity
  const baseIterations = 200;
  const boardComplexity = Math.min(empty.length / 10, 2); // 1-2x multiplier
  const iterations = Math.floor(baseIterations * boardComplexity);

  // Initialize root node
  const rootNode = new MCTSNode(null, null, empty);

  // MCTS main loop
  for (let i = 0; i < iterations; i++) {
    const gameClone = game.clone();
    let node = rootNode;

    // 1. SELECTION: Traverse tree using UCB1
    while (node.isFullyExpanded() && node.children.length > 0 && !node.isTerminal(gameClone)) {
      node = node.selectBestChild();
      if (node.move !== null) {
        gameClone.play(node.move);
      }
    }

    // 2. EXPANSION: Add new child if not terminal
    if (!node.isTerminal(gameClone) && !node.isFullyExpanded()) {
      node = node.expand(gameClone);
      if (node.move !== null) {
        gameClone.play(node.move);
      }
    }

    // 3. SIMULATION: Random playout from current position
    let result = gameClone.winner();
    if (result === 0) {
      result = simulate(gameClone, currentColor);
    }

    // 4. BACKPROPAGATION: Update all nodes in path
    while (node !== null) {
      node.visits++;
      if (result === currentColor) {
        node.wins++;
      } else if (result !== 0) {
        // Opponent win = 0 points for us
        node.wins += 0;
      } else {
        // Draw = 0.5 points
        node.wins += 0.5;
      }
      node = node.parent;
    }
  }

  // Select best move based on visit count (most robust)
  if (rootNode.children.length === 0) {
    return empty[0]; // Fallback
  }

  let bestChild = rootNode.children[0];
  let bestVisits = bestChild.visits;

  for (const child of rootNode.children) {
    if (child.visits > bestVisits) {
      bestVisits = child.visits;
      bestChild = child;
    }
  }

  return bestChild.move || empty[0];
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
      reasons.push('UCB1-based tree search identified this as the strongest move');

      if (distFromCenter <= 1) {
        reasons.push('securing critical central position');
      } else {
        reasons.push('maximizing long-term winning chances');
      }
      break;

    default:
      reasons.push('Making a move');
  }

  return reasons.join(', ') + '.';
}
