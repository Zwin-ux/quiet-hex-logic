export type GameDefaults = {
  /** Used by lobbies/tournaments as the default "size" value in DB. */
  boardSize: number;
  /** Whether pie swap is enabled (only meaningful for Hex-like games). */
  pieRule: boolean;
  /** Default match size for competitive matchmaking. */
  competitiveSize: number;
};

export const GAME_DEFAULTS: Record<string, GameDefaults> = {
  hex: { boardSize: 11, pieRule: true, competitiveSize: 13 },
  chess: { boardSize: 8, pieRule: false, competitiveSize: 8 },
  checkers: { boardSize: 8, pieRule: false, competitiveSize: 8 },
  ttt: { boardSize: 3, pieRule: false, competitiveSize: 3 },
  // For connect4, `boardSize` stores columns (standard 7x6 => 7).
  connect4: { boardSize: 7, pieRule: false, competitiveSize: 7 },
};

export function defaultsForGame(gameKey: string): GameDefaults {
  return GAME_DEFAULTS[gameKey] ?? { boardSize: 8, pieRule: false, competitiveSize: 8 };
}

