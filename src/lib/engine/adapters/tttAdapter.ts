import { TicTacToe } from '@/lib/ttt/engine';
import type { GameEngine } from '../types';

export type TttMove = number; // cell 0-8

export class TttAdapter implements GameEngine<TttMove> {
  readonly ttt: TicTacToe;

  constructor(ttt: TicTacToe) {
    this.ttt = ttt;
  }

  static create(): TttAdapter {
    return new TttAdapter(new TicTacToe());
  }

  currentPlayer(): 1 | 2 {
    return this.ttt.turn;
  }

  ply(): number {
    return this.ttt.ply;
  }

  isLegal(move: TttMove): boolean {
    return this.ttt.legal(move);
  }

  applyMove(move: TttMove): void {
    this.ttt.play(move);
  }

  winner(): 0 | 1 | 2 {
    return this.ttt.winner();
  }

  isDraw(): boolean {
    return this.ttt.isDraw();
  }

  isGameOver(): boolean {
    return this.ttt.winner() !== 0 || this.ttt.isDraw();
  }

  clone(): TttAdapter {
    return new TttAdapter(this.ttt.clone());
  }

  serializeMove(move: TttMove): Record<string, unknown> {
    return { cell: move };
  }

  deserializeMove(data: Record<string, unknown>): TttMove {
    return Number(data.cell);
  }
}
