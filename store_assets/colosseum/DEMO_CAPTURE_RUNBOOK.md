# BOARD Colosseum Demo Capture Runbook

Last updated: 2026-05-04

## Goal

Capture one deterministic event-first submission packet for Colosseum.

This packet is the source of truth for:

- demo screenshots
- live demo route order
- event id under test
- fallback ranked capture only if the event path is unavailable

## Inputs

Required:

- `tournamentId`
- `eventName`
- `gameKey`
- app origin

Recommended origin:

- `https://botbot-production-38b3.up.railway.app`

Recommended route root:

- `https://botbot-production-38b3.up.railway.app/?surface=world`

## Account State Prerequisites

Canonical demo account should have:

- World wallet bound
- World human verified
- Solana wallet linked
- no event pass at the start of the capture run
- no tournament entry at the start of the capture run

If you cannot reset state cleanly, use a fresh seeded account instead of reusing a dirty profile.

## Capture Order

1. Open `/?surface=world`
2. Capture the featured event card before pass activation
3. Link Solana wallet if not already linked
4. Activate the event pass
5. Open `/tournament/:id`
6. Capture pass-active / pre-join state
7. Join the event
8. Capture joined event state
9. Open bracket or event state
10. Complete one match if the seeded flow supports it
11. Capture the competitive profile with event entry and sealed receipt

Fallback only if the event path is unavailable:

1. Activate ranked pass
2. Enter pass-backed ranked room
3. Capture ranked receipt flow

## Required Filenames

- `01-world-home-event-card.png`
- `02-wallet-linked.png`
- `03-event-pass-activated.png`
- `04-event-pass-blocked-state.png`
- `05-event-joined.png`
- `06-event-bracket-open.png`
- `07-profile-event-receipt.png`
- `08-ranked-fallback.png` optional

## Visibility Rules

Each frame should preserve the main competitive claim.

Must visibly show:

- BOARD branding
- event or competitive context
- wallet/pass state where relevant
- no token, prize, yield, or marketplace language
- no raw wallet address as the primary identity label

## Notes Per Frame

### `01-world-home-event-card.png`

Must show:

- featured event card
- event-forward copy
- primary CTA aimed at event access, not generic ranked

### `02-wallet-linked.png`

Must show:

- linked Solana wallet state
- human verification retained

### `03-event-pass-activated.png`

Must show:

- active event pass
- event name or tournament label
- action to continue into event

### `04-event-pass-blocked-state.png`

Must show:

- blocked join state before pass or before wallet link
- clear explanation of missing requirement

### `05-event-joined.png`

Must show:

- joined status
- participant or entry state
- join action resolved

### `06-event-bracket-open.png`

Must show:

- bracket or event-open state
- competitive event context

### `07-profile-event-receipt.png`

Must show:

- event entry count or latest event entry
- sealed receipt row
- event label
- outcome or issued time

## Output Directory

Generate the concrete packet under:

- `store_assets/colosseum/capture/<tournamentId>/`

Use the packet generator:

```bash
npm run capture:colosseum -- --tournament-id <id> --event-name "<name>" --game <gameKey>
```

## Acceptance

The packet is complete when:

- all required screenshots exist
- the results template is filled
- the event path works without fallback
- the product reads as `competitive identity / access / receipts`, not `mini app`
