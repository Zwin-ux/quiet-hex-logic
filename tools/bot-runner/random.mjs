/* Reference Bot Runner (Multi-Game)
 *
 * Chooses a random move from server-provided `state.legal` for any game.
 *
 * Env:
 * - BOARD_BOT_TOKEN (required, preferred)
 * - BOARD_FUNCTIONS_URL (optional, preferred) e.g. https://<project>.supabase.co/functions/v1
 *
 * Legacy aliases still work:
 * - HEXLOGY_BOT_TOKEN
 * - HEXLOGY_FUNCTIONS_URL
 */

const BOT_TOKEN = process.env.BOARD_BOT_TOKEN || process.env.HEXLOGY_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('Missing BOARD_BOT_TOKEN');
  process.exit(1);
}

const base =
  process.env.BOARD_FUNCTIONS_URL ||
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

function uuidv4() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
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

async function submitMove(payload) {
  const res = await fetch(BOT_SUBMIT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bot ${BOT_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    throw new Error(`bot-submit-move failed: ${res.status} ${json?.error ?? 'unknown error'}`);
  }
  return json;
}

function payloadFromLegal(legalMove) {
  const kind = legalMove?.kind;
  if (kind === 'hex') return { cell: legalMove.cell ?? null };
  if (kind === 'chess') return { move: { uci: legalMove.uci } };
  if (kind === 'checkers') return { move: { path: legalMove.path } };
  if (kind === 'ttt') return { move: { cell: legalMove.cell } };
  if (kind === 'connect4') return { move: { col: legalMove.col } };
  // Fallback: try generic move envelope
  return { move: legalMove };
}

async function main() {
  console.log(`[random] functions: ${base}`);
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
        const legal = r?.state?.legal;
        if (!Array.isArray(legal) || legal.length === 0) {
          console.log(`[random] no legal moves in request ${r.id} (game=${r.gameKey})`);
          continue;
        }
        const move = randomChoice(legal);
        const actionId = uuidv4();
        const basePayload = payloadFromLegal(move);
        const out = await submitMove({ requestId: r.id, actionId, ...basePayload });
        console.log(`[random] match ${r.matchId} ply ${r.ply} (${r.gameKey}) -> ${JSON.stringify(move)} => ${out.status}`);
      }
    } catch (e) {
      console.error(`[random] error: ${e?.message ?? e}`);
      await sleep(backoff);
      backoff = Math.min(2500, Math.floor(backoff * 1.4));
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

