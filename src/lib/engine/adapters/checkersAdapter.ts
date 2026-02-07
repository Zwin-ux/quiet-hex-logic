import { CheckersEngine } from '@/lib/checkers/engine';
import type { CheckersMove } from '@/lib/checkers/engine';
import type { GameEngine, GameEngineOptions } from '../types';

export type { CheckersMove };

export class CheckersAdapter implements GameEngine<CheckersMove> {
  readonly checkers: CheckersEngine;

  constructor(checkers: CheckersEngine) {
    this.checkers = checkers;
  }

  static create(opts?: GameEngineOptions): CheckersAdapter {
    return new CheckersAdapter(new CheckersEngine(opts?.rules as any));
  }

  currentPlayer(): 1 | 2 {
    return this.checkers.turn;
  }

  ply(): number {
    return this.checkers.ply;
  }

  isLegal(move: CheckersMove): boolean {
    return this.checkers.legalMove(move);
  }

  applyMove(move: CheckersMove): void {
    this.checkers.play(move);
  }

  winner(): 0 | 1 | 2 {
    return this.checkers.winner();
  }

  isDraw(): boolean {
    return this.checkers.result() === 'draw';
  }

  isGameOver(): boolean {
    return this.checkers.result() !== null;
  }

  clone(): CheckersAdapter {
    return new CheckersAdapter(this.checkers.clone());
  }

  serializeMove(move: CheckersMove): Record<string, unknown> {
    return { path: move.path };
  }

  deserializeMove(data: Record<string, unknown>): CheckersMove {
    const path = data.path as number[];
    return { path: path.map((x) => Number(x)) };
  }
}
