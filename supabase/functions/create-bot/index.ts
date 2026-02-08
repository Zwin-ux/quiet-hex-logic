import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { generateBotToken, sha256Hex } from '../_shared/botAuth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const schema = z.object({
  name: z.string().min(1).max(64),
  // MVP runner is Hex-first; we still store per-game metadata for future.
  gameKey: z.enum(['hex', 'chess', 'checkers', 'ttt', 'connect4']).default('hex'),
  visibility: z.enum(['private', 'unlisted', 'public']).default('private'),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return json({ error: 'Invalid input', details: parsed.error.format() }, 400);

    // Ensure owner profile exists for anon users (handle_new_user trigger should do this)
    const { data: bot, error: botErr } = await supabase
      .from('bots')
      .insert({
        owner_profile_id: user.id,
        name: parsed.data.name,
        game_key: parsed.data.gameKey,
        visibility: parsed.data.visibility,
      })
      .select('*')
      .single();

    if (botErr || !bot) return json({ error: botErr?.message ?? 'Failed to create bot' }, 500);

    const rawToken = generateBotToken();
    const tokenHash = await sha256Hex(rawToken);

    const { error: tokErr } = await supabase
      .from('bot_tokens')
      .insert({ bot_id: bot.id, token_hash: tokenHash });

    if (tokErr) return json({ error: tokErr.message ?? 'Failed to issue token' }, 500);

    return json({
      success: true,
      bot,
      token: rawToken, // shown once
    });
  } catch (e) {
    console.error('create-bot error:', e);
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

