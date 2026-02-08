import { getGameOrNull } from '@/lib/engine/registry';

export type LocalGameKey = string;

export type LocalMatchStatus = 'active' | 'finished';

export type LocalMove = { move: Record<string, unknown> } | any;

export type LocalMatch = {
  id: string;
  game_key: LocalGameKey;
  created_at: string;
  status: LocalMatchStatus;
  turn: number; // 1-indexed ply (matches.supabase semantics)
  winner: 1 | 2 | null;
  result: 'p1' | 'p2' | 'draw' | null;
  size: number;
  pie_rule: boolean;
  is_ranked: false;
  rules: any | null;
  moves: LocalMove[];
};

function keyFor(id: string): string {
  return `openboard_local_match:${id}`;
}

export function createLocalMatch(opts: { gameKey: LocalGameKey; rules?: any | null; pieRule?: boolean }): LocalMatch {
  const id = `local-${crypto.randomUUID()}`;
  // v2: default sizing comes from the game registry when possible.
  const def = getGameOrNull(opts.gameKey);
  const size =
    def?.defaultBoardSize ??
    (opts.gameKey === 'hex' ? 11 : opts.gameKey === 'ttt' ? 3 : opts.gameKey === 'connect4' ? 7 : 8);
  const defaultPieRule = def?.supportsPieRule === true || opts.gameKey === 'hex';

  const pieRule = opts.pieRule;
  const match: LocalMatch = {
    id,
    game_key: opts.gameKey,
    created_at: new Date().toISOString(),
    status: 'active',
    turn: 1,
    winner: null,
    result: null,
    size,
    pie_rule: typeof pieRule === 'boolean' ? pieRule : defaultPieRule,
    is_ranked: false,
    rules: opts.rules ?? null,
    moves: [],
  };
  localStorage.setItem(keyFor(id), JSON.stringify(match));
  return match;
}

export function loadLocalMatch(id: string): LocalMatch | null {
  try {
    const raw = localStorage.getItem(keyFor(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalMatch;
    if (!parsed || parsed.id !== id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveLocalMatch(match: LocalMatch): void {
  localStorage.setItem(keyFor(match.id), JSON.stringify(match));
}

