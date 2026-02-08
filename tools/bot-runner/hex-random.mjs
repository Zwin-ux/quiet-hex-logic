/* Reference Bot Runner (MVP)
 *
 * Hex-only random move bot.
 * - Polls bot-poll for pending requests
 * - Chooses a random legal cell (empty) from state
 * - Submits to bot-submit-move
 *
 * Env:
 * - HEXLOGY_BOT_TOKEN (required)
 * - HEXLOGY_FUNCTIONS_URL (optional) e.g. http://localhost:54321/functions/v1
 *   If omitted, uses SUPABASE_URL + /functions/v1 when available.
 */

const BOT_TOKEN = process.env.HEXLOGY_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('Missing HEXLOGY_BOT_TOKEN');
  process.exit(1);
}

const base =
  process.env.HEXLOGY_FUNCTIONS_URL ||
  (process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL.replace(/\/+$/, '')}/functions/v1` : null) ||
  'http://localhost:54321/functions/v1';

const BOT_POLL = `${base}/bot-poll`;
const BOT_SUBMIT = `${base}/bot-submit-move`;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function computeEmptyCells(size, moves) {
  const taken = new Set();
  for (const m of moves || []) {
    if (m && typeof m.cell === 'number') taken.add(m.cell);
  }
  const empties = [];
  const n = size * size;
  for (let i = 0; i < n; i++) {
    if (!taken.has(i)) empties.push(i);
  }
  return empties;
}

function extractLegalFromState(state) {
  const legal = state?.legal;
  if (!Array.isArray(legal) || legal.length === 0) return null;
  // Expect normalized legal moves from server: {kind:'hex',cell:number|null}
  const hexMoves = legal.filter((m) => m && m.kind === 'hex');
  if (hexMoves.length === 0) return null;
  return hexMoves;
}

async function pollOnce() {
  const res = await fetch(BOT_POLL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bot ${BOT_TOKEN}`,
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`bot-poll failed: ${res.status} ${text}`);
  }

  return await res.json();
}

async function submitMove({ requestId, actionId, cell }) {
  const res = await fetch(BOT_SUBMIT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bot ${BOT_TOKEN}`,
    },
    body: JSON.stringify({ requestId, actionId, cell }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    throw new Error(`bot-submit-move failed: ${res.status} ${json?.error ?? 'unknown error'}`);
  }
  return json;
}

function uuidv4() {
  // Node 18+ has crypto.randomUUID
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  // fallback (non-cryptographic) - should not happen on modern Node
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function main() {
  console.log(`[hex-random] functions: ${base}`);
  let backoff = 250;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const polled = await pollOnce();
      const reqs = polled?.requests ?? [];
      if (reqs.length === 0) {
        await sleep(backoff);
        backoff = Math.min(1500, Math.floor(backoff * 1.2));
        continue;
      }

      backoff = 250;

      for (const r of reqs) {
        const state = r.state ?? {};
        const match = state.match ?? {};
        const size = match.size ?? 11;
        const legal = extractLegalFromState(state);
        if (legal) {
          const chosen = randomChoice(legal);
          const cell = chosen.cell ?? null;
          const actionId = uuidv4();
          const out = await submitMove({ requestId: r.id, actionId, cell });
          console.log(`[hex-random] match ${r.matchId} ply ${r.ply} -> cell ${cell} => ${out.status}`);
          continue;
        }

        const empties = computeEmptyCells(size, state.moves);
        if (empties.length === 0) {
          console.log(`[hex-random] no legal moves for request ${r.id}`);
          continue;
        }
        const cell = randomChoice(empties);
        const actionId = uuidv4();
        const out = await submitMove({ requestId: r.id, actionId, cell });
        console.log(`[hex-random] match ${r.matchId} ply ${r.ply} -> cell ${cell} => ${out.status}`);
      }
    } catch (e) {
      console.error(`[hex-random] error: ${e?.message ?? e}`);
      await sleep(backoff);
      backoff = Math.min(2500, Math.floor(backoff * 1.4));
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
