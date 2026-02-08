/**
 * Common game engine interface.
 *
 * Every built-in and mod-provided game must implement this interface
 * (typically via an adapter wrapping the real engine).
 *
 * TMove is the game-specific move type:
 *   - Hex: number | null  (cell index, or null for pie swap)
 *   - Chess: { uci: string; promotion?: string }
 *   - TTT: number  (cell 0-8)
 *   - Checkers: { path: number[] }
 *   - Connect4: number (column 0-6)
 */
export interface GameEngine<TMove = unknown> {
  /** Whose turn is it? 1 = first player, 2 = second player. */
  currentPlayer(): 1 | 2;

  /** Number of half-moves played so far (0 at game start). */
  ply(): number;

  /** Check if a move is legal in the current position. */
  isLegal(move: TMove): boolean;

  /** Apply a move, mutating the engine state. Throws if illegal. */
  applyMove(move: TMove): void;

  /** Returns the winner (1 or 2), or 0 if no winner yet. */
  winner(): 0 | 1 | 2;

  /** True if the game ended in a draw. */
  isDraw(): boolean;

  /** True if the game is over (winner or draw). */
  isGameOver(): boolean;

  /** Deep-copy the engine state. */
  clone(): GameEngine<TMove>;

  /**
   * Convert a typed move into a plain JSON-friendly object
   * suitable for database storage and wire transfer.
   */
  serializeMove(move: TMove): Record<string, unknown>;

  /**
   * Parse a plain JSON object back into the typed move format.
   */
  deserializeMove(data: Record<string, unknown>): TMove;
}

/**
 * Props that every board component receives from the match system.
 * Individual board components can extend this with game-specific props.
 */
export interface BoardProps<TMove = unknown> {
  engine: GameEngine<TMove>;
  lastMove: TMove | null;
  disabled: boolean;
  onMove: (move: TMove) => void;
}

/**
 * AI player interface. Given an engine state, returns a move.
 */
export interface AIPlayer<TMove = unknown> {
  getMove(engine: GameEngine<TMove>): Promise<{ move: TMove; reasoning: string }> | { move: TMove; reasoning: string };
}

/**
 * Full game definition registered in the game registry.
 */
export interface GameDefinition<TMove = unknown> {
  /** Unique key used in DB, URLs, etc. (e.g. 'hex', 'chess', 'connect4') */
  key: string;

  /** Human-readable name for UI display. */
  displayName: string;

  /** Create a fresh engine instance. */
  createEngine(opts?: GameEngineOptions): GameEngine<TMove>;

  /** React component that renders the board (resolved at render time, not stored here). */
  boardComponent?: React.ComponentType<any> | null;

  /** Default board size for this game. */
  defaultBoardSize: number;

  /** Whether board size is configurable by the user. */
  configurableBoardSize: boolean;

  /** Available board size options (if configurable). */
  boardSizeOptions?: Array<{ value: number; label: string }>;

  /** Whether this game supports the pie rule. */
  supportsPieRule: boolean;

  /** Whether this game supports ranked play. */
  supportsRanked: boolean;

  /** Create an AI player for the given difficulty. Returns null if AI not available. */
  createAI?(difficulty: string): AIPlayer<TMove> | null;

  /** Available AI difficulty levels. Empty array = no AI. */
  aiDifficulties: string[];
}

export interface GameEngineOptions {
  boardSize?: number;
  pieRule?: boolean;
  fen?: string;
  rules?: Record<string, unknown>;
}
