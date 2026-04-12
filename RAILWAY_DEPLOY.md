# Railway Deploy

Hexology now expects Railway to own the app-facing web server.

Important change:

- The Railway server now injects critical public env into the HTML response at request time.
- That means a missing frontend Supabase config should no longer hard-crash the bundle at boot.
- On Railway, setting `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `VITE_PUBLIC_APP_URL` gives the frontend a canonical auth/runtime contract.

## What Railway Runs

- Express server in [`server/index.ts`](./server/index.ts)
- Vite production bundle from [`dist`](./dist)
- App APIs:
  - `GET /api/health`
  - `POST /api/chat`
  - `POST /api/discord-token-exchange`

Supabase still handles auth, realtime, Postgres, and the existing game edge functions.

## Required Railway Variables

Set these in Railway for the web service:

- Recommended: `SUPABASE_URL`
- Recommended: `SUPABASE_PUBLISHABLE_KEY`
- Recommended: `VITE_PUBLIC_APP_URL`
  - Set this to the canonical public app origin, for example `https://your-app.up.railway.app`
  - Auth redirects use this origin first and only fall back to `window.location.origin` when it is missing or malformed.
- Optional: `VITE_SUPABASE_URL`
- Optional: `VITE_SUPABASE_PUBLISHABLE_KEY`
- Optional: `VITE_SUPABASE_PROJECT_ID`
- Optional: `VITE_API_BASE_URL`
  - Leave unset when the frontend and API are served from the same Railway service.
  - Set it when your web bundle needs to call a separate Railway API domain.
- Optional: `VITE_DISCORD_CLIENT_ID`
- Optional: `VITE_WORLD_ID_APP_ID`
- Optional: `VITE_WORLD_ID_ACTION`
- Optional: `VITE_ENABLE_BASE_WALLET`
- Optional: `VITE_ONCHAINKIT_API_KEY`
- Optional: `WORLD_ID_APP_ID`
- Optional: `WORLD_ID_ACTION`
  - Keep `WORLD_ID_ACTION` and `VITE_WORLD_ID_ACTION` aligned with the action configured in the World ID dashboard.

For AI chat, set one provider path:

- `OPENAI_API_KEY`
- Optional: `OPENAI_MODEL`

or

- `AI_GATEWAY_API_KEY`
- Optional: `AI_MODEL`

If `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `VITE_PUBLIC_APP_URL` are present, the server injects them into the frontend at request time.
If they are omitted, the app falls back to the `VITE_*` values above, but that should be treated as a local-development fallback rather than the intended Railway contract.

## Local Development

Terminal 1:

```bash
npm run dev
```

Terminal 2:

```bash
npm run dev:server
```

The Vite dev server proxies `/api/*` to `http://localhost:3001` by default.

If your Railway-style API server runs somewhere else locally, set:

```bash
VITE_DEV_API_PROXY_TARGET=http://localhost:4010
```

## Railway Build

The repo includes:

- [`Dockerfile`](./Dockerfile)
- [`railway.json`](./railway.json)

Railway can deploy directly from GitHub using the Dockerfile.

Important:

- Railway only injects build-time variables into Docker builds if the Dockerfile declares them with `ARG`.
- This repo's Dockerfile already forwards the needed `VITE_*` values and Railway git metadata into the frontend build.
- The repo also includes [`.npmrc`](./.npmrc) with `legacy-peer-deps=true` because `@coinbase/onchainkit` still declares a React 19 peer range while this app is on React 18.
- The Docker image installs dependencies once, builds, then prunes dev dependencies instead of running a second production `npm ci`.

Equivalent local build:

```bash
npm ci --legacy-peer-deps
npm run build:railway
npm run serve:railway
```

## Health Check

Railway health probe:

```text
GET /api/health
```

Expected response:

```json
{
  "ok": true,
  "service": "hexology-railway-server"
}
```

## Alpha Demo Contract

Public alpha readiness depends on these runtime guarantees:

- Live HTML includes `VITE_SUPABASE_URL`
- Live HTML includes `VITE_SUPABASE_PUBLISHABLE_KEY`
- Live HTML includes `VITE_PUBLIC_APP_URL`
- `/auth?next=...` resolves against the canonical app origin instead of whatever browser origin happens to be active
- Deploy smoke checks verify the world and tournament RPC path, not only the arena sidecar
