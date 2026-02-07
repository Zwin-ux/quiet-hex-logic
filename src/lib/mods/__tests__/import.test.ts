import { describe, it, expect } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { importModFromFile } from '@/lib/mods/import';

function makeZip(files: Record<string, any>): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (const [name, json] of Object.entries(files)) {
    entries[name] = strToU8(JSON.stringify(json), true);
  }
  return zipSync(entries, { level: 9 });
}

describe('mods/import', () => {
  it('loads rules/connect4.json overlay even if manifest.games is empty', async () => {
    const zip = makeZip({
      'manifest.json': {
        id: 't',
        name: 'Test',
        version: '1.0.0',
        games: {},
      },
      'rules/connect4.json': { connect: 3 },
    });

    const file = new File([zip], 't.openboardmod', { type: 'application/octet-stream' });
    const manifest = await importModFromFile(file);

    expect((manifest.games as any).connect4).toBeTruthy();
    expect((manifest.games as any).connect4.rules).toEqual({ connect: 3 });
  });
});

