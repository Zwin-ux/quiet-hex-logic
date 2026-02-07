import { Connect4 } from '@/lib/connect4/engine';
import type { GameEngine, GameEngineOptions } from '../types';

export type Connect4Move = number; // column 0-6

export class Connect4Adapter implements GameEngine<Connect4Move> {
  readonly c4: Connect4;

  constructor(c4: Connect4) {
    this.c4 = c4;
  }

  static create(opts?: GameEngineOptions): Connect4Adapter {
    const cols = opts?.boardSize ?? 7;
    const connect = (opts?.rules as any)?.connect;
    return new Connect4Adapter(new Connect4(cols, 6, typeof connect === 'number' ? connect : 4));
  }

  currentPlayer(): 1 | 2 {
    return this.c4.turn;
  }

  ply(): number {
    return this.c4.ply;
  }

  isLegal(move: Connect4Move): boolean {
    return this.c4.legal(move);
  }

  applyMove(move: Connect4Move): void {
    this.c4.play(move);
  }

  winner(): 0 | 1 | 2 {
    return this.c4.winner();
  }

  isDraw(): boolean {
    return this.c4.isDraw();
  }

  isGameOver(): boolean {
    return this.c4.isGameOver();
  }

  clone(): Connect4Adapter {
    return new Connect4Adapter(this.c4.clone());
  }

  serializeMove(move: Connect4Move): Record<string, unknown> {
    return { col: move };
  }

  deserializeMove(data: Record<string, unknown>): Connect4Move {
    return Number(data.col);
  }
}
