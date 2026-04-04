import type { AIDifficulty } from '@/lib/hex/simpleAI';
import { getGame } from '@/lib/engine/registry';

export type LocalAIInit = {
  isLocalAI: true;
  aiDifficulty: AIDifficulty;
  boardSize: number;
  gameKey: string;
  playerName?: string;
};

function keyFor(id: string): string {
  return `openboard_local_ai_match:${id}`;
}

export function createLocalAIMatch(opts: {
  difficulty: AIDifficulty;
  gameKey: string;
  boardSize?: number;
  playerName?: string;
}) {
  const game = getGame(opts.gameKey);
  const id = `local-ai-${crypto.randomUUID()}`;
  const payload: LocalAIInit = {
    isLocalAI: true,
    aiDifficulty: opts.difficulty,
    boardSize: opts.boardSize ?? game.defaultBoardSize,
    gameKey: opts.gameKey,
    playerName: opts.playerName?.trim() || undefined,
  };

  try {
    sessionStorage.setItem(keyFor(id), JSON.stringify(payload));
  } catch {
    // Storage can fail in privacy-restricted environments; routing state is enough.
  }

  return { id, payload };
}

export function loadLocalAIMatch(id: string): LocalAIInit | null {
  try {
    const raw = sessionStorage.getItem(keyFor(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalAIInit;
    if (!parsed?.isLocalAI) return null;
    return parsed;
  } catch {
    return null;
  }
}
