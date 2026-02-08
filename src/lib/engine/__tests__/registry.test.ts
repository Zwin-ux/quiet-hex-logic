import { describe, it, expect } from 'vitest';
import { getGame, getGameOrNull, listGameKeys, listGames, createEngine } from '../registry';

describe('Game Registry', () => {
  it('getGame returns hex definition', () => {
    const def = getGame('hex');
    expect(def.key).toBe('hex');
    expect(def.displayName).toBe('Hex');
    expect(def.defaultBoardSize).toBe(11);
  });

  it('getGame throws for unknown key', () => {
    expect(() => getGame('unknown_game')).toThrow('Unknown game: unknown_game');
  });

  it('getGameOrNull returns undefined for unknown key', () => {
    expect(getGameOrNull('nonexistent')).toBeUndefined();
  });

  it('listGameKeys returns all 5 game keys', () => {
    const keys = listGameKeys();
    expect(keys).toContain('hex');
    expect(keys).toContain('chess');
    expect(keys).toContain('ttt');
    expect(keys).toContain('checkers');
    expect(keys).toContain('connect4');
    expect(keys.length).toBe(5);
  });

  it('listGames returns all 5 definitions', () => {
    const games = listGames();
    expect(games.length).toBe(5);
    const keys = games.map(g => g.key);
    expect(keys).toContain('hex');
    expect(keys).toContain('chess');
  });

  it('createEngine returns a working hex engine', () => {
    const engine = createEngine('hex');
    expect(engine.currentPlayer()).toBe(1);
    expect(engine.ply()).toBe(0);
    expect(engine.winner()).toBe(0);
    expect(engine.isGameOver()).toBe(false);
  });

  it('createEngine respects boardSize option for hex', () => {
    const engine = createEngine('hex', { boardSize: 7 });
    // 7x7 board: cell 0 should be legal
    expect(engine.isLegal(0)).toBe(true);
    // cell 48 (7*7-1) should also be legal
    expect(engine.isLegal(48)).toBe(true);
    // cell 49 (out of range) should not be
    expect(engine.isLegal(49)).toBe(false);
  });
});
