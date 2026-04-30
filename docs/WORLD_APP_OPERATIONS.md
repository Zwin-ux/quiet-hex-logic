# World App Backend Operations

Use this during staging QR tests and review prep.

## Commands

```bash
npm run check:world-release -- --strict-env
npm test -- server/__tests__/worldEndpoints.test.ts
npm run smoke:world -- https://your-staging-origin.example
npm run qa:world-device -- https://your-staging-origin.example
npm run qa:world-device -- https://your-staging-origin.example --auth-check
```

## Local Smoke Topology

For the World flow, a plain Vite tab is not a faithful local smoke target.

- `/?surface=world` needs the server-injected runtime env script.
- `/api/world/*` lives on the Express server, not on the standalone frontend.
- `/api/world/quickplay/state` uses the service-role-backed read model.

Use one of these two local setups:

1. Vite + API proxy, for fast shell/UI iteration.
   - frontend on Vite
   - API on `server/index.ts`
   - valid public Supabase env loaded on both
2. Built Railway-style server, for full runtime-contract smoke.
   - `npm run build:railway`
   - run `node server-dist/index.js` with injected public env
   - include `SUPABASE_SERVICE_ROLE_KEY` if you need live Quickplay data instead of shell-only rendering

Without `SUPABASE_SERVICE_ROLE_KEY`, the built World shell can still be verified visually, but `/api/world/quickplay/state` will return `400` locally because the competitive read model uses the service-role client.

## Railway Log Format

World auth routes emit one JSON log line per meaningful outcome:

```json
{
  "ts": "2026-04-29T00:00:00.000Z",
  "service": "board-world-auth",
  "level": "warn",
  "route": "world.verify-id",
  "event": "nullifier_conflict",
  "requestId": "uuid",
  "durationMs": 12,
  "statusCode": 409,
  "profileIdHash": "hash",
  "nullifierHash": "hash"
}
```

Raw wallet addresses, bearer tokens, and World ID nullifiers are not logged. Profile ids, wallet addresses, RP ids, and nullifiers are SHA-256 hashed and truncated for correlation.

Every `/api/world/*` response also includes:

```text
X-BOARD-Request-Id: <uuid>
```

Ask testers to include that id when reporting auth, wallet, or verification failures.

Quickplay command architecture lives in `docs/WORLD_APP_QUICKPLAY_ARCHITECTURE.md`.

## Important Events

| Event | Meaning | Action |
| --- | --- | --- |
| `auth_required` | Missing or invalid Supabase bearer token. | Confirm anonymous session was created before World auth. |
| `nonce_created` | Wallet auth nonce was issued. | Continue wallet auth flow. |
| `nonce_invalid_or_expired` | Wallet auth nonce expired, consumed, or mismatched. | Restart wallet auth; inspect client retry behavior. |
| `siwe_invalid` | MiniKit wallet signature failed verification. | Confirm World App environment and app id. |
| `wallet_conflict` | Wallet is already bound to another profile. | Treat as account-link conflict; do not auto-rebind. |
| `rp_signature_created` | IDKit RP request was signed. | Continue IDKit flow. |
| `wallet_not_bound` | IDKit attempted before wallet binding. | Client should require wallet binding first. |
| `nullifier_conflict` | World ID proof already linked elsewhere. | Treat as human-uniqueness conflict. |
| `world_verify_rejected` | World API rejected the IDKit payload. | Check action, RP id, payload shape, and staging credentials. |
| `idkit_verified` | IDKit verification succeeded and profile flag was updated. | Ranked gate should unlock. |
| `state_loaded` | World App Play console state loaded through Railway, including competitive gate/game/queue summary fields. | Confirm rooms/events/worlds and the competitive scene render from one backend read model. |
| `wallet_required` | Quickplay was requested before wallet binding. | Run wallet auth before play actions. |
| `verification_required` | Ranked Quickplay was requested before IDKit verification. | Send the user to the Profile verification state. |
| `ranked_resume_not_found` | Resume was requested but the viewer has no active/waiting ranked match. | Refresh Quickplay state and show the ranked or rematch action instead. |
| `ranked_rematch_source_invalid` | Rematch source was missing, not owned by the viewer, or not ranked. | Start a normal ranked match or ask the user to pick a valid recent ranked result. |
| `quickplay_started` | Railway accepted a Quickplay command and returned a match or lobby destination. | Navigate to the returned `destination`. |
| `quickplay_resumed` | Railway returned an active ranked match destination without calling matchmaking. | Navigate to the returned `destination`. |
| `rpc_failed` | Supabase rejected the underlying play mutation. | Inspect the RPC message and request id. |

## Staging Failure Triage

1. Confirm `GET /api/health` has `hasWorldAppConfig: true`.
2. Run `npm run smoke:world -- <origin>`.
3. Run `npm run qa:world-device -- <origin>`.
4. Scan the World Developer Portal QR on iOS and Android.
5. For any failure, capture screenshot/video and the `X-BOARD-Request-Id`.
6. Search Railway logs for that request id.
7. If the event is `world_verify_rejected`, compare `WORLD_ID_ACTION`, `WORLD_ID_RP_ID`, and the Dev Portal action.

## Staging Unblock Checklist

If strict readiness fails before a URL exists:

1. Confirm Railway is linked to the intended app, environment, and service.
2. Set/load required Railway env: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `WORLD_APP_ID`, `WORLD_ID_ACTION`, `WORLD_ID_RP_ID`, `WORLD_ID_RP_SIGNING_KEY`.
3. Set a public app origin for QA: `WORLD_QA_APP_URL` or `VITE_PUBLIC_APP_URL`.
4. Deploy this branch to the linked Railway service or provide an explicit tunnel/staging origin serving this branch.
5. Run `railway run node scripts/check-world-release-readiness.mjs --strict-env`.
6. Run `npm run qa:world-device -- <staging-origin>`.
7. Only then scan the World Developer Portal QR on physical devices.

Known failed public baseline:

- `https://hexology.me` is not currently a valid World App staging target for this branch.
- It returns 404 for `/api/health` and `/api/world/*`.
- It does not include Railway runtime env injection.
- Evidence is under `store_assets/world/qa/public-baseline-20260428-195916/`.

Known failed Railway baseline:

- Railway is linked to `confident-magic` / `production` / `botbot`.
- `https://botbot-production-38b3.up.railway.app` timed out on health, World surface HTML, and all World endpoint preflight checks.
- `railway deployment list` showed only removed deployments during the check.
- Railway variable presence check originally showed the required Supabase and World env groups missing.
- Supabase env has since been loaded from the linked Supabase project `kgwxaenxdlzuzqyoewpe`.
- World App id and RP id have since been loaded from the World Developer Portal.
- RP signing key has since been loaded.
- Evidence is under `store_assets/world/qa/railway-production-20260428-200525/`.

Current passing Railway baseline:

- Deployment `f723d010-e0fe-401b-a6d4-3b7b627db30c` succeeded.
- Deployment `4f914db5-04cb-464b-bf15-f10d6329f57a` succeeded with the competitive Quickplay state.
- Deployment `e7abbecf-d6ba-4e89-8cb8-9b782fff6579` succeeded with competitive Quickplay log fields on `state_loaded`.
- Deployment `7ea729a4-6f63-443a-9287-82af00e17967` succeeded with `resume-ranked` and `ranked-rematch` Quickplay commands.
- Deployment `98b2b537-479c-4460-a1b1-a21f45309629` succeeded with Play scene wiring for competitive stats, resume, and rematch actions.
- Deployment `43580326-17b5-4f0c-8a8b-512aec892ec7` succeeded with the combined core-loop UI snapshot and manual room-code join wiring.
- `railway run node scripts/check-world-release-readiness.mjs --strict-env` passes with only the optional `WORLD_DEV_PORTAL_API_KEY` warning.
- Supabase migration `20260429013327_add_world_app_identity.sql` is applied remotely.
- `npm run smoke:world -- https://botbot-production-38b3.up.railway.app` passes.
- `npm run qa:world-device -- https://botbot-production-38b3.up.railway.app --out store_assets/world/qa/railway-production-post-migration-20260428-203045` passes.
- Supabase anonymous auth is enabled for World App no-form entry.
- `npm run qa:world-device -- https://botbot-production-38b3.up.railway.app --auth-check --out store_assets/world/qa/railway-production-auth-20260428-204419` passes and proves anonymous Supabase auth, nonce insertion, RP signing, Quickplay state, and wallet-required command gating.
- `npm run qa:world-device -- https://botbot-production-38b3.up.railway.app --auth-check --out store_assets/world/qa/railway-production-competitive-20260428-205526` passes and proves the competitive Quickplay state contract: `rankedGate`, five supported games, leaderboard array, recent results array, and wallet-required ranked gate.
- `npm run qa:world-device -- https://botbot-production-38b3.up.railway.app --auth-check --out store_assets/world/qa/railway-production-competitive-logs-20260428-205905` passes after the final deployment.
- `npm run qa:world-device -- https://botbot-production-38b3.up.railway.app --auth-check --out store_assets/world/qa/railway-production-resume-rematch-20260428-211315` passes and proves wallet-required gates for ranked, resume, and rematch commands before wallet binding.
- `npm run qa:world-device -- https://botbot-production-38b3.up.railway.app --auth-check --out store_assets/world/qa/railway-production-play-scene-20260428-211958` passes after the Play scene deployment.
- `npm run qa:world-device -- https://botbot-production-38b3.up.railway.app --auth-check --out store_assets/world/qa/railway-production-core-loop-20260428-213324` passes after the combined core-loop deployment.
- Deployed browser evidence: `store_assets/world/qa/railway-production-play-scene-20260428-211958/world-play-scene-mobile.png`.
- Current deployed browser evidence: `store_assets/world/qa/railway-production-core-loop-20260428-213324/world-surface-mobile.png`, `play-mobile.png`, `worlds-mobile.png`, and `events-mobile.png`.
- Remaining release gate is physical iOS/Android World App WebView QA from the Developer Portal QR.

Deployment note:

- Deployment `cd242093-5693-476b-89ba-a5939ea264fa` failed because Railway uploaded while the parallel frontend refactor was rewriting `WorldView.tsx`; the Docker build snapshot missed that file. The follow-up deploy waited for stable file hashes before uploading and succeeded.

## Non-Negotiables

- Do not log raw wallet addresses.
- Do not log bearer tokens.
- Do not log raw nullifiers or full IDKit payloads.
- Do not bypass `profiles.is_verified_human` for ranked entry.
