import fs from 'node:fs';
import path from 'node:path';

function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function required(name, v) {
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

async function check(name, fn) {
  try {
    const res = await fn();
    return { name, ok: true, ...res };
  } catch (e) {
    return { name, ok: false, error: e?.message ?? String(e) };
  }
}

async function main() {
  const cwd = process.cwd();
  const fileEnv = parseEnvFile(path.join(cwd, '.env'));
  const url = (process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL || '').trim();
  const anon = (process.env.VITE_SUPABASE_PUBLISHABLE_KEY || fileEnv.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();

  const knownBadRef = 'ptuxqfwicdpdslqwnswd';
  if (url.includes(knownBadRef)) {
    throw new Error(`Supabase URL points at known-bad ref: ${knownBadRef}`);
  }

  required('VITE_SUPABASE_URL', url);
  required('VITE_SUPABASE_PUBLISHABLE_KEY', anon);

  const headers = {
    apikey: anon,
    Authorization: `Bearer ${anon}`,
  };

  const results = [];

  results.push(await check('auth_health', async () => {
    const r = await fetch(`${url}/auth/v1/health`, { method: 'GET', headers: { apikey: anon } });
    if (!r.ok) throw new Error(`status=${r.status}`);
    return { status: r.status };
  }));

  results.push(await check('rest_bot_seasons_select', async () => {
    const r = await fetch(`${url}/rest/v1/bot_seasons?select=id&limit=1`, { headers });
    if (!r.ok) throw new Error(`status=${r.status}`);
    return { status: r.status };
  }));

  results.push(await check('fn_bot_poll_exists', async () => {
    const r = await fetch(`${url}/functions/v1/bot-poll`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    if (r.status === 404) throw new Error('404_not_deployed');
    return { status: r.status };
  }));

  results.push(await check('fn_arena_create_match_exists', async () => {
    const r = await fetch(`${url}/functions/v1/arena-create-match`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    if (r.status === 404) throw new Error('404_not_deployed');
    return { status: r.status };
  }));

  const failed = results.filter((r) => !r.ok);
  for (const r of results) {
    // eslint-disable-next-line no-console
    console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${r.name}${r.status ? ` (status ${r.status})` : ''}${r.error ? `: ${r.error}` : ''}`);
  }

  if (failed.length) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(`SMOKE FAILED: ${e?.message ?? e}`);
  process.exitCode = 1;
});
