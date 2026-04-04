import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLocalAIMatch, loadLocalAIMatch } from '../localAiMatch';

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
  });
  vi.stubGlobal('crypto', {
    randomUUID: () => '11111111-1111-1111-1111-111111111111',
  });
});

describe('browser-local AI matches', () => {
  it('creates a replayable local AI payload with game defaults', () => {
    const { id, payload } = createLocalAIMatch({
      difficulty: 'hard',
      gameKey: 'hex',
    });

    expect(id).toBe('local-ai-11111111-1111-1111-1111-111111111111');
    expect(payload).toEqual({
      isLocalAI: true,
      aiDifficulty: 'hard',
      boardSize: 11,
      gameKey: 'hex',
      playerName: undefined,
    });
    expect(loadLocalAIMatch(id)).toEqual(payload);
  });

  it('preserves explicit board size and player name overrides', () => {
    const { id } = createLocalAIMatch({
      difficulty: 'easy',
      gameKey: 'chess',
      boardSize: 10,
      playerName: '  Mira  ',
    });

    expect(loadLocalAIMatch(id)).toEqual({
      isLocalAI: true,
      aiDifficulty: 'easy',
      boardSize: 10,
      gameKey: 'chess',
      playerName: 'Mira',
    });
  });

  it('returns null for missing or corrupted storage', () => {
    expect(loadLocalAIMatch('local-ai-missing')).toBeNull();
    storage.set('openboard_local_ai_match:local-ai-bad', '{bad json');
    expect(loadLocalAIMatch('local-ai-bad')).toBeNull();
  });
});
