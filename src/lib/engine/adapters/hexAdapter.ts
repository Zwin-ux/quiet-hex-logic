import { Hex } from '@/lib/hex/engine';
import type { GameEngine, GameEngineOptions } from '../types';

/** Hex move: cell index (number) for placement, null for pie swap. */
export type HexMove = number | null;

export class HexAdapter implements GameEngine<HexMove> {
  readonly hex: Hex;

  constructor(hex: Hex) {
    this.hex = hex;
  }

  static create(opts?: GameEngineOptions): HexAdapter {
    const size = opts?.boardSize ?? 11;
    const pieRule = opts?.pieRule ?? true;
    return new HexAdapter(new Hex(size, pieRule));
  }

  currentPlayer(): 1 | 2 {
    return this.hex.turn;
  }

  ply(): number {
    return this.hex.ply;
  }

  isLegal(move: HexMove): boolean {
    return this.hex.legal(move);
  }

  applyMove(move: HexMove): void {
    this.hex.play(move);
  }

  winner(): 0 | 1 | 2 {
    return this.hex.winner();
  }

  isDraw(): boolean {
    // Hex cannot end in a draw
    return false;
  }

  isGameOver(): boolean {
    return this.hex.winner() !== 0;
  }

  clone(): HexAdapter {
    return new HexAdapter(this.hex.clone());
  }

  serializeMove(move: HexMove): Record<string, unknown> {
    return { cell: move };
  }

  deserializeMove(data: Record<string, unknown>): HexMove {
    const cell = data.cell;
    if (cell === null || cell === undefined) return null;
    return Number(cell);
  }
}
