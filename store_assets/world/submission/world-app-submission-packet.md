# BOARD World App Submission Packet

Status: BLOCKED

## Locked target

- App origin: `https://botbot-production-38b3.up.railway.app`
- World surface: `https://botbot-production-38b3.up.railway.app/?surface=world`
- Deployment id: `1f44dd16-2bd6-4635-a6ac-1b9390a9f9a1`
- QA bundle: `store_assets/world/qa/railway-production-mobile-visual-auth-20260429-2345`

## Submission fields

- App name: `BOARD`
- Category: `Games / Strategy`
- Positioning: Verified human play rooms for fast board games inside World App.
- Support URL: https://hexology.me/support
- Privacy Policy URL: https://hexology.me/privacy
- Terms URL: https://hexology.me/terms

### Short description

Play real people in fast board-game rooms. Verify once, enter ranked, rematch, or share a room.

### Full description

BOARD is a compact play room for classic board games inside World App.

Open the app, bind your World wallet, verify human status, and enter skill-based rooms without an email-first signup. Start a quick ranked match, open an unranked room, join live rooms, or share a room with another player.

Included games:

- Hex
- Chess
- Checkers
- Tic-Tac-Toe
- Connect 4

Ranked and competitive entry requires human verification. Unranked rooms stay lightweight so players can get into a match quickly.

BOARD does not include WLD prizes, paid competitive rewards, token mechanics, yield, NFT unlocks, randomized rewards, or chance-based competition.

## Review notes

BOARD is a verified play room for fast board games inside World App.

The Mini App lets a World App user bind their World wallet, verify human status with IDKit, enter ranked or unranked board-game rooms, and share room links.

### V1 scope
- Skill-based board games: Hex, Chess, Checkers, Tic-Tac-Toe, and Connect 4.
- Wallet auth is used to identify the World App account.
- IDKit is used only to prove human uniqueness for ranked and competitive entry.
- Supabase stores rooms, matches, profiles, ratings, and realtime state.
- Railway serves the React app and `/api/world/*` auth/verification endpoints.

### Explicit non-scope
- No WLD rewards.
- No prize pools.
- No token sale.
- No yield, staking, NFT unlocks, randomized rewards, or chance-based competition.
- No paid competitive rewards inside World App.
- No user-facing Notion or Linear integration.

## Physical QA

- Results file: `store_assets/world/qa/railway-production-mobile-visual-auth-20260429-2345/physical-qa-results-template.md`
- Final result: Pending
- Pending markers remaining: 17
- Fill-in markers remaining: 10

## Evidence inventory

### Screenshots
- missing (*ios-play.png)
- missing (*ios-profile-wallet-bound.png)
- missing (*ios-ranked-blocked.png)
- missing (*ios-profile-verified.png)
- missing (*ios-room-share-sheet.png)
- missing (*android-play.png)
- missing (*android-profile-wallet-bound.png)
- missing (*android-ranked-blocked.png)
- missing (*android-room-share-sheet.png)

### Videos
- missing

## Screenshot order for portal
1. Play console with quick ranked and unranked room actions.
2. Verification gate before ranked entry.
3. Profile after World wallet binding and human verification.
4. Rooms tab with join/share actions.
5. Events tab with scheduled or empty state.
6. Native share sheet evidence inside World App.

## Blockers
- physical QA results template is not complete
- missing required screenshot matching *ios-play.png
- missing required screenshot matching *ios-profile-wallet-bound.png
- missing required screenshot matching *ios-ranked-blocked.png
- missing required screenshot matching *ios-profile-verified.png
- missing required screenshot matching *ios-room-share-sheet.png
- missing required screenshot matching *android-play.png
- missing required screenshot matching *android-profile-wallet-bound.png
- missing required screenshot matching *android-ranked-blocked.png
- missing required screenshot matching *android-room-share-sheet.png
- missing required iPhone wallet-bind or IDKit proof video
