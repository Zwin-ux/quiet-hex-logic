import express, { Request, Response } from 'express';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash, randomBytes, randomUUID, verify } from 'node:crypto';

import { convertToModelMessages, gateway, stepCountIs, streamText, tool, type UIMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createClient } from '@supabase/supabase-js';
import { verifySiweMessage } from '@worldcoin/minikit-js/siwe';
import type { WalletAuthResult } from '@worldcoin/minikit-js/commands';
import { signRequest } from '@worldcoin/idkit/signing';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');
const indexHtmlPath = path.join(distDir, 'index.html');

export const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

function normalizeOrigin(value: string): string {
  return new URL(value).origin;
}

function isAllowedOrigin(origin: string): boolean {
  try {
    const normalizedOrigin = normalizeOrigin(origin);
    const configuredAppUrl = getEnv('VITE_PUBLIC_APP_URL', 'PUBLIC_APP_URL');
    const configuredApiBase = getEnv('VITE_API_BASE_URL', 'API_BASE_URL');

    if (configuredAppUrl && normalizedOrigin === normalizeOrigin(configuredAppUrl)) {
      return true;
    }

    if (configuredApiBase && normalizedOrigin === normalizeOrigin(configuredApiBase)) {
      return true;
    }

    if (process.env.NODE_ENV !== 'production') {
      const hostname = new URL(normalizedOrigin).hostname;
      return hostname === 'localhost' || hostname === '127.0.0.1';
    }
  } catch {
    return false;
  }

  return false;
}

function extractBearerToken(authHeader?: string): string {
  const raw = authHeader?.trim() ?? '';
  const prefix = 'Bearer ';
  if (!raw.startsWith(prefix)) return '';
  return raw.slice(prefix.length).trim();
}

async function requireAuthedUser(authHeader?: string) {
  const token = extractBearerToken(authHeader);
  if (!token) return null;

  const { url, publishableKey } = getSupabaseConfig();
  if (!url || !publishableKey) return null;

  const authClient = createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  return data.user;
}

app.use('/api', (req, res, next) => {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : '';

  if (origin) {
    if (!isAllowedOrigin(origin)) {
      res.status(403).json({ error: 'Origin not allowed.' });
      return;
    }

    res.setHeader('Access-Control-Allow-Origin', normalizeOrigin(origin));
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

function getSupabaseAdminConfig() {
  return {
    url: getEnv('SUPABASE_URL', 'VITE_SUPABASE_URL'),
    serviceRoleKey: getEnv('SUPABASE_SERVICE_ROLE_KEY'),
  };
}

function createAuthedSupabaseClient(authHeader?: string) {
  const { url, publishableKey } = getSupabaseConfig();

  if (!url || !publishableKey) {
    throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required for authenticated API tools.');
  }

  return createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
  });
}

function createServiceSupabaseClient() {
  const { url, serviceRoleKey } = getSupabaseAdminConfig();

  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for World App endpoints.');
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getWorldAppId() {
  return getEnv('WORLD_APP_ID', 'VITE_WORLD_APP_ID') || getEnv('WORLD_ID_APP_ID', 'VITE_WORLD_ID_APP_ID');
}

function getWorldIdAction() {
  return getEnv('WORLD_ID_ACTION', 'VITE_WORLD_ID_ACTION') || 'verify-board-player';
}

function createWorldNonce() {
  return randomBytes(24).toString('hex');
}

function normalizeWalletAddress(address: string) {
  return address.trim().toLowerCase();
}

function sanitizeWorldText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function asMetadataRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

const SOLANA_BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const SOLANA_PUBLIC_KEY_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

type SolanaRoomPassScope = 'single_room' | 'event_series' | 'seasonal';
type SolanaCompetitiveAccessMode = 'open' | 'pass_required' | 'invite_only';
type SolanaReceiptStatus = 'pending' | 'issued' | 'disputed' | 'finalized';

type SolanaLinkedWallet = {
  provider: 'solana';
  address: string;
  linkedAt: string;
};

type SolanaRoomPass = {
  id: string;
  label: string;
  scope: SolanaRoomPassScope;
  accessMode: SolanaCompetitiveAccessMode;
  gameKey: string | null;
  worldId: string | null;
  tournamentId: string | null;
  status: SolanaReceiptStatus;
  issuedAt: string;
};

type SolanaMatchReceipt = {
  id: string;
  matchId: string;
  gameKey: string;
  worldId: string | null;
  tournamentId: string | null;
  status: SolanaReceiptStatus;
  outcome: 'win' | 'loss' | 'draw' | null;
  ratingChange: number | null;
  issuedAt: string;
};

type SolanaCompetitiveMetadata = {
  linkedWallet: SolanaLinkedWallet | null;
  roomPasses: SolanaRoomPass[];
  matchReceipts: SolanaMatchReceipt[];
};

type SolanaTournamentEntry = {
  tournamentId: string;
  name: string;
  gameKey: string | null;
  status: 'pass_required' | 'pass_ready' | 'joined' | 'receipt_issued';
  startTime: string | null;
  receiptCount: number;
};

function decodeBase58(value: string) {
  if (!value.trim()) {
    throw new Error('Empty base58 value.');
  }

  const bytes = [0];
  for (const char of value.trim()) {
    const digit = SOLANA_BASE58_ALPHABET.indexOf(char);
    if (digit < 0) {
      throw new Error('Invalid base58 character.');
    }

    let carry = digit;
    for (let index = 0; index < bytes.length; index += 1) {
      const next = bytes[index] * 58 + carry;
      bytes[index] = next & 0xff;
      carry = next >> 8;
    }

    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  for (const char of value) {
    if (char === '1') {
      bytes.push(0);
    } else {
      break;
    }
  }

  return Buffer.from(bytes.reverse());
}

function sanitizeSolanaLinkedWallet(value: unknown): SolanaLinkedWallet | null {
  const record = asMetadataRecord(value);
  const provider = record.provider === 'solana' ? 'solana' : null;
  const address = sanitizeWorldText(record.address, 96);
  const linkedAt = sanitizeWorldText(record.linkedAt, 64);
  if (!provider || !address || !linkedAt) return null;
  return { provider, address, linkedAt };
}

function sanitizeSolanaRoomPass(value: unknown): SolanaRoomPass | null {
  const record = asMetadataRecord(value);
  const scope = record.scope === 'single_room' || record.scope === 'event_series' || record.scope === 'seasonal'
    ? record.scope
    : null;
  const accessMode =
    record.accessMode === 'open' || record.accessMode === 'pass_required' || record.accessMode === 'invite_only'
      ? record.accessMode
      : null;
  const status =
    record.status === 'pending' ||
    record.status === 'issued' ||
    record.status === 'disputed' ||
    record.status === 'finalized'
      ? record.status
      : null;
  const id = sanitizeWorldText(record.id, 96);
  const label = sanitizeWorldText(record.label, 96);
  const issuedAt = sanitizeWorldText(record.issuedAt, 64);
  if (!scope || !accessMode || !status || !id || !label || !issuedAt) return null;

  return {
    id,
    label,
    scope,
    accessMode,
    gameKey: sanitizeWorldText(record.gameKey, 32),
    worldId: sanitizeWorldText(record.worldId, 64),
    tournamentId: sanitizeWorldText(record.tournamentId, 64),
    status,
    issuedAt,
  };
}

function sanitizeSolanaMatchReceipt(value: unknown): SolanaMatchReceipt | null {
  const record = asMetadataRecord(value);
  const status =
    record.status === 'pending' ||
    record.status === 'issued' ||
    record.status === 'disputed' ||
    record.status === 'finalized'
      ? record.status
      : null;
  const outcome =
    record.outcome === 'win' || record.outcome === 'loss' || record.outcome === 'draw' ? record.outcome : null;
  const id = sanitizeWorldText(record.id, 96);
  const matchId = sanitizeWorldText(record.matchId, 64);
  const gameKey = sanitizeWorldText(record.gameKey, 32);
  const issuedAt = sanitizeWorldText(record.issuedAt, 64);
  if (!status || !id || !matchId || !gameKey || !issuedAt) return null;

  return {
    id,
    matchId,
    gameKey,
    worldId: sanitizeWorldText(record.worldId, 64),
    tournamentId: sanitizeWorldText(record.tournamentId, 64),
    status,
    outcome,
    ratingChange: typeof record.ratingChange === 'number' ? record.ratingChange : null,
    issuedAt,
  };
}

function readSolanaCompetitiveMetadata(value: unknown): SolanaCompetitiveMetadata {
  const root = asMetadataRecord(value);
  const solanaRecord = asMetadataRecord(root.solanaCompetitive);
  const roomPasses = Array.isArray(solanaRecord.roomPasses)
    ? solanaRecord.roomPasses.map(sanitizeSolanaRoomPass).filter(Boolean) as SolanaRoomPass[]
    : [];
  const matchReceipts = Array.isArray(solanaRecord.matchReceipts)
    ? solanaRecord.matchReceipts.map(sanitizeSolanaMatchReceipt).filter(Boolean) as SolanaMatchReceipt[]
    : [];

  roomPasses.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  matchReceipts.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));

  return {
    linkedWallet: sanitizeSolanaLinkedWallet(solanaRecord.linkedWallet),
    roomPasses,
    matchReceipts,
  };
}

function mergeSolanaCompetitiveMetadata(
  currentMetadata: unknown,
  nextCompetitive: SolanaCompetitiveMetadata,
) {
  return {
    ...asMetadataRecord(currentMetadata),
    solanaCompetitive: {
      linkedWallet: nextCompetitive.linkedWallet,
      roomPasses: nextCompetitive.roomPasses,
      matchReceipts: nextCompetitive.matchReceipts,
    },
  };
}

function hasIssuedSeasonPass(
  roomPasses: SolanaRoomPass[],
  gameKey?: string | null,
  accessMode: SolanaCompetitiveAccessMode = 'pass_required',
) {
  return roomPasses.some((pass) => {
    if (pass.scope !== 'seasonal') return false;
    if (pass.accessMode !== accessMode) return false;
    if (pass.status !== 'issued' && pass.status !== 'finalized') return false;
    if (!gameKey || !pass.gameKey) return true;
    return pass.gameKey === gameKey;
  });
}

function hasIssuedTournamentPass(
  roomPasses: SolanaRoomPass[],
  tournamentId?: string | null,
  accessMode: SolanaCompetitiveAccessMode = 'pass_required',
) {
  if (!tournamentId) return false;

  return roomPasses.some((pass) => {
    if (pass.scope !== 'event_series') return false;
    if (pass.accessMode !== accessMode) return false;
    if (pass.status !== 'issued' && pass.status !== 'finalized') return false;
    return pass.tournamentId === tournamentId;
  });
}

type ViewerTournamentEntryRow = {
  status: string;
  tournaments:
    | {
        id: string;
        name: string;
        game_key: string | null;
        start_time: string | null;
      }
    | Array<{
        id: string;
        name: string;
        game_key: string | null;
        start_time: string | null;
      }>
    | null;
};

function normalizeTournamentJoin(
  value: ViewerTournamentEntryRow['tournaments'],
): { id: string; name: string; game_key: string | null; start_time: string | null } | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function buildTournamentEntries(
  roomPasses: SolanaRoomPass[],
  matchReceipts: SolanaMatchReceipt[],
  joinedEntries: ViewerTournamentEntryRow[] = [],
) {
  const byTournament = new Map<string, SolanaTournamentEntry>();

  for (const pass of roomPasses) {
    if (pass.scope !== 'event_series' || !pass.tournamentId) continue;
    byTournament.set(pass.tournamentId, {
      tournamentId: pass.tournamentId,
      name: pass.label || 'Competitive event',
      gameKey: pass.gameKey,
      status: 'pass_ready',
      startTime: null,
      receiptCount: 0,
    });
  }

  for (const row of joinedEntries) {
    const tournament = normalizeTournamentJoin(row.tournaments);
    if (!tournament?.id) continue;
    const current = byTournament.get(tournament.id);
    byTournament.set(tournament.id, {
      tournamentId: tournament.id,
      name: tournament.name,
      gameKey: tournament.game_key,
      status: current?.receiptCount ? 'receipt_issued' : 'joined',
      startTime: tournament.start_time,
      receiptCount: current?.receiptCount ?? 0,
    });
  }

  for (const receipt of matchReceipts) {
    if (!receipt.tournamentId) continue;
    const current = byTournament.get(receipt.tournamentId);
    byTournament.set(receipt.tournamentId, {
      tournamentId: receipt.tournamentId,
      name: current?.name ?? 'Competitive event',
      gameKey: receipt.gameKey,
      status: 'receipt_issued',
      startTime: current?.startTime ?? null,
      receiptCount: (current?.receiptCount ?? 0) + 1,
    });
  }

  return [...byTournament.values()].sort((a, b) => {
    if (a.status === b.status) {
      return (b.startTime ?? '').localeCompare(a.startTime ?? '');
    }
    if (a.status === 'receipt_issued') return -1;
    if (b.status === 'receipt_issued') return 1;
    if (a.status === 'joined') return -1;
    if (b.status === 'joined') return 1;
    return 0;
  });
}

function buildCompetitiveIdentityPayload(
  currentCompetitive: SolanaCompetitiveMetadata,
  joinedEntries: ViewerTournamentEntryRow[] = [],
  lane?: Partial<{
    title: string;
    body: string;
    hasSeasonPass: boolean;
  }>,
) {
  const tournamentEntries = buildTournamentEntries(
    currentCompetitive.roomPasses,
    currentCompetitive.matchReceipts,
    joinedEntries,
  );
  const hasSeasonPass = lane?.hasSeasonPass ?? hasIssuedSeasonPass(currentCompetitive.roomPasses);

  return {
    linkedWallet: currentCompetitive.linkedWallet,
    roomPasses: currentCompetitive.roomPasses,
    recentReceipts: currentCompetitive.matchReceipts.slice(0, 6),
    tournamentEntries,
    profile: {
      passCount: currentCompetitive.roomPasses.length,
      eventEntryCount: tournamentEntries.length,
      receiptCount: currentCompetitive.matchReceipts.length,
      latestReceiptAt: currentCompetitive.matchReceipts[0]?.issuedAt ?? null,
    },
    solanaLane: {
      walletLinked: Boolean(currentCompetitive.linkedWallet),
      hasSeasonPass,
      accessMode: 'pass_required' as const,
      title:
        lane?.title ??
        (hasSeasonPass ? 'Receipt-backed ranked' : 'Activate room pass'),
      body:
        lane?.body ??
        (hasSeasonPass
          ? 'Solana pass ready. Enter ranked and seal match receipts after play.'
          : 'Issue a room pass to enter the receipt-backed lane.'),
    },
  };
}

function verifySolanaSignature(address: string, message: string, signatureBase64: string) {
  const publicKeyBytes = decodeBase58(address);
  if (publicKeyBytes.length !== 32) {
    throw new Error('Solana wallet address is invalid.');
  }

  const signature = Buffer.from(signatureBase64, 'base64');
  if (signature.length !== 64) {
    throw new Error('Solana signature is invalid.');
  }

  const publicKey = Buffer.concat([SOLANA_PUBLIC_KEY_SPKI_PREFIX, publicKeyBytes]);
  return verify(
    null,
    Buffer.from(message, 'utf8'),
    {
      key: publicKey,
      format: 'der',
      type: 'spki',
    },
    signature,
  );
}

function extractIdKitNullifier(value: unknown) {
  const result = value as any;
  const direct = result?.nullifier_hash ?? result?.nullifierHash ?? result?.nullifier;
  if (typeof direct === 'string' && direct.trim()) {
    return direct.trim();
  }

  const responses = Array.isArray(result?.responses) ? result.responses : [];
  for (const response of responses) {
    const nullifier = response?.nullifier ?? response?.nullifier_hash ?? response?.nullifierHash;
    if (typeof nullifier === 'string' && nullifier.trim()) {
      return nullifier.trim();
    }
  }

  return null;
}

function toNumericString(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();

  try {
    if (/^0x[0-9a-f]+$/i.test(trimmed)) {
      return BigInt(trimmed).toString(10);
    }

    if (/^[0-9]+$/.test(trimmed)) {
      return trimmed;
    }
  } catch {
    return null;
  }

  return null;
}

function hashForLog(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex').slice(0, 16);
}

function getWorldRequestLogger(req: Request, res: Response, route: string) {
  const requestId = req.header('x-request-id') || randomUUID();
  const startedAt = Date.now();

  res.setHeader('X-BOARD-Request-Id', requestId);

  const write = (level: 'info' | 'warn' | 'error', event: string, details: Record<string, unknown> = {}) => {
    const payload = {
      ts: new Date().toISOString(),
      service: 'board-world-auth',
      level,
      route,
      event,
      requestId,
      durationMs: Date.now() - startedAt,
      ...details,
    };

    const line = JSON.stringify(payload);
    if (level === 'error') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.info(line);
    }
  };

  return {
    requestId,
    info: (event: string, details?: Record<string, unknown>) => write('info', event, details),
    warn: (event: string, details?: Record<string, unknown>) => write('warn', event, details),
    error: (event: string, details?: Record<string, unknown>) => write('error', event, details),
  };
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

function getPublicRuntimeEnv() {
  return {
    VITE_API_BASE_URL: getEnv('VITE_API_BASE_URL'),
    VITE_DISCORD_CLIENT_ID: getEnv('DISCORD_CLIENT_ID', 'VITE_DISCORD_CLIENT_ID'),
    VITE_ENABLE_BASE_WALLET: getEnv('ENABLE_BASE_WALLET', 'VITE_ENABLE_BASE_WALLET'),
    VITE_ONCHAINKIT_API_KEY: getEnv('ONCHAINKIT_API_KEY', 'VITE_ONCHAINKIT_API_KEY'),
    VITE_PUBLIC_APP_URL: getEnv('VITE_PUBLIC_APP_URL'),
    VITE_SUPABASE_PROJECT_ID: getEnv('VITE_SUPABASE_PROJECT_ID'),
    VITE_SUPABASE_PUBLISHABLE_KEY: getEnv('SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY'),
    VITE_SUPABASE_URL: getEnv('SUPABASE_URL', 'VITE_SUPABASE_URL'),
    VITE_WORLD_APP_ID: getWorldAppId(),
    VITE_WORLD_ID_ACTION: getWorldIdAction(),
    VITE_WORLD_ID_APP_ID: getEnv('WORLD_ID_APP_ID', 'VITE_WORLD_ID_APP_ID'),
  };
}

function serializeRuntimeEnvScript() {
  const serializedEnv = JSON.stringify(getPublicRuntimeEnv())
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

  return `<script>window.__HEXLOGY_RUNTIME_ENV__=${serializedEnv};</script>`;
}

function injectRuntimeEnv(html: string) {
  const scriptTag = serializeRuntimeEnvScript();

  if (html.includes('</head>')) {
    return html.replace('</head>', `${scriptTag}</head>`);
  }

  return `${scriptTag}${html}`;
}

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

const worldUserSchema = z
  .object({
    username: z.string().max(80).optional(),
    profilePictureUrl: z.string().max(2048).optional(),
    walletAddress: z.string().max(120).optional(),
  })
  .passthrough()
  .optional();

const walletAuthCompleteSchema = z.object({
  nonce: z.string().min(8),
  requestId: z.string().min(8),
  payload: z
    .object({
      address: z.string().min(4),
      message: z.string().min(1),
      signature: z.string().min(1),
      version: z.number().int().optional(),
    })
    .passthrough(),
  worldUser: worldUserSchema,
});

const rpSignatureSchema = z.object({
  action: z.string().min(1).max(80).optional(),
});

const idKitVerifySchema = z.object({
  action: z.string().min(1).max(80).optional(),
  idkitResponse: z.unknown(),
});

const solanaLinkCompleteSchema = z.object({
  nonce: z.string().min(8),
  requestId: z.string().min(8),
  provider: z.literal('solana'),
  address: z.string().min(16).max(96),
  message: z.string().min(16).max(512),
  signatureBase64: z.string().min(32).max(512),
});

const issueMatchReceiptSchema = z.object({
  matchId: z.string().uuid(),
});

const WORLD_QUICKPLAY_GAME_KEYS = ['hex', 'chess', 'checkers', 'ttt', 'connect4'] as const;
const WORLD_QUICKPLAY_GAME_LABELS: Record<(typeof WORLD_QUICKPLAY_GAME_KEYS)[number], string> = {
  hex: 'Hex',
  chess: 'Chess',
  checkers: 'Checkers',
  ttt: 'Tic-Tac-Toe',
  connect4: 'Connect 4',
};
const worldQuickplayGameSchema = z.enum(WORLD_QUICKPLAY_GAME_KEYS);
const issueRoomPassSchema = z.object({
  scope: z.enum(['single_room', 'event_series', 'seasonal']).default('seasonal'),
  accessMode: z.enum(['open', 'pass_required', 'invite_only']).default('pass_required'),
  gameKey: worldQuickplayGameSchema.nullish(),
  worldId: z.string().uuid().nullish(),
  tournamentId: z.string().uuid().nullish(),
  label: z.string().min(2).max(96).nullish(),
});
const competitiveAccessModeSchema = z.enum(['open', 'pass_required', 'invite_only']);
const walletProviderSchema = z.enum(['world', 'solana']);
const worldQuickplaySchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('ranked'),
    gameKey: worldQuickplayGameSchema.default('hex'),
    competitiveAccessMode: competitiveAccessModeSchema.optional(),
    walletProvider: walletProviderSchema.optional(),
  }),
  z.object({
    mode: z.literal('ranked-rematch'),
    gameKey: worldQuickplayGameSchema.optional(),
    matchId: z.string().min(4).max(80).optional(),
    competitiveAccessMode: competitiveAccessModeSchema.optional(),
    walletProvider: walletProviderSchema.optional(),
  }),
  z.object({
    mode: z.literal('resume-ranked'),
    matchId: z.string().min(4).max(80).optional(),
    competitiveAccessMode: competitiveAccessModeSchema.optional(),
    walletProvider: walletProviderSchema.optional(),
  }),
  z.object({
    mode: z.literal('room'),
    gameKey: worldQuickplayGameSchema.default('hex'),
    competitiveAccessMode: competitiveAccessModeSchema.optional(),
    walletProvider: walletProviderSchema.optional(),
  }),
  z.object({
    mode: z.literal('join-room'),
    code: z.string().min(4).max(12).regex(/^[a-z0-9]+$/i).transform((value) => value.trim().toUpperCase()),
  }),
]);

type WorldQuickplayRoomRow = {
  id: string;
  code: string;
  game_key: string | null;
  board_size: number;
  status: string;
  created_at: string;
  world_id: string | null;
};

type WorldQuickplayEventRow = {
  id: string;
  name: string;
  game_key: string | null;
  status: string;
  competitive_mode: boolean | null;
  access_type: string | null;
  start_time: string | null;
  max_players: number | null;
};

type WorldQuickplayWorldRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  visibility: string;
  created_at: string;
  updated_at: string;
};

type WorldPlayerRatingRow = {
  profile_id: string;
  game_key: string;
  elo_rating: number | null;
  games_rated: number | null;
  updated_at?: string | null;
  profiles?: {
    id?: string | null;
    username?: string | null;
    avatar_color?: string | null;
    is_verified_human?: boolean | null;
  } | Array<{
    id?: string | null;
    username?: string | null;
    avatar_color?: string | null;
    is_verified_human?: boolean | null;
  }> | null;
};

type WorldRatingHistoryRow = {
  id: string;
  match_id: string | null;
  game_key: string | null;
  old_rating: number;
  new_rating: number;
  rating_change: number;
  created_at: string;
};

type WorldRankedMatchRow = {
  id: string;
  game_key: string | null;
  status: string;
  is_ranked?: boolean | null;
  created_at: string;
  updated_at?: string | null;
};

type WorldMatchPlayerRow = {
  match_id: string;
  color: number | null;
  created_at: string | null;
  matches?: WorldRankedMatchRow | WorldRankedMatchRow[] | null;
};

function isWorldQuickplayGameKey(value: string | null | undefined): value is (typeof WORLD_QUICKPLAY_GAME_KEYS)[number] {
  return WORLD_QUICKPLAY_GAME_KEYS.includes(value as any);
}

function normalizeWorldQuickplayGameKey(value: string | null | undefined) {
  return isWorldQuickplayGameKey(value) ? value : 'hex';
}

function normalizeRankedMatch(value: WorldMatchPlayerRow['matches']) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function normalizeJoinedProfile(value: WorldPlayerRatingRow['profiles']) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function createRankedGate(
  isWalletBound: boolean,
  isHumanVerified: boolean,
  hasSolanaPass = false,
  linkedSolanaWallet = false,
) {
  if (!isWalletBound) {
    return {
      status: 'wallet_required',
      title: 'Bind World wallet',
      body: 'Wallet auth opens the ranked seat. No email form first.',
    };
  }

  if (!isHumanVerified) {
    return {
      status: 'human_required',
      title: 'Verify to enter ranked',
      body: 'World ID keeps ranked rooms human-only.',
    };
  }

  if (linkedSolanaWallet && !hasSolanaPass) {
    return {
      status: 'pass_required',
      title: 'Activate a room pass',
      body: 'World proves the human. Solana carries ranked access and receipts.',
    };
  }

  return {
    status: 'ready',
    title: 'Ranked open',
    body: 'Verified seat ready for skill-based matchmaking.',
  };
}

function toWorldActiveMatchPayload(row: { player: WorldMatchPlayerRow; match: WorldRankedMatchRow }) {
  return {
    id: row.match.id,
    gameKey: normalizeWorldQuickplayGameKey(row.match.game_key),
    status: row.match.status,
    color: row.player.color,
    createdAt: row.match.created_at,
    updatedAt: row.match.updated_at ?? null,
    destination: `/match/${row.match.id}`,
  };
}

async function findWorldActiveRankedMatch(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  viewerId: string,
  matchId?: string,
) {
  let query = supabase
    .from('match_players')
    .select('match_id, color, created_at, matches(id, status, game_key, is_ranked, created_at, updated_at)')
    .eq('profile_id', viewerId)
    .order('created_at', { ascending: false })
    .limit(matchId ? 1 : 20);

  if (matchId) {
    query = query.eq('match_id', matchId);
  }

  const { data, error } = await query;
  if (error) throw error;

  for (const player of (data ?? []) as WorldMatchPlayerRow[]) {
    const match = normalizeRankedMatch(player.matches);
    if (match?.is_ranked === true && ['waiting', 'active'].includes(match.status)) {
      return toWorldActiveMatchPayload({ player, match });
    }
  }

  return null;
}

async function resolveWorldRankedRematch(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  viewerId: string,
  args: { gameKey?: string; matchId?: string },
) {
  if (args.gameKey) {
    return {
      gameKey: normalizeWorldQuickplayGameKey(args.gameKey),
      sourceMatchId: args.matchId ?? null,
    };
  }

  if (args.matchId) {
    const { data, error } = await supabase
      .from('match_players')
      .select('match_id, matches(id, status, game_key, is_ranked, created_at, updated_at)')
      .eq('profile_id', viewerId)
      .eq('match_id', args.matchId)
      .limit(1);

    if (error) throw error;

    const match = normalizeRankedMatch(((data ?? []) as WorldMatchPlayerRow[])[0]?.matches);
    if (!match) {
      return {
        error: 'Ranked match not found for this player.',
        errorCode: 'ranked_match_not_found',
        statusCode: 404,
      } as const;
    }

    if (match.is_ranked !== true) {
      return {
        error: 'Rematch source must be ranked.',
        errorCode: 'ranked_match_required',
        statusCode: 409,
      } as const;
    }

    return {
      gameKey: normalizeWorldQuickplayGameKey(match.game_key),
      sourceMatchId: match.id,
    };
  }

  const { data, error } = await supabase
    .from('rating_history')
    .select('match_id, game_key, created_at')
    .eq('profile_id', viewerId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;

  const recent = ((data ?? []) as WorldRatingHistoryRow[])[0];
  return {
    gameKey: normalizeWorldQuickplayGameKey(recent?.game_key),
    sourceMatchId: recent?.match_id ?? null,
  };
}

function buildWorldCompetitiveState(args: {
  viewerId: string;
  isWalletBound: boolean;
  isHumanVerified: boolean;
  solanaCompetitive: SolanaCompetitiveMetadata;
  events: WorldQuickplayEventRow[];
  ratings: WorldPlayerRatingRow[];
  leaderboard: WorldPlayerRatingRow[];
  ratingHistory: WorldRatingHistoryRow[];
  matchPlayers: WorldMatchPlayerRow[];
  rankedMatches: WorldRankedMatchRow[];
}) {
  const hasSeasonPass = hasIssuedSeasonPass(args.solanaCompetitive.roomPasses);
  const ratingsByGame = new Map(args.ratings.map((rating) => [rating.game_key, rating]));
  const leaderboardRows = args.leaderboard
    .filter((row) => WORLD_QUICKPLAY_GAME_KEYS.includes(row.game_key as any))
    .filter((row) => Number(row.games_rated ?? 0) > 0)
    .sort((a, b) => Number(b.elo_rating ?? 1200) - Number(a.elo_rating ?? 1200));

  const leaderboardByGame = new Map<string, WorldPlayerRatingRow[]>();
  for (const row of leaderboardRows) {
    const rows = leaderboardByGame.get(row.game_key) ?? [];
    rows.push(row);
    leaderboardByGame.set(row.game_key, rows);
  }

  const rankedCountsByGame = new Map<string, { waiting: number; active: number }>();
  for (const match of args.rankedMatches) {
    const gameKey = match.game_key ?? 'hex';
    if (!WORLD_QUICKPLAY_GAME_KEYS.includes(gameKey as any)) continue;
    const counts = rankedCountsByGame.get(gameKey) ?? { waiting: 0, active: 0 };
    if (match.status === 'waiting') counts.waiting += 1;
    if (match.status === 'active') counts.active += 1;
    rankedCountsByGame.set(gameKey, counts);
  }

  const activeMatchRow = args.matchPlayers
    .map((row) => ({ player: row, match: normalizeRankedMatch(row.matches) }))
    .find(({ match }) => match?.is_ranked === true && ['waiting', 'active'].includes(match.status));

  const activeMatch = activeMatchRow?.match
    ? toWorldActiveMatchPayload({ player: activeMatchRow.player, match: activeMatchRow.match })
    : null;

  const games = WORLD_QUICKPLAY_GAME_KEYS.map((gameKey) => {
    const rating = ratingsByGame.get(gameKey);
    const gameLeaderboard = leaderboardByGame.get(gameKey) ?? [];
    const rankIndex = gameLeaderboard.findIndex((row) => row.profile_id === args.viewerId);
    const queue = rankedCountsByGame.get(gameKey) ?? { waiting: 0, active: 0 };

    return {
      gameKey,
      label: WORLD_QUICKPLAY_GAME_LABELS[gameKey],
      rating: Number(rating?.elo_rating ?? 1200),
      gamesRated: Number(rating?.games_rated ?? 0),
      rank: rankIndex >= 0 ? rankIndex + 1 : null,
      updatedAt: rating?.updated_at ?? null,
      queue,
      canEnterRanked: args.isWalletBound && args.isHumanVerified,
    };
  });

  return {
    rankedGate: createRankedGate(
      args.isWalletBound,
      args.isHumanVerified,
      hasSeasonPass,
      Boolean(args.solanaCompetitive.linkedWallet),
    ),
    activeMatch,
    games,
    leaderboard: leaderboardRows.slice(0, 10).map((row, index) => ({
      profileId: row.profile_id,
      gameKey: row.game_key,
      username: normalizeJoinedProfile(row.profiles)?.username || 'Player',
      avatarColor: normalizeJoinedProfile(row.profiles)?.avatar_color ?? null,
      isVerifiedHuman: Boolean(normalizeJoinedProfile(row.profiles)?.is_verified_human),
      rating: Number(row.elo_rating ?? 1200),
      gamesRated: Number(row.games_rated ?? 0),
      rank: index + 1,
    })),
    recentResults: args.ratingHistory.map((row) => ({
      id: row.id,
      matchId: row.match_id,
      gameKey: row.game_key ?? 'hex',
      oldRating: row.old_rating,
      newRating: row.new_rating,
      ratingChange: row.rating_change,
      outcome: row.rating_change > 0 ? 'win' : row.rating_change < 0 ? 'loss' : 'draw',
      createdAt: row.created_at,
    })),
    solanaLane: {
      walletLinked: Boolean(args.solanaCompetitive.linkedWallet),
      hasSeasonPass,
      accessMode: 'pass_required',
      title: Boolean(args.solanaCompetitive.linkedWallet)
        ? hasSeasonPass
          ? 'Receipt-backed ranked'
          : 'Activate room pass'
        : 'Link Solana wallet',
      body: Boolean(args.solanaCompetitive.linkedWallet)
        ? hasSeasonPass
          ? 'Enter ranked with a Solana-backed pass and receipt trail.'
          : 'Issue a season pass before entering the Solana-ranked lane.'
        : 'Link Solana once to carry room access and match receipts.',
    },
    events: args.events
      .filter((event) => event.competitive_mode === true)
      .map((event) => ({
        ...event,
        gameKey: normalizeWorldQuickplayGameKey(event.game_key),
        accessType: event.access_type ?? 'public',
      })),
  };
}

async function getWorldQuickplayState(viewerId: string) {
  const supabase = createServiceSupabaseClient();

  const [
    identityResult,
    profileResult,
    roomsResult,
    eventsResult,
    worldsResult,
    tournamentEntriesResult,
    ratingsResult,
    leaderboardResult,
    ratingHistoryResult,
    matchPlayersResult,
    rankedMatchesResult,
  ] = await Promise.all([
    supabase
      .from('world_app_identities')
      .select('profile_id, world_username, profile_picture_url, wallet_auth_at, idkit_verified_at, verification_metadata')
      .eq('profile_id', viewerId)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('id, username, world_username, world_app_bound_at, is_verified_human')
      .eq('id', viewerId)
      .maybeSingle(),
    supabase
      .from('lobbies')
      .select('id, code, game_key, board_size, status, created_at, world_id')
      .in('status', ['waiting', 'starting'])
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('tournaments')
      .select('id, name, game_key, status, competitive_mode, access_type, start_time, max_players')
      .in('status', ['registration', 'scheduled', 'active'])
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('worlds')
      .select('id, slug, name, description, visibility, created_at, updated_at')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('tournament_participants')
      .select('status, tournaments!inner(id, name, game_key, start_time)')
      .eq('player_id', viewerId)
      .limit(12),
    supabase
      .from('player_ratings')
      .select('profile_id, game_key, elo_rating, games_rated, updated_at')
      .eq('profile_id', viewerId)
      .in('game_key', [...WORLD_QUICKPLAY_GAME_KEYS]),
    supabase
      .from('player_ratings')
      .select('profile_id, game_key, elo_rating, games_rated, profiles(id, username, avatar_color, is_verified_human)')
      .in('game_key', [...WORLD_QUICKPLAY_GAME_KEYS])
      .order('elo_rating', { ascending: false })
      .limit(60),
    supabase
      .from('rating_history')
      .select('id, match_id, game_key, old_rating, new_rating, rating_change, created_at')
      .eq('profile_id', viewerId)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('match_players')
      .select('match_id, color, created_at, matches(id, status, game_key, is_ranked, created_at, updated_at)')
      .eq('profile_id', viewerId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('matches')
      .select('id, game_key, status, is_ranked, created_at, updated_at')
      .eq('is_ranked', true)
      .in('status', ['waiting', 'active'])
      .limit(40),
  ]);

  if (identityResult.error) throw identityResult.error;
  if (profileResult.error) throw profileResult.error;
  if (roomsResult.error) throw roomsResult.error;
  if (eventsResult.error) throw eventsResult.error;
  if (worldsResult.error) throw worldsResult.error;
  if (tournamentEntriesResult.error) throw tournamentEntriesResult.error;
  if (ratingsResult.error) throw ratingsResult.error;
  if (leaderboardResult.error) throw leaderboardResult.error;
  if (ratingHistoryResult.error) throw ratingHistoryResult.error;
  if (matchPlayersResult.error) throw matchPlayersResult.error;
  if (rankedMatchesResult.error) throw rankedMatchesResult.error;

  const rooms = ((roomsResult.data ?? []) as WorldQuickplayRoomRow[]);
  const roomIds = rooms.map((room) => room.id);
  const worldIds = ((worldsResult.data ?? []) as WorldQuickplayWorldRow[]).map((world) => world.id);

  const [roomPlayersResult, worldLobbyCountsResult, worldMatchCountsResult] = await Promise.all([
    roomIds.length
      ? supabase.from('lobby_players').select('lobby_id').in('lobby_id', roomIds)
      : Promise.resolve({ data: [], error: null }),
    worldIds.length
      ? supabase
          .from('lobbies')
          .select('world_id')
          .in('world_id', worldIds)
          .in('status', ['waiting', 'starting'])
      : Promise.resolve({ data: [], error: null }),
    worldIds.length
      ? supabase
          .from('matches')
          .select('world_id')
          .in('world_id', worldIds)
          .eq('status', 'active')
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (roomPlayersResult.error) throw roomPlayersResult.error;
  if (worldLobbyCountsResult.error) throw worldLobbyCountsResult.error;
  if (worldMatchCountsResult.error) throw worldMatchCountsResult.error;

  const playerCounts = new Map<string, number>();
  for (const player of roomPlayersResult.data ?? []) {
    playerCounts.set(player.lobby_id, (playerCounts.get(player.lobby_id) ?? 0) + 1);
  }

  const worldInstanceCounts = new Map<string, number>();
  for (const lobby of worldLobbyCountsResult.data ?? []) {
    if (!lobby.world_id) continue;
    worldInstanceCounts.set(lobby.world_id, (worldInstanceCounts.get(lobby.world_id) ?? 0) + 1);
  }
  for (const match of worldMatchCountsResult.data ?? []) {
    if (!match.world_id) continue;
    worldInstanceCounts.set(match.world_id, (worldInstanceCounts.get(match.world_id) ?? 0) + 1);
  }

  const identity = identityResult.data ?? null;
  const profile = profileResult.data ?? null;
  const solanaCompetitive = readSolanaCompetitiveMetadata(identity?.verification_metadata);
  const joinedTournamentEntries = (tournamentEntriesResult.data ?? []) as ViewerTournamentEntryRow[];
  const isWalletBound = Boolean(identity?.wallet_auth_at || profile?.world_app_bound_at);
  const isHumanVerified = Boolean(identity?.idkit_verified_at || profile?.is_verified_human);
  const events = (eventsResult.data ?? []) as WorldQuickplayEventRow[];

  return {
    profile: profile
      ? {
          username: profile.username,
          world_username: identity?.world_username ?? profile.world_username ?? null,
          profile_picture_url: identity?.profile_picture_url ?? null,
          world_app_bound_at: identity?.wallet_auth_at ?? profile.world_app_bound_at ?? null,
          is_verified_human: isHumanVerified,
        }
      : null,
    identity: identity
      ? {
          profile_id: identity.profile_id,
          world_username: identity.world_username,
          profile_picture_url: identity.profile_picture_url,
          wallet_auth_at: identity.wallet_auth_at,
          idkit_verified_at: identity.idkit_verified_at,
        }
      : null,
    gates: {
      walletBound: isWalletBound,
      humanVerified: isHumanVerified,
      canOpenRoom: isWalletBound,
      canEnterRanked: isWalletBound && isHumanVerified,
    },
    competitiveIdentity: {
      ...buildCompetitiveIdentityPayload(solanaCompetitive, joinedTournamentEntries, {
        title: Boolean(solanaCompetitive.linkedWallet)
          ? hasIssuedSeasonPass(solanaCompetitive.roomPasses)
            ? 'Receipt-backed ranked'
            : 'Activate room pass'
          : 'Link Solana wallet',
        body: Boolean(solanaCompetitive.linkedWallet)
          ? hasIssuedSeasonPass(solanaCompetitive.roomPasses)
            ? 'Solana pass ready. Enter ranked and seal match receipts after play.'
            : 'Issue a room pass to enter the receipt-backed lane.'
          : 'World proves the human. Solana carries access and receipts.',
      }),
    },
    rooms: rooms.map((room) => ({
      ...room,
      playerCount: playerCounts.get(room.id) ?? 0,
    })),
    events,
    worlds: ((worldsResult.data ?? []) as WorldQuickplayWorldRow[]).map((world) => ({
      id: world.id,
      slug: world.slug,
      name: world.name,
      description: world.description,
      visibility: world.visibility,
      createdAt: world.created_at,
      updatedAt: world.updated_at,
      instanceCount: worldInstanceCounts.get(world.id) ?? 0,
      ownerName: 'Host',
      ownerAvatarColor: null,
      memberCount: 0,
      eventCount: 0,
      userRole: null,
    })),
    competitive: buildWorldCompetitiveState({
      viewerId,
      isWalletBound,
      isHumanVerified,
      solanaCompetitive,
      events,
      ratings: (ratingsResult.data ?? []) as WorldPlayerRatingRow[],
      leaderboard: (leaderboardResult.data ?? []) as WorldPlayerRatingRow[],
      ratingHistory: (ratingHistoryResult.data ?? []) as WorldRatingHistoryRow[],
      matchPlayers: (matchPlayersResult.data ?? []) as WorldMatchPlayerRow[],
      rankedMatches: (rankedMatchesResult.data ?? []) as WorldRankedMatchRow[],
    }),
  };
}

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
    hasWorldAppConfig: Boolean(getWorldAppId()),
  });
});

app.post('/api/world/nonce', async (req, res) => {
  const worldLog = getWorldRequestLogger(req, res, 'world.nonce');

  try {
    const viewer = await requireAuthedUser(req.header('authorization') ?? undefined);
    if (!viewer) {
      worldLog.warn('auth_required', { statusCode: 401 });
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const supabase = createServiceSupabaseClient();
    const nonce = createWorldNonce();
    const requestId = randomUUID();
    const statement = getEnv('WORLD_WALLET_AUTH_STATEMENT') || 'Sign in to BOARD World App.';
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error } = await supabase.from('world_app_auth_nonces').insert({
      profile_id: viewer.id,
      nonce,
      request_id: requestId,
      statement,
      expires_at: expiresAt,
    });

    if (error) {
      worldLog.error('nonce_insert_failed', {
        statusCode: 500,
        profileIdHash: hashForLog(viewer.id),
        reason: error.message,
      });
      res.status(500).json({ error: error.message });
      return;
    }

    worldLog.info('nonce_created', {
      statusCode: 200,
      profileIdHash: hashForLog(viewer.id),
      requestIdHash: hashForLog(requestId),
      expiresAt,
    });

    res.json({
      nonce,
      requestId,
      statement,
      expirationTime: expiresAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create World auth nonce.';
    worldLog.error('nonce_exception', { statusCode: 500, reason: message });
    res.status(500).json({ error: message });
  }
});

app.post('/api/world/complete-wallet-auth', async (req, res) => {
  const worldLog = getWorldRequestLogger(req, res, 'world.complete-wallet-auth');

  try {
    const viewer = await requireAuthedUser(req.header('authorization') ?? undefined);
    if (!viewer) {
      worldLog.warn('auth_required', { statusCode: 401 });
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const parsed = walletAuthCompleteSchema.parse(req.body ?? {});
    const supabase = createServiceSupabaseClient();

    const { data: nonceRow, error: nonceError } = await supabase
      .from('world_app_auth_nonces')
      .select('id, profile_id, nonce, request_id, statement, expires_at, consumed_at')
      .eq('profile_id', viewer.id)
      .eq('nonce', parsed.nonce)
      .eq('request_id', parsed.requestId)
      .maybeSingle();

    if (nonceError) {
      worldLog.error('nonce_lookup_failed', {
        statusCode: 500,
        profileIdHash: hashForLog(viewer.id),
        reason: nonceError.message,
      });
      res.status(500).json({ error: nonceError.message });
      return;
    }

    if (!nonceRow || nonceRow.consumed_at || Date.parse(nonceRow.expires_at) <= Date.now()) {
      worldLog.warn('nonce_invalid_or_expired', {
        statusCode: 400,
        profileIdHash: hashForLog(viewer.id),
        requestIdHash: hashForLog(parsed.requestId),
        nonceFound: Boolean(nonceRow),
        consumed: Boolean(nonceRow?.consumed_at),
      });
      res.status(400).json({ error: 'World auth nonce is invalid or expired.' });
      return;
    }

    const walletPayload: WalletAuthResult = {
      address: parsed.payload.address,
      message: parsed.payload.message,
      signature: parsed.payload.signature,
      version: parsed.payload.version,
    };

    const verification = await verifySiweMessage(
      walletPayload,
      nonceRow.nonce,
      nonceRow.statement,
      nonceRow.request_id,
    );

    if (!verification.isValid) {
      worldLog.warn('siwe_invalid', {
        statusCode: 400,
        profileIdHash: hashForLog(viewer.id),
        walletHash: hashForLog(parsed.payload.address),
      });
      res.status(400).json({ error: 'World wallet signature could not be verified.' });
      return;
    }

    const walletAddress = normalizeWalletAddress(parsed.payload.address);
    const signedAddress = normalizeWalletAddress(verification.siweMessageData.address ?? '');
    if (!walletAddress || !signedAddress || walletAddress !== signedAddress) {
      worldLog.warn('wallet_address_mismatch', {
        statusCode: 400,
        profileIdHash: hashForLog(viewer.id),
        walletHash: hashForLog(walletAddress),
        signedWalletHash: hashForLog(signedAddress),
      });
      res.status(400).json({ error: 'World wallet address mismatch.' });
      return;
    }

    const { data: existingIdentity, error: existingError } = await supabase
      .from('world_app_identities')
      .select('profile_id')
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    if (existingError) {
      worldLog.error('identity_lookup_failed', {
        statusCode: 500,
        profileIdHash: hashForLog(viewer.id),
        walletHash: hashForLog(walletAddress),
        reason: existingError.message,
      });
      res.status(500).json({ error: existingError.message });
      return;
    }

    if (existingIdentity && existingIdentity.profile_id !== viewer.id) {
      worldLog.warn('wallet_conflict', {
        statusCode: 409,
        profileIdHash: hashForLog(viewer.id),
        existingProfileIdHash: hashForLog(existingIdentity.profile_id),
        walletHash: hashForLog(walletAddress),
      });
      res.status(409).json({ error: 'This World wallet is already bound to another BOARD profile.' });
      return;
    }

    const worldUsername = sanitizeWorldText(parsed.worldUser?.username, 80);
    const profilePictureUrl = sanitizeWorldText(parsed.worldUser?.profilePictureUrl, 2048);
    const now = new Date().toISOString();

    const { data: identity, error: identityError } = await supabase
      .from('world_app_identities')
      .upsert(
        {
          profile_id: viewer.id,
          wallet_address: walletAddress,
          world_username: worldUsername,
          profile_picture_url: profilePictureUrl,
          wallet_auth_version: parsed.payload.version ?? null,
          wallet_auth_at: now,
          verification_metadata: {
            siwe: {
              domain: verification.siweMessageData.domain,
              uri: verification.siweMessageData.uri,
              chainId: verification.siweMessageData.chain_id,
              issuedAt: verification.siweMessageData.issued_at,
            },
          },
        },
        { onConflict: 'profile_id' },
      )
      .select('profile_id, world_username, profile_picture_url, wallet_auth_at, idkit_verified_at')
      .single();

    if (identityError) {
      worldLog.error('identity_upsert_failed', {
        statusCode: 500,
        profileIdHash: hashForLog(viewer.id),
        walletHash: hashForLog(walletAddress),
        reason: identityError.message,
      });
      res.status(500).json({ error: identityError.message });
      return;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        world_app_bound_at: now,
        world_username: worldUsername,
        world_profile_picture_url: profilePictureUrl,
      })
      .eq('id', viewer.id);

    if (profileError) {
      worldLog.error('profile_world_bind_failed', {
        statusCode: 500,
        profileIdHash: hashForLog(viewer.id),
        walletHash: hashForLog(walletAddress),
        reason: profileError.message,
      });
      res.status(500).json({ error: profileError.message });
      return;
    }

    await supabase
      .from('world_app_auth_nonces')
      .update({ consumed_at: now })
      .eq('id', nonceRow.id);

    worldLog.info('wallet_bound', {
      statusCode: 200,
      profileIdHash: hashForLog(viewer.id),
      walletHash: hashForLog(walletAddress),
      hasWorldUsername: Boolean(worldUsername),
    });

    res.json({
      ok: true,
      identity,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not complete World wallet auth.';
    worldLog.warn('wallet_auth_exception', { statusCode: 400, reason: message });
    res.status(400).json({ error: message });
  }
});

app.post('/api/world/solana/challenge', async (req, res) => {
  const worldLog = getWorldRequestLogger(req, res, 'world.solana-challenge');

  try {
    const viewer = await requireAuthedUser(req.header('authorization') ?? undefined);
    if (!viewer) {
      worldLog.warn('auth_required', { statusCode: 401 });
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const supabase = createServiceSupabaseClient();
    const { data: identity, error: identityError } = await supabase
      .from('world_app_identities')
      .select('profile_id, wallet_auth_at')
      .eq('profile_id', viewer.id)
      .maybeSingle();

    if (identityError) {
      worldLog.error('identity_lookup_failed', {
        statusCode: 500,
        profileIdHash: hashForLog(viewer.id),
        reason: identityError.message,
      });
      res.status(500).json({ error: identityError.message });
      return;
    }

    if (!identity?.wallet_auth_at) {
      worldLog.warn('world_wallet_required', {
        statusCode: 409,
        profileIdHash: hashForLog(viewer.id),
      });
      res.status(409).json({ error: 'Bind a World wallet before linking Solana.' });
      return;
    }

    const nonce = createWorldNonce();
    const requestId = randomUUID();
    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const message = [
      'BOARD Competitive Identity',
      'Link this Solana wallet to your verified BOARD seat.',
      `Profile: ${viewer.id}`,
      `Nonce: ${nonce}`,
      `Request: ${requestId}`,
      `Issued at: ${issuedAt}`,
    ].join('\n');

    const { error: nonceError } = await supabase.from('world_app_auth_nonces').insert({
      profile_id: viewer.id,
      nonce,
      request_id: requestId,
      purpose: 'solana_link',
      statement: message,
      expires_at: expiresAt,
    });

    if (nonceError) {
      worldLog.error('solana_nonce_insert_failed', {
        statusCode: 500,
        profileIdHash: hashForLog(viewer.id),
        reason: nonceError.message,
      });
      res.status(500).json({ error: nonceError.message });
      return;
    }

    worldLog.info('solana_challenge_created', {
      statusCode: 200,
      profileIdHash: hashForLog(viewer.id),
      requestIdHash: hashForLog(requestId),
    });

    res.json({
      nonce,
      requestId,
      issuedAt,
      expiresAt,
      message,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create Solana challenge.';
    worldLog.warn('solana_challenge_exception', { statusCode: 400, reason: message });
    res.status(400).json({ error: message });
  }
});

app.post('/api/world/solana/complete-link', async (req, res) => {
  const worldLog = getWorldRequestLogger(req, res, 'world.solana-complete-link');

  try {
    const viewer = await requireAuthedUser(req.header('authorization') ?? undefined);
    if (!viewer) {
      worldLog.warn('auth_required', { statusCode: 401 });
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const parsed = solanaLinkCompleteSchema.parse(req.body ?? {});
    const supabase = createServiceSupabaseClient();
    const now = new Date().toISOString();

    const { data: nonceRow, error: nonceError } = await supabase
      .from('world_app_auth_nonces')
      .select('id, profile_id, nonce, request_id, statement, expires_at, consumed_at')
      .eq('profile_id', viewer.id)
      .eq('nonce', parsed.nonce)
      .eq('request_id', parsed.requestId)
      .eq('purpose', 'solana_link')
      .maybeSingle();

    if (nonceError) {
      worldLog.error('nonce_lookup_failed', {
        statusCode: 500,
        profileIdHash: hashForLog(viewer.id),
        reason: nonceError.message,
      });
      res.status(500).json({ error: nonceError.message });
      return;
    }

    if (!nonceRow || nonceRow.consumed_at || new Date(nonceRow.expires_at).getTime() < Date.now()) {
      worldLog.warn('challenge_expired', {
        statusCode: 410,
        profileIdHash: hashForLog(viewer.id),
        requestIdHash: hashForLog(parsed.requestId),
      });
      res.status(410).json({ error: 'Solana link challenge expired. Start again.' });
      return;
    }

    if (parsed.message !== nonceRow.statement) {
      worldLog.warn('challenge_message_mismatch', {
        statusCode: 400,
        profileIdHash: hashForLog(viewer.id),
        requestIdHash: hashForLog(parsed.requestId),
      });
      res.status(400).json({ error: 'Solana challenge message mismatch.' });
      return;
    }

    if (!verifySolanaSignature(parsed.address, parsed.message, parsed.signatureBase64)) {
      worldLog.warn('solana_signature_invalid', {
        statusCode: 400,
        profileIdHash: hashForLog(viewer.id),
        walletHash: hashForLog(parsed.address),
      });
      res.status(400).json({ error: 'Solana wallet signature could not be verified.' });
      return;
    }

    const { data: identity, error: identityError } = await supabase
      .from('world_app_identities')
      .select('profile_id, verification_metadata')
      .eq('profile_id', viewer.id)
      .maybeSingle();

    if (identityError) {
      worldLog.error('identity_lookup_failed', {
        statusCode: 500,
        profileIdHash: hashForLog(viewer.id),
        walletHash: hashForLog(parsed.address),
        reason: identityError.message,
      });
      res.status(500).json({ error: identityError.message });
      return;
    }

    if (!identity) {
      worldLog.warn('world_identity_required', {
        statusCode: 409,
        profileIdHash: hashForLog(viewer.id),
      });
      res.status(409).json({ error: 'Bind a World wallet before linking Solana.' });
      return;
    }

    const currentCompetitive = readSolanaCompetitiveMetadata(identity.verification_metadata);
    const nextCompetitive: SolanaCompetitiveMetadata = {
      ...currentCompetitive,
      linkedWallet: {
        provider: 'solana',
        address: parsed.address,
        linkedAt: now,
      },
    };

    const { error: updateError } = await supabase
      .from('world_app_identities')
      .update({
        verification_metadata: mergeSolanaCompetitiveMetadata(identity.verification_metadata, nextCompetitive),
      })
      .eq('profile_id', viewer.id);

    if (updateError) {
      worldLog.error('identity_update_failed', {
        statusCode: 500,
        profileIdHash: hashForLog(viewer.id),
        walletHash: hashForLog(parsed.address),
        reason: updateError.message,
      });
      res.status(500).json({ error: updateError.message });
      return;
    }

    await supabase
      .from('world_app_auth_nonces')
      .update({ consumed_at: now })
      .eq('id', nonceRow.id);

    worldLog.info('solana_wallet_linked', {
      statusCode: 200,
      profileIdHash: hashForLog(viewer.id),
      walletHash: hashForLog(parsed.address),
    });

    res.json({
      ok: true,
      competitiveIdentity: buildCompetitiveIdentityPayload(nextCompetitive, [], {
        title: hasIssuedSeasonPass(nextCompetitive.roomPasses) ? 'Receipt-backed ranked' : 'Activate room pass',
        body: hasIssuedSeasonPass(nextCompetitive.roomPasses)
          ? 'Solana pass ready. Enter ranked and seal match receipts after play.'
          : 'Issue a room pass to enter the receipt-backed lane.',
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not complete Solana wallet link.';
    worldLog.warn('solana_link_exception', { statusCode: 400, reason: message });
    res.status(400).json({ error: message });
  }
});

app.post('/api/world/competitive/issue-room-pass', async (req, res) => {
  const worldLog = getWorldRequestLogger(req, res, 'world.competitive-issue-room-pass');

  try {
    const viewer = await requireAuthedUser(req.header('authorization') ?? undefined);
    if (!viewer) {
      worldLog.warn('auth_required', { statusCode: 401 });
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const parsed = issueRoomPassSchema.parse(req.body ?? {});
    const supabase = createServiceSupabaseClient();

    const { data: identity, error: identityError } = await supabase
      .from('world_app_identities')
      .select('profile_id, verification_metadata')
      .eq('profile_id', viewer.id)
      .maybeSingle();

    if (identityError) {
      worldLog.error('identity_lookup_failed', {
        statusCode: 500,
        profileIdHash: hashForLog(viewer.id),
        reason: identityError.message,
      });
      res.status(500).json({ error: identityError.message });
      return;
    }

    if (!identity) {
      worldLog.warn('world_identity_required', {
        statusCode: 409,
        profileIdHash: hashForLog(viewer.id),
      });
      res.status(409).json({ error: 'Bind a World wallet before issuing a room pass.' });
      return;
    }

    const currentCompetitive = readSolanaCompetitiveMetadata(identity.verification_metadata);
    if (!currentCompetitive.linkedWallet) {
      worldLog.warn('solana_wallet_required', {
        statusCode: 409,
        profileIdHash: hashForLog(viewer.id),
      });
      res.status(409).json({ error: 'Link a Solana wallet before issuing a room pass.' });
      return;
    }

    const gameKey = parsed.gameKey ? normalizeWorldQuickplayGameKey(parsed.gameKey) : null;
    const existingPass = currentCompetitive.roomPasses.find((pass) => {
      return (
        pass.scope === parsed.scope &&
        pass.accessMode === parsed.accessMode &&
        (pass.gameKey ?? null) === gameKey &&
        (pass.worldId ?? null) === (parsed.worldId ?? null) &&
        (pass.tournamentId ?? null) === (parsed.tournamentId ?? null) &&
        (pass.status === 'issued' || pass.status === 'finalized')
      );
    });

    const roomPass =
      existingPass ??
      ({
        id: randomUUID(),
        label:
          sanitizeWorldText(parsed.label, 96) ??
          (parsed.scope === 'seasonal'
            ? `${gameKey ? WORLD_QUICKPLAY_GAME_LABELS[gameKey] : 'BOARD'} season pass`
            : parsed.scope === 'event_series'
              ? 'Event series pass'
              : 'Room pass'),
        scope: parsed.scope,
        accessMode: parsed.accessMode,
        gameKey,
        worldId: parsed.worldId ?? null,
        tournamentId: parsed.tournamentId ?? null,
        status: 'issued',
        issuedAt: new Date().toISOString(),
      } satisfies SolanaRoomPass);

    const roomPasses = existingPass
      ? currentCompetitive.roomPasses
      : [roomPass, ...currentCompetitive.roomPasses].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));

    const nextCompetitive: SolanaCompetitiveMetadata = {
      ...currentCompetitive,
      roomPasses,
    };

    const { error: updateError } = await supabase
      .from('world_app_identities')
      .update({
        verification_metadata: mergeSolanaCompetitiveMetadata(identity.verification_metadata, nextCompetitive),
      })
      .eq('profile_id', viewer.id);

    if (updateError) {
      worldLog.error('room_pass_update_failed', {
        statusCode: 500,
        profileIdHash: hashForLog(viewer.id),
        reason: updateError.message,
      });
      res.status(500).json({ error: updateError.message });
      return;
    }

    worldLog.info('room_pass_issued', {
      statusCode: 200,
      profileIdHash: hashForLog(viewer.id),
      passIdHash: hashForLog(roomPass.id),
      scope: roomPass.scope,
      gameKey: roomPass.gameKey ?? undefined,
    });

    res.json({
      ok: true,
      roomPass,
      competitiveIdentity: buildCompetitiveIdentityPayload(nextCompetitive, [], {
        hasSeasonPass: hasIssuedSeasonPass(nextCompetitive.roomPasses, roomPass.gameKey),
        title: roomPass.scope === 'event_series' ? 'Event pass active' : 'Receipt-backed ranked',
        body:
          roomPass.scope === 'event_series'
            ? 'Event pass ready. Join the competitive bracket from the event page.'
            : 'Season pass active. Enter ranked and seal receipts after the board resolves.',
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not issue room pass.';
    worldLog.warn('room_pass_exception', { statusCode: 400, reason: message });
    res.status(400).json({ error: message });
  }
});

app.post('/api/world/competitive/issue-match-receipt', async (req, res) => {
  const worldLog = getWorldRequestLogger(req, res, 'world.competitive-issue-match-receipt');

  try {
    const viewer = await requireAuthedUser(req.header('authorization') ?? undefined);
    if (!viewer) {
      worldLog.warn('auth_required', { statusCode: 401 });
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const parsed = issueMatchReceiptSchema.parse(req.body ?? {});
    const supabase = createServiceSupabaseClient();

    const [{ data: identity, error: identityError }, { data: matchRows, error: matchError }, { data: ratingRows, error: ratingError }] =
      await Promise.all([
        supabase
          .from('world_app_identities')
          .select('profile_id, verification_metadata')
          .eq('profile_id', viewer.id)
          .maybeSingle(),
        supabase
          .from('match_players')
          .select('color, matches(id, status, game_key, tournament_id, result, winner, created_at, updated_at)')
          .eq('profile_id', viewer.id)
          .eq('match_id', parsed.matchId)
          .limit(1),
        supabase
          .from('rating_history')
          .select('match_id, rating_change')
          .eq('profile_id', viewer.id)
          .eq('match_id', parsed.matchId)
          .limit(1),
      ]);

    if (identityError) {
      worldLog.error('identity_lookup_failed', {
        statusCode: 500,
        profileIdHash: hashForLog(viewer.id),
        reason: identityError.message,
      });
      res.status(500).json({ error: identityError.message });
      return;
    }

    if (matchError) {
      worldLog.error('match_lookup_failed', {
        statusCode: 500,
        profileIdHash: hashForLog(viewer.id),
        matchIdHash: hashForLog(parsed.matchId),
        reason: matchError.message,
      });
      res.status(500).json({ error: matchError.message });
      return;
    }

    if (ratingError) {
      worldLog.error('rating_lookup_failed', {
        statusCode: 500,
        profileIdHash: hashForLog(viewer.id),
        matchIdHash: hashForLog(parsed.matchId),
        reason: ratingError.message,
      });
      res.status(500).json({ error: ratingError.message });
      return;
    }

    if (!identity) {
      worldLog.warn('world_identity_required', {
        statusCode: 409,
        profileIdHash: hashForLog(viewer.id),
      });
      res.status(409).json({ error: 'Bind a World wallet before issuing receipts.' });
      return;
    }

    const currentCompetitive = readSolanaCompetitiveMetadata(identity.verification_metadata);
    if (!currentCompetitive.linkedWallet) {
      worldLog.warn('solana_wallet_required', {
        statusCode: 409,
        profileIdHash: hashForLog(viewer.id),
      });
      res.status(409).json({ error: 'Link a Solana wallet before issuing receipts.' });
      return;
    }

    const playerRow = (matchRows ?? [])[0] as
      | {
          color: number | null;
          matches: Array<{
            id: string;
            status: string;
            game_key: string | null;
            tournament_id?: string | null;
            result?: string | null;
            winner?: number | null;
            created_at: string;
            updated_at?: string | null;
          }> | null;
        }
      | undefined;
    const match = Array.isArray(playerRow?.matches) ? playerRow.matches[0] ?? null : null;
    if (!match || match.status !== 'finished') {
      worldLog.warn('match_not_finished', {
        statusCode: 409,
        profileIdHash: hashForLog(viewer.id),
        matchIdHash: hashForLog(parsed.matchId),
      });
      res.status(409).json({ error: 'Finish the match before issuing a receipt.' });
      return;
    }

    const existingReceipt = currentCompetitive.matchReceipts.find((receipt) => receipt.matchId === parsed.matchId);
    const ratingChange = (ratingRows ?? [])[0]?.rating_change ?? null;
    const outcome =
      typeof ratingChange === 'number'
        ? ratingChange > 0
          ? 'win'
          : ratingChange < 0
            ? 'loss'
            : 'draw'
        : null;

    const receipt =
      existingReceipt ??
      ({
        id: randomUUID(),
        matchId: parsed.matchId,
        gameKey: normalizeWorldQuickplayGameKey(match.game_key),
        worldId: null,
        tournamentId: (match as any).tournament_id ?? null,
        status: 'issued',
        outcome,
        ratingChange: typeof ratingChange === 'number' ? ratingChange : null,
        issuedAt: new Date().toISOString(),
      } satisfies SolanaMatchReceipt);

    const matchReceipts = existingReceipt
      ? currentCompetitive.matchReceipts
      : [receipt, ...currentCompetitive.matchReceipts].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));

    const nextCompetitive: SolanaCompetitiveMetadata = {
      ...currentCompetitive,
      matchReceipts,
    };

    const { error: updateError } = await supabase
      .from('world_app_identities')
      .update({
        verification_metadata: mergeSolanaCompetitiveMetadata(identity.verification_metadata, nextCompetitive),
      })
      .eq('profile_id', viewer.id);

    if (updateError) {
      worldLog.error('receipt_update_failed', {
        statusCode: 500,
        profileIdHash: hashForLog(viewer.id),
        matchIdHash: hashForLog(parsed.matchId),
        reason: updateError.message,
      });
      res.status(500).json({ error: updateError.message });
      return;
    }

    worldLog.info('match_receipt_issued', {
      statusCode: 200,
      profileIdHash: hashForLog(viewer.id),
      matchIdHash: hashForLog(parsed.matchId),
      receiptIdHash: hashForLog(receipt.id),
    });

    res.json({
      ok: true,
      receipt,
      competitiveIdentity: buildCompetitiveIdentityPayload(nextCompetitive, [], {
        title: receipt.tournamentId ? 'Event receipt sealed' : 'Receipt-backed ranked',
        body: receipt.tournamentId
          ? 'Event result sealed. Competitive history is now portable.'
          : 'Receipt issued. Competitive history is now portable.',
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not issue match receipt.';
    worldLog.warn('match_receipt_exception', { statusCode: 400, reason: message });
    res.status(400).json({ error: message });
  }
});

app.post('/api/world/rp-signature', async (req, res) => {
  const worldLog = getWorldRequestLogger(req, res, 'world.rp-signature');

  try {
    const viewer = await requireAuthedUser(req.header('authorization') ?? undefined);
    if (!viewer) {
      worldLog.warn('auth_required', { statusCode: 401 });
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const parsed = rpSignatureSchema.parse(req.body ?? {});
    const rpId = getEnv('WORLD_ID_RP_ID');
    const signingKeyHex = getEnv('WORLD_ID_RP_SIGNING_KEY');
    const action = parsed.action ?? getWorldIdAction();

    if (!rpId || !signingKeyHex) {
      worldLog.error('rp_config_missing', {
        statusCode: 500,
        profileIdHash: hashForLog(viewer.id),
        hasRpId: Boolean(rpId),
        hasSigningKey: Boolean(signingKeyHex),
      });
      res.status(500).json({ error: 'WORLD_ID_RP_ID and WORLD_ID_RP_SIGNING_KEY are required.' });
      return;
    }

    const rpSignature = await signRequest({
      signingKeyHex,
      action,
    });

    worldLog.info('rp_signature_created', {
      statusCode: 200,
      profileIdHash: hashForLog(viewer.id),
      action,
      rpIdHash: hashForLog(rpId),
    });

    res.json({
      rp_id: rpId,
      action,
      ...rpSignature,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not sign World ID request.';
    worldLog.warn('rp_signature_exception', { statusCode: 400, reason: message });
    res.status(400).json({ error: message });
  }
});

app.post('/api/world/verify-id', async (req, res) => {
  const worldLog = getWorldRequestLogger(req, res, 'world.verify-id');

  try {
    const viewer = await requireAuthedUser(req.header('authorization') ?? undefined);
    if (!viewer) {
      worldLog.warn('auth_required', { statusCode: 401 });
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const parsed = idKitVerifySchema.parse(req.body ?? {});
    const rpId = getEnv('WORLD_ID_RP_ID');
    const action = parsed.action ?? getWorldIdAction();

    if (!rpId) {
      worldLog.error('rp_id_missing', {
        statusCode: 500,
        profileIdHash: hashForLog(viewer.id),
      });
      res.status(500).json({ error: 'WORLD_ID_RP_ID is required.' });
      return;
    }

    const nullifier = extractIdKitNullifier(parsed.idkitResponse);
    if (!nullifier) {
      worldLog.warn('nullifier_missing', {
        statusCode: 400,
        profileIdHash: hashForLog(viewer.id),
        action,
      });
      res.status(400).json({ error: 'World ID result did not include a nullifier.' });
      return;
    }

    const nullifierNumeric = toNumericString(nullifier);
    const protocolVersion =
      typeof (parsed.idkitResponse as any)?.protocol_version === 'string'
        ? (parsed.idkitResponse as any).protocol_version
        : null;

    const supabase = createServiceSupabaseClient();

    const { data: currentIdentity, error: currentIdentityError } = await supabase
      .from('world_app_identities')
      .select('profile_id, wallet_auth_at, verification_metadata')
      .eq('profile_id', viewer.id)
      .maybeSingle();

    if (currentIdentityError) {
      worldLog.error('identity_lookup_failed', {
        statusCode: 500,
        profileIdHash: hashForLog(viewer.id),
        nullifierHash: hashForLog(nullifier),
        reason: currentIdentityError.message,
      });
      res.status(500).json({ error: currentIdentityError.message });
      return;
    }

    if (!currentIdentity?.wallet_auth_at) {
      worldLog.warn('wallet_not_bound', {
        statusCode: 409,
        profileIdHash: hashForLog(viewer.id),
        nullifierHash: hashForLog(nullifier),
      });
      res.status(409).json({ error: 'Bind a World wallet before verifying human status.' });
      return;
    }

    const { data: existingNullifier, error: nullifierError } = await supabase
      .from('world_app_identities')
      .select('profile_id')
      .eq('idkit_nullifier', nullifier)
      .maybeSingle();

    if (nullifierError) {
      worldLog.error('nullifier_lookup_failed', {
        statusCode: 500,
        profileIdHash: hashForLog(viewer.id),
        nullifierHash: hashForLog(nullifier),
        reason: nullifierError.message,
      });
      res.status(500).json({ error: nullifierError.message });
      return;
    }

    if (existingNullifier && existingNullifier.profile_id !== viewer.id) {
      worldLog.warn('nullifier_conflict', {
        statusCode: 409,
        profileIdHash: hashForLog(viewer.id),
        existingProfileIdHash: hashForLog(existingNullifier.profile_id),
        nullifierHash: hashForLog(nullifier),
      });
      res.status(409).json({ error: 'This World ID proof is already linked to another BOARD profile.' });
      return;
    }

    const devPortalApiKey = getEnv('WORLD_DEV_PORTAL_API_KEY');
    const verifyHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (devPortalApiKey) {
      verifyHeaders.Authorization = `Bearer ${devPortalApiKey}`;
    }

    const verifyResponse = await fetch(`https://developer.world.org/api/v4/verify/${encodeURIComponent(rpId)}`, {
      method: 'POST',
      headers: verifyHeaders,
      body: JSON.stringify(parsed.idkitResponse),
    });

    const verifyText = await verifyResponse.text();
    let verifyJson: any = null;
    try {
      verifyJson = verifyText ? JSON.parse(verifyText) : null;
    } catch {
      verifyJson = { message: verifyText };
    }

    if (!verifyResponse.ok) {
      worldLog.warn('world_verify_rejected', {
        statusCode: verifyResponse.status,
        profileIdHash: hashForLog(viewer.id),
        nullifierHash: hashForLog(nullifier),
        action,
        reason: verifyJson?.detail ?? verifyJson?.message ?? 'World ID verification failed.',
      });
      res.status(verifyResponse.status).json({
        error: verifyJson?.detail ?? verifyJson?.message ?? 'World ID verification failed.',
      });
      return;
    }

    const now = new Date().toISOString();
    const verificationMetadata = {
      ...asMetadataRecord(currentIdentity.verification_metadata),
      idkit: verifyJson ?? {},
    };

    const { error: identityError } = await supabase
      .from('world_app_identities')
      .update({
        idkit_protocol_version: protocolVersion,
        idkit_action: action,
        idkit_nullifier: nullifier,
        idkit_nullifier_numeric: nullifierNumeric,
        idkit_verified_at: now,
        verification_metadata: verificationMetadata,
      })
      .eq('profile_id', viewer.id);

    if (identityError) {
      worldLog.error('identity_verify_update_failed', {
        statusCode: 500,
        profileIdHash: hashForLog(viewer.id),
        nullifierHash: hashForLog(nullifier),
        reason: identityError.message,
      });
      res.status(500).json({ error: identityError.message });
      return;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        is_verified_human: true,
        world_id_verified_at: now,
        world_id_nullifier: nullifier,
        world_id_protocol_version: protocolVersion,
        world_id_action: action,
      })
      .eq('id', viewer.id);

    if (profileError) {
      worldLog.error('profile_human_flag_update_failed', {
        statusCode: 500,
        profileIdHash: hashForLog(viewer.id),
        nullifierHash: hashForLog(nullifier),
        reason: profileError.message,
      });
      res.status(500).json({ error: profileError.message });
      return;
    }

    worldLog.info('idkit_verified', {
      statusCode: 200,
      profileIdHash: hashForLog(viewer.id),
      nullifierHash: hashForLog(nullifier),
      action,
      protocolVersion,
    });

    res.json({
      ok: true,
      verified: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not verify World ID proof.';
    worldLog.warn('idkit_verify_exception', { statusCode: 400, reason: message });
    res.status(400).json({ error: message });
  }
});

app.get('/api/world/quickplay/state', async (req, res) => {
  const worldLog = getWorldRequestLogger(req, res, 'world.quickplay-state');

  try {
    const viewer = await requireAuthedUser(req.header('authorization') ?? undefined);
    if (!viewer) {
      worldLog.warn('auth_required', { statusCode: 401 });
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const state = await getWorldQuickplayState(viewer.id);

    worldLog.info('state_loaded', {
      statusCode: 200,
      profileIdHash: hashForLog(viewer.id),
      walletBound: state.gates.walletBound,
      humanVerified: state.gates.humanVerified,
      competitiveGate: state.competitive.rankedGate.status,
      competitiveGameCount: state.competitive.games.length,
      activeRankedMatch: Boolean(state.competitive.activeMatch),
      leaderboardCount: state.competitive.leaderboard.length,
      recentResultCount: state.competitive.recentResults.length,
      roomCount: state.rooms.length,
      eventCount: state.events.length,
      worldCount: state.worlds.length,
    });

    res.json({
      ok: true,
      ...state,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'World Quickplay state failed.';
    worldLog.warn('state_exception', { statusCode: 400, reason: message });
    res.status(400).json({ error: message });
  }
});

app.post('/api/world/quickplay', async (req, res) => {
  const worldLog = getWorldRequestLogger(req, res, 'world.quickplay');

  try {
    const authHeader = req.header('authorization') ?? undefined;
    const viewer = await requireAuthedUser(authHeader);
    if (!viewer) {
      worldLog.warn('auth_required', { statusCode: 401 });
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const parsed = worldQuickplaySchema.parse(req.body ?? {});
    const serviceSupabase = createServiceSupabaseClient();

    const [{ data: identity, error: identityError }, { data: profile, error: profileError }] = await Promise.all([
      serviceSupabase
        .from('world_app_identities')
        .select('profile_id, wallet_auth_at, idkit_verified_at, verification_metadata')
        .eq('profile_id', viewer.id)
        .maybeSingle(),
      serviceSupabase
        .from('profiles')
        .select('id, is_verified_human, world_app_bound_at')
        .eq('id', viewer.id)
        .maybeSingle(),
    ]);

    if (identityError) {
      worldLog.error('identity_lookup_failed', {
        statusCode: 500,
        profileIdHash: hashForLog(viewer.id),
        reason: identityError.message,
      });
      res.status(500).json({ error: identityError.message });
      return;
    }

    if (profileError) {
      worldLog.error('profile_lookup_failed', {
        statusCode: 500,
        profileIdHash: hashForLog(viewer.id),
        reason: profileError.message,
      });
      res.status(500).json({ error: profileError.message });
      return;
    }

    const isWalletBound = Boolean(identity?.wallet_auth_at || profile?.world_app_bound_at);
    const isHumanVerified = Boolean(identity?.idkit_verified_at || profile?.is_verified_human);
    const solanaCompetitive = readSolanaCompetitiveMetadata(identity?.verification_metadata);
    const requestedAccessMode = 'competitiveAccessMode' in parsed ? parsed.competitiveAccessMode : undefined;
    const requestedWalletProvider = 'walletProvider' in parsed ? parsed.walletProvider : undefined;
    const requiresSolanaPass = requestedAccessMode === 'pass_required' && requestedWalletProvider === 'solana';

    if (!isWalletBound) {
      worldLog.warn('wallet_required', {
        statusCode: 409,
        profileIdHash: hashForLog(viewer.id),
        mode: parsed.mode,
      });
      res.status(409).json({
        error: 'Bind a World wallet before starting Quickplay.',
        errorCode: 'world_wallet_required',
      });
      return;
    }

    if (requiresSolanaPass && !solanaCompetitive.linkedWallet) {
      worldLog.warn('solana_wallet_required', {
        statusCode: 409,
        profileIdHash: hashForLog(viewer.id),
        mode: parsed.mode,
      });
      res.status(409).json({
        error: 'Link a Solana wallet before entering the pass-backed lane.',
        errorCode: 'solana_wallet_required',
      });
      return;
    }

    if (
      requiresSolanaPass &&
      ['ranked', 'ranked-rematch', 'resume-ranked'].includes(parsed.mode) &&
      !hasIssuedSeasonPass(solanaCompetitive.roomPasses, 'gameKey' in parsed ? parsed.gameKey : undefined)
    ) {
      worldLog.warn('solana_pass_required', {
        statusCode: 409,
        profileIdHash: hashForLog(viewer.id),
        mode: parsed.mode,
        gameKey: 'gameKey' in parsed ? parsed.gameKey : undefined,
      });
      res.status(409).json({
        error: 'Activate a room pass before entering the receipt-backed lane.',
        errorCode: 'solana_room_pass_required',
      });
      return;
    }

    if (['ranked', 'ranked-rematch', 'resume-ranked'].includes(parsed.mode) && !isHumanVerified) {
      worldLog.warn('verification_required', {
        statusCode: 409,
        profileIdHash: hashForLog(viewer.id),
        gameKey: 'gameKey' in parsed ? parsed.gameKey : undefined,
      });
      res.status(409).json({
        error: 'Verify to enter ranked.',
        errorCode: 'human_verification_required',
      });
      return;
    }

    const playSupabase = createAuthedSupabaseClient(authHeader);
    worldLog.info('quickplay_requested', {
      statusCode: 202,
      profileIdHash: hashForLog(viewer.id),
      mode: parsed.mode,
      gameKey: 'gameKey' in parsed ? parsed.gameKey : undefined,
      lobbyCodeHash: parsed.mode === 'join-room' ? hashForLog(parsed.code) : undefined,
    });

    if (parsed.mode === 'resume-ranked') {
      const activeMatch = await findWorldActiveRankedMatch(serviceSupabase, viewer.id, parsed.matchId);

      if (!activeMatch) {
        worldLog.warn('ranked_resume_not_found', {
          statusCode: 404,
          profileIdHash: hashForLog(viewer.id),
          matchIdHash: parsed.matchId ? hashForLog(parsed.matchId) : undefined,
        });
        res.status(404).json({
          error: 'No active ranked match to resume.',
          errorCode: 'ranked_match_not_found',
        });
        return;
      }

      const payload = {
        ok: true,
        mode: parsed.mode,
        gameKey: activeMatch.gameKey,
        walletProvider: requestedWalletProvider ?? null,
        competitiveAccessMode: requestedAccessMode,
        matchId: activeMatch.id,
        status: activeMatch.status,
        destination: activeMatch.destination,
        joined: activeMatch.status === 'active',
        waiting: activeMatch.status === 'waiting',
      };

      worldLog.info('quickplay_resumed', {
        statusCode: 200,
        profileIdHash: hashForLog(viewer.id),
        mode: parsed.mode,
        gameKey: activeMatch.gameKey,
        matchIdHash: hashForLog(activeMatch.id),
        matchStatus: activeMatch.status,
      });
      res.json(payload);
      return;
    }

    if (parsed.mode === 'ranked' || parsed.mode === 'ranked-rematch') {
      const rankedRequest =
        parsed.mode === 'ranked'
          ? { gameKey: parsed.gameKey, sourceMatchId: null as string | null }
          : await resolveWorldRankedRematch(serviceSupabase, viewer.id, {
              gameKey: parsed.gameKey,
              matchId: parsed.matchId,
            });

      if ('error' in rankedRequest) {
        const statusCode: number = rankedRequest.statusCode ?? 400;
        worldLog.warn('ranked_rematch_source_invalid', {
          statusCode,
          profileIdHash: hashForLog(viewer.id),
          matchIdHash: parsed.mode === 'ranked-rematch' && parsed.matchId ? hashForLog(parsed.matchId) : undefined,
          reason: rankedRequest.error,
        });
        res.status(statusCode).json({
          error: rankedRequest.error,
          errorCode: rankedRequest.errorCode,
        });
        return;
      }

      const { data, error } = await playSupabase.rpc('find_or_create_ranked_match_atomic', {
        p_game_key: rankedRequest.gameKey,
      });

      if (error) {
        worldLog.warn('rpc_failed', {
          statusCode: 400,
          profileIdHash: hashForLog(viewer.id),
          mode: parsed.mode,
          gameKey: rankedRequest.gameKey,
          reason: error.message,
        });
        res.status(400).json({ error: error.message || 'Ranked Quickplay failed.' });
        return;
      }

      const matchId = (data as any)?.matchId;
      if (!matchId) {
        worldLog.error('match_id_missing', {
          statusCode: 500,
          profileIdHash: hashForLog(viewer.id),
          gameKey: rankedRequest.gameKey,
        });
        res.status(500).json({ error: 'Quickplay did not return a match.' });
        return;
      }

      const payload = {
        ok: true,
        mode: parsed.mode,
        gameKey: rankedRequest.gameKey,
        walletProvider: requestedWalletProvider ?? null,
        competitiveAccessMode: requestedAccessMode,
        matchId,
        rematchOf: rankedRequest.sourceMatchId,
        destination: `/match/${matchId}`,
        joined: Boolean((data as any)?.joined),
        waiting: Boolean((data as any)?.waiting),
      };

      worldLog.info('quickplay_started', {
        statusCode: 200,
        profileIdHash: hashForLog(viewer.id),
        mode: parsed.mode,
        gameKey: rankedRequest.gameKey,
        matchIdHash: hashForLog(matchId),
        sourceMatchIdHash: rankedRequest.sourceMatchId ? hashForLog(rankedRequest.sourceMatchId) : undefined,
        joined: payload.joined,
        waiting: payload.waiting,
      });
      res.json(payload);
      return;
    }

    if (parsed.mode === 'room') {
      const { data, error } = await playSupabase.rpc('create_lobby_atomic', {
        p_game_key: parsed.gameKey,
      });

      if (error) {
        worldLog.warn('rpc_failed', {
          statusCode: 400,
          profileIdHash: hashForLog(viewer.id),
          mode: parsed.mode,
          gameKey: parsed.gameKey,
          reason: error.message,
        });
        res.status(400).json({ error: error.message || 'Could not open room.' });
        return;
      }

      const lobby = (data as any)?.lobby;
      if (!lobby?.id) {
        worldLog.error('lobby_id_missing', {
          statusCode: 500,
          profileIdHash: hashForLog(viewer.id),
          gameKey: parsed.gameKey,
        });
        res.status(500).json({ error: 'Quickplay did not return a room.' });
        return;
      }

      const payload = {
        ok: true,
        mode: parsed.mode,
        gameKey: parsed.gameKey,
        walletProvider: requestedWalletProvider ?? null,
        competitiveAccessMode: requestedAccessMode,
        lobby,
        code: (data as any)?.code ?? lobby.code ?? null,
        destination: `/lobby/${lobby.id}`,
      };

      worldLog.info('quickplay_started', {
        statusCode: 200,
        profileIdHash: hashForLog(viewer.id),
        mode: parsed.mode,
        gameKey: parsed.gameKey,
        lobbyIdHash: hashForLog(lobby.id),
        lobbyCodeHash: hashForLog(payload.code),
      });
      res.json(payload);
      return;
    }

    const { data, error } = await playSupabase.rpc('join_lobby_by_code_atomic', {
      p_code: parsed.code,
    });

    if (error) {
      worldLog.warn('rpc_failed', {
        statusCode: 400,
        profileIdHash: hashForLog(viewer.id),
        mode: parsed.mode,
        lobbyCodeHash: hashForLog(parsed.code),
        reason: error.message,
      });
      res.status(400).json({ error: error.message || 'Could not join room.' });
      return;
    }

    const lobby = (data as any)?.lobby;
    if (!lobby?.id) {
      worldLog.error('lobby_id_missing', {
        statusCode: 500,
        profileIdHash: hashForLog(viewer.id),
        lobbyCodeHash: hashForLog(parsed.code),
      });
      res.status(500).json({ error: 'Quickplay did not return a room.' });
      return;
    }

    const payload = {
      ok: true,
      mode: parsed.mode,
      lobby,
      code: lobby.code ?? parsed.code,
      destination: `/lobby/${lobby.id}`,
    };

    worldLog.info('quickplay_started', {
      statusCode: 200,
      profileIdHash: hashForLog(viewer.id),
      mode: parsed.mode,
      lobbyIdHash: hashForLog(lobby.id),
      lobbyCodeHash: hashForLog(payload.code),
    });
    res.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'World Quickplay failed.';
    worldLog.warn('quickplay_exception', { statusCode: 400, reason: message });
    res.status(400).json({ error: message });
  }
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
    const viewer = await requireAuthedUser(authHeader);

    if (!viewer) {
      res.status(401).json({ error: 'Authentication required for chat.' });
      return;
    }

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

app.use(
  express.static(distDir, {
    index: false,
    setHeaders: (res, filePath) => {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return;
      }

      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  }),
);

app.get(/^(?!\/api(?:\/|$)).*/, async (_req, res) => {
  try {
    const html = await fs.readFile(indexHtmlPath, 'utf8');
    res.setHeader('Cache-Control', 'no-cache');
    res.type('html').send(injectRuntimeEnv(html));
  } catch {
    res.status(500).send('Build output not found. Run npm run build:railway first.');
  }
});

export function startServer(port = Number.parseInt(process.env.PORT ?? '3001', 10)) {
  return app.listen(port, () => {
    console.log(`Hexology Railway server listening on port ${port}`);
  });
}

if (process.env.NODE_ENV !== 'test' && process.env.HEXLOGY_SKIP_SERVER_LISTEN !== '1') {
  startServer();
}
