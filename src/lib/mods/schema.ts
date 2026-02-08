import { z } from 'zod';

// v2: allow arbitrary game keys (validated against the runtime registry during import).
export const gameKeySchema = z.string().min(1);
export type GameKey = z.infer<typeof gameKeySchema>;

export const modManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().optional(),
  author: z.string().optional(),
  // v1: rules-only mods. Assets are reserved for later.
  games: z.record(
    z.string().min(1),
    z.object({ rules: z.unknown().optional() })
  ).default({}),
});

export type ModManifest = z.infer<typeof modManifestSchema>;

export type InstalledMod = {
  manifest: ModManifest;
  installedAt: string;
};

