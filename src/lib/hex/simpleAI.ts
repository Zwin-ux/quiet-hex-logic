import { Hex } from './engine';

export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

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

    switch (this.difficulty) {
      case 'easy':
        return this.getEasyMove(emptyCells);
      case 'medium':
        return this.getMediumMove(emptyCells);
      case 'hard':
      case 'expert': // Expert uses hard difficulty
        return this.getHardMove(emptyCells);
      default:
        return this.getMediumMove(emptyCells);
    }
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
   * Easy: Random with slight center bias
   */
  private getEasyMove(emptyCells: number[]): { cell: number; reasoning: string } {
    const center = Math.floor(this.game.n / 2);
    
    // 60% chance to play near center
    if (Math.random() < 0.6) {
      const centerCells = emptyCells.filter(cell => {
        const [c, r] = this.coords(cell);
        const dist = Math.abs(c - center) + Math.abs(r - center);
        return dist <= 2;
      });
      
      if (centerCells.length > 0) {
        const cell = centerCells[Math.floor(Math.random() * centerCells.length)];
        return { cell, reasoning: 'Playing near the center' };
      }
    }
    
    const cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    return { cell, reasoning: 'Making a move' };
  }

  /**
   * Medium: Positional heuristics
   */
  private getMediumMove(emptyCells: number[]): { cell: number; reasoning: string } {
    const currentColor = this.game.ply % 2 === 0 ? 1 : 2;
    const center = Math.floor(this.game.n / 2);
    
    let bestCell = emptyCells[0];
    let bestScore = -Infinity;
    
    for (const cell of emptyCells) {
      const [c, r] = this.coords(cell);
      let score = 0;
      
      if (currentColor === 1) {
        // Indigo connects West-East (horizontal)
        const distToWest = c;
        const distToEast = this.game.n - 1 - c;
        score += 20 - Math.min(distToWest, distToEast);
        score += 10 - Math.abs(r - center); // Slight center preference
      } else {
        // Ochre connects North-South (vertical)
        const distToNorth = r;
        const distToSouth = this.game.n - 1 - r;
        score += 20 - Math.min(distToNorth, distToSouth);
        score += 10 - Math.abs(c - center); // Slight center preference
      }
      
      // Bonus for being adjacent to own stones
      const neighbors = this.getNeighbors(cell);
      for (const neighbor of neighbors) {
        if (this.game.board[neighbor] === currentColor) {
          score += 5;
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestCell = cell;
      }
    }
    
    const [c, r] = this.coords(bestCell);
    const reasoning = currentColor === 1
      ? `Building west-east connection at row ${r + 1}`
      : `Building north-south connection at col ${c + 1}`;
    
    return { cell: bestCell, reasoning };
  }

  /**
   * Hard: Tactical patterns + Bridge detection
   */
  private getHardMove(emptyCells: number[]): { cell: number; reasoning: string } {
    const currentColor = this.game.ply % 2 === 0 ? 1 : 2;
    const opponentColor = currentColor === 1 ? 2 : 1;
    
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
        return { cell: oppCell, reasoning: 'Blocking critical opponent threat!' };
      }
    }
    
    // Check for bridge opportunities
    const bridgeMove = this.findBridgeMove(emptyCells, currentColor);
    if (bridgeMove) {
      return { cell: bridgeMove, reasoning: 'Creating tactical bridge connection' };
    }
    
    // Check for opponent bridges to interrupt
    const blockBridge = this.findBridgeMove(emptyCells, opponentColor);
    if (blockBridge) {
      return { cell: blockBridge, reasoning: 'Disrupting opponent bridge' };
    }
    
    // Otherwise use medium strategy with enhanced scoring
    return this.getMediumMove(emptyCells);
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
    
    // Hex grid has 6 neighbors - correct directions for axial coordinates
    const directions = [
      [1, 0], [-1, 0],      // E, W
      [0, 1], [0, -1],      // SE, NW
      [1, -1], [-1, 1]      // NE, SW
    ];
    
    for (const [dc, dr] of directions) {
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
