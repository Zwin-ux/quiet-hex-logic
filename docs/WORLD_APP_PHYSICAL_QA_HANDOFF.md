# BOARD World App Physical QA Handoff

Last updated: 2026-04-29

This is the final release gate for the World App flow. Browser-based mobile emulation is already passing against the live Railway build. The remaining work is real iOS and Android verification inside the World App WebView.

## Target build

- App origin: `https://botbot-production-38b3.up.railway.app`
- World surface: `https://botbot-production-38b3.up.railway.app/?surface=world`
- Latest passing live deployment: `1f44dd16-2bd6-4635-a6ac-1b9390a9f9a1`
- Latest automated evidence bundle:
  - [device-qa-report.html](/C:/Users/mzwin/Documents/hexoogy/store_assets/world/qa/railway-production-mobile-visual-auth-20260429-2345/device-qa-report.html)
  - [device-qa-checklist.md](/C:/Users/mzwin/Documents/hexoogy/store_assets/world/qa/railway-production-mobile-visual-auth-20260429-2345/device-qa-checklist.md)
  - [device-qa-manifest.json](/C:/Users/mzwin/Documents/hexoogy/store_assets/world/qa/railway-production-mobile-visual-auth-20260429-2345/device-qa-manifest.json)
  - [physical-qa-freeze.md](/C:/Users/mzwin/Documents/hexoogy/store_assets/world/qa/railway-production-mobile-visual-auth-20260429-2345/physical-qa-freeze.md)
  - [physical-qa-results-template.md](/C:/Users/mzwin/Documents/hexoogy/store_assets/world/qa/railway-production-mobile-visual-auth-20260429-2345/physical-qa-results-template.md)
  - [physical-qa-failure-template.md](/C:/Users/mzwin/Documents/hexoogy/store_assets/world/qa/railway-production-mobile-visual-auth-20260429-2345/physical-qa-failure-template.md)

## What is already proven

- Railway health and runtime env are valid.
- The physical QA packet is now frozen to deployment `1f44dd16-2bd6-4635-a6ac-1b9390a9f9a1` with live asset fingerprints recorded.
- World auth endpoints reject unauthenticated requests.
- Auth-aware preflight passes with anonymous Supabase session, nonce issuance, RP signing, Quickplay state, and ranked/resume/rematch wallet gates.
- Browser-based iPhone 15 and Pixel 8 screenshots pass for:
  - `/?surface=world`
  - `/play`
  - `/worlds`
  - `/events`
  - `/worlds/:id`
  - `/tournament/:id`
- The previous live `/worlds/:id` drift is gone after the redeploy.

## What still must be proven on phones

- The Developer Portal QR opens BOARD inside the World App WebView on both iOS and Android.
- Wallet binding completes on both devices.
- IDKit verification completes on at least one device and updates the ranked gate.
- Room share opens the native share sheet inside the World App container.
- Background/resume preserves session state and bottom navigation.

## Required devices

- 1 physical iPhone with World App installed
- 1 physical Android device with World App installed

## Test order

1. Scan the Developer Portal test QR for the Railway origin above.
2. Confirm the app opens inside World App, not the normal browser.
3. Capture Play, Rooms, Events, and Profile screens immediately after load.
4. Bind wallet.
5. Attempt ranked before verification and capture the blocked state.
6. Complete IDKit verification.
7. Re-check ranked state after verification.
8. Open or join an unranked room and capture the lobby path.
9. Trigger room share and capture the native share sheet.
10. Background the app, resume, and confirm the session survives.

Fill the results directly into:

- [physical-qa-results-template.md](/C:/Users/mzwin/Documents/hexoogy/store_assets/world/qa/railway-production-mobile-visual-auth-20260429-2345/physical-qa-results-template.md)

If anything fails, duplicate and complete:

- [physical-qa-failure-template.md](/C:/Users/mzwin/Documents/hexoogy/store_assets/world/qa/railway-production-mobile-visual-auth-20260429-2345/physical-qa-failure-template.md)

## Evidence to capture

- `ios-play.png`
- `ios-profile-wallet-bound.png`
- `ios-ranked-blocked.png`
- `ios-profile-verified.png`
- `ios-room-share-sheet.png`
- `android-play.png`
- `android-profile-wallet-bound.png`
- `android-ranked-blocked.png`
- `android-room-share-sheet.png`
- at least one short video for wallet bind or IDKit proof

Store them under:

`store_assets/world/screenshots/YYYYMMDD-<device>-<state>.png`

Do not crop out World App chrome when the purpose is proving the WebView container.

## Release blockers

Do not clear the World App release if any of these are true:

- QR opens outside World App
- wallet auth fails on either device
- IDKit cannot complete on at least one device
- raw wallet address appears in the main UI
- ranked state ignores verification status
- share does not open the native share sheet
- bottom nav breaks after background/resume
- user-facing copy mentions prizes, WLD, token rewards, yield, or paid competitive rewards

## Reviewer note

The automated report may show browser warnings about MiniKit not being installed. Those are expected outside the World App container and are not release blockers. The physical-device pass is the authoritative check for that layer.
