import { describe, it, expect } from 'vitest';
import { HexAdapter } from '../hexAdapter';
import { ChessAdapter } from '../chessAdapter';
import { TttAdapter } from '../tttAdapter';
import { CheckersAdapter } from '../checkersAdapter';
import { Connect4Adapter } from '../connect4Adapter';

describe('HexAdapter', () => {
  it('serialize → deserialize round-trips', () => {
    const adapter = HexAdapter.create();
    const move = 42;
    const serialized = adapter.serializeMove(move);
    expect(adapter.deserializeMove(serialized)).toBe(42);
  });

  it('serialize → deserialize round-trips null (pie swap)', () => {
    const adapter = HexAdapter.create();
    const serialized = adapter.serializeMove(null);
    expect(adapter.deserializeMove(serialized)).toBeNull();
  });

  it('clone produces independent copy', () => {
    const adapter = HexAdapter.create();
    adapter.applyMove(0);
    const cloned = adapter.clone();
    cloned.applyMove(1);
    expect(adapter.ply()).toBe(1);
    expect(cloned.ply()).toBe(2);
  });

  it('isLegal returns true for valid and false for invalid', () => {
    const adapter = HexAdapter.create();
    expect(adapter.isLegal(0)).toBe(true);
    expect(adapter.isLegal(-1)).toBe(false);
  });

  it('applyMove advances ply and switches player', () => {
    const adapter = HexAdapter.create();
    expect(adapter.currentPlayer()).toBe(1);
    expect(adapter.ply()).toBe(0);
    adapter.applyMove(0);
    expect(adapter.currentPlayer()).toBe(2);
    expect(adapter.ply()).toBe(1);
  });
});

describe('ChessAdapter', () => {
  it('serialize → deserialize round-trips', () => {
    const adapter = ChessAdapter.create();
    const move = { uci: 'e2e4' };
    const serialized = adapter.serializeMove(move);
    const deserialized = adapter.deserializeMove(serialized);
    expect(deserialized.uci).toBe('e2e4');
  });

  it('clone produces independent copy', () => {
    const adapter = ChessAdapter.create();
    adapter.applyMove({ uci: 'e2e4' });
    const cloned = adapter.clone();
    cloned.applyMove({ uci: 'e7e5' });
    expect(adapter.ply()).toBe(1);
    expect(cloned.ply()).toBe(2);
  });

  it('isLegal returns true for valid and false for invalid', () => {
    const adapter = ChessAdapter.create();
    expect(adapter.isLegal({ uci: 'e2e4' })).toBe(true);
    expect(adapter.isLegal({ uci: 'e2e5' })).toBe(false);
  });

  it('applyMove advances ply and switches player', () => {
    const adapter = ChessAdapter.create();
    expect(adapter.currentPlayer()).toBe(1);
    adapter.applyMove({ uci: 'e2e4' });
    expect(adapter.currentPlayer()).toBe(2);
    expect(adapter.ply()).toBe(1);
  });

  it('isGameOver detects checkmate', () => {
    // Scholar's mate
    const adapter = ChessAdapter.create();
    adapter.applyMove({ uci: 'e2e4' });
    adapter.applyMove({ uci: 'e7e5' });
    adapter.applyMove({ uci: 'd1h5' });
    adapter.applyMove({ uci: 'b8c6' });
    adapter.applyMove({ uci: 'f1c4' });
    adapter.applyMove({ uci: 'g8f6' });
    adapter.applyMove({ uci: 'h5f7' });
    expect(adapter.isGameOver()).toBe(true);
    expect(adapter.winner()).toBe(1);
  });
});

describe('TttAdapter', () => {
  it('serialize → deserialize round-trips', () => {
    const adapter = TttAdapter.create();
    const move = 4;
    const serialized = adapter.serializeMove(move);
    expect(adapter.deserializeMove(serialized)).toBe(4);
  });

  it('clone produces independent copy', () => {
    const adapter = TttAdapter.create();
    adapter.applyMove(0);
    const cloned = adapter.clone();
    cloned.applyMove(1);
    expect(adapter.ply()).toBe(1);
    expect(cloned.ply()).toBe(2);
  });

  it('isLegal returns true for valid and false for invalid', () => {
    const adapter = TttAdapter.create();
    expect(adapter.isLegal(0)).toBe(true);
    adapter.applyMove(0);
    expect(adapter.isLegal(0)).toBe(false);
  });

  it('applyMove advances ply and switches player', () => {
    const adapter = TttAdapter.create();
    expect(adapter.currentPlayer()).toBe(1);
    adapter.applyMove(4);
    expect(adapter.currentPlayer()).toBe(2);
    expect(adapter.ply()).toBe(1);
  });

  it('isGameOver detects terminal states', () => {
    const adapter = TttAdapter.create();
    // P1 wins with top row: 0,1,2
    adapter.applyMove(0); // P1
    adapter.applyMove(3); // P2
    adapter.applyMove(1); // P1
    adapter.applyMove(4); // P2
    adapter.applyMove(2); // P1
    expect(adapter.isGameOver()).toBe(true);
    expect(adapter.winner()).toBe(1);
  });
});

describe('CheckersAdapter', () => {
  it('serialize → deserialize round-trips', () => {
    const adapter = CheckersAdapter.create();
    const move = { path: [40, 33] };
    const serialized = adapter.serializeMove(move);
    const deserialized = adapter.deserializeMove(serialized);
    expect(deserialized.path).toEqual([40, 33]);
  });

  it('clone produces independent copy', () => {
    const adapter = CheckersAdapter.create();
    adapter.applyMove({ path: [40, 33] });
    const cloned = adapter.clone();
    // P2 moves
    cloned.applyMove({ path: [17, 24] });
    expect(adapter.ply()).toBe(2);
    expect(cloned.ply()).toBe(3);
  });

  it('isLegal returns true for valid and false for invalid', () => {
    const adapter = CheckersAdapter.create();
    expect(adapter.isLegal({ path: [40, 33] })).toBe(true);
    expect(adapter.isLegal({ path: [0, 1] })).toBe(false);
  });

  it('applyMove advances ply and switches player', () => {
    const adapter = CheckersAdapter.create();
    expect(adapter.currentPlayer()).toBe(1);
    adapter.applyMove({ path: [40, 33] });
    expect(adapter.currentPlayer()).toBe(2);
    expect(adapter.ply()).toBe(2);
  });

  it('isGameOver is false at start', () => {
    const adapter = CheckersAdapter.create();
    expect(adapter.isGameOver()).toBe(false);
    expect(adapter.winner()).toBe(0);
  });
});

describe('Connect4Adapter', () => {
  it('serialize → deserialize round-trips', () => {
    const adapter = Connect4Adapter.create();
    const move = 3;
    const serialized = adapter.serializeMove(move);
    expect(adapter.deserializeMove(serialized)).toBe(3);
  });

  it('clone produces independent copy', () => {
    const adapter = Connect4Adapter.create();
    adapter.applyMove(0);
    const cloned = adapter.clone();
    cloned.applyMove(1);
    expect(adapter.ply()).toBe(1);
    expect(cloned.ply()).toBe(2);
  });

  it('isLegal returns true for valid and false for invalid', () => {
    const adapter = Connect4Adapter.create();
    expect(adapter.isLegal(0)).toBe(true);
    expect(adapter.isLegal(7)).toBe(false);
  });

  it('applyMove advances ply and switches player', () => {
    const adapter = Connect4Adapter.create();
    expect(adapter.currentPlayer()).toBe(1);
    adapter.applyMove(0);
    expect(adapter.currentPlayer()).toBe(2);
    expect(adapter.ply()).toBe(1);
  });

  it('isGameOver detects terminal states', () => {
    const adapter = Connect4Adapter.create();
    // P1 plays col 0 four times (with P2 in col 1)
    adapter.applyMove(0); // P1
    adapter.applyMove(1); // P2
    adapter.applyMove(0); // P1
    adapter.applyMove(1); // P2
    adapter.applyMove(0); // P1
    adapter.applyMove(1); // P2
    adapter.applyMove(0); // P1 - vertical 4
    expect(adapter.isGameOver()).toBe(true);
    expect(adapter.winner()).toBe(1);
  });
});
