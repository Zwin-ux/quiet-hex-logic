# BOARD World App Submission Metadata

This file replaces the old Hexology native app copy for the World App release. Do not use prize, subscription, WLD, token, yield, or rewards language for this Mini App submission.

## App Information

**App Name**: BOARD

**Category**: Games / Strategy

**Positioning**: Verified human play rooms for fast board games inside World App.

## Short Description

Play real people in fast board-game rooms. Verify once, enter ranked, rematch, or share a room.

## Full Description

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

## Review Notes

- MiniKit wallet auth identifies the World App account.
- IDKit verifies human uniqueness for ranked entry.
- Existing Supabase game state, lobbies, matches, ratings, and realtime flows stay in place.
- Railway owns the `/api/world/*` auth and verification endpoints.
- No Notion or Linear content is visible to users.

## Support Information

**Support URL**: https://hexology.me/support

**Privacy Policy URL**: https://hexology.me/privacy

**Terms URL**: https://hexology.me/terms

## Asset Checklist

- App icon source: `store_assets/world/app-icon.svg`
- App icon raster: `store_assets/world/app-icon.png`
- Content card source: `store_assets/world/content-card.svg`
- Content card raster: `store_assets/world/content-card.png`
- Content card safe-area check: `store_assets/world/content-card-safe-check.svg`
- Review notes: `store_assets/world/REVIEW_NOTES.md`
- Device QA run artifacts: `store_assets/world/qa/<timestamp>/`
- Final submission packet: `store_assets/world/submission/world-app-submission-packet.md`

## Submission Command

After the physical World App pass is complete and the screenshot/video evidence is stored under `store_assets/world/screenshots/`, run:

```bash
node scripts/build-world-submission-packet.mjs
```

This command reads the canonical metadata in this file, the review notes, the frozen QA bundle, and the physical results template, then generates:

- `store_assets/world/submission/world-app-submission-packet.md`
- `store_assets/world/submission/world-app-submission-packet.json`

It fails until the real device results and required evidence are present.

## Screenshot Order

1. Play console with quick ranked and unranked room actions.
2. Verification gate before ranked entry.
3. Profile after World wallet binding and human verification.
4. Rooms tab with join/share actions.
5. Events tab with scheduled or empty state.
6. Native share sheet evidence inside World App.

## Copy Rules

Use:

- "Verify to enter ranked"
- "World seat"
- "Room open"
- "Quick ranked"
- "Open unranked room"
- "Share room"

Avoid:

- official
- seamless
- empower
- revolutionary
- earn
- yield
- rewards
- prize
- WLD payouts
