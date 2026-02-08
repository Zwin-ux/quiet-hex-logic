/**
 * Common interface for server-side game validators.
 *
 * Each game implements this to validate and apply moves on the server.
 * The validator reconstructs game state from move history and validates
 * new moves before applying them.
 */
export interface ServerValidator {
  /** Replay a single move from the database move record. */
  replayMove(moveRecord: any): void;

  /**
   * List legal moves for the current reconstructed position.
   * Returned values must be directly consumable by bot runners and/or clients.
   */
  listLegalMoves(): unknown[];

  /** Validate and apply a proposed move. Returns the move insert record. */
  applyProposedMove(
    move: unknown,
    cell: number | null | undefined,
    ctx: MoveContext,
  ): MoveResult;
}

export interface MoveContext {
  matchId: string;
  actionId: string;
  currentTurn: number;
  currentPlayerColor: 1 | 2;
}

export interface MoveResult {
  /** The move record to insert into the moves table. */
  moveInsert: any;
  /** Updated turn number. */
  newTurn: number;
  /** New match status. */
  newStatus: 'active' | 'finished';
  /** Winner (0 = no winner). */
  winner: 0 | 1 | 2;
  /** Result string for DB. */
  result: 'p1' | 'p2' | 'draw' | null;
}
