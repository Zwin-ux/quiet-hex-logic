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
   * Hard: Look-ahead with blocking
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
    
    // Check if we need to block opponent's win
    for (const cell of emptyCells) {
      const testGame = this.game.clone();
      testGame.play(cell); // Skip our turn
      
      // Check if opponent can win
      const opponentEmptyCells = this.getEmptyCellsForGame(testGame);
      for (const oppCell of opponentEmptyCells) {
        const oppTestGame = testGame.clone();
        oppTestGame.play(oppCell);
        if (oppTestGame.winner() === opponentColor) {
          return { cell, reasoning: 'Blocking opponent threat' };
        }
      }
    }
    
    // Otherwise use medium strategy
    return this.getMediumMove(emptyCells);
  }

  private getNeighbors(cell: number): number[] {
    const [col, row] = this.coords(cell);
    const neighbors: number[] = [];
    const directions = [
      [-1, 0], [1, 0],   // W, E
      [0, -1], [0, 1],   // NW, SE
      [-1, 1], [1, -1]   // SW, NE
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
