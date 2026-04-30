# BOARD World App Review Notes

## App Position

BOARD is a verified play room for fast board games inside World App.

The Mini App lets a World App user bind their World wallet, verify human status with IDKit, enter ranked or unranked board-game rooms, and share room links.

## V1 Scope

- Skill-based board games: Hex, Chess, Checkers, Tic-Tac-Toe, and Connect 4.
- Wallet auth is used to identify the World App account.
- IDKit is used only to prove human uniqueness for ranked and competitive entry.
- Supabase stores rooms, matches, profiles, ratings, and realtime state.
- Railway serves the React app and `/api/world/*` auth/verification endpoints.

## Explicit Non-Scope

- No WLD rewards.
- No prize pools.
- No token sale.
- No yield, staking, NFT unlocks, randomized rewards, or chance-based competition.
- No paid competitive rewards inside World App.
- No user-facing Notion or Linear integration.

## Review Copy

Short description:
Play real people in fast board-game rooms. Verify once, enter ranked, rematch, or share a room.

Support note:
If wallet auth or verification fails, the user can continue browsing rooms and play unranked after wallet binding. Ranked entry stays locked until IDKit verification succeeds.

## Asset Paths

- App icon source: `store_assets/world/app-icon.svg`
- App icon raster: `store_assets/world/app-icon.png`
- Content card source: `store_assets/world/content-card.svg`
- Content card raster: `store_assets/world/content-card.png`
- Content card safe-area check: `store_assets/world/content-card-safe-check.svg`

## QA Evidence To Attach

- `store_assets/world/qa/railway-production-mobile-visual-auth-20260429-2345/device-qa-report.html`
- `store_assets/world/qa/railway-production-mobile-visual-auth-20260429-2345/physical-qa-results-template.md`
- iOS World App WebView screenshots: Play, Rooms, Profile, verification gate, share sheet
- Android World App WebView screenshots: Play, Rooms, Profile, verification gate, share sheet
- one iPhone wallet-bind or IDKit proof video
- Confirmation that `/api/world/*` rejects unauthenticated requests
- Confirmation that no raw wallet address appears in UI
