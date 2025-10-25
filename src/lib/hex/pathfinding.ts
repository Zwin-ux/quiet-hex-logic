/**
 * Pathfinding utilities for Hex AI
 * Used to estimate connection potential and evaluate board positions
 */

import { Hex } from './engine';

/**
 * Calculate shortest path distance between two sides using Dijkstra-like approach
 * Returns the minimum number of empty cells needed to connect the sides
 * 
 * @param game - The Hex game instance
 * @param color - The player color (1 or 2)
 * @returns Distance estimate (lower is better)
 */
export function estimateConnectionDistance(game: Hex, color: 1 | 2): number {
  const n = game.n;
  const distances = new Array(n * n).fill(Infinity);
  const visited = new Set<number>();
  const queue: number[] = [];

  // Initialize starting cells (one edge)
  if (color === 1) {
    // Player 1 connects West to East, start from West edge (col = 0)
    for (let row = 0; row < n; row++) {
      const cell = row * n + 0;
      if (game.board[cell] === color) {
        distances[cell] = 0;
        queue.push(cell);
      } else if (game.board[cell] === 0) {
        distances[cell] = 1;
        queue.push(cell);
      }
    }
  } else {
    // Player 2 connects North to South, start from North edge (row = 0)
    for (let col = 0; col < n; col++) {
      const cell = 0 * n + col;
      if (game.board[cell] === color) {
        distances[cell] = 0;
        queue.push(cell);
      } else if (game.board[cell] === 0) {
        distances[cell] = 1;
        queue.push(cell);
      }
    }
  }

  // Dijkstra-like expansion
  while (queue.length > 0) {
    // Find cell with minimum distance
    let minIdx = 0;
    for (let i = 1; i < queue.length; i++) {
      if (distances[queue[i]] < distances[queue[minIdx]]) {
        minIdx = i;
      }
    }
    const current = queue.splice(minIdx, 1)[0];
    
    if (visited.has(current)) continue;
    visited.add(current);

    const currentDist = distances[current];

    // Explore neighbors
    for (const neighbor of game.neighbors(current)) {
      if (visited.has(neighbor)) continue;

      let edgeCost: number;
      const neighborColor = game.board[neighbor];
      
      if (neighborColor === color) {
        edgeCost = 0; // Own stone, no cost
      } else if (neighborColor === 0) {
        edgeCost = 1; // Empty cell, cost 1
      } else {
        edgeCost = 100; // Opponent stone, very high cost (blocked)
      }

      const newDist = currentDist + edgeCost;
      if (newDist < distances[neighbor]) {
        distances[neighbor] = newDist;
        queue.push(neighbor);
      }
    }
  }

  // Find minimum distance to target edge
  let minDist = Infinity;
  if (color === 1) {
    // Check East edge (col = n-1)
    for (let row = 0; row < n; row++) {
      const cell = row * n + (n - 1);
      minDist = Math.min(minDist, distances[cell]);
    }
  } else {
    // Check South edge (row = n-1)
    for (let col = 0; col < n; col++) {
      const cell = (n - 1) * n + col;
      minDist = Math.min(minDist, distances[cell]);
    }
  }

  return minDist;
}

/**
 * Evaluate how much a move improves connection for a player
 * Lower return value = better connection
 * 
 * @param game - The Hex game instance
 * @param cell - The cell to evaluate
 * @param color - The player color
 * @returns Connection improvement score
 */
export function evaluateMoveConnection(game: Hex, cell: number, color: 1 | 2): number {
  // Clone and simulate the move
  const clone = game.clone();
  clone.board[cell] = color;

  // Calculate connection distance after this move
  return estimateConnectionDistance(clone, color);
}

/**
 * Find cells that are critical for blocking opponent's connection
 * Returns cells that are on the opponent's shortest path
 * 
 * @param game - The Hex game instance
 * @param opponentColor - The opponent's color
 * @returns Array of critical blocking cells
 */
export function findBlockingCells(game: Hex, opponentColor: 1 | 2): number[] {
  const n = game.n;
  const blockingCells: number[] = [];
  
  // Get opponent's current connection distance
  const baseDistance = estimateConnectionDistance(game, opponentColor);
  
  // If opponent is already well-connected, find cells that would increase their distance
  const emptyCells = game.getEmptyCells();
  
  for (const cell of emptyCells) {
    // Simulate blocking this cell
    const clone = game.clone();
    clone.board[cell] = (opponentColor === 1 ? 2 : 1); // Place our stone
    
    const newDistance = estimateConnectionDistance(clone, opponentColor);
    
    // If blocking this cell significantly increases opponent's distance, it's critical
    if (newDistance > baseDistance + 1) {
      blockingCells.push(cell);
    }
  }
  
  return blockingCells;
}

/**
 * Find cells that would create a bridge (two-connection) pattern
 * Bridges are strong tactical patterns in Hex
 * 
 * @param game - The Hex game instance
 * @param color - The player color
 * @returns Array of cells that would create bridges
 */
export function findBridgeCells(game: Hex, color: 1 | 2): number[] {
  const bridgeCells: number[] = [];
  const emptyCells = game.getEmptyCells();
  
  for (const cell of emptyCells) {
    const neighbors = game.neighbors(cell);
    const friendlyNeighbors = neighbors.filter(n => game.board[n] === color);
    
    // A bridge is formed when we connect two friendly stones that are 2 cells apart
    if (friendlyNeighbors.length >= 2) {
      // Check if any pair of friendly neighbors are not directly adjacent
      for (let i = 0; i < friendlyNeighbors.length; i++) {
        for (let j = i + 1; j < friendlyNeighbors.length; j++) {
          const n1 = friendlyNeighbors[i];
          const n2 = friendlyNeighbors[j];
          const n1Neighbors = game.neighbors(n1);
          
          // If n2 is not a direct neighbor of n1, this forms a bridge
          if (!n1Neighbors.includes(n2)) {
            bridgeCells.push(cell);
            break;
          }
        }
      }
    }
  }
  
  return bridgeCells;
}
