# BOARD World App Device QA

This is the real-device gate for the World App release. Local browser smoke checks are useful, but they do not prove MiniKit wallet auth, IDKit, native share, haptics, or WebView behavior.

## Required Staging Setup

- Railway deploy with HTTPS.
- Railway server env:
  - `SUPABASE_URL`
  - `SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `WORLD_APP_ID`
  - `WORLD_ID_ACTION=verify-board-player`
  - `WORLD_ID_RP_ID`
  - `WORLD_ID_RP_SIGNING_KEY`
  - `VITE_PUBLIC_APP_URL`
- Supabase migration `20260429013327_add_world_app_identity.sql` applied to staging.
- World Developer Portal app points to the Railway or tunnel origin.
- World Developer Portal action matches `verify-board-player`.
- Physical iOS and Android devices with World App installed.

## Preflight

Run this against the tunnel or Railway URL:

```bash
npm run qa:world-device -- https://your-staging-origin.example
```

Run the authenticated staging gate after Supabase and World env are loaded:

```bash
npm run qa:world-device -- https://your-staging-origin.example --auth-check
```

Run the mobile visual pass as part of the same harness:

```bash
node scripts/world-device-qa.mjs https://your-staging-origin.example --visual-check
```

Run the local screenshot-only pass when you want iPhone/Android route captures without hitting the World API contract:

```bash
node scripts/world-device-qa.mjs http://127.0.0.1:4174 --visual-only
```

`--visual-only` is intentionally strict about fallback shells. It fails if the page renders `Deployment Config Missing`, `World failed to load`, or `Tournament failed to load`, even when the console stays quiet.

`--auth-check` creates one anonymous Supabase session and verifies authenticated World endpoints before wallet binding: nonce issuance, RP signing, Quickplay state, and the expected `world_wallet_required` command gates for ranked, resume, and rematch.

`--visual-check` captures the current mobile route matrix at:

- iPhone 15: `393x852 @ 2x`
- Pixel 8: `412x915 @ 2x`

Captured routes:

- `/?surface=world`
- `/play`
- `/worlds`
- `/events`
- `/worlds/:id`
- `/tournament/:id`

The script writes:

- `store_assets/world/qa/<timestamp>/world-app-qa-url.svg`
- `store_assets/world/qa/<timestamp>/world-app-qa-url.txt`
- `store_assets/world/qa/<timestamp>/device-qa-manifest.json`
- `store_assets/world/qa/<timestamp>/device-qa-checklist.md`
- `store_assets/world/qa/<timestamp>/*-ios.png`
- `store_assets/world/qa/<timestamp>/*-android.png`

The generated QR is a direct URL handoff for fast tunnel inspection. The release gate still uses the World Developer Portal test QR so the app opens inside the World App WebView.

## Current REF-109 Blocker

Latest automated attempt: 2026-04-29.

- Railway is linked to `confident-magic` / `production` / `botbot`.
- Supabase Railway env is now loaded for project `kgwxaenxdlzuzqyoewpe`: `SUPABASE_URL`, `VITE_SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- `WORLD_APP_ID` and `WORLD_ID_RP_ID` are now loaded from the World Developer Portal values.
- `WORLD_ID_RP_SIGNING_KEY` is now loaded in Railway.
- `railway run node scripts/check-world-release-readiness.mjs --strict-env` passes with 0 failures and 1 optional warning for `WORLD_DEV_PORTAL_API_KEY`.
- Railway deployment `f723d010-e0fe-401b-a6d4-3b7b627db30c` succeeded on 2026-04-29.
- Remote Supabase migration `20260429013327_add_world_app_identity.sql` is applied.
- `npm run qa:world-device -- https://botbot-production-38b3.up.railway.app` passes after the migration.
- Supabase anonymous auth is enabled for World App no-form entry.
- Authenticated staging preflight passes with `--auth-check`: anonymous Supabase session, World nonce, RP signing, Quickplay state, and the expected `world_wallet_required` ranked gate.
- Railway deployment `4f914db5-04cb-464b-bf15-f10d6329f57a` adds the competitive Quickplay read model.
- Authenticated competitive staging preflight passes with `--auth-check`: anonymous Supabase session, World nonce, RP signing, Quickplay competitive state, five supported game labels, and the expected `world_wallet_required` ranked gate.
- Railway deployment `e7abbecf-d6ba-4e89-8cb8-9b782fff6579` adds competitive summary fields to the existing `state_loaded` log event.
- Final authenticated competitive/log staging preflight passes against the Railway URL.
- Railway deployment `7ea729a4-6f63-443a-9287-82af00e17967` adds backend-supported ranked resume and rematch commands.
- Authenticated resume/rematch staging preflight passes against the Railway URL and verifies wallet gates for ranked, resume, and rematch.
- Railway deployment `98b2b537-479c-4460-a1b1-a21f45309629` wires the World App Play scene to competitive state, resume, and rematch actions.
- Deployed 375px browser evidence passes with only expected MiniKit warnings outside World App.
- Railway deployment `43580326-17b5-4f0c-8a8b-512aec892ec7` is the current passing combined snapshot after the core-loop UI refactor and manual room-code join wiring.
- Automated production checks pass against the Railway URL: smoke, strict readiness, anonymous Supabase auth, World nonce, RP signing, competitive Quickplay state, wallet-required ranked/resume/rematch gates, unauthenticated endpoint rejection, and QR artifact generation.
- Deployed browser evidence for `/?surface=world`, `/play`, `/worlds`, and `/events` is captured under `store_assets/world/qa/railway-production-core-loop-20260428-213324/`.
- Remaining blocker: physical iOS and Android World App QR/WebView QA.
- Added mobile screenshot verification in the device harness. Latest deployed pass shows:
  - `play`, `worlds`, and `events` render cleanly on iPhone and Android widths
  - `world detail` still fails on the live Railway build and renders the error fallback instead of the venue surface
  - the same `world detail` route is clean on the current local source build, which means the live failure is deployment drift, not a current source regression
- Public baseline against `https://hexology.me` failed because that origin is not serving the current Railway/World App build: `/api/health` and `/api/world/*` return 404, runtime env injection is absent, and the World App bundle labels are missing.
- Earlier Railway domain baseline against `https://botbot-production-38b3.up.railway.app` failed before deploy because the service timed out on `/api/health`, `/?surface=world`, and all `/api/world/*` endpoint checks.

Evidence:

- `store_assets/world/qa/public-baseline-20260428-195916/device-qa-manifest.json`
- `store_assets/world/qa/public-baseline-20260428-195916/device-qa-checklist.md`
- `store_assets/world/qa/railway-production-20260428-200525/device-qa-manifest.json`
- `store_assets/world/qa/railway-production-20260428-200525/device-qa-checklist.md`
- `store_assets/world/qa/railway-production-post-migration-20260428-203045/device-qa-manifest.json`
- `store_assets/world/qa/railway-production-post-migration-20260428-203045/device-qa-checklist.md`
- `store_assets/world/qa/railway-production-auth-20260428-204419/device-qa-manifest.json`
- `store_assets/world/qa/railway-production-auth-20260428-204419/device-qa-checklist.md`
- `store_assets/world/qa/railway-production-competitive-20260428-205526/device-qa-manifest.json`
- `store_assets/world/qa/railway-production-competitive-20260428-205526/device-qa-checklist.md`
- `store_assets/world/qa/railway-production-competitive-logs-20260428-205905/device-qa-manifest.json`
- `store_assets/world/qa/railway-production-competitive-logs-20260428-205905/device-qa-checklist.md`
- `store_assets/world/qa/railway-production-resume-rematch-20260428-211315/device-qa-manifest.json`
- `store_assets/world/qa/railway-production-resume-rematch-20260428-211315/device-qa-checklist.md`
- `store_assets/world/qa/railway-production-play-scene-20260428-211958/device-qa-manifest.json`
- `store_assets/world/qa/railway-production-play-scene-20260428-211958/device-qa-checklist.md`
- `store_assets/world/qa/railway-production-play-scene-20260428-211958/world-play-scene-mobile.png`
- `store_assets/world/qa/railway-production-core-loop-20260428-213324/device-qa-manifest.json`
- `store_assets/world/qa/railway-production-core-loop-20260428-213324/device-qa-checklist.md`
- `store_assets/world/qa/railway-production-core-loop-20260428-213324/world-surface-mobile.png`
- `store_assets/world/qa/railway-production-core-loop-20260428-213324/play-mobile.png`
- `store_assets/world/qa/railway-production-core-loop-20260428-213324/worlds-mobile.png`
- `store_assets/world/qa/railway-production-core-loop-20260428-213324/events-mobile.png`
- Latest mobile visual runs also write route screenshots and manifests under `store_assets/world/qa/<timestamp>/`.

Do not mark REF-109 complete until a real staging/tunnel URL passes automated preflight and physical iOS/Android World App checks.

Required unblock inputs:

- World Developer Portal test QR for the same staging/tunnel origin.
- Physical iOS and Android devices with World App installed.

## Manual Test Matrix

| Case | iOS | Android | Evidence |
| --- | --- | --- | --- |
| Dev Portal QR opens BOARD inside World App | Pending | Pending | Screenshot/video |
| First screen renders Play console and bottom tabs | Pending | Pending | Screenshot |
| Wallet auth opens and completes | Pending | Pending | Screenshot/video |
| Profile shows wallet-bound state | Pending | Pending | Screenshot |
| IDKit verification completes | Pending | Pending | Screenshot/video |
| Ranked is blocked before verification | Pending | Pending | Screenshot |
| Competitive scene shows wallet/human gate and game queue state | Pending | Pending | Screenshot |
| Ranked entry works after verification | Pending | Pending | Screenshot/video |
| Resume ranked returns the active match destination | Pending | Pending | Screenshot/video |
| Rematch starts the next ranked match from a recent result | Pending | Pending | Screenshot/video |
| Unranked room opens after wallet binding | Pending | Pending | Screenshot/video |
| Manual room-code join opens the lobby destination | Pending | Pending | Screenshot/video |
| Room share opens native share sheet | Pending | Pending | Screenshot/video |
| Haptics fire on invalid/success actions | Pending | Pending | Tester note |
| Background/resume keeps bottom nav and session state | Pending | Pending | Screenshot/video |

## Screen Capture List

Capture these from a real World App WebView:

1. Play tab, unbound or freshly bound state.
2. Play tab after human verification.
3. Rooms tab with at least one open room.
4. Events tab with empty or scheduled state.
5. Profile tab showing World username and verification state.
6. Verification gate after tapping ranked while unverified.
7. Native share sheet after sharing a room.

## Failure Rules

Block submission if any of these fail:

- App opens outside the World App WebView when launched from the Dev Portal test QR.
- Wallet auth cannot complete on either iOS or Android.
- IDKit verification cannot complete on at least one physical device.
- A raw wallet address appears in user-facing UI.
- Ranked entry does not read `profiles.is_verified_human`.
- Bottom nav disappears, overlays content, or requires scrolling to reach on 375px width.
- Any copy mentions WLD prizes, token rewards, yield, NFT unlocks, or paid competitive rewards.

## Evidence Naming

Use this pattern:

```text
store_assets/world/screenshots/YYYYMMDD-ios-play.png
store_assets/world/screenshots/YYYYMMDD-ios-profile-verified.png
store_assets/world/screenshots/YYYYMMDD-android-share-sheet.png
```

Keep raw device captures. Do not crop out the World App chrome when the purpose is WebView proof.
