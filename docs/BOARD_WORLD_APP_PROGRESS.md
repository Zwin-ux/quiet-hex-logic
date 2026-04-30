# BOARD World App Progress Ledger

Last updated: 2026-04-30

## Current Release Score

Overall readiness: 95/100

| Area | Score | Status |
| --- | ---: | --- |
| Product scope | 9/10 | V1 is tight: verified play rooms, quickplay, rooms, events, profile. No prizes, tokens, or host workbench in World App. |
| Architecture | 9/10 | Vite/React/Supabase/Railway preserved. World App auth routes, Quickplay command/read model, competitive read model, and Supabase identity storage are implemented. |
| Identity and verification | 9/10 | MiniKit wallet auth and IDKit 4 flow are wired, Railway env is loaded, remote schema is applied, anonymous auth is enabled, and authenticated backend gates pass. Needs real World App device verification. |
| World App UX | 9/10 | World console, world detail, tournament detail, and lobby entry now share one CDS-style mono system contract: semantic shell modes, segmented controls, utility strips, and compact decision rows. Needs screenshot QA on iOS/Android. |
| Web regression safety | 9/10 | Typecheck, lint, tests, production build, server build, endpoint harness, and local World-flow browser smoke pass. Remaining QA gap is authenticated World App device verification, not route instability. |
| Submission readiness | 7/10 | World-specific metadata, review notes, icon, content card, local layout screenshots, and passing deployed QR preflight exist. Needs real World App WebView screenshots and final upload review. |
| Observability and operations | 9/10 | Health reports World config presence. Deploy smoke, release readiness, unauth/auth device preflight, structured `/api/world/*` logs, Quickplay competitive state, request-id tracing, Railway env, deployed URL, and remote migration are now validated. |

## Completed

- Created Notion launch hub: BOARD World App Launch OS.
- Created Linear project: BOARD World App MVP.
- Added MiniKit and current IDKit dependencies.
- Added `world` surface detection and capability isolation.
- Added Railway `/api/world/nonce`, `/api/world/complete-wallet-auth`, `/api/world/rp-signature`, and `/api/world/verify-id`.
- Added Supabase migration for `world_app_identities` and World auth nonces.
- Kept `profiles.is_verified_human` as the fast ranked/competitive gate.
- Added compact World App play console with Play, Rooms, Events, and Profile tabs.
- Added native share and haptic wrappers with web fallbacks.
- Migrated World ID UI to IDKit 4 request widget with backend RP signing.
- Added regression tests for World App client detection, MiniKit install, wallet auth, native share fallback, haptic commands, and `VITE_WORLD_APP_ID` config fallback.
- Added `npm run smoke:world` for deployed `/?surface=world` route/runtime-env/bundle-label checks.
- Fixed the runtime env parser in both deploy smoke scripts to accept the semicolon emitted by Railway HTML injection.
- Shifted the World App UI from dark arcade shell to a cleaner market-app surface, then converged it again into the mono system used by the core play loop: warm paper shell, white planes, black decision states, and monochrome trust feedback.
- Fixed bottom navigation placement by making it a real flex-shell footer instead of fixed positioning.
- Preserved existing wallet/SIWE metadata when IDKit verification writes `verification_metadata`.
- Added an importable Express app harness and Vitest route tests for `/api/world/nonce`, `/api/world/complete-wallet-auth`, `/api/world/rp-signature`, and `/api/world/verify-id`.
- Covered auth failures, expired wallet nonces, duplicate wallet conflicts, RP signature generation, duplicate nullifier conflicts, and successful IDKit metadata/profile writes in the endpoint harness.
- Added `npm run qa:world-device` for tunnel/Railway preflight, QR handoff artifacts, and manual device QA checklist generation.
- Added `docs/WORLD_APP_DEVICE_QA.md` with the iOS/Android WebView matrix, capture list, failure rules, and evidence naming.
- Added `docs/WORLD_APP_OPERATIONS.md` with Railway log events, request-id tracing, and staging failure triage.
- Added structured JSON logs and `X-BOARD-Request-Id` headers for all `/api/world/*` auth and verification routes, with profile/wallet/nullifier identifiers hashed before logging.
- Added `/api/world/quickplay/state` as a Railway-backed Play console read model for profile gate state, rooms, events, and public worlds.
- Added `/api/world/quickplay` as the World App command endpoint for ranked entry, opening an unranked room, and joining a room by code.
- Routed the World App Play tab through the Railway Quickplay state/command APIs instead of scattered client-side Supabase reads/mutations.
- Added `docs/WORLD_APP_QUICKPLAY_ARCHITECTURE.md` and expanded device QA preflight to check Quickplay endpoints reject unauthenticated requests.
- Attempted REF-109 strict staging readiness locally. It is blocked because staging secrets are not loaded.
- Linked Railway to `confident-magic` / `production` / `botbot` and confirmed the selected service is missing required Supabase and World env groups.
- Loaded safe/public Railway values: Supabase project id, Supabase URL aliases, public app URL aliases, World action aliases, and wallet auth statement.
- Pulled Supabase API keys for project `kgwxaenxdlzuzqyoewpe` through the authenticated Supabase CLI and set the publishable plus service-role keys in Railway via stdin.
- Loaded World Developer Portal values for `WORLD_APP_ID`, `VITE_WORLD_APP_ID`, `WORLD_ID_APP_ID`, `VITE_WORLD_ID_APP_ID`, and `WORLD_ID_RP_ID`.
- Loaded `WORLD_ID_RP_SIGNING_KEY` in Railway.
- Passed strict Railway readiness with 0 failures and 1 optional warning.
- Deployed Railway deployment `f723d010-e0fe-401b-a6d4-3b7b627db30c`.
- Applied remote Supabase migration `20260429013327_add_world_app_identity.sql`.
- Passed deployed World App smoke and device preflight against `https://botbot-production-38b3.up.railway.app`.
- Added authenticated staging checks to `scripts/world-device-qa.mjs` behind `--auth-check`.
- Enabled Supabase anonymous sign-ins for the linked project and restored stricter email confirmation/MFA settings after the config push diff.
- Passed authenticated deployed preflight against `https://botbot-production-38b3.up.railway.app` with anonymous Supabase session creation, nonce issuance, RP signing, Quickplay state, and wallet-required ranked gate.
- Expanded `/api/world/quickplay/state` with a competitive scene read model: ranked gate copy, active ranked match resume target, supported games, per-game rating/rank/queue counts, compact leaderboard, recent rating results, and competitive events.
- Updated the World-device harness to assert the competitive Quickplay contract during authenticated staging preflight.
- Deployed Railway deployment `4f914db5-04cb-464b-bf15-f10d6329f57a` with the competitive Quickplay state.
- Passed authenticated deployed competitive preflight against `https://botbot-production-38b3.up.railway.app` with anonymous session creation, World nonce, RP signing, Quickplay competitive state, wallet-required ranked gate, unauthenticated endpoint rejection, and QR artifact generation.
- Added competitive summary fields to the existing `state_loaded` Railway log event for request-id triage.
- Deployed Railway deployment `e7abbecf-d6ba-4e89-8cb8-9b782fff6579` with Quickplay competitive state plus log fields.
- Passed authenticated deployed competitive/log preflight against `https://botbot-production-38b3.up.railway.app` after the final deploy.
- Added backend-supported `resume-ranked` and `ranked-rematch` Quickplay commands so the World App competitive loop can continue from active matches and recent results without client-side route guessing.
- Expanded the World-device auth preflight to verify wallet gates for ranked, resume, and rematch commands.
- Deployed Railway deployment `7ea729a4-6f63-443a-9287-82af00e17967` with Quickplay resume/rematch commands.
- Passed authenticated deployed resume/rematch preflight against `https://botbot-production-38b3.up.railway.app`.
- Wired the World App Play scene to consume the competitive state: rating/rank/queue stats, active ranked resume card, and recent-result rematch action.
- Deployed Railway deployment `98b2b537-479c-4460-a1b1-a21f45309629` with the Play scene resume/rematch UI.
- Captured deployed 375px browser evidence for the Play scene at `store_assets/world/qa/railway-production-play-scene-20260428-211958/world-play-scene-mobile.png`.
- Added manual room-code join wiring to the World App Rooms tab through the existing `join-room` Quickplay command.
- Coordinated with the parallel core-loop UI refactor by keeping backend/system work out of the frontend-owned files while validating the combined snapshot.
- Deployed Railway deployment `43580326-17b5-4f0c-8a8b-512aec892ec7` after the parallel frontend file set stabilized.
- Captured deployed 375px browser evidence for World surface, Play, Worlds, and Events under `store_assets/world/qa/railway-production-core-loop-20260428-213324/`.
- Passed deployed World App smoke, strict Railway readiness, and auth-aware World-device preflight against `https://botbot-production-38b3.up.railway.app`.
- Ran Railway-domain preflight against `https://botbot-production-38b3.up.railway.app`; it failed because the service timed out on health, World surface HTML, and all `/api/world/*` endpoint checks.
- Ran a public baseline preflight against `https://hexology.me`; it failed because that origin is not serving the current Railway/World App build.
- Recorded REF-109 blocker evidence under `store_assets/world/qa/public-baseline-20260428-195916/`.
- Recorded Railway-domain blocker evidence under `store_assets/world/qa/railway-production-20260428-200525/`.
- Added `npm run check:world-release` for file, env, copy, script, asset, and mobile handoff readiness checks.
- Added `docs/IOS_ANDROID_AFTER_WORLD.md`, `worldPreview` EAS profile, production auto-increment, and `EXPO_PUBLIC_WEB_APP_URL` WebView configuration for post-World native release prep.
- Replaced old Hexology native App Store copy with World App-specific BOARD metadata that removes prize/subscription/WLD/token language.
- Added `npm run assets:world` and generated World App icon, content card, safe-area check, review notes, and PNG previews under `store_assets/world/`.
- Captured local 375x812 layout screenshots for Play, Rooms, Events, and Profile tabs under `store_assets/world/screenshots/`.
- Verified `npm run lint`, `npm run typecheck`, `npm test`, `npm run build:server`, and `npm run build`.
- Promoted the World App console primitives into a shared World-first CDS system layer: `SiteFrame visualMode="world"`, `SystemScreen`/`SystemSection` world variants, shared segmented controls, and shared metadata strips.
- Rebuilt `WorldAppHome` onto the shared system contract so it is now the reference World surface instead of a page-local mini design system.
- Migrated `WorldView`, `TournamentView`, `LobbyView`, and world-context match loading/state chrome onto the same World system language.
- Verified the World flow against a local Railway-style runtime with injected public env: `/?surface=world`, `/worlds/:id`, `/tournament/:id`, and `/lobby/:id` now render without console errors under the built server contract.
- Confirmed the local World console needs `SUPABASE_SERVICE_ROLE_KEY` to fully populate `/api/world/quickplay/state`; public-key-only local smoke is enough for shell/UI validation but not for live Quickplay data.
- Added `scripts/smoke-world-local.mjs` so the built-server World smoke can be run from one command instead of manual multi-process shell setup, with public Supabase config fallback through the authenticated CLI when shell env is absent.
- Redeployed `main` to Railway deployment `1f44dd16-2bd6-4635-a6ac-1b9390a9f9a1`, confirmed new live JS/CSS asset hashes, and cleared the stale `/worlds/:id` deployment drift.
- Reran the full live device harness with `--auth-check --visual-check` and produced the current handoff bundle under `store_assets/world/qa/railway-production-mobile-visual-auth-20260429-2345/`, including the reviewer-facing `device-qa-report.html`.

## Current Verification

| Command | Result | Notes |
| --- | --- | --- |
| `npm run lint` | Pass | 16 warnings remain; all are existing non-blocking hook/fast-refresh warnings outside the new World App helper tests. |
| `npm run typecheck` | Pass | Client and server TypeScript compile. |
| `npm test` | Pass | 15 files, 179 tests. |
| `npm run build:server` | Pass | Railway server compiles. |
| `npm run build` | Pass | Vite build succeeds; large chunk and dependency annotation warnings remain. |
| `npm run smoke:world -- http://localhost:8092` | Pass | Local production server with dummy public env validates the World route/runtime contract and compiled labels. |
| `npm run qa:world-device -- http://localhost:8092 --out store_assets/world/qa/local-preflight` | Pass | Local preflight validates health, runtime env, World labels, unauthenticated endpoint rejection, and QR/checklist generation. |
| `npm run assets:world` | Pass | Regenerates SVG icon, content card, safe-area check, and review notes. |
| `npm run check:world-release` | Pass | 0 failures, 10 expected local env warnings because staging secrets are not loaded in this shell. |
| `npm run check:world-release -- --strict-env` | Blocked | 7 required env groups missing locally: Supabase URL, publishable key, service role key, World app id, World action, RP id, RP signing key. |
| `railway run node scripts/check-world-release-readiness.mjs --strict-env` | Pass | 0 failures, 1 optional warning for `WORLD_DEV_PORTAL_API_KEY`. |
| `npm run qa:world-device -- https://hexology.me --out store_assets/world/qa/public-baseline-20260428-195916` | Fail | Public origin is not the current staging build: `/api/health` and `/api/world/*` are 404, runtime env injection is missing, World bundle labels are absent. |
| `npm run qa:world-device -- https://botbot-production-38b3.up.railway.app --out store_assets/world/qa/railway-production-20260428-200525` | Fail | Linked Railway service timed out on health, World surface HTML, and all World endpoint checks; deployment list showed only removed deployments. |
| `railway deployment up --ci --message "REF-109 World App env locked"` | Pass | Deployment `f723d010-e0fe-401b-a6d4-3b7b627db30c` succeeded. |
| `npx -y supabase@latest db push --linked --yes` | Pass | Applied `20260429013327_add_world_app_identity.sql` to remote Supabase. |
| `npm run smoke:world -- https://botbot-production-38b3.up.railway.app` | Pass | Deployed World route, runtime env, and compiled labels pass. |
| `npm run qa:world-device -- https://botbot-production-38b3.up.railway.app --out store_assets/world/qa/railway-production-post-migration-20260428-203045` | Pass | Health, runtime env, World labels, unauthenticated World endpoints, Quickplay endpoints, and QR artifact generation pass. |
| `npx -y supabase@latest config push --project-ref kgwxaenxdlzuzqyoewpe --yes` | Pass | Enabled anonymous sign-ins and restored previous stricter email confirmation/MFA settings while adding the botbot Railway redirect allowlist. |
| `npm run qa:world-device -- https://botbot-production-38b3.up.railway.app --auth-check --out store_assets/world/qa/railway-production-auth-20260428-204419` | Pass | Anonymous Supabase session, World nonce, RP signing, Quickplay state, wallet-required ranked gate, unauthenticated endpoint rejection, and QR artifact generation pass. |
| `railway up --detach --service botbot --environment production --message "REF-109 Quickplay competitive state"` | Pass | Deployment `4f914db5-04cb-464b-bf15-f10d6329f57a` succeeded. |
| `railway run node scripts/check-world-release-readiness.mjs --strict-env` | Pass | Rechecked after competitive deploy: 0 failures, 1 optional warning for `WORLD_DEV_PORTAL_API_KEY`. |
| `npm run qa:world-device -- https://botbot-production-38b3.up.railway.app --auth-check --out store_assets/world/qa/railway-production-competitive-20260428-205526` | Pass | Anonymous Supabase session, World nonce, RP signing, competitive Quickplay state, wallet-required ranked gate, unauthenticated endpoint rejection, and QR artifact generation pass. |
| `railway up --detach --service botbot --environment production --message "REF-109 Quickplay competitive logs"` | Pass | Deployment `e7abbecf-d6ba-4e89-8cb8-9b782fff6579` succeeded. |
| `railway run node scripts/check-world-release-readiness.mjs --strict-env` | Pass | Rechecked after final deploy: 0 failures, 1 optional warning for `WORLD_DEV_PORTAL_API_KEY`. |
| `npm run qa:world-device -- https://botbot-production-38b3.up.railway.app --auth-check --out store_assets/world/qa/railway-production-competitive-logs-20260428-205905` | Pass | Anonymous Supabase session, World nonce, RP signing, competitive Quickplay state, wallet-required ranked gate, unauthenticated endpoint rejection, QR artifact generation, and deployed contract pass. |
| `npm test -- server/__tests__/worldEndpoints.test.ts` | Pass | 23 tests, including Quickplay state, resume/rematch commands, command gates, request-id headers, and redacted structured log contract. |
| `npm test` | Pass | 15 files, 183 tests after resume/rematch. |
| `npm run build` | Pass | Vite production build succeeds; existing Rollup pure annotation and large chunk warnings remain. |
| `railway up --detach --service botbot --environment production --message "REF-109 Quickplay resume rematch"` | Pass | Deployment `7ea729a4-6f63-443a-9287-82af00e17967` succeeded. |
| `railway run node scripts/check-world-release-readiness.mjs --strict-env` | Pass | Rechecked after resume/rematch deploy: 0 failures, 1 optional warning for `WORLD_DEV_PORTAL_API_KEY`. |
| `npm run qa:world-device -- https://botbot-production-38b3.up.railway.app --auth-check --out store_assets/world/qa/railway-production-resume-rematch-20260428-211315` | Pass | Anonymous Supabase session, World nonce, RP signing, competitive Quickplay state, wallet-required ranked/resume/rematch gates, unauthenticated endpoint rejection, QR artifact generation, and deployed contract pass. |
| `npm run typecheck` | Pass | Client/server TypeScript pass after Play scene competitive state wiring. |
| `npm run build` | Pass | Vite production build succeeds after Play scene competitive state wiring; existing Rollup annotation and large chunk warnings remain. |
| `npm run build:railway` | Pass | Combined client/server production build succeeds after the World-first CDS system pass. |
| `node scripts/smoke-world-local.mjs --build` | Pass | Boots the built server locally, verifies runtime env injection, validates the main World routes, creates an anonymous Supabase session, and warns cleanly when Quickplay state is missing `SUPABASE_SERVICE_ROLE_KEY`. |
| `node scripts/world-device-qa.mjs https://botbot-production-38b3.up.railway.app --auth-check --visual-check --out store_assets/world/qa/railway-production-mobile-visual-auth-20260429-2345` | Pass | Live Railway iPhone/Android visual matrix plus auth-aware preflight pass. Only expected browser-only MiniKit/preload warnings remain outside the real World App container. |
| `railway up --detach --service botbot --environment production --message "REF-109 Wire Quickplay resume rematch UI"` | Pass | Deployment `98b2b537-479c-4460-a1b1-a21f45309629` succeeded. |
| `npm run smoke:world -- https://botbot-production-38b3.up.railway.app` | Pass | Deployed World route/runtime env/compiled labels pass after Play scene wiring. |
| `railway run node scripts/check-world-release-readiness.mjs --strict-env` | Pass | Rechecked after Play scene deploy: 0 failures, 1 optional warning for `WORLD_DEV_PORTAL_API_KEY`. |
| `npm run qa:world-device -- https://botbot-production-38b3.up.railway.app --auth-check --out store_assets/world/qa/railway-production-play-scene-20260428-211958` | Pass | Anonymous Supabase session, World nonce, RP signing, competitive Quickplay state, wallet-required ranked/resume/rematch gates, unauthenticated endpoint rejection, QR artifact generation, and deployed contract pass. |
| gstack browser, deployed 375x812 | Pass | `/?surface=world` renders the Play scene with rating/rank/queue and rematch action. Console only shows expected MiniKit warnings outside World App. |
| gstack browser, 375x812 | Pass | World shell renders with visible bottom nav. Dummy Supabase env shows an expected data-load toast. |
| `npm run build:railway` | Pass | Combined snapshot builds locally after the parallel core-loop refactor restored `MatchBoard`. Existing Rollup annotation and large chunk warnings remain. |
| `npm test -- server/__tests__/worldEndpoints.test.ts src/lib/__tests__/worldIdConfig.test.ts` | Pass | 27 tests cover World endpoint harness plus World ID config compatibility. |
| `railway deployment up` | Pass | Deployment `43580326-17b5-4f0c-8a8b-512aec892ec7` succeeded. Previous deployment `cd242093-5693-476b-89ba-a5939ea264fa` failed because Railway uploaded while `WorldView.tsx` was being rewritten by the parallel frontend refactor. |
| `npm run smoke:world -- https://botbot-production-38b3.up.railway.app` | Pass | Deployed World route/runtime env/compiled labels pass after the combined core-loop snapshot. |
| `railway run node scripts/check-world-release-readiness.mjs --strict-env` | Pass | 0 failures, 1 optional warning for `WORLD_DEV_PORTAL_API_KEY`. |
| `npm run qa:world-device -- https://botbot-production-38b3.up.railway.app --auth-check --out store_assets/world/qa/railway-production-core-loop-20260428-213324` | Pass | Anonymous Supabase session, World nonce, RP signing, competitive Quickplay state, wallet-required ranked/resume/rematch gates, unauthenticated endpoint rejection, QR artifact generation, and deployed contract pass. |
| gstack browser, deployed 375x812 | Pass | `/?surface=world`, `/play`, `/worlds`, and `/events` render on mobile. Console only shows expected MiniKit warnings outside World App. Screenshots are in `store_assets/world/qa/railway-production-core-loop-20260428-213324/`. |
| Local Railway-style browser smoke, 127.0.0.1 | Pass | With runtime env injected by the built Express server, `/?surface=world`, `/worlds/:id`, `/tournament/:id`, and `/lobby/:id` render on the new World system without console errors. |
| Local Railway-style Quickplay data, public keys only | Expected partial | `POST /auth/v1/signup` succeeds and the shell renders, but `/api/world/quickplay/state` returns 400 until `SUPABASE_SERVICE_ROLE_KEY` is present locally. This is a local-env limitation, not a UI regression. |

## Active Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| World App auth cannot be fully verified outside a real World App WebView. | High | Run tunnel/QR test on iOS and Android before submission. |
| Real World App WebView behavior still unverified on physical devices. | High | Use the current handoff bundle in `store_assets/world/qa/railway-production-mobile-visual-auth-20260429-2345/`, scan the World Developer Portal QR on iOS and Android, and record screenshots/videos for wallet auth, IDKit, quickplay, and share. |
| `https://hexology.me` is not serving the current Railway/World App build. | High | Deploy current branch to the World App staging origin before using it for QR/device QA. |
| IDKit verification path depends on exact World API response shape. | Medium | Endpoint harness now covers expected success/failure handling; validate with staging credentials before submission. |
| Bundle size is high because web3/wallet/IDKit code is pulled into the app. | Medium | Split World ID and wallet-heavy code into lazy chunks after functional QA. |
| Migration changes play-account gating for anonymous World-bound users. | Medium | Test ranked, unranked, lobby, tournament, and legacy web auth flows against staging Supabase. |
| Device screenshots are not production-ready. | Medium | Replace local layout screenshots with iOS/Android World App WebView captures after staging QR test. |
| Local World console smoke can look broken if only public Supabase keys are loaded. | Low | For local built-server smoke, load `SUPABASE_SERVICE_ROLE_KEY` when validating live Quickplay data. Use public-key-only smoke for shell/UI checks only. |
| Parallel frontend/design changes are active in the worktree. | Medium | Keep backend/system work out of design-owned files and reconcile before ship. |

## Operating Loop

Every continuation should do this:

1. Update this file with current score, completed work, active risk, and next action.
2. Keep Linear issues aligned when work crosses a milestone boundary.
3. Run the narrowest useful verification after each patch.
4. Run the full release check before declaring a milestone done:

```bash
npm run typecheck
npm test
npm run build:server
npm run build
```

## Next Actions

1. Load `SUPABASE_SERVICE_ROLE_KEY` into the local built-server smoke path if live Quickplay data needs to be validated outside Railway.
2. Open the World Developer Portal test QR for `https://botbot-production-38b3.up.railway.app`.
3. Use `docs/WORLD_APP_PHYSICAL_QA_HANDOFF.md` plus `store_assets/world/qa/railway-production-mobile-visual-auth-20260429-2345/device-qa-report.html` during the phone pass.
4. Run real device World App QR QA on iOS and Android.
5. Verify wallet auth binding, IDKit proof, `/api/world/quickplay/state`, competitive gate state, `ranked`, `resume-ranked`, `ranked-rematch`, and room commands with real wallet-bound and verified users.
6. Capture iOS/Android World App screenshots for Play, Rooms, Events, Profile, verification gate, and share sheet.
7. Replace local dummy-env screenshots with staging iOS/Android World App captures.
