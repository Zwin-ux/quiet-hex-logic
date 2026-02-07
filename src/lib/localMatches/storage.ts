export type LocalGameKey = 'hex' | 'chess' | 'ttt' | 'checkers' | 'connect4';

export type LocalMatchStatus = 'active' | 'finished';

export type LocalMove =
  | { kind: 'hex'; cell: number | null }
  | { kind: 'chess'; uci: string }
  | { kind: 'ttt'; cell: number }
  | { kind: 'checkers'; path: number[] }
  | { kind: 'connect4'; col: number };

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
  const sizeMap: Record<LocalGameKey, number> = { hex: 11, chess: 8, checkers: 8, ttt: 3, connect4: 7 };
  const size = sizeMap[opts.gameKey] ?? 8;
  const defaultPieRule = opts.gameKey === 'hex';
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

