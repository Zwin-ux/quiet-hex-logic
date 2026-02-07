import { ChessEngine } from '@/lib/chess/engine';
import type { GameEngine, GameEngineOptions } from '../types';

export type ChessMove = { uci: string; promotion?: 'q' | 'r' | 'b' | 'n' };

export class ChessAdapter implements GameEngine<ChessMove> {
  readonly chess: ChessEngine;

  constructor(chess: ChessEngine) {
    this.chess = chess;
  }

  static create(opts?: GameEngineOptions): ChessAdapter {
    return new ChessAdapter(new ChessEngine(opts?.fen));
  }

  currentPlayer(): 1 | 2 {
    return this.chess.currentColorNumber();
  }

  ply(): number {
    // chess.js doesn't expose ply directly; we track via FEN halfmove
    // But for our purposes we can derive from the FEN move counters
    // However, the match system uses the `turn` field from the DB.
    // For the adapter, we'll use the FEN-based approach:
    const fen = this.chess.fen();
    const parts = fen.split(' ');
    const fullMoves = parseInt(parts[5] || '1', 10);
    const isBlack = parts[1] === 'b';
    return (fullMoves - 1) * 2 + (isBlack ? 1 : 0);
  }

  isLegal(move: ChessMove): boolean {
    return this.chess.legalUci(move.uci);
  }

  applyMove(move: ChessMove): void {
    this.chess.playUci(move.uci);
  }

  winner(): 0 | 1 | 2 {
    const result = this.chess.result();
    if (result === 'p1') return 1;
    if (result === 'p2') return 2;
    return 0;
  }

  isDraw(): boolean {
    return this.chess.result() === 'draw';
  }

  isGameOver(): boolean {
    return this.chess.isGameOver();
  }

  clone(): ChessAdapter {
    return new ChessAdapter(new ChessEngine(this.chess.fen()));
  }

  serializeMove(move: ChessMove): Record<string, unknown> {
    return { uci: move.uci, promotion: move.promotion };
  }

  deserializeMove(data: Record<string, unknown>): ChessMove {
    return {
      uci: String(data.uci),
      promotion: data.promotion as ChessMove['promotion'],
    };
  }
}
