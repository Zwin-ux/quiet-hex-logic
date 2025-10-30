/**
 * AI Worker - Runs AI calculations in background thread
 * Prevents UI blocking during AI thinking
 */

import { Hex } from '../lib/hex/engine';
import { getAIMove, getAIReasoning, AIDifficulty } from '../lib/hex/ai';

export interface AIWorkerRequest {
  type: 'compute_move';
  gameState: {
    n: number;
    board: number[];
    turn: number;
    ply: number;
    swapped: boolean;
    pieRule: boolean;
  };
  difficulty: AIDifficulty;
}

export interface AIWorkerResponse {
  type: 'move_computed';
  move: number | null;
  reasoning: string;
  computeTime: number;
}

// Worker message handler
self.onmessage = async (e: MessageEvent<AIWorkerRequest>) => {
  const startTime = performance.now();
  
  try {
    const { gameState, difficulty } = e.data;
    
    // Reconstruct game engine from serialized state
    const game = new Hex(gameState.n, gameState.pieRule);
    game.board = new Uint8Array(gameState.board);
    game.turn = gameState.turn as 1 | 2;
    game.ply = gameState.ply;
    game.swapped = gameState.swapped;
    
    // Compute AI move
    const move = getAIMove(game, difficulty);
    const reasoning = getAIReasoning(game, move, difficulty);
    
    const computeTime = performance.now() - startTime;
    
    const response: AIWorkerResponse = {
      type: 'move_computed',
      move,
      reasoning,
      computeTime
    };
    
    self.postMessage(response);
  } catch (error) {
    console.error('AI Worker error:', error);
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Export type for TypeScript
export type {};
