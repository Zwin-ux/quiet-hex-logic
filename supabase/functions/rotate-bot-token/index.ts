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

const schema = z.object({ botId: z.string().uuid() });

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

    const { data: bot, error: botErr } = await supabase
      .from('bots')
      .select('id, owner_profile_id')
      .eq('id', parsed.data.botId)
      .single();

    if (botErr || !bot) return json({ error: 'Bot not found' }, 404);
    if ((bot as any).owner_profile_id !== user.id) return json({ error: 'Forbidden' }, 403);

    // Invalidate all previous tokens for this bot (simple + safe).
    await supabase.from('bot_tokens').delete().eq('bot_id', parsed.data.botId);

    const rawToken = generateBotToken();
    const tokenHash = await sha256Hex(rawToken);
    const { error: tokErr } = await supabase
      .from('bot_tokens')
      .insert({ bot_id: parsed.data.botId, token_hash: tokenHash });

    if (tokErr) return json({ error: tokErr.message ?? 'Failed to rotate token' }, 500);

    return json({ success: true, token: rawToken });
  } catch (e) {
    console.error('rotate-bot-token error:', e);
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

