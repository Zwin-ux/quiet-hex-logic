import fs from 'node:fs';
import path from 'node:path';

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2);
    const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
    out[k] = v;
  }
  return out;
}

function pascalCase(s) {
  return String(s)
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join('');
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeFileIfMissing(p, content) {
  if (fs.existsSync(p)) die(`Refusing to overwrite existing file: ${p}`);
  fs.writeFileSync(p, content, 'utf8');
}

function patchFile(p, transform) {
  const before = fs.readFileSync(p, 'utf8');
  const after = transform(before);
  if (after === before) die(`Patch produced no changes for: ${p}`);
  fs.writeFileSync(p, after, 'utf8');
}

const args = parseArgs(process.argv.slice(2));
const key = (args.key || args.k || '').trim();
const name = (args.name || args.n || '').trim();

if (!key) die('Missing --key. Example: node scripts/scaffold-game.mjs --key centerwin --name "Center Win"');
if (!/^[a-z][a-z0-9]*$/.test(key)) die('Invalid --key. Use lowercase letters and digits only, starting with a letter. Example: centerwin');
if (!name) die('Missing --name. Example: --name "Center Win"');

const className = pascalCase(name);
const adapterClass = `${className}Adapter`;
const engineClass = `${className}Engine`;
const boardComponent = `${className}Board`;
const moveType = `${className}Move`;
const validatorClass = `${className}ServerValidator`;

const root = process.cwd();
const feEngineDir = path.join(root, 'src', 'lib', key);
const feAdapterPath = path.join(root, 'src', 'lib', 'engine', 'adapters', `${key}Adapter.ts`);
const feBoardDir = path.join(root, 'src', 'components', key);
const feBoardPath = path.join(feBoardDir, `${boardComponent}.tsx`);
const feEnginePath = path.join(feEngineDir, 'engine.ts');
const supaValidatorPath = path.join(root, 'supabase', 'functions', '_shared', 'validators', `${key}.ts`);

ensureDir(feEngineDir);
ensureDir(feBoardDir);
ensureDir(path.dirname(feAdapterPath));
ensureDir(path.dirname(supaValidatorPath));

writeFileIfMissing(
  feEnginePath,
  `export type ${moveType} = { cell: number };

// A tiny fully-working template game:
// - Players take turns claiming cells on an NxN board.
// - If you claim the center cell, you instantly win.
// - If the board fills with no center-claim, it's a draw.
//
// Replace this entire file with your real game rules.
export class ${engineClass} {
  readonly size: number;
  readonly board: Uint8Array;
  turn: 1 | 2 = 1;
  ply = 0;

  constructor(size = 8) {
    this.size = size;
    this.board = new Uint8Array(size * size);
  }

  clone(): ${engineClass} {
    const e = new ${engineClass}(this.size);
    e.board.set(this.board);
    e.turn = this.turn;
    e.ply = this.ply;
    return e;
  }

  private centerIndex(): number {
    const mid = Math.floor(this.size / 2);
    return mid * this.size + mid;
  }

  legal(move: ${moveType}): boolean {
    const cell = Number((move as any)?.cell);
    return Number.isInteger(cell) && cell >= 0 && cell < this.board.length && this.board[cell] === 0;
  }

  play(move: ${moveType}): void {
    if (!this.legal(move)) throw new Error('Illegal move');
    const cell = Number(move.cell);
    this.board[cell] = this.turn;
    this.ply += 1;
    this.turn = this.turn === 1 ? 2 : 1;
  }

  winner(): 0 | 1 | 2 {
    const c = this.board[this.centerIndex()];
    return (c === 1 || c === 2) ? (c as 1 | 2) : 0;
  }

  isDraw(): boolean {
    if (this.winner() !== 0) return false;
    for (let i = 0; i < this.board.length; i++) {
      if (this.board[i] === 0) return false;
    }
    return true;
  }

  isGameOver(): boolean {
    return this.winner() !== 0 || this.isDraw();
  }
}
`
);

writeFileIfMissing(
  feAdapterPath,
  `import type { GameEngine, GameEngineOptions } from '../types';
import { ${engineClass}, type ${moveType} } from '@/lib/${key}/engine';

export type { ${moveType} };

export class ${adapterClass} implements GameEngine<${moveType}> {
  readonly engine: ${engineClass};

  constructor(engine: ${engineClass}) {
    this.engine = engine;
  }

  static create(opts?: GameEngineOptions): ${adapterClass} {
    const size = opts?.boardSize ?? 8;
    return new ${adapterClass}(new ${engineClass}(size));
  }

  currentPlayer(): 1 | 2 {
    return this.engine.turn;
  }

  ply(): number {
    return this.engine.ply;
  }

  isLegal(move: ${moveType}): boolean {
    return this.engine.legal(move);
  }

  applyMove(move: ${moveType}): void {
    this.engine.play(move);
  }

  winner(): 0 | 1 | 2 {
    return this.engine.winner();
  }

  isDraw(): boolean {
    return this.engine.isDraw();
  }

  isGameOver(): boolean {
    return this.engine.isGameOver();
  }

  clone(): ${adapterClass} {
    return new ${adapterClass}(this.engine.clone());
  }

  serializeMove(move: ${moveType}): Record<string, unknown> {
    return { cell: Number(move.cell) };
  }

  deserializeMove(data: Record<string, unknown>): ${moveType} {
    return { cell: Number((data as any).cell) };
  }
}
`
);

writeFileIfMissing(
  feBoardPath,
  `import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import type { ${adapterClass}, ${moveType} } from '@/lib/engine/adapters/${key}Adapter';

export default function ${boardComponent}(props: {
  engine: ${adapterClass};
  matchSize: number;
  lastMove: ${moveType} | null;
  disabled: boolean;
  onMove: (move: ${moveType}) => void;
}) {
  const { engine, matchSize, lastMove, disabled, onMove } = props;
  const raw = (engine as any).engine;
  const size = Number.isInteger(matchSize) ? matchSize : raw.size;

  const cells = useMemo(() => {
    const out = [];
    for (let i = 0; i < size * size; i++) out.push(i);
    return out;
  }, [size]);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-full max-w-[560px] aspect-square grid gap-1" style={{ gridTemplateColumns: \`repeat(\${size}, minmax(0, 1fr))\` }}>
        {cells.map((i) => {
          const v = raw.board[i];
          const isLast = lastMove?.cell === i;
          return (
            <Button
              key={i}
              type="button"
              variant="outline"
              disabled={disabled || v !== 0}
              onClick={() => onMove({ cell: i })}
              className={\`h-full w-full p-0 rounded-md font-mono text-xs \${isLast ? 'ring-2 ring-primary' : ''}\`}
            >
              {v === 1 ? '1' : v === 2 ? '2' : ''}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
`
);

writeFileIfMissing(
  supaValidatorPath,
  `import type { ServerValidator, MoveContext, MoveResult } from './types.ts';

export class ${validatorClass} implements ServerValidator {
  private size: number;
  private board: (0 | 1 | 2)[];
  private turn: number;

  constructor(size: number) {
    this.size = size;
    this.board = Array(size * size).fill(0) as (0 | 1 | 2)[];
    this.turn = 1;
  }

  private centerIndex(): number {
    const mid = Math.floor(this.size / 2);
    return mid * this.size + mid;
  }

  private legal(cell: number): boolean {
    return Number.isInteger(cell) && cell >= 0 && cell < this.board.length && this.board[cell] === 0;
  }

  private play(cell: number): void {
    if (!this.legal(cell)) throw new Error('Illegal move');
    const color = this.turn % 2 === 1 ? 1 : 2;
    this.board[cell] = color as 1 | 2;
    this.turn += 1;
  }

  private winner(): 0 | 1 | 2 {
    const c = this.board[this.centerIndex()];
    return (c === 1 || c === 2) ? (c as 1 | 2) : 0;
  }

  private isDraw(): boolean {
    if (this.winner() !== 0) return false;
    return this.board.every((x) => x !== 0);
  }

  replayMove(moveRecord: any): void {
    const cell = (moveRecord?.move as any)?.cell;
    if (cell === undefined || cell === null) return;
    this.play(Number(cell));
  }

  listLegalMoves(): unknown[] {
    const out: any[] = [];
    for (let i = 0; i < this.board.length; i++) {
      if (this.board[i] === 0) out.push({ kind: '${key}', cell: i });
    }
    return out;
  }

  applyProposedMove(move: unknown, _cell: number | null | undefined, ctx: MoveContext): MoveResult {
    const cell = (move as any)?.cell;
    if (cell === undefined || cell === null) throw new Error('Missing cell');

    if (!this.legal(Number(cell))) throw new Error('Illegal move');
    this.play(Number(cell));

    const w = this.winner();
    let newStatus: 'active' | 'finished' = 'active';
    let winner: 0 | 1 | 2 = 0;
    let result: 'p1' | 'p2' | 'draw' | null = null;

    if (w) {
      newStatus = 'finished';
      winner = w;
      result = winner === 1 ? 'p1' : 'p2';
    } else if (this.isDraw()) {
      newStatus = 'finished';
      result = 'draw';
    }

    return {
      moveInsert: {
        match_id: ctx.matchId,
        ply: ctx.currentTurn,
        color: ctx.currentPlayerColor,
        cell: null,
        move: { cell: Number(cell) },
        notation: null,
        action_id: ctx.actionId,
      },
      newTurn: this.turn,
      newStatus,
      winner,
      result,
    };
  }
}
`
);

// Patch FE registry: import + registerGame.
patchFile(path.join(root, 'src', 'lib', 'engine', 'registry.ts'), (src) => {
  if (src.includes(`key: '${key}'`)) die(`registry.ts already contains game key '${key}'`);

  const importNeedle = `import { Connect4Adapter } from './adapters/connect4Adapter';`;
  if (!src.includes(importNeedle)) die('Unexpected registry.ts format (missing Connect4Adapter import).');

  const insertImports =
    `${importNeedle}\n` +
    `import { ${adapterClass} } from './adapters/${key}Adapter';\n`;
  src = src.replace(importNeedle, insertImports);

  const boardImportNeedle = `import { Connect4BoardGame } from '@/components/gameBoards/Connect4BoardGame';`;
  if (!src.includes(boardImportNeedle)) die('Unexpected registry.ts format (missing Connect4BoardGame import).');

  const boardInsert =
    `${boardImportNeedle}\n` +
    `import ${boardComponent} from '@/components/${key}/${boardComponent}';\n`;
  src = src.replace(boardImportNeedle, boardInsert);

  const appendNeedle = `registerGame({\n  key: 'connect4',`;
  const idx = src.indexOf(appendNeedle);
  if (idx === -1) die('Unexpected registry.ts format (missing connect4 registration).');

  // Append after the last registerGame block.
  const last = src.lastIndexOf('registerGame({');
  if (last === -1) die('Unexpected registry.ts format (no registerGame blocks).');

  return (
    src +
    `\n\nregisterGame({\n` +
    `  key: '${key}',\n` +
    `  displayName: '${name.replace(/'/g, "\\'")}',\n` +
    `  createEngine: (opts) => ${adapterClass}.create(opts),\n` +
    `  boardComponent: ${boardComponent},\n` +
    `  defaultBoardSize: 8,\n` +
    `  configurableBoardSize: true,\n` +
    `  boardSizeOptions: [\n` +
    `    { value: 6, label: '6x6 - Quick' },\n` +
    `    { value: 8, label: '8x8 - Standard' },\n` +
    `    { value: 10, label: '10x10 - Big' },\n` +
    `  ],\n` +
    `  supportsPieRule: false,\n` +
    `  supportsRanked: false,\n` +
    `  aiDifficulties: [],\n` +
    `});\n`
  );
});

// Patch Supabase validator factory.
patchFile(path.join(root, 'supabase', 'functions', '_shared', 'gameValidators.ts'), (src) => {
  if (src.includes(`'${key}'`)) die(`gameValidators.ts already contains game key '${key}'`);

  const importNeedle = `import { Connect4ServerValidator } from './validators/connect4.ts';`;
  if (!src.includes(importNeedle)) die('Unexpected gameValidators.ts format (missing Connect4ServerValidator import).');
  src = src.replace(importNeedle, `${importNeedle}\nimport { ${validatorClass} } from './validators/${key}.ts';`);

  const switchNeedle = `    case 'connect4': {`;
  const pos = src.indexOf(switchNeedle);
  if (pos === -1) die('Unexpected gameValidators.ts format (missing connect4 case).');

  // Insert a new case right before default.
  const defaultNeedle = `    default: {`;
  const defPos = src.indexOf(defaultNeedle);
  if (defPos === -1) die('Unexpected gameValidators.ts format (missing default case).');

  const insert = `    case '${key}': {\n      const n = Number.isInteger((match as any).size) ? Number((match as any).size) : 8;\n      return new ${validatorClass}(n);\n    }\n`;

  return src.slice(0, defPos) + insert + src.slice(defPos);
});

// Patch Supabase defaults map.
patchFile(path.join(root, 'supabase', 'functions', '_shared', 'gameDefaults.ts'), (src) => {
  if (src.includes(`  ${key}:`)) die(`gameDefaults.ts already contains game key '${key}'`);
  const mapNeedle = `  connect4: { boardSize: 7, pieRule: false, competitiveSize: 7 },`;
  if (!src.includes(mapNeedle)) die('Unexpected gameDefaults.ts format (missing connect4 defaults).');
  return src.replace(
    mapNeedle,
    `${mapNeedle}\n  ${key}: { boardSize: 8, pieRule: false, competitiveSize: 8 },`
  );
});

console.log(`Scaffolded game '${key}' (${name}).`);
console.log(`- FE engine: src/lib/${key}/engine.ts`);
console.log(`- FE adapter: src/lib/engine/adapters/${key}Adapter.ts`);
console.log(`- FE board: src/components/${key}/${boardComponent}.tsx`);
console.log(`- Server validator: supabase/functions/_shared/validators/${key}.ts`);
console.log(`Next: run npm run typecheck && npm test, then deploy Supabase functions and Vercel.`);
