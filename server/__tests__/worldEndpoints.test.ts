import { generateKeyPairSync, sign as signMessage } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

type TableName =
  | 'world_app_auth_nonces'
  | 'world_app_identities'
  | 'profiles'
  | 'lobbies'
  | 'lobby_players'
  | 'match_players'
  | 'tournaments'
  | 'tournament_participants'
  | 'worlds'
  | 'matches'
  | 'player_ratings'
  | 'rating_history';
type Row = Record<string, any>;

const mocks = vi.hoisted(() => ({
  state: {
    world_app_auth_nonces: [] as Row[],
    world_app_identities: [] as Row[],
    profiles: [] as Row[],
    lobbies: [] as Row[],
    lobby_players: [] as Row[],
    match_players: [] as Row[],
    tournaments: [] as Row[],
    tournament_participants: [] as Row[],
    worlds: [] as Row[],
    matches: [] as Row[],
    player_ratings: [] as Row[],
    rating_history: [] as Row[],
  },
  createClient: vi.fn(),
  verifySiweMessage: vi.fn(),
  signRequest: vi.fn(),
  worldVerifyFetch: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => {
  class Query {
    private action: 'select' | 'insert' | 'update' | 'upsert' = 'select';
    private filters: Array<[string, any]> = [];
    private inFilters: Array<[string, any[]]> = [];
    private payload: Row | Row[] | null = null;
    private onConflict = '';
    private limitCount: number | null = null;
    private orders: Array<{ column: string; ascending: boolean }> = [];

    constructor(private tableName: TableName) {}

    select() {
      this.action = this.action === 'select' ? 'select' : this.action;
      return this;
    }

    eq(column: string, value: any) {
      this.filters.push([column, value]);
      return this;
    }

    in(column: string, values: any[]) {
      this.inFilters.push([column, values]);
      return this;
    }

    order(column: string, options?: { ascending?: boolean }) {
      this.orders.push({ column, ascending: options?.ascending ?? true });
      return this;
    }

    limit(count: number) {
      this.limitCount = count;
      return this;
    }

    insert(payload: Row | Row[]) {
      this.action = 'insert';
      this.payload = payload;
      return this;
    }

    update(payload: Row) {
      this.action = 'update';
      this.payload = payload;
      return this;
    }

    upsert(payload: Row, options?: { onConflict?: string }) {
      this.action = 'upsert';
      this.payload = payload;
      this.onConflict = options?.onConflict ?? '';
      return this;
    }

    maybeSingle() {
      return this.execute('maybeSingle');
    }

    single() {
      return this.execute('single');
    }

    then<TResult1 = any, TResult2 = never>(
      onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
    ) {
      return this.execute().then(onfulfilled, onrejected);
    }

    private rows() {
      return mocks.state[this.tableName];
    }

    private matches(row: Row) {
      return (
        this.filters.every(([column, value]) => row[column] === value) &&
        this.inFilters.every(([column, values]) => values.includes(row[column]))
      );
    }

    private filteredRows() {
      const rows = this.rows().filter((row) => this.matches(row));
      for (const order of [...this.orders].reverse()) {
        rows.sort((a, b) => {
          const av = a[order.column];
          const bv = b[order.column];
          if (av === bv) return 0;
          if (av === null || av === undefined) return 1;
          if (bv === null || bv === undefined) return -1;
          return (av > bv ? 1 : -1) * (order.ascending ? 1 : -1);
        });
      }
      return this.limitCount === null ? rows : rows.slice(0, this.limitCount);
    }

    private async execute(mode?: 'maybeSingle' | 'single') {
      if (this.action === 'insert') {
        const payloads = Array.isArray(this.payload) ? this.payload : [this.payload];
        for (const payload of payloads) {
          if (!payload) continue;
          this.rows().push({
            id: payload.id ?? `mock-${this.tableName}-${this.rows().length + 1}`,
            ...payload,
          });
        }
        return { data: null, error: null };
      }

      if (this.action === 'update') {
        for (const row of this.filteredRows()) {
          Object.assign(row, this.payload);
        }
        return { data: null, error: null };
      }

      if (this.action === 'upsert') {
        const payload = this.payload as Row;
        const conflictColumn = this.onConflict || 'id';
        const existing = this.rows().find((row) => row[conflictColumn] === payload[conflictColumn]);
        const row = existing ?? { id: payload.id ?? `mock-${this.tableName}-${this.rows().length + 1}` };
        Object.assign(row, payload);
        if (!existing) this.rows().push(row);

        if (mode === 'single' || mode === 'maybeSingle') {
          return { data: row, error: null };
        }
        return { data: null, error: null };
      }

      const rows = this.filteredRows();
      if (mode === 'maybeSingle') {
        return { data: rows[0] ?? null, error: null };
      }
      if (mode === 'single') {
        return rows[0]
          ? { data: rows[0], error: null }
          : { data: null, error: { message: `No ${this.tableName} row found.` } };
      }

      return { data: rows, error: null };
    }
  }

  const serviceClient = {
    from: (tableName: TableName) => new Query(tableName),
  };

  const authClient = {
    auth: {
      getUser: vi.fn(async (token: string) => {
        if (token === 'valid-token') {
          return { data: { user: { id: 'user-1' } }, error: null };
        }

        return { data: { user: null }, error: { message: 'Invalid token.' } };
      }),
    },
    rpc: mocks.rpc,
  };

  mocks.createClient.mockImplementation((_url: string, key: string) => {
    return key === 'service-key' ? serviceClient : authClient;
  });

  return {
    createClient: mocks.createClient,
  };
});

vi.mock('@worldcoin/minikit-js/siwe', () => ({
  verifySiweMessage: mocks.verifySiweMessage,
}));

vi.mock('@worldcoin/idkit/signing', () => ({
  signRequest: mocks.signRequest,
}));

let app: Awaited<typeof import('../index')>['app'];
let server: Server;
let baseUrl = '';
const realFetch = globalThis.fetch.bind(globalThis);
let consoleSpies: Array<ReturnType<typeof vi.spyOn>> = [];

function resetState() {
  mocks.state.world_app_auth_nonces = [];
  mocks.state.world_app_identities = [];
  mocks.state.profiles = [{ id: 'user-1', is_verified_human: false }];
  mocks.state.lobbies = [];
  mocks.state.lobby_players = [];
  mocks.state.match_players = [];
  mocks.state.tournaments = [];
  mocks.state.tournament_participants = [];
  mocks.state.worlds = [];
  mocks.state.matches = [];
  mocks.state.player_ratings = [];
  mocks.state.rating_history = [];
}

function seedNonce(overrides: Partial<Row> = {}) {
  const row = {
    id: 'nonce-1',
    profile_id: 'user-1',
    nonce: 'nonce-123',
    request_id: 'request-1',
    statement: 'Sign in to BOARD World App.',
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    consumed_at: null,
    ...overrides,
  };

  mocks.state.world_app_auth_nonces.push(row);
  return row;
}

function seedWorldIdentity(overrides: Partial<Row> = {}) {
  const row = {
    profile_id: 'user-1',
    wallet_address: '0xabc',
    wallet_auth_at: '2026-04-29T00:00:00.000Z',
    idkit_verified_at: null,
    verification_metadata: {},
    ...overrides,
  };

  mocks.state.world_app_identities.push(row);
  return row;
}

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function encodeBase58(bytes: Uint8Array) {
  if (!bytes.length) return '';

  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let index = 0; index < digits.length; index += 1) {
      const next = digits[index] * 256 + carry;
      digits[index] = next % 58;
      carry = Math.floor(next / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }

  let leadingZeroes = 0;
  for (const byte of bytes) {
    if (byte === 0) leadingZeroes += 1;
    else break;
  }

  return `${'1'.repeat(leadingZeroes)}${digits.reverse().map((digit) => BASE58_ALPHABET[digit]).join('')}`;
}

function createSignedSolanaPayload(message: string) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const publicKeyDer = publicKey.export({ format: 'der', type: 'spki' }) as Buffer;
  const rawPublicKey = publicKeyDer.subarray(-32);
  const address = encodeBase58(rawPublicKey);
  const signature = signMessage(null, Buffer.from(message, 'utf8'), privateKey);

  return {
    address,
    signatureBase64: signature.toString('base64'),
  };
}

async function post(path: string, body: unknown = {}, token = 'valid-token') {
  return realFetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function get(path: string, token = 'valid-token') {
  return realFetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

beforeAll(async () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  process.env.WORLD_ID_RP_ID = 'app_test_rp';
  process.env.WORLD_ID_RP_SIGNING_KEY = '0xabc123';
  process.env.WORLD_ID_ACTION = 'verify-board-player';
  process.env.WORLD_WALLET_AUTH_STATEMENT = 'Sign in to BOARD World App.';

  app = (await import('../index')).app;
});

beforeEach(() => {
  resetState();
  vi.clearAllMocks();
  consoleSpies = [
    vi.spyOn(console, 'info').mockImplementation(() => undefined),
    vi.spyOn(console, 'warn').mockImplementation(() => undefined),
    vi.spyOn(console, 'error').mockImplementation(() => undefined),
  ];

  mocks.verifySiweMessage.mockResolvedValue({
    isValid: true,
    siweMessageData: {
      address: '0xabc',
      domain: 'world.org',
      uri: 'https://world.org',
      chain_id: 480,
      issued_at: '2026-04-29T00:00:00.000Z',
    },
  });

  mocks.signRequest.mockResolvedValue({
    sig: 'rp-signature',
    nonce: 'rp-nonce',
    createdAt: 1,
    expiresAt: 2,
  });
  mocks.rpc.mockResolvedValue({
    data: {
      matchId: 'match-1',
      joined: true,
      waiting: false,
    },
    error: null,
  });

  mocks.worldVerifyFetch.mockResolvedValue(
    new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
    if (url.startsWith('https://developer.world.org/api/v4/verify/')) {
      return mocks.worldVerifyFetch(input, init);
    }

    return realFetch(input, init);
  });

  server = app.listen(0);
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  vi.unstubAllGlobals();
  for (const spy of consoleSpies) {
    spy.mockRestore();
  }

  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

describe('World App API routes', () => {
  it.each([
    '/api/world/nonce',
    '/api/world/complete-wallet-auth',
    '/api/world/solana/challenge',
    '/api/world/solana/complete-link',
    '/api/world/competitive/issue-room-pass',
    '/api/world/competitive/issue-match-receipt',
    '/api/world/rp-signature',
    '/api/world/verify-id',
    '/api/world/quickplay',
  ])('requires a bearer token for %s', async (route) => {
    const response = await post(route, {}, '');
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('Authentication required.');
  });

  it('requires a bearer token for Quickplay state', async () => {
    const response = await get('/api/world/quickplay/state', '');
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('Authentication required.');
  });

  it('emits a structured request id header and redacted auth log', async () => {
    const response = await post('/api/world/nonce', {}, '');
    const payload = await response.json();
    const warn = vi.mocked(console.warn);
    const log = JSON.parse(String(warn.mock.calls[0]?.[0] ?? '{}'));

    expect(response.status).toBe(401);
    expect(response.headers.get('x-board-request-id')).toMatch(/[0-9a-f-]{36}/);
    expect(payload.error).toBe('Authentication required.');
    expect(log).toMatchObject({
      service: 'board-world-auth',
      level: 'warn',
      route: 'world.nonce',
      event: 'auth_required',
      statusCode: 401,
    });
    expect(JSON.stringify(log)).not.toContain('valid-token');
  });

  it('creates a nonce shape for wallet auth', async () => {
    const response = await post('/api/world/nonce');
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      nonce: expect.any(String),
      requestId: expect.any(String),
      statement: 'Sign in to BOARD World App.',
      expirationTime: expect.any(String),
    });
    expect(mocks.state.world_app_auth_nonces).toHaveLength(1);
    expect(mocks.state.world_app_auth_nonces[0]).toMatchObject({
      profile_id: 'user-1',
      nonce: payload.nonce,
      request_id: payload.requestId,
    });
  });

  it('rejects expired wallet auth nonces before SIWE verification', async () => {
    seedNonce({
      expires_at: new Date(Date.now() - 1000).toISOString(),
    });

    const response = await post('/api/world/complete-wallet-auth', {
      nonce: 'nonce-123',
      requestId: 'request-1',
      payload: {
        address: '0xabc',
        message: 'message',
        signature: 'signature',
        version: 1,
      },
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('World auth nonce is invalid or expired.');
    expect(mocks.verifySiweMessage).not.toHaveBeenCalled();
  });

  it('rejects a wallet already bound to another profile', async () => {
    seedNonce();
    mocks.state.world_app_identities.push({
      profile_id: 'user-2',
      wallet_address: '0xabc',
      wallet_auth_at: '2026-04-29T00:00:00.000Z',
    });

    const response = await post('/api/world/complete-wallet-auth', {
      nonce: 'nonce-123',
      requestId: 'request-1',
      payload: {
        address: '0xAbC',
        message: 'message',
        signature: 'signature',
        version: 1,
      },
      worldUser: {
        username: 'board_player',
        profilePictureUrl: 'https://world.org/avatar.png',
      },
    });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toBe('This World wallet is already bound to another BOARD profile.');
  });

  it('returns backend-signed RP context for IDKit', async () => {
    const response = await post('/api/world/rp-signature', {
      action: 'verify-board-player',
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.signRequest).toHaveBeenCalledWith({
      signingKeyHex: '0xabc123',
      action: 'verify-board-player',
    });
    expect(payload).toMatchObject({
      rp_id: 'app_test_rp',
      action: 'verify-board-player',
      sig: 'rp-signature',
      nonce: 'rp-nonce',
      createdAt: 1,
      expiresAt: 2,
    });
  });

  it('rejects an IDKit nullifier already bound to another profile', async () => {
    mocks.state.world_app_identities.push(
      {
        profile_id: 'user-1',
        wallet_auth_at: '2026-04-29T00:00:00.000Z',
        verification_metadata: { siwe: { domain: 'world.org' } },
      },
      {
        profile_id: 'user-2',
        idkit_nullifier: '0xabc',
      },
    );

    const response = await post('/api/world/verify-id', {
      action: 'verify-board-player',
      idkitResponse: {
        nullifier_hash: '0xabc',
      },
    });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toBe('This World ID proof is already linked to another BOARD profile.');
    expect(mocks.worldVerifyFetch).not.toHaveBeenCalled();
  });

  it('preserves wallet metadata when storing successful IDKit verification', async () => {
    mocks.state.world_app_identities.push({
      profile_id: 'user-1',
      wallet_auth_at: '2026-04-29T00:00:00.000Z',
      verification_metadata: { siwe: { domain: 'world.org' } },
    });

    const response = await post('/api/world/verify-id', {
      action: 'verify-board-player',
      idkitResponse: {
        nullifier_hash: '0xabc',
        protocol_version: 'v2',
      },
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true, verified: true });
    expect(mocks.worldVerifyFetch).toHaveBeenCalledWith(
      'https://developer.world.org/api/v4/verify/app_test_rp',
      expect.objectContaining({
        method: 'POST',
      }),
    );

    expect(mocks.state.world_app_identities[0]).toMatchObject({
      idkit_protocol_version: 'v2',
      idkit_action: 'verify-board-player',
      idkit_nullifier: '0xabc',
      idkit_nullifier_numeric: '2748',
      verification_metadata: {
        siwe: { domain: 'world.org' },
        idkit: { success: true },
      },
    });
    expect(mocks.state.profiles[0]).toMatchObject({
      is_verified_human: true,
      world_id_nullifier: '0xabc',
      world_id_protocol_version: 'v2',
      world_id_action: 'verify-board-player',
    });
  });

  it('requires a World-bound wallet before Quickplay commands', async () => {
    const response = await post('/api/world/quickplay', {
      mode: 'room',
      gameKey: 'hex',
    });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toMatchObject({
      error: 'Bind a World wallet before starting Quickplay.',
      errorCode: 'world_wallet_required',
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('loads Quickplay console state from Railway with gate flags and room counts', async () => {
    mocks.state.profiles[0] = {
      ...mocks.state.profiles[0],
      username: 'guest-1',
      world_username: 'world_guest',
      world_app_bound_at: '2026-04-29T00:00:00.000Z',
      is_verified_human: true,
    };
    seedWorldIdentity({
      world_username: 'world_guest',
      profile_picture_url: 'https://world.org/avatar.png',
      idkit_verified_at: '2026-04-29T00:00:00.000Z',
      verification_metadata: {
        solanaCompetitive: {
          linkedWallet: {
            provider: 'solana',
            address: 'So1anaWallet1111111111111111111111111111111',
            linkedAt: '2026-04-29T00:00:00.000Z',
          },
          roomPasses: [
            {
              id: 'pass-1',
              label: 'Hex season pass',
              scope: 'seasonal',
              accessMode: 'pass_required',
              gameKey: 'hex',
              worldId: null,
              tournamentId: null,
              status: 'issued',
              issuedAt: '2026-04-29T00:00:00.000Z',
            },
          ],
          matchReceipts: [
            {
              id: 'receipt-1',
              matchId: 'match-old',
              gameKey: 'hex',
              worldId: null,
              tournamentId: null,
              status: 'issued',
              outcome: 'win',
              ratingChange: 18,
              issuedAt: '2026-04-29T00:30:00.000Z',
            },
          ],
        },
      },
    });
    mocks.state.lobbies.push(
      {
        id: 'lobby-1',
        code: 'ABCD',
        game_key: 'hex',
        board_size: 11,
        status: 'waiting',
        created_at: '2026-04-29T00:00:00.000Z',
        world_id: 'world-1',
      },
      {
        id: 'lobby-2',
        code: 'FULL',
        game_key: 'connect4',
        board_size: 7,
        status: 'active',
        created_at: '2026-04-29T00:00:00.000Z',
        world_id: 'world-1',
      },
    );
    mocks.state.lobby_players.push(
      { lobby_id: 'lobby-1' },
      { lobby_id: 'lobby-1' },
      { lobby_id: 'lobby-2' },
    );
    mocks.state.tournaments.push({
      id: 'event-1',
      name: 'Lunch Bracket',
      status: 'registration',
      competitive_mode: true,
      start_time: null,
      max_players: 8,
    });
    mocks.state.worlds.push({
      id: 'world-1',
      slug: 'public-room',
      name: 'Public Room',
      description: 'Open play',
      visibility: 'public',
      created_at: '2026-04-29T00:00:00.000Z',
      updated_at: '2026-04-29T00:00:00.000Z',
    });
    mocks.state.matches.push({
      id: 'match-1',
      world_id: 'world-1',
      status: 'active',
      game_key: 'hex',
      is_ranked: true,
      created_at: '2026-04-29T00:00:00.000Z',
      updated_at: '2026-04-29T00:05:00.000Z',
    });
    mocks.state.match_players.push({
      match_id: 'match-1',
      profile_id: 'user-1',
      color: 1,
      created_at: '2026-04-29T00:00:00.000Z',
      matches: {
        id: 'match-1',
        status: 'active',
        game_key: 'hex',
        is_ranked: true,
        created_at: '2026-04-29T00:00:00.000Z',
        updated_at: '2026-04-29T00:05:00.000Z',
      },
    });
    mocks.state.player_ratings.push(
      {
        profile_id: 'user-2',
        game_key: 'hex',
        elo_rating: 1420,
        games_rated: 11,
        updated_at: '2026-04-28T00:00:00.000Z',
        profiles: {
          id: 'user-2',
          username: 'top_player',
          avatar_color: 'blue',
          is_verified_human: true,
        },
      },
      {
        profile_id: 'user-1',
        game_key: 'hex',
        elo_rating: 1288,
        games_rated: 7,
        updated_at: '2026-04-29T00:00:00.000Z',
        profiles: {
          id: 'user-1',
          username: 'guest-1',
          avatar_color: 'green',
          is_verified_human: true,
        },
      },
      {
        profile_id: 'user-1',
        game_key: 'chess',
        elo_rating: 1190,
        games_rated: 1,
        updated_at: '2026-04-29T00:00:00.000Z',
      },
    );
    mocks.state.rating_history.push({
      id: 'rating-1',
      profile_id: 'user-1',
      match_id: 'match-old',
      game_key: 'hex',
      old_rating: 1270,
      new_rating: 1288,
      rating_change: 18,
      created_at: '2026-04-28T00:00:00.000Z',
    });

    const response = await get('/api/world/quickplay/state');
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      profile: {
        username: 'guest-1',
        world_username: 'world_guest',
        is_verified_human: true,
      },
      gates: {
        walletBound: true,
        humanVerified: true,
        canOpenRoom: true,
        canEnterRanked: true,
      },
      competitiveIdentity: {
        linkedWallet: expect.objectContaining({
          provider: 'solana',
        }),
        roomPasses: [
          expect.objectContaining({
            id: 'pass-1',
            scope: 'seasonal',
          }),
        ],
        recentReceipts: [
          expect.objectContaining({
            id: 'receipt-1',
            matchId: 'match-old',
          }),
        ],
        tournamentEntries: [],
        profile: {
          passCount: 1,
          eventEntryCount: 0,
          receiptCount: 1,
          latestReceiptAt: '2026-04-29T00:30:00.000Z',
        },
        solanaLane: expect.objectContaining({
          walletLinked: true,
          hasSeasonPass: true,
        }),
      },
      rooms: [
        expect.objectContaining({
          id: 'lobby-1',
          code: 'ABCD',
          playerCount: 2,
        }),
      ],
      events: [
        expect.objectContaining({
          id: 'event-1',
          name: 'Lunch Bracket',
        }),
      ],
      worlds: [
        expect.objectContaining({
          id: 'world-1',
          name: 'Public Room',
          instanceCount: 2,
        }),
      ],
      competitive: {
        rankedGate: expect.objectContaining({
          status: 'ready',
        }),
        solanaLane: expect.objectContaining({
          walletLinked: true,
          hasSeasonPass: true,
        }),
        activeMatch: expect.objectContaining({
          id: 'match-1',
          gameKey: 'hex',
          status: 'active',
          destination: '/match/match-1',
        }),
        games: expect.arrayContaining([
          expect.objectContaining({
            gameKey: 'hex',
            label: 'Hex',
            rating: 1288,
            gamesRated: 7,
            rank: 2,
            queue: {
              waiting: 0,
              active: 1,
            },
            canEnterRanked: true,
          }),
        ]),
        leaderboard: [
          expect.objectContaining({
            profileId: 'user-2',
            username: 'top_player',
            rating: 1420,
            rank: 1,
          }),
          expect.objectContaining({
            profileId: 'user-1',
            username: 'guest-1',
            rating: 1288,
            rank: 2,
          }),
          expect.objectContaining({
            profileId: 'user-1',
            gameKey: 'chess',
            rating: 1190,
            rank: 3,
          }),
        ],
        recentResults: [
          expect.objectContaining({
            id: 'rating-1',
            matchId: 'match-old',
            gameKey: 'hex',
            ratingChange: 18,
            outcome: 'win',
          }),
        ],
        events: [
          expect.objectContaining({
            id: 'event-1',
            name: 'Lunch Bracket',
          }),
        ],
      },
    });
  });

  it('opens an unranked Quickplay room through the lobby RPC', async () => {
    seedWorldIdentity();
    mocks.rpc.mockResolvedValueOnce({
      data: {
        lobby: {
          id: 'lobby-1',
          code: 'ABCD',
        },
        code: 'ABCD',
      },
      error: null,
    });

    const response = await post('/api/world/quickplay', {
      mode: 'room',
      gameKey: 'connect4',
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('create_lobby_atomic', {
      p_game_key: 'connect4',
    });
    expect(payload).toMatchObject({
      ok: true,
      mode: 'room',
      gameKey: 'connect4',
      code: 'ABCD',
      destination: '/lobby/lobby-1',
    });
  });

  it('requires human verification before ranked Quickplay', async () => {
    seedWorldIdentity();

    const response = await post('/api/world/quickplay', {
      mode: 'ranked',
      gameKey: 'hex',
    });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toMatchObject({
      error: 'Verify to enter ranked.',
      errorCode: 'human_verification_required',
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('links a Solana wallet through a signed challenge', async () => {
    seedWorldIdentity({
      verification_metadata: {
        siwe: { domain: 'world.org' },
      },
    });

    const challengeResponse = await post('/api/world/solana/challenge');
    const challenge = await challengeResponse.json();
    const signature = createSignedSolanaPayload(challenge.message);

    const response = await post('/api/world/solana/complete-link', {
      nonce: challenge.nonce,
      requestId: challenge.requestId,
      provider: 'solana',
      address: signature.address,
      message: challenge.message,
      signatureBase64: signature.signatureBase64,
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.competitiveIdentity.linkedWallet).toMatchObject({
      provider: 'solana',
      address: signature.address,
    });
    expect(mocks.state.world_app_identities[0].verification_metadata.solanaCompetitive.linkedWallet).toMatchObject({
      provider: 'solana',
      address: signature.address,
    });
    expect(mocks.state.world_app_auth_nonces[0].purpose).toBe('solana_link');
    expect(mocks.state.world_app_auth_nonces[0].consumed_at).toEqual(expect.any(String));
  });

  it('issues a seasonal room pass for a linked Solana wallet', async () => {
    seedWorldIdentity({
      verification_metadata: {
        solanaCompetitive: {
          linkedWallet: {
            provider: 'solana',
            address: 'So1anaWallet1111111111111111111111111111111',
            linkedAt: '2026-04-29T00:00:00.000Z',
          },
          roomPasses: [],
          matchReceipts: [],
        },
      },
    });

    const response = await post('/api/world/competitive/issue-room-pass', {
      scope: 'seasonal',
      accessMode: 'pass_required',
      gameKey: 'hex',
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.roomPass).toMatchObject({
      scope: 'seasonal',
      accessMode: 'pass_required',
      gameKey: 'hex',
      status: 'issued',
    });
    expect(mocks.state.world_app_identities[0].verification_metadata.solanaCompetitive.roomPasses).toHaveLength(1);
  });

  it('blocks pass-backed ranked matchmaking when the Solana pass is missing', async () => {
    seedWorldIdentity({
      idkit_verified_at: '2026-04-29T00:00:00.000Z',
      verification_metadata: {
        solanaCompetitive: {
          linkedWallet: {
            provider: 'solana',
            address: 'So1anaWallet1111111111111111111111111111111',
            linkedAt: '2026-04-29T00:00:00.000Z',
          },
          roomPasses: [],
          matchReceipts: [],
        },
      },
    });

    const response = await post('/api/world/quickplay', {
      mode: 'ranked',
      gameKey: 'hex',
      competitiveAccessMode: 'pass_required',
      walletProvider: 'solana',
    });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toMatchObject({
      error: 'Activate a room pass before entering the receipt-backed lane.',
      errorCode: 'solana_room_pass_required',
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('starts ranked Quickplay for verified World-bound users', async () => {
    seedWorldIdentity({ idkit_verified_at: '2026-04-29T00:00:00.000Z' });
    mocks.rpc.mockResolvedValueOnce({
      data: {
        matchId: 'match-1',
        joined: false,
        waiting: true,
      },
      error: null,
    });

    const response = await post('/api/world/quickplay', {
      mode: 'ranked',
      gameKey: 'hex',
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('find_or_create_ranked_match_atomic', {
      p_game_key: 'hex',
    });
    expect(payload).toMatchObject({
      ok: true,
      mode: 'ranked',
      gameKey: 'hex',
      matchId: 'match-1',
      destination: '/match/match-1',
      joined: false,
      waiting: true,
    });
  });

  it('starts pass-backed ranked Quickplay when Solana access is ready', async () => {
    seedWorldIdentity({
      idkit_verified_at: '2026-04-29T00:00:00.000Z',
      verification_metadata: {
        solanaCompetitive: {
          linkedWallet: {
            provider: 'solana',
            address: 'So1anaWallet1111111111111111111111111111111',
            linkedAt: '2026-04-29T00:00:00.000Z',
          },
          roomPasses: [
            {
              id: 'pass-1',
              label: 'Hex season pass',
              scope: 'seasonal',
              accessMode: 'pass_required',
              gameKey: 'hex',
              worldId: null,
              tournamentId: null,
              status: 'issued',
              issuedAt: '2026-04-29T00:00:00.000Z',
            },
          ],
          matchReceipts: [],
        },
      },
    });
    mocks.rpc.mockResolvedValueOnce({
      data: {
        matchId: 'match-sol',
        joined: true,
        waiting: false,
      },
      error: null,
    });

    const response = await post('/api/world/quickplay', {
      mode: 'ranked',
      gameKey: 'hex',
      competitiveAccessMode: 'pass_required',
      walletProvider: 'solana',
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      walletProvider: 'solana',
      competitiveAccessMode: 'pass_required',
      matchId: 'match-sol',
    });
  });

  it('resumes an active ranked match without calling matchmaking RPCs', async () => {
    seedWorldIdentity({ idkit_verified_at: '2026-04-29T00:00:00.000Z' });
    mocks.state.match_players.push({
      match_id: 'match-active',
      profile_id: 'user-1',
      color: 2,
      created_at: '2026-04-29T00:00:00.000Z',
      matches: {
        id: 'match-active',
        status: 'active',
        game_key: 'connect4',
        is_ranked: true,
        created_at: '2026-04-29T00:00:00.000Z',
        updated_at: '2026-04-29T00:05:00.000Z',
      },
    });

    const response = await post('/api/world/quickplay', {
      mode: 'resume-ranked',
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(payload).toMatchObject({
      ok: true,
      mode: 'resume-ranked',
      gameKey: 'connect4',
      matchId: 'match-active',
      status: 'active',
      destination: '/match/match-active',
      joined: true,
      waiting: false,
    });
  });

  it('returns a clear resume error when no active ranked match exists', async () => {
    seedWorldIdentity({ idkit_verified_at: '2026-04-29T00:00:00.000Z' });

    const response = await post('/api/world/quickplay', {
      mode: 'resume-ranked',
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(payload).toMatchObject({
      error: 'No active ranked match to resume.',
      errorCode: 'ranked_match_not_found',
    });
  });

  it('starts a ranked rematch from the source match game', async () => {
    seedWorldIdentity({ idkit_verified_at: '2026-04-29T00:00:00.000Z' });
    mocks.state.match_players.push({
      match_id: 'match-old',
      profile_id: 'user-1',
      color: 1,
      created_at: '2026-04-28T00:00:00.000Z',
      matches: {
        id: 'match-old',
        status: 'finished',
        game_key: 'chess',
        is_ranked: true,
        created_at: '2026-04-28T00:00:00.000Z',
        updated_at: '2026-04-28T00:20:00.000Z',
      },
    });
    mocks.rpc.mockResolvedValueOnce({
      data: {
        matchId: 'match-next',
        joined: true,
        waiting: false,
      },
      error: null,
    });

    const response = await post('/api/world/quickplay', {
      mode: 'ranked-rematch',
      matchId: 'match-old',
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('find_or_create_ranked_match_atomic', {
      p_game_key: 'chess',
    });
    expect(payload).toMatchObject({
      ok: true,
      mode: 'ranked-rematch',
      gameKey: 'chess',
      matchId: 'match-next',
      rematchOf: 'match-old',
      destination: '/match/match-next',
      joined: true,
      waiting: false,
    });
  });

  it('uses the latest rating result as the default ranked rematch source', async () => {
    seedWorldIdentity({ idkit_verified_at: '2026-04-29T00:00:00.000Z' });
    mocks.state.rating_history.push({
      id: 'rating-1',
      profile_id: 'user-1',
      match_id: 'match-recent',
      game_key: 'ttt',
      old_rating: 1200,
      new_rating: 1192,
      rating_change: -8,
      created_at: '2026-04-28T00:00:00.000Z',
    });
    mocks.rpc.mockResolvedValueOnce({
      data: {
        matchId: 'match-next',
        joined: false,
        waiting: true,
      },
      error: null,
    });

    const response = await post('/api/world/quickplay', {
      mode: 'ranked-rematch',
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('find_or_create_ranked_match_atomic', {
      p_game_key: 'ttt',
    });
    expect(payload).toMatchObject({
      ok: true,
      mode: 'ranked-rematch',
      gameKey: 'ttt',
      matchId: 'match-next',
      rematchOf: 'match-recent',
      destination: '/match/match-next',
    });
  });

  it('joins Quickplay rooms by code and returns the lobby destination', async () => {
    seedWorldIdentity();
    mocks.rpc.mockResolvedValueOnce({
      data: {
        lobby: {
          id: 'lobby-2',
          code: 'WXYZ',
        },
      },
      error: null,
    });

    const response = await post('/api/world/quickplay', {
      mode: 'join-room',
      code: 'wxyz',
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('join_lobby_by_code_atomic', {
      p_code: 'WXYZ',
    });
    expect(payload).toMatchObject({
      ok: true,
      mode: 'join-room',
      code: 'WXYZ',
      destination: '/lobby/lobby-2',
    });
  });

  it('issues a match receipt for a finished competitive match', async () => {
    const matchId = '11111111-1111-4111-8111-111111111111';
    seedWorldIdentity({
      verification_metadata: {
        solanaCompetitive: {
          linkedWallet: {
            provider: 'solana',
            address: 'So1anaWallet1111111111111111111111111111111',
            linkedAt: '2026-04-29T00:00:00.000Z',
          },
          roomPasses: [],
          matchReceipts: [],
        },
      },
    });
    mocks.state.match_players.push({
      match_id: matchId,
      profile_id: 'user-1',
      color: 1,
      created_at: '2026-04-29T00:00:00.000Z',
      matches: [
        {
          id: matchId,
          status: 'finished',
          game_key: 'hex',
          tournament_id: null,
          result: 'win',
          winner: 1,
          created_at: '2026-04-29T00:00:00.000Z',
          updated_at: '2026-04-29T00:20:00.000Z',
        },
      ],
    });
    mocks.state.rating_history.push({
      id: 'rating-finished',
      profile_id: 'user-1',
      match_id: matchId,
      game_key: 'hex',
      old_rating: 1200,
      new_rating: 1218,
      rating_change: 18,
      created_at: '2026-04-29T00:20:00.000Z',
    });

    const response = await post('/api/world/competitive/issue-match-receipt', {
      matchId,
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.receipt).toMatchObject({
      matchId,
      gameKey: 'hex',
      status: 'issued',
      outcome: 'win',
      ratingChange: 18,
    });
    expect(mocks.state.world_app_identities[0].verification_metadata.solanaCompetitive.matchReceipts).toHaveLength(1);
  });
});
