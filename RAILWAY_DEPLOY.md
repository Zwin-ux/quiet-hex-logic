# Railway Deploy

Hexology now expects Railway to own the app-facing web server.

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

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- Optional: `VITE_SUPABASE_PROJECT_ID`
- Optional: `VITE_API_BASE_URL`
  - Leave unset when the frontend and API are served from the same Railway service.
  - Set it when your web bundle needs to call a separate Railway API domain.
- Optional: `VITE_DISCORD_CLIENT_ID`
- Optional: `VITE_WORLD_ID_APP_ID`
- Optional: `VITE_ENABLE_BASE_WALLET`
- Optional: `VITE_ONCHAINKIT_API_KEY`

For AI chat, set one provider path:

- `OPENAI_API_KEY`
- Optional: `OPENAI_MODEL`

or

- `AI_GATEWAY_API_KEY`
- Optional: `AI_MODEL`

The Railway server also accepts:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

If those are omitted, it falls back to the `VITE_*` values above.

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
