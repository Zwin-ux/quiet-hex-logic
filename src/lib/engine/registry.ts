import type { GameDefinition, GameEngine, GameEngineOptions } from './types';

const registry = new Map<string, GameDefinition<any>>();

/** Register a game definition. */
export function registerGame<TMove>(def: GameDefinition<TMove>): void {
  registry.set(def.key, def);
}

/** Get a game definition by key. Throws if not found. */
export function getGame(key: string): GameDefinition<any> {
  const def = registry.get(key);
  if (!def) throw new Error(`Unknown game: ${key}`);
  return def;
}

/** Get a game definition by key, or undefined if not found. */
export function getGameOrNull(key: string): GameDefinition<any> | undefined {
  return registry.get(key);
}

/** List all registered game keys. */
export function listGameKeys(): string[] {
  return [...registry.keys()];
}

/** List all registered game definitions. */
export function listGames(): GameDefinition<any>[] {
  return [...registry.values()];
}

/** Create an engine for a game key with options. */
export function createEngine(key: string, opts?: GameEngineOptions): GameEngine<any> {
  return getGame(key).createEngine(opts);
}

// ---------------------------------------------------------------------------
// Built-in game registrations
// ---------------------------------------------------------------------------

import { HexAdapter } from './adapters/hexAdapter';
import { ChessAdapter } from './adapters/chessAdapter';
import { TttAdapter } from './adapters/tttAdapter';
import { CheckersAdapter } from './adapters/checkersAdapter';
import { Connect4Adapter } from './adapters/connect4Adapter';
import { createTttAI } from '@/lib/ttt/ai';
import { createCheckersAI } from '@/lib/checkers/ai';
import { createChessAI } from '@/lib/chess/ai';
import { createConnect4AI } from '@/lib/connect4/ai';

// Board components are resolved at render time by MatchBoard,
// not stored in the registry, to avoid importing React into engine code.

registerGame({
  key: 'hex',
  displayName: 'Hex',
  createEngine: (opts) => HexAdapter.create(opts),
  boardComponent: null as any,
  defaultBoardSize: 11,
  configurableBoardSize: true,
  boardSizeOptions: [
    { value: 7, label: '7x7 - Quick' },
    { value: 9, label: '9x9 - Standard' },
    { value: 11, label: '11x11 - Classic' },
  ],
  supportsPieRule: true,
  supportsRanked: true,
  aiDifficulties: ['easy', 'medium', 'hard', 'expert'],
  // Hex AI is handled via the existing SimpleHexAI + server-side ai-move-v2
});

registerGame({
  key: 'chess',
  displayName: 'Chess',
  createEngine: (opts) => ChessAdapter.create(opts),
  boardComponent: null as any,
  defaultBoardSize: 8,
  configurableBoardSize: false,
  boardSizeOptions: [{ value: 8, label: '8x8 - Standard' }],
  supportsPieRule: false,
  supportsRanked: true,
  aiDifficulties: ['easy', 'medium'],
  createAI: (difficulty) => createChessAI(difficulty),
});

registerGame({
  key: 'checkers',
  displayName: 'Checkers',
  createEngine: (opts) => CheckersAdapter.create(opts),
  boardComponent: null as any,
  defaultBoardSize: 8,
  configurableBoardSize: false,
  boardSizeOptions: [{ value: 8, label: '8x8 - American' }],
  supportsPieRule: false,
  supportsRanked: true,
  aiDifficulties: ['easy', 'medium', 'hard'],
  createAI: (difficulty) => createCheckersAI(difficulty),
});

registerGame({
  key: 'ttt',
  displayName: 'Tic Tac Toe',
  createEngine: (opts) => TttAdapter.create(opts),
  boardComponent: null as any,
  defaultBoardSize: 3,
  configurableBoardSize: false,
  boardSizeOptions: [{ value: 3, label: '3x3 - Classic' }],
  supportsPieRule: false,
  supportsRanked: false,
  aiDifficulties: ['easy', 'medium', 'hard'],
  createAI: (difficulty) => createTttAI(difficulty),
});

registerGame({
  key: 'connect4',
  displayName: 'Connect 4',
  createEngine: (opts) => Connect4Adapter.create(opts),
  boardComponent: null as any,
  defaultBoardSize: 7,
  configurableBoardSize: false,
  boardSizeOptions: [{ value: 7, label: '7x6 - Classic' }],
  supportsPieRule: false,
  supportsRanked: true,
  aiDifficulties: ['easy', 'medium', 'hard'],
  createAI: (difficulty) => createConnect4AI(difficulty),
});
