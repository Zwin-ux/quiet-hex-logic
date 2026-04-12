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

function normalizeOrigin(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  try {
    return new URL(trimmed).origin;
  } catch {
    throw new Error(`Invalid origin: ${trimmed}`);
  }
}

function expectStatus(name, response, allowedStatuses) {
  if (!allowedStatuses.includes(response.status)) {
    throw new Error(`status=${response.status}`);
  }

  return { status: response.status };
}

async function main() {
  const cwd = process.cwd();
  const fileEnv = parseEnvFile(path.join(cwd, '.env'));
  const url = (process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL || '').trim();
  const anon = (process.env.VITE_SUPABASE_PUBLISHABLE_KEY || fileEnv.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();
  const appUrl = normalizeOrigin(process.env.VITE_PUBLIC_APP_URL || fileEnv.VITE_PUBLIC_APP_URL || '');

  const knownBadRef = 'ptuxqfwicdpdslqwnswd';
  if (url.includes(knownBadRef)) {
    throw new Error(`Supabase URL points at known-bad ref: ${knownBadRef}`);
  }

  required('VITE_SUPABASE_URL', url);
  required('VITE_SUPABASE_PUBLISHABLE_KEY', anon);
  required('VITE_PUBLIC_APP_URL', appUrl);

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

  results.push(await check('app_runtime_env_contract', async () => {
    const r = await fetch(`${appUrl}/`, { method: 'GET' });
    if (!r.ok) throw new Error(`status=${r.status}`);

    const html = await r.text();
    const requiredKeys = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_PUBLISHABLE_KEY',
      'VITE_PUBLIC_APP_URL',
    ];

    for (const key of requiredKeys) {
      if (!html.includes(`"${key}"`) && !html.includes(`${key}`)) {
        throw new Error(`missing_runtime_key=${key}`);
      }
    }

    return { status: r.status };
  }));

  results.push(await check('route_home', async () => {
    const r = await fetch(`${appUrl}/`, { method: 'GET' });
    return expectStatus('route_home', r, [200]);
  }));

  results.push(await check('route_worlds', async () => {
    const r = await fetch(`${appUrl}/worlds`, { method: 'GET' });
    return expectStatus('route_worlds', r, [200]);
  }));

  results.push(await check('route_play', async () => {
    const r = await fetch(`${appUrl}/play`, { method: 'GET' });
    return expectStatus('route_play', r, [200]);
  }));

  results.push(await check('route_events', async () => {
    const r = await fetch(`${appUrl}/events`, { method: 'GET' });
    return expectStatus('route_events', r, [200]);
  }));

  results.push(await check('route_auth_next', async () => {
    const r = await fetch(`${appUrl}/auth?next=%2Fworlds%3Fcreate%3Dtrue`, { method: 'GET' });
    return expectStatus('route_auth_next', r, [200]);
  }));

  results.push(await check('rpc_list_worlds', async () => {
    const r = await fetch(`${url}/rest/v1/rpc/list_worlds`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    if (r.status === 404) throw new Error('404_not_found');
    return expectStatus('rpc_list_worlds', r, [200, 401, 403]);
  }));

  results.push(await check('rpc_get_world_overview_exists', async () => {
    const r = await fetch(`${url}/rest/v1/rpc/get_world_overview`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_world_id: '00000000-0000-0000-0000-000000000000' }),
    });
    if (r.status === 404) throw new Error('404_not_found');
    return expectStatus('rpc_get_world_overview_exists', r, [400, 401, 403]);
  }));

  results.push(await check('rpc_create_world_atomic_exists', async () => {
    const r = await fetch(`${url}/rest/v1/rpc/create_world_atomic`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_name: 'Smoke World', p_description: 'smoke', p_visibility: 'public' }),
    });
    if (r.status === 404) throw new Error('404_not_found');
    return expectStatus('rpc_create_world_atomic_exists', r, [200, 400, 401, 403]);
  }));

  results.push(await check('rpc_join_lobby_by_code_atomic_exists', async () => {
    const r = await fetch(`${url}/rest/v1/rpc/join_lobby_by_code_atomic`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_code: 'SMOKE1' }),
    });
    if (r.status === 404) throw new Error('404_not_found');
    return expectStatus('rpc_join_lobby_by_code_atomic_exists', r, [400, 401, 403]);
  }));

  results.push(await check('rpc_join_tournament_atomic_exists', async () => {
    const r = await fetch(`${url}/rest/v1/rpc/join_tournament_atomic`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_tournament_id: '00000000-0000-0000-0000-000000000000' }),
    });
    if (r.status === 404) throw new Error('404_not_found');
    return expectStatus('rpc_join_tournament_atomic_exists', r, [400, 401, 403]);
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
