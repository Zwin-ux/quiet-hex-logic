import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createLocalMatch, loadLocalMatch, saveLocalMatch } from '../storage';

// Mock localStorage
const storage = new Map<string, string>();
beforeEach(() => {
  storage.clear();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
    removeItem: (key: string) => { storage.delete(key); },
  });
  // Mock crypto.randomUUID
  vi.stubGlobal('crypto', {
    randomUUID: () => '00000000-0000-0000-0000-000000000000',
  });
});

describe('Local Match Storage', () => {
  it('createLocalMatch creates with correct defaults for hex', () => {
    const match = createLocalMatch({ gameKey: 'hex' });
    expect(match.id).toMatch(/^local-/);
    expect(match.game_key).toBe('hex');
    expect(match.size).toBe(11);
    expect(match.pie_rule).toBe(true);
    expect(match.status).toBe('active');
    expect(match.turn).toBe(1);
    expect(match.winner).toBeNull();
    expect(match.moves).toEqual([]);
  });

  it('loadLocalMatch retrieves a saved match', () => {
    const match = createLocalMatch({ gameKey: 'ttt' });
    const loaded = loadLocalMatch(match.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.game_key).toBe('ttt');
    expect(loaded!.size).toBe(3);
    expect(loaded!.id).toBe(match.id);
  });

  it('loadLocalMatch returns null for nonexistent id', () => {
    expect(loadLocalMatch('local-nonexistent')).toBeNull();
  });

  it('saveLocalMatch persists updates', () => {
    const match = createLocalMatch({ gameKey: 'chess' });
    match.turn = 5;
    match.moves.push({ kind: 'chess', uci: 'e2e4' });
    saveLocalMatch(match);
    const loaded = loadLocalMatch(match.id);
    expect(loaded!.turn).toBe(5);
    expect(loaded!.moves.length).toBe(1);
  });

  it('corrupted JSON returns null instead of throwing', () => {
    const id = 'local-corrupted';
    storage.set(`openboard_local_match:${id}`, '{invalid json!!!');
    expect(loadLocalMatch(id)).toBeNull();
  });

  it('board sizes are correct per game', () => {
    const hexMatch = createLocalMatch({ gameKey: 'hex' });
    expect(hexMatch.size).toBe(11);

    // Reset mock UUID for unique IDs
    let counter = 1;
    vi.stubGlobal('crypto', {
      randomUUID: () => `00000000-0000-0000-0000-00000000000${counter++}`,
    });

    const chessMatch = createLocalMatch({ gameKey: 'chess' });
    expect(chessMatch.size).toBe(8);

    const tttMatch = createLocalMatch({ gameKey: 'ttt' });
    expect(tttMatch.size).toBe(3);

    const connect4Match = createLocalMatch({ gameKey: 'connect4' });
    expect(connect4Match.size).toBe(7);

    const checkersMatch = createLocalMatch({ gameKey: 'checkers' });
    expect(checkersMatch.size).toBe(8);
  });
});
