import { Hex } from './engine';
import { getSmartAIMove, getSmartAIReasoning } from './smartAI';

export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

/**
 * Difficulty tier constants
 * 
 * EASY: Random but gentle (60% center bias, <100ms)
 * MEDIUM: Bridge-aware, 1-move horizon (150-300ms)
 * HARD: Lookahead with threat detection (300-700ms)
 * EXPERT: Uses server-side MCTS (handled by ai-move-v2)
 */
const DIFFICULTY_CONFIG = {
  easy: {
    centerBias: 0.6,
    centerRadius: 2
  },
  medium: {
    bridgeBonus: 8,
    adjacencyBonus: 5,
    redundancyPenalty: -5,
    randomness: 3
  },
  hard: {
    opponentWeighting: 1.2,
    lookaheadDepth: 1
  }
} as const;

/**
 * Simple, reliable AI for Hex practice games.
 * Runs entirely client-side with no dependencies.
 */
export class SimpleHexAI {
  private game: Hex;
  private difficulty: AIDifficulty;

  constructor(game: Hex, difficulty: AIDifficulty = 'medium') {
    this.game = game;
    this.difficulty = difficulty;
  }

  /**
   * Get the best move for the current position
   */
  getMove(): { cell: number; reasoning: string } {
    const emptyCells = this.getEmptyCells();
    
    if (emptyCells.length === 0) {
      throw new Error('No legal moves available');
    }

    // Use smart AI for medium, hard and expert difficulties for better blocking
    if (this.difficulty === 'medium' || this.difficulty === 'hard' || this.difficulty === 'expert') {
      const cell = getSmartAIMove(this.game, this.difficulty);
      const reasoning = getSmartAIReasoning(this.game, cell, this.difficulty);
      return { cell, reasoning };
    }

    // Easy difficulty uses simple logic
    return this.getEasyMove(emptyCells);
  }

  private getEmptyCells(): number[] {
    const cells: number[] = [];
    for (let i = 0; i < this.game.board.length; i++) {
      if (this.game.board[i] === 0) {
        cells.push(i);
      }
    }
    return cells;
  }

  private coords(i: number): [number, number] {
    return [i % this.game.n, Math.floor(i / this.game.n)];
  }

  /**
   * Easy: Random but gentle
   * - 60% chance to prefer center or near-friendly hexes
   * - Avoids blocking efficiently
   * - Teaches basic flow of the game
   * - Never wins by accident
   */
  private getEasyMove(emptyCells: number[]): { cell: number; reasoning: string } {
    const center = Math.floor(this.game.n / 2);
    const config = DIFFICULTY_CONFIG.easy;
    const currentColor = this.game.ply % 2 === 0 ? 1 : 2;
    
    // 60% chance to play near center or friendly stones
    if (Math.random() < config.centerBias) {
      // First check for cells near own stones
      const friendlyCells = emptyCells.filter(cell => {
        const neighbors = this.getNeighbors(cell);
        return neighbors.some(n => this.game.board[n] === currentColor);
      });
      
      if (friendlyCells.length > 0) {
        const cell = friendlyCells[Math.floor(Math.random() * friendlyCells.length)];
        return { cell, reasoning: 'Exploring near my stones' };
      }
      
      // Otherwise try center region
      const centerCells = emptyCells.filter(cell => {
        const [c, r] = this.coords(cell);
        const dist = Math.abs(c - center) + Math.abs(r - center);
        return dist <= config.centerRadius;
      });
      
      if (centerCells.length > 0) {
        const cell = centerCells[Math.floor(Math.random() * centerCells.length)];
        return { cell, reasoning: 'Playing near the center' };
      }
    }
    
    // Pure random fallback
    const cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    return { cell, reasoning: 'Exploring the board' };
  }

  /**
   * Medium: Intermediate AI
   * - Aware of bridges and adjacency, but still myopic (1-move horizon)
   * - +8 for forming a bridge; +5 for adjacency; -5 for redundancy
   * - Basic blocking if opponent path length ≤ 2
   * - Mild randomness (±3 points)
   * - Simulates a new human player learning tactics
   */
  private getMediumMove(emptyCells: number[]): { cell: number; reasoning: string } {
    const currentColor = this.game.ply % 2 === 0 ? 1 : 2;
    const opponentColor = currentColor === 1 ? 2 : 1;
    const center = Math.floor(this.game.n / 2);
    const config = DIFFICULTY_CONFIG.medium;
    
    let bestCell = emptyCells[0];
    let bestScore = -Infinity;
    let bestReason = 'Making a strategic move';
    
    for (const cell of emptyCells) {
      const [c, r] = this.coords(cell);
      let score = 0;
      
      // Base positional score
      if (currentColor === 1) {
        const distToWest = c;
        const distToEast = this.game.n - 1 - c;
        score += 20 - Math.min(distToWest, distToEast);
        score += 10 - Math.abs(r - center);
      } else {
        const distToNorth = r;
        const distToSouth = this.game.n - 1 - r;
        score += 20 - Math.min(distToNorth, distToSouth);
        score += 10 - Math.abs(c - center);
      }
      
      // Check if this cell forms a bridge
      const neighbors = this.getNeighbors(cell);
      let adjacentFriends = 0;
      let adjacentEnemies = 0;
      let formsBridge = false;
      
      for (const neighbor of neighbors) {
        if (this.game.board[neighbor] === currentColor) {
          adjacentFriends++;
          
          // Check if this creates a bridge pattern
          const commonNeighbors = this.getNeighbors(neighbor).filter(n => 
            neighbors.includes(n) && this.game.board[n] === currentColor
          );
          if (commonNeighbors.length > 0) {
            formsBridge = true;
          }
        } else if (this.game.board[neighbor] === opponentColor) {
          adjacentEnemies++;
        }
      }
      
      // Apply bonuses/penalties
      if (formsBridge) {
        score += config.bridgeBonus;
      }
      score += adjacentFriends * config.adjacencyBonus;
      
      // Redundancy penalty if too many neighbors
      if (adjacentFriends > 2) {
        score += config.redundancyPenalty;
      }
      
      // Basic blocking: check if opponent could make short path
      const testGame = this.game.clone();
      testGame.board[cell] = opponentColor;
      const opponentShortPath = this.estimateShortestPath(testGame, opponentColor);
      if (opponentShortPath !== null && opponentShortPath <= 2) {
        score += 6; // Blocking bonus
      }
      
      // Add mild randomness
      score += (Math.random() - 0.5) * config.randomness;
      
      if (score > bestScore) {
        bestScore = score;
        bestCell = cell;
        bestReason = formsBridge ? 'Creating bridge connection' : 
                     adjacentFriends > 0 ? 'Extending my chain' :
                     'Building toward goal';
      }
    }
    
    return { cell: bestCell, reasoning: bestReason };
  }
  
  /**
   * Estimate shortest path to goal (simple heuristic)
   */
  private estimateShortestPath(game: Hex, color: number): number | null {
    let minDist = Infinity;
    
    for (let i = 0; i < game.board.length; i++) {
      if (game.board[i] === color) {
        const [c, r] = this.coords(i);
        const dist = color === 1 ? (game.n - 1 - c) : (game.n - 1 - r);
        minDist = Math.min(minDist, dist);
      }
    }
    
    return minDist === Infinity ? null : minDist;
  }

  /**
   * Hard: Advanced AI
   * - Uses lookahead and threat detection
   * - Plans multiple bridges, defends actively
   * - Weighted formula: score = my_dist - 1.2 * opp_dist + adjacency_bonus
   * - Simulates 1-move future; blocks immediate threats
   * - Tough but beatable human equivalent
   */
  private getHardMove(emptyCells: number[]): { cell: number; reasoning: string } {
    const currentColor = this.game.ply % 2 === 0 ? 1 : 2;
    const opponentColor = currentColor === 1 ? 2 : 1;
    const config = DIFFICULTY_CONFIG.hard;
    
    // Check if we can win in one move
    for (const cell of emptyCells) {
      const testGame = this.game.clone();
      testGame.play(cell);
      if (testGame.winner() === currentColor) {
        return { cell, reasoning: 'Winning move!' };
      }
    }
    
    // Check if opponent can win on their next turn (and block it)
    for (const oppCell of emptyCells) {
      const testGame = this.game.clone();
      testGame.board[oppCell] = opponentColor;
      
      if (testGame.winner() === opponentColor) {
        return { cell: oppCell, reasoning: 'Blocking critical threat!' };
      }
    }
    
    // Evaluate moves with lookahead
    let bestCell = emptyCells[0];
    let bestScore = -Infinity;
    
    for (const cell of emptyCells) {
      // Simulate this move
      const testGame = this.game.clone();
      testGame.board[cell] = currentColor;
      
      // Calculate distances to goal for both players
      const myDist = this.estimateShortestPath(testGame, currentColor) || 99;
      const oppDist = this.estimateShortestPath(testGame, opponentColor) || 99;
      
      // Weighted formula emphasizing opponent blocking
      let score = -myDist + (config.opponentWeighting * oppDist);
      
      // Adjacency bonus
      const neighbors = this.getNeighbors(cell);
      let adjacentFriends = 0;
      for (const neighbor of neighbors) {
        if (this.game.board[neighbor] === currentColor) {
          adjacentFriends++;
        }
      }
      score += adjacentFriends * 3;
      
      // Bridge detection bonus
      const formsBridge = this.checkBridgeAtCell(cell, currentColor);
      if (formsBridge) {
        score += 10;
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestCell = cell;
      }
    }
    
    return { cell: bestCell, reasoning: 'Strategic positioning with lookahead' };
  }
  
  /**
   * Check if a cell forms a bridge with existing stones
   */
  private checkBridgeAtCell(cell: number, color: number): boolean {
    const neighbors = this.getNeighbors(cell);
    let friendCount = 0;
    
    for (const neighbor of neighbors) {
      if (this.game.board[neighbor] === color) {
        friendCount++;
        
        // Check for bridge pattern
        const commonNeighbors = this.getNeighbors(neighbor).filter(n => 
          neighbors.includes(n) && this.game.board[n] === color
        );
        if (commonNeighbors.length > 0) {
          return true;
        }
      }
    }
    
    return friendCount >= 2;
  }

  /**
   * Detect bridge patterns (H-bridge / two-distance connections)
   * A bridge is two cells that form a strong virtual connection
   */
  private findBridgeMove(emptyCells: number[], color: number): number | null {
    const myStones = [];
    for (let i = 0; i < this.game.board.length; i++) {
      if (this.game.board[i] === color) {
        myStones.push(i);
      }
    }

    // Look for pairs of my stones that are 2 hops apart
    for (let i = 0; i < myStones.length; i++) {
      for (let j = i + 1; j < myStones.length; j++) {
        const stone1 = myStones[i];
        const stone2 = myStones[j];
        
        // Find common neighbors (bridge points)
        const neighbors1 = this.getNeighbors(stone1);
        const neighbors2 = this.getNeighbors(stone2);
        
        const bridgePoints = neighbors1.filter(n1 => 
          neighbors2.includes(n1) && 
          this.game.board[n1] === 0 &&
          emptyCells.includes(n1)
        );
        
        // If there are 2 empty bridge points, play one of them
        if (bridgePoints.length === 2) {
          // Check if opponent hasn't blocked yet
          const enemyNear = bridgePoints.some(bp => {
            const bpNeighbors = this.getNeighbors(bp);
            return bpNeighbors.some(n => this.game.board[n] !== 0 && this.game.board[n] !== color);
          });
          
          if (!enemyNear) {
            // Play the bridge point closer to our goal
            return this.selectBestBridgePoint(bridgePoints, color);
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Select the better bridge point based on proximity to goal
   */
  private selectBestBridgePoint(bridgePoints: number[], color: number): number {
    let bestPoint = bridgePoints[0];
    let bestScore = -Infinity;

    for (const point of bridgePoints) {
      const [c, r] = this.coords(point);
      let score = 0;

      if (color === 1) {
        // Indigo: prefer points closer to east edge
        score = c;
      } else {
        // Ochre: prefer points closer to south edge
        score = r;
      }

      if (score > bestScore) {
        bestScore = score;
        bestPoint = point;
      }
    }

    return bestPoint;
  }

  private getNeighbors(cell: number): number[] {
    const [col, row] = this.coords(cell);
    const neighbors: number[] = [];
    
    // Offset coordinates (odd-q): odd columns shifted down
    const deltasEven = [[1, -1], [1, 0], [0, 1], [-1, 0], [-1, -1], [0, -1]]; // [dc, dr]
    const deltasOdd = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [0, -1]];   // [dc, dr]
    
    const deltas = col % 2 === 0 ? deltasEven : deltasOdd;
    
    for (const [dc, dr] of deltas) {
      const nc = col + dc;
      const nr = row + dr;
      if (nc >= 0 && nc < this.game.n && nr >= 0 && nr < this.game.n) {
        neighbors.push(nr * this.game.n + nc);
      }
    }
    
    return neighbors;
  }

  private getEmptyCellsForGame(game: Hex): number[] {
    const cells: number[] = [];
    for (let i = 0; i < game.board.length; i++) {
      if (game.board[i] === 0) {
        cells.push(i);
      }
    }
    return cells;
  }
}
