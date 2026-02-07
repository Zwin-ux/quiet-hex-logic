import { z } from 'zod';

export const gameKeySchema = z.enum(['hex', 'chess', 'checkers', 'ttt', 'connect4']);
export type GameKey = z.infer<typeof gameKeySchema>;

export const modManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().optional(),
  author: z.string().optional(),
  // v1: rules-only mods. Assets are reserved for later.
  games: z.record(gameKeySchema, z.object({
    rules: z.unknown().optional(),
  })).default({}),
});

export type ModManifest = z.infer<typeof modManifestSchema>;

export type InstalledMod = {
  manifest: ModManifest;
  installedAt: string;
};

