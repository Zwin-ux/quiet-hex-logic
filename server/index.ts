import express, { Request, Response } from 'express';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { convertToModelMessages, gateway, stepCountIs, streamText, tool, type UIMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');
const indexHtmlPath = path.join(distDir, 'index.html');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;

  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});

function getEnv(name: string, fallbackName?: string): string {
  const primary = process.env[name]?.trim();
  if (primary) return primary;
  const fallback = fallbackName ? process.env[fallbackName]?.trim() : '';
  return fallback || '';
}

function getSupabaseConfig() {
  return {
    url: getEnv('SUPABASE_URL', 'VITE_SUPABASE_URL'),
    publishableKey: getEnv('SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY'),
  };
}

function createAuthedSupabaseClient(authHeader?: string) {
  const { url, publishableKey } = getSupabaseConfig();

  if (!url || !publishableKey) {
    throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required for chat context tools.');
  }

  return createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
  });
}

function selectLanguageModel() {
  if (process.env.OPENAI_API_KEY?.trim()) {
    return openai(getEnv('OPENAI_MODEL') || 'gpt-4.1-mini');
  }

  if (process.env.AI_GATEWAY_API_KEY?.trim()) {
    return gateway(getEnv('AI_MODEL') || 'openai/gpt-4.1-mini');
  }

  return null;
}

type ChatContext = {
  page?: string;
  matchId?: string;
  gameKey?: string;
  currentPly?: number;
  moveCount?: number;
};

function buildSystemPrompt(context?: ChatContext) {
  const pageHint = context?.page ? `Current surface: ${context.page}.` : 'Current surface: general product chat.';
  const gameHint = context?.gameKey ? `Game: ${context.gameKey}.` : 'Game unknown.';
  const moveHint =
    typeof context?.currentPly === 'number' && typeof context?.moveCount === 'number'
      ? `Replay scrubber is at ply ${context.currentPly} of ${context.moveCount}.`
      : 'No replay cursor provided.';

  return [
    'You are Hexology Coach, a concise tactical assistant inside a competitive board-game product.',
    'Speak like a strong analyst, not a generic support bot.',
    'Prefer concrete position ideas, move consequences, shape, tempo, risk, and winning plans over fluff.',
    'If you do not have enough board context, say exactly what is missing and ask one focused follow-up.',
    'When discussing a replay, reference momentum swings and what each side should care about next.',
    pageHint,
    gameHint,
    moveHint,
  ].join(' ');
}

const requestSchema = z.object({
  messages: z.array(z.custom<UIMessage>()).default([]),
  context: z
    .object({
      page: z.string().optional(),
      matchId: z.string().uuid().optional(),
      gameKey: z.string().optional(),
      currentPly: z.number().int().min(0).optional(),
      moveCount: z.number().int().min(0).optional(),
    })
    .optional(),
});

async function getReplayContext(matchId: string, authHeader?: string, currentPly?: number) {
  const supabase = createAuthedSupabaseClient(authHeader);

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select(`
      id,
      size,
      winner,
      pie_rule,
      created_at,
      game_key,
      players:match_players(
        color,
        is_bot,
        profile:profiles(username)
      )
    `)
    .eq('id', matchId)
    .maybeSingle();

  if (matchError) {
    throw new Error(matchError.message || 'Could not load match context.');
  }

  if (!match) {
    throw new Error('Match not found or not visible to this user.');
  }

  const { data: moves, error: movesError } = await supabase
    .from('moves')
    .select('ply, color, move, cell')
    .eq('match_id', matchId)
    .order('ply', { ascending: true })
    .limit(200);

  if (movesError) {
    throw new Error(movesError.message || 'Could not load move history.');
  }

  const cappedPly =
    typeof currentPly === 'number'
      ? Math.max(0, Math.min(currentPly, moves?.length ?? 0))
      : moves?.length ?? 0;

  const visibleMoves = (moves ?? []).slice(0, cappedPly);
  const lastMove = visibleMoves.at(-1) ?? null;

  return {
    match,
    moveCount: moves?.length ?? 0,
    visibleMoveCount: visibleMoves.length,
    lastMove,
    visibleMoves,
  };
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'hexology-railway-server',
    hasAiProvider: Boolean(selectLanguageModel()),
    hasSupabaseConfig: Boolean(getSupabaseConfig().url && getSupabaseConfig().publishableKey),
  });
});

app.post('/api/discord-token-exchange', async (req, res) => {
  const supabaseUrl = getEnv('SUPABASE_URL', 'VITE_SUPABASE_URL');

  if (!supabaseUrl) {
    res.status(500).json({ error: 'SUPABASE_URL is not configured.' });
    return;
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/discord-token-exchange`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req.body ?? {}),
  });

  const text = await response.text();
  res.status(response.status);
  res.type(response.headers.get('content-type') || 'application/json');
  res.send(text);
});

app.post('/api/chat', async (req: Request, res: Response) => {
  const model = selectLanguageModel();

  if (!model) {
    res.status(503).json({
      error: 'No AI provider configured. Set OPENAI_API_KEY or AI_GATEWAY_API_KEY on Railway.',
    });
    return;
  }

  try {
    const parsed = requestSchema.parse(req.body ?? {});
    const authHeader = req.header('authorization') ?? undefined;

    const result = streamText({
      model,
      system: buildSystemPrompt(parsed.context),
      messages: await convertToModelMessages(parsed.messages as Array<Omit<UIMessage, 'id'>>),
      stopWhen: stepCountIs(3),
      tools: {
        getReplayContext: tool({
          description: 'Load the current replay snapshot from Hexology so you can explain the visible game state precisely.',
          inputSchema: z.object({
            matchId: z.string().uuid(),
          }),
          execute: async ({ matchId }) => {
            return getReplayContext(matchId, authHeader, parsed.context?.currentPly);
          },
        }),
      },
    });

    result.pipeUIMessageStreamToResponse(res);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown chat error';
    res.status(500).json({ error: message });
  }
});

app.use(express.static(distDir, { index: false }));

app.get(/^(?!\/api(?:\/|$)).*/, async (_req, res) => {
  try {
    const html = await fs.readFile(indexHtmlPath, 'utf8');
    res.type('html').send(html);
  } catch {
    res.status(500).send('Build output not found. Run npm run build:railway first.');
  }
});

const port = Number.parseInt(process.env.PORT ?? '3001', 10);

app.listen(port, () => {
  console.log(`Hexology Railway server listening on port ${port}`);
});
