import type { InstalledMod, ModManifest } from '@/lib/mods/schema';
import { modManifestSchema } from '@/lib/mods/schema';

const STORAGE_KEY = 'openboard_mods_v1';

type Stored = { mods: InstalledMod[] };

function readStored(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { mods: [] };
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed || !Array.isArray(parsed.mods)) return { mods: [] };
    return parsed;
  } catch {
    return { mods: [] };
  }
}

function writeStored(next: Stored): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function listMods(): InstalledMod[] {
  return readStored().mods;
}

export function upsertMod(manifest: ModManifest): InstalledMod {
  const m = modManifestSchema.parse(manifest);
  const stored = readStored();
  const mods = stored.mods.filter((x) => x.manifest.id !== m.id);
  const installed: InstalledMod = { manifest: m, installedAt: new Date().toISOString() };
  mods.unshift(installed);
  writeStored({ mods });
  return installed;
}

export function removeMod(modId: string): void {
  const stored = readStored();
  writeStored({ mods: stored.mods.filter((x) => x.manifest.id !== modId) });
}

