/**
 * Smart Hex AI with connection-based evaluation
 * This AI evaluates moves based on:
 * 1. Connection potential (how close to winning)
 * 2. Blocking opponent threats
 * 3. Building bridges and strong patterns
 */

import { Hex, Cell } from './engine';
import { 
  estimateConnectionDistance, 
  evaluateMoveConnection,
  findBlockingCells,
  findBridgeCells 
} from './pathfinding';

export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

/**
 * Score a move based on multiple heuristics
 * Lower score is better
 */
function scoreMoveAdvanced(
  game: Hex, 
  cell: number, 
  aiColor: 1 | 2,
  difficulty: AIDifficulty
): number {
  const opponentColor = aiColor === 1 ? 2 : 1;
  
  // 1. Check for immediate win
  const clone = game.clone();
  clone.play(cell);
  if (clone.winner() === aiColor) {
    return -10000; // Winning move has highest priority
  }
  
  // 2. Check if opponent would win next turn if we don't block
  const opponentWinThreat = checkOpponentWinThreat(game, cell, opponentColor);
  if (opponentWinThreat) {
    return -5000; // Must block opponent win
  }
  
  // 3. Evaluate connection improvement for AI
  const aiConnectionAfter = evaluateMoveConnection(game, cell, aiColor);
  
  // 4. Evaluate how much this blocks opponent
  const opponentConnectionBefore = estimateConnectionDistance(game, opponentColor);
  const cloneWithMove = game.clone();
  cloneWithMove.board[cell] = aiColor;
  const opponentConnectionAfter = estimateConnectionDistance(cloneWithMove, opponentColor);
  const blockingValue = opponentConnectionAfter - opponentConnectionBefore;
  
  // 5. Check if this creates a bridge pattern
  const bridges = findBridgeCells(game, aiColor);
  const isBridge = bridges.includes(cell);
  
  // 6. Center control bonus (early game)
  const [col, row] = game.coords(cell);
  const center = Math.floor(game.n / 2);
  const distFromCenter = Math.abs(col - center) + Math.abs(row - center);
  const centerBonus = game.ply < 10 ? (5 - distFromCenter) * 0.5 : 0;
  
  // Combine scores with weights based on difficulty
  let score = 0;
  
  if (difficulty === 'easy') {
    // Easy: mostly random with slight center bias
    score = Math.random() * 10 - centerBonus;
  } else if (difficulty === 'medium') {
    // Medium: balance offense and defense
    score = aiConnectionAfter * 2.0 - blockingValue * 1.5 - centerBonus;
    if (isBridge) score -= 2;
  } else {
    // Hard/Expert: aggressive blocking and connection building
    score = aiConnectionAfter * 1.5 - blockingValue * 3.0 - centerBonus;
    if (isBridge) score -= 3;
    
    // Extra penalty for moves that don't contribute to connection
    const neighbors = game.neighbors(cell);
    const friendlyNeighbors = neighbors.filter(n => game.board[n] === aiColor).length;
    if (friendlyNeighbors === 0 && game.ply > 5) {
      score += 5; // Penalize isolated moves
    }
  }
  
  return score;
}

/**
 * Check if opponent has a winning move available
 */
function checkOpponentWinThreat(game: Hex, blockCell: number, opponentColor: 1 | 2): boolean {
  const emptyCells = game.getEmptyCells();
  
  for (const cell of emptyCells) {
    if (cell === blockCell) continue; // Skip the cell we're considering
    
    const clone = game.clone();
    // Temporarily set turn to opponent
    const originalTurn = clone.turn;
    clone.turn = opponentColor;
    
    // Use the public play() method which handles DSU updates correctly
    try {
      clone.play(cell);
      if (clone.winner() === opponentColor) {
        return true; // Opponent has a winning move
      }
    } catch (e) {
      // Invalid move, skip
      continue;
    }
  }
  
  return false;
}

/**
 * Get best AI move using advanced heuristics
 */
export function getSmartAIMove(game: Hex, difficulty: AIDifficulty): Cell {
  const emptyCells = game.getEmptyCells();
  if (emptyCells.length === 0) return null;
  
  // Handle pie rule for medium/hard/expert
  if (game.pieRule && game.ply === 1 && difficulty !== 'easy') {
    const n = game.n;
    const center = Math.floor(n / 2);
    
    // Check if opponent's first move is strong (near center)
    for (let i = 0; i < n * n; i++) {
      if (game.board[i] !== 0) {
        const [c, r] = game.coords(i);
        const dist = Math.abs(c - center) + Math.abs(r - center);
        
        // Swap if opponent played within 2 cells of center
        if (dist <= 2) {
          return null; // Swap
        }
      }
    }
  }
  
  const aiColor = game.turn;
  const opponentColor = aiColor === 1 ? 2 : 1;
  
  // First, check for critical blocking cells
  const blockingCells = findBlockingCells(game, opponentColor);
  
  // Score all moves
  const scoredMoves = emptyCells.map(cell => ({
    cell,
    score: scoreMoveAdvanced(game, cell, aiColor, difficulty),
    isBlocking: blockingCells.includes(cell)
  }));
  
  // Sort by score (lower is better)
  scoredMoves.sort((a, b) => a.score - b.score);
  
  // Add randomness for unpredictability
  let selectedMove: number;
  
  if (difficulty === 'easy') {
    // Easy: 70% random, 30% best move
    if (Math.random() < 0.7) {
      selectedMove = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    } else {
      selectedMove = scoredMoves[0].cell;
    }
  } else if (difficulty === 'medium') {
    // Medium: pick from top 3 moves with slight randomness
    const topMoves = scoredMoves.slice(0, Math.min(3, scoredMoves.length));
    const weights = [0.6, 0.3, 0.1];
    const rand = Math.random();
    let cumulative = 0;
    selectedMove = topMoves[0].cell;
    
    for (let i = 0; i < topMoves.length; i++) {
      cumulative += weights[i];
      if (rand < cumulative) {
        selectedMove = topMoves[i].cell;
        break;
      }
    }
  } else {
    // Hard/Expert: pick from top 2 moves with minimal randomness
    const topMoves = scoredMoves.slice(0, Math.min(2, scoredMoves.length));
    if (Math.random() < 0.9) {
      selectedMove = topMoves[0].cell;
    } else {
      selectedMove = topMoves[Math.min(1, topMoves.length - 1)].cell;
    }
  }
  
  return selectedMove;
}

/**
 * Get reasoning for AI move (for UI display)
 */
export function getSmartAIReasoning(game: Hex, move: Cell, difficulty: AIDifficulty): string {
  if (move === null) {
    return "Swapping colors - opponent's opening was too strong.";
  }
  
  const aiColor = game.turn;
  const opponentColor = aiColor === 1 ? 2 : 1;
  const reasons: string[] = [];
  
  // Check if it's a winning move
  const clone = game.clone();
  clone.play(move);
  if (clone.winner() === aiColor) {
    return "This move wins the game!";
  }
  
  // Check if it blocks opponent win
  if (checkOpponentWinThreat(game, move, opponentColor)) {
    reasons.push("Blocking opponent's winning threat");
  }
  
  // Check connection improvement
  const connectionBefore = estimateConnectionDistance(game, aiColor);
  const connectionAfter = evaluateMoveConnection(game, move, aiColor);
  if (connectionAfter < connectionBefore) {
    reasons.push(`Improving connection (distance: ${connectionBefore} → ${connectionAfter})`);
  }
  
  // Check if blocking opponent
  const oppConnectionBefore = estimateConnectionDistance(game, opponentColor);
  const cloneWithMove = game.clone();
  cloneWithMove.board[move] = aiColor;
  const oppConnectionAfter = estimateConnectionDistance(cloneWithMove, opponentColor);
  if (oppConnectionAfter > oppConnectionBefore) {
    reasons.push("Disrupting opponent's connection");
  }
  
  // Check for bridge
  const bridges = findBridgeCells(game, aiColor);
  if (bridges.includes(move)) {
    reasons.push("Creating a bridge pattern");
  }
  
  // Check neighbors
  const neighbors = game.neighbors(move);
  const friendlyNeighbors = neighbors.filter(n => game.board[n] === aiColor).length;
  if (friendlyNeighbors >= 2) {
    reasons.push("Connecting existing stones");
  }
  
  if (reasons.length === 0) {
    reasons.push("Developing position");
  }
  
  return reasons.join(", ") + ".";
}
