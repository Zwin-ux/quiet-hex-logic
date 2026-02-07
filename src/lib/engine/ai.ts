import type { AIPlayer, GameEngine } from './types';

/**
 * Wraps a synchronous evaluation function into an AIPlayer interface.
 * This is the simplest way to create an AI for a game.
 */
export function createSimpleAI<TMove>(
  evalFn: (engine: GameEngine<TMove>) => { move: TMove; reasoning: string },
): AIPlayer<TMove> {
  return {
    getMove(engine: GameEngine<TMove>) {
      return evalFn(engine);
    },
  };
}
