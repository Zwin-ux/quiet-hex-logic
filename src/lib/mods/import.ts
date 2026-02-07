import { unzipSync, strFromU8 } from 'fflate';
import { modManifestSchema, type ModManifest } from '@/lib/mods/schema';

async function readFileText(file: File): Promise<string> {
  return await file.text();
}

async function readFileBytes(file: File): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();
  return new Uint8Array(buf);
}

function getZipText(files: Record<string, Uint8Array>, path: string): string | null {
  const entry = files[path] ?? files[path.replace(/^[./]+/, '')];
  if (!entry) return null;
  return strFromU8(entry);
}

export async function importModFromFile(file: File): Promise<ModManifest> {
  const lower = file.name.toLowerCase();

  if (lower.endsWith('.json')) {
    const raw = await readFileText(file);
    const json = JSON.parse(raw);
    return modManifestSchema.parse(json);
  }

  if (lower.endsWith('.zip') || lower.endsWith('.openboardmod')) {
    const bytes = await readFileBytes(file);
    const files = unzipSync(bytes);

    const manifestText =
      getZipText(files, 'manifest.json') ??
      getZipText(files, './manifest.json') ??
      getZipText(files, 'mod.json') ??
      null;
    if (!manifestText) throw new Error('Zip is missing manifest.json');

    const manifest = modManifestSchema.parse(JSON.parse(manifestText));

    // Optional per-game rule overlays: rules/<game>.json
    const games = { ...(manifest.games ?? {}) } as any;
    for (const gameKey of Object.keys(games)) {
      // keep existing inline rules
    }

    const rulePaths = [
      ['hex', 'rules/hex.json'],
      ['chess', 'rules/chess.json'],
      ['checkers', 'rules/checkers.json'],
      ['ttt', 'rules/ttt.json'],
    ] as const;

    for (const [gameKey, p] of rulePaths) {
      const txt = getZipText(files, p);
      if (!txt) continue;
      const rules = JSON.parse(txt);
      games[gameKey] = { ...(games[gameKey] ?? {}), rules };
    }

    return modManifestSchema.parse({ ...manifest, games });
  }

  throw new Error('Unsupported mod file type (expected .json or .zip)');
}

