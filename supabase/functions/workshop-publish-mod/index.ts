import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const gameKeySchema = z.enum(['hex', 'chess', 'checkers', 'ttt', 'connect4']);

// Minimal validation for the OpenBoard v1 manifest format used by the web client.
const manifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1).max(32),
  description: z.string().optional(),
  author: z.string().optional(),
  games: z.record(z.string(), z.object({ rules: z.unknown().optional() })).default({}),
});

const bodySchema = z.object({
  manifest: manifestSchema,
  // Optional: allow publishing just one game from a multi-game manifest.
  gameKey: gameKeySchema.optional(),
});

type Json = Record<string, unknown>;

function json(data: Json, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function pickRulesGames(manifest: z.infer<typeof manifestSchema>): Array<{ gameKey: z.infer<typeof gameKeySchema>; rules: unknown }> {
  const out: Array<{ gameKey: z.infer<typeof gameKeySchema>; rules: unknown }> = [];
  for (const k of Object.keys(manifest.games ?? {})) {
    const parsedKey = gameKeySchema.safeParse(k);
    if (!parsedKey.success) continue;
    const rules = (manifest.games as any)?.[k]?.rules;
    if (rules == null) continue;
    out.push({ gameKey: parsedKey.data, rules });
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userRes, error: userError } = await supabase.auth.getUser();
    const user = userRes?.user ?? null;
    if (userError || !user) return json({ error: 'Unauthorized' }, 401);

    const raw = await req.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return json({ error: 'Invalid input', details: parsed.error.format() }, 400);
    }

    const manifest = parsed.data.manifest;
    const manifestId = manifest.id;
    const name = manifest.name.trim();
    const description = manifest.description?.trim() || null;

    const allRulesGames = pickRulesGames(manifest);
    const requestedGameKey = parsed.data.gameKey;
    const targets = requestedGameKey
      ? allRulesGames.filter((g) => g.gameKey === requestedGameKey)
      : allRulesGames;

    if (targets.length === 0) {
      return json({ error: 'Manifest must include at least one game rules block (manifest.games[gameKey].rules).' }, 400);
    }

    const published: Array<{ modId: string; versionId: string; gameKey: string }> = [];

    for (const t of targets) {
      const gameKey = t.gameKey;
      const rules = t.rules;

      // Upsert mod row by (manifest_id, game_key).
      const { data: existing, error: exErr } = await supabase
        .from('workshop_mods' as any)
        .select('id, author_id')
        .eq('manifest_id', manifestId)
        .eq('game_key', gameKey)
        .maybeSingle();
      if (exErr) return json({ error: exErr.message }, 400);
      if (existing && existing.author_id !== user.id) {
        return json({ error: `Mod ${manifestId} for ${gameKey} already exists and is owned by a different author.` }, 403);
      }

      const now = new Date().toISOString();
      const { data: modRow, error: modErr } = await supabase
        .from('workshop_mods' as any)
        .upsert({
          id: existing?.id,
          manifest_id: manifestId,
          game_key: gameKey,
          name,
          description,
          author_id: user.id,
          rules: rules as any,
          is_published: true,
          updated_at: now,
        }, { onConflict: 'manifest_id,game_key' })
        .select('id')
        .single();
      if (modErr) return json({ error: modErr.message }, 400);

      const modId = modRow.id as string;

      const { data: verRow, error: verErr } = await supabase
        .from('workshop_mod_versions' as any)
        .upsert({
          mod_id: modId,
          version: manifest.version,
          manifest: manifest as any,
          rules: rules as any,
        }, { onConflict: 'mod_id,version' })
        .select('id')
        .single();
      if (verErr) return json({ error: verErr.message }, 400);

      const versionId = verRow.id as string;

      const { error: updErr } = await supabase
        .from('workshop_mods' as any)
        .update({ latest_version_id: versionId, rules: rules as any, updated_at: now })
        .eq('id', modId);
      if (updErr) return json({ error: updErr.message }, 400);

      published.push({ modId, versionId, gameKey });
    }

    return json({ ok: true, published });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return json({ error: msg }, 400);
  }
});

