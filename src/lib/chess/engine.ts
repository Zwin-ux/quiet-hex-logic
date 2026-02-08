import { Chess } from 'chess.js';

export type ChessColor = 'w' | 'b';
export type ChessResult = 'p1' | 'p2' | 'draw' | null;

export type UciMove = {
  uci: string;
  promotion?: 'q' | 'r' | 'b' | 'n';
};

const uciRegex = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

export function isUci(s: string): boolean {
  return uciRegex.test(s);
}

export function parseUci(uci: string): { from: string; to: string; promotion?: 'q' | 'r' | 'b' | 'n' } {
  if (!isUci(uci)) throw new Error(`Invalid UCI: ${uci}`);
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci.length === 5 ? uci[4] as 'q' | 'r' | 'b' | 'n' : undefined;
  return { from, to, promotion };
}

// Thin wrapper so the rest of the app doesn't depend on chess.js APIs directly.
export class ChessEngine {
  private chess: Chess;

  constructor(fen?: string) {
    this.chess = new Chess(fen);
  }

  fen(): string {
    return this.chess.fen();
  }

  turn(): ChessColor {
    return this.chess.turn();
  }

  // 1 = White, 2 = Black (keep parity with Hex turn math).
  currentColorNumber(): 1 | 2 {
    return this.turn() === 'w' ? 1 : 2;
  }

  isGameOver(): boolean {
    // chess.js exposes several helpers; this is enough for UI gating.
    return this.chess.isGameOver();
  }

  inCheck(): boolean {
    return this.chess.isCheck();
  }

  legalMovesFrom(square: string): Array<{ to: string; san: string; uci: string }> {
    const moves = this.chess.moves({ square: square as any, verbose: true });
    return moves.map((m) => ({
      to: m.to,
      san: m.san,
      uci: `${m.from}${m.to}${m.promotion ?? ''}`,
    }));
  }

  legalUci(uci: string): boolean {
    if (!isUci(uci)) return false;
    const { from } = parseUci(uci);
    return this.legalMovesFrom(from).some((m) => m.uci === uci);
  }

  playUci(uci: string): { san: string } {
    const { from, to, promotion } = parseUci(uci);
    const move = this.chess.move({ from: from as any, to: to as any, promotion });
    if (!move) throw new Error('Illegal move');
    return { san: move.san };
  }

  board(): ReturnType<Chess['board']> {
    return this.chess.board();
  }

  // Result mapping for backend. In UI we mostly just show "finished".
  result(): ChessResult {
    // chess.js v1.4.0 supports these conditions.
    if (!this.chess.isGameOver()) return null;
    if (this.chess.isCheckmate()) {
      // If it's checkmate, the side to move is checkmated, so the other side won.
      return this.turn() === 'w' ? 'p2' : 'p1';
    }
    // Stalemate, insufficient material, repetition, 50-move rule => draw.
    return 'draw';
  }
}

