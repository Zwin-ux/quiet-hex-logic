/**
 * Client-side move validation utilities
 * Provides instant feedback without server round-trip
 */

import { Hex, Cell } from './engine';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a move locally before sending to server
 */
export function validateMoveLocally(game: Hex, move: Cell): ValidationResult {
  // Validate pie swap
  if (move === null) {
    if (!game.pieRule) {
      return { valid: false, error: 'Pie rule is not enabled for this game' };
    }
    if (game.ply !== 1) {
      return { valid: false, error: 'Pie swap only allowed on second move' };
    }
    if (game.swapped) {
      return { valid: false, error: 'Pie swap already used' };
    }
    return { valid: true };
  }

  // Validate cell index
  if (move < 0 || move >= game.n * game.n) {
    return { valid: false, error: 'Invalid cell position' };
  }

  // Check if cell is empty
  if (game.board[move] !== 0) {
    return { valid: false, error: 'Cell is already occupied' };
  }

  return { valid: true };
}

/**
 * Check if it's the player's turn
 */
export function isPlayerTurn(
  currentTurn: number,
  playerColor: number,
  gameStatus: string
): ValidationResult {
  if (gameStatus !== 'active') {
    return { valid: false, error: 'Game is not active' };
  }

  const currentColor = currentTurn % 2 === 1 ? 1 : 2;
  if (currentColor !== playerColor) {
    return { valid: false, error: 'Not your turn' };
  }

  return { valid: true };
}

/**
 * Comprehensive move validation
 */
export function validateMove(
  game: Hex,
  move: Cell,
  currentTurn: number,
  playerColor: number,
  gameStatus: string
): ValidationResult {
  // Check turn
  const turnCheck = isPlayerTurn(currentTurn, playerColor, gameStatus);
  if (!turnCheck.valid) return turnCheck;

  // Check move legality
  return validateMoveLocally(game, move);
}

/**
 * Get all legal moves for current position
 */
export function getLegalMoves(game: Hex): number[] {
  const legalMoves: number[] = [];
  
  for (let i = 0; i < game.n * game.n; i++) {
    if (game.board[i] === 0) {
      legalMoves.push(i);
    }
  }
  
  return legalMoves;
}

/**
 * Check if pie swap is available
 */
export function canUsePieSwap(game: Hex): boolean {
  return game.pieRule && game.ply === 1 && !game.swapped;
}
