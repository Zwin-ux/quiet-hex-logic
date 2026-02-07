import { z } from 'zod';
import type { ModManifest } from '@/lib/mods/schema';
import { gameKeySchema } from '@/lib/mods/schema';
import { ChessEngine } from '@/lib/chess/engine';

const hexRulesSchema = z.object({
  pieRule: z.boolean().optional(),
}).strict();

const chessRulesSchema = z.object({
  startFen: z.string().min(1).optional(),
}).strict();

const checkersRulesSchema = z.object({
  mandatoryCapture: z.boolean().optional(),
  draw: z.object({
    threefoldRepetition: z.boolean().optional(),
    noCaptureHalfMoves: z.number().int().min(1).max(500).optional(),
  }).optional(),
}).strict();

const tttRulesSchema = z.object({
  misere: z.boolean().optional(),
}).strict();

const connect4RulesSchema = z.object({
  connect: z.number().int().min(3).max(6).optional(),
}).strict();

const rulesSchemas = {
  hex: hexRulesSchema,
  chess: chessRulesSchema,
  checkers: checkersRulesSchema,
  ttt: tttRulesSchema,
  connect4: connect4RulesSchema,
} as const satisfies Record<string, z.ZodTypeAny>;

export function validateModManifest(manifest: ModManifest): void {
  // Validate per-game rules shapes and do a couple semantic checks (like FEN validity).
  for (const [gameKey, gameDef] of Object.entries(manifest.games ?? {})) {
    const parsedGameKey = gameKeySchema.safeParse(gameKey);
    if (!parsedGameKey.success) continue;
    const key = parsedGameKey.data;
    const rules = (gameDef as any)?.rules;
    if (rules == null) continue;

    // Require object rules (v1).
    if (typeof rules !== 'object' || Array.isArray(rules)) {
      throw new Error(`[${key}] rules must be a JSON object`);
    }

    const schema = (rulesSchemas as any)[key] as z.ZodTypeAny | undefined;
    if (!schema) continue;
    const res = schema.safeParse(rules);
    if (!res.success) {
      const first = res.error.issues[0];
      const path = first?.path?.length ? first.path.join('.') : 'rules';
      throw new Error(`[${key}] invalid ${path}: ${first.message}`);
    }

    // Semantic checks
    if (key === 'chess') {
      const fen = (rules as any).startFen;
      if (typeof fen === 'string' && fen.trim()) {
        try {
          // chess.js validates FEN on construction.
          new ChessEngine(fen);
        } catch (e: any) {
          throw new Error(`[chess] invalid startFen: ${e?.message ?? 'Invalid FEN'}`);
        }
      }
    }
  }
}

