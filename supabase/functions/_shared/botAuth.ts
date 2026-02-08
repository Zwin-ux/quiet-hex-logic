import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

export type BotAuth = {
  botId: string;
  ownerProfileId: string;
  gameKey: string;
  botName: string;
};

export function parseBotToken(req: Request): string | null {
  const auth = req.headers.get('Authorization') ?? '';
  const lower = auth.toLowerCase();
  if (lower.startsWith('bot ')) return auth.slice(4).trim();
  // Allow x-bot-token for convenience in local tooling.
  const x = req.headers.get('x-bot-token');
  if (x && x.trim()) return x.trim();
  return null;
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex;
}

export function generateBotToken(bytes = 32): string {
  const raw = new Uint8Array(bytes);
  crypto.getRandomValues(raw);
  // base64url without padding
  const b64 = btoa(String.fromCharCode(...raw))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  return `hxly_bot_${b64}`;
}

export async function authenticateBot(
  supabase: SupabaseClient,
  token: string,
): Promise<BotAuth | null> {
  const tokenHash = await sha256Hex(token);
  const { data, error } = await supabase
    .from('bot_tokens')
    .select('bot_id, bots!inner(id, owner_profile_id, game_key, name)')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (error || !data) return null;

  // Update last_used_at opportunistically (ignore errors)
  try {
    await supabase
      .from('bot_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('bot_id', (data as any).bot_id)
      .eq('token_hash', tokenHash);
  } catch {
    // ignore
  }

  const bot = (data as any).bots;
  return {
    botId: bot.id,
    ownerProfileId: bot.owner_profile_id,
    gameKey: bot.game_key ?? 'hex',
    botName: bot.name,
  };
}

