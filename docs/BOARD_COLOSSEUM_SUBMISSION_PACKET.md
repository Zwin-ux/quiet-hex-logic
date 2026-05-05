# BOARD Colosseum Submission Packet

Last updated: 2026-05-04

## One-line Pitch

BOARD is a competitive room network for real-time strategy games where World proves the human and Solana carries room access plus match receipts.

## Short Description

BOARD lets real players enter competitive rooms, hold pass-backed access, play offchain in a fast game runtime, and leave with portable match receipts.

## The Primitive

BOARD is not trying to put the whole game onchain.

The narrow Solana primitive is:

- `RoomPass`
- `MatchReceipt`

That gives a clean answer to `why Solana`:

- passes can gate ranked or event access
- receipts can prove participation and outcomes
- both artifacts can travel beyond one app session

## Role Split

Use the dual stack deliberately.

- `World`
  - distribution inside World App
  - wallet-auth inside the World container
  - proof-of-human gate for competitive entry
- `Solana`
  - linked wallet identity for competitive state
  - room and season passes
  - match receipts
  - portable player history

World is the human layer.
Solana is the competitive asset and history layer.

## Problem

Competitive consumer games have weak portable identity.

- rooms are easy to spoof
- match participation rarely leaves a usable record
- event entry and match history are trapped inside one app
- “wallet game” products usually over-index on tokens instead of competition

BOARD focuses on the real coordination problem:

- who is allowed in
- who actually played
- what happened

## What Judges Should Understand Fast

Within one minute, the demo should make these points obvious:

1. This is a real consumer game loop, not a token wrapper.
2. Human verification matters because ranked rooms need anti-sybil trust.
3. Solana matters because passes and receipts become portable competitive artifacts.
4. The gameplay stays fast because execution remains offchain.

## Demo Script

### 1. Open BOARD

Show the core Play surface.

Say:

`World proves the player is human. Solana proves access and match history.`

### 2. Bind human proof

Use World wallet auth / verification gate.

Show:

- wallet bound
- human verified

### 3. Link Solana

Use the wallet lane.

Show:

- linked wallet
- no pass yet

### 4. Activate a ranked pass

Issue one pass-backed competitive access artifact.

Show:

- ranked pass active
- pass count increments

### 5. Enter a pass-backed ranked room

Use the Solana lane, not the plain ranked button.

Show:

- player can enter only after
  - human verification
  - wallet link
  - ranked pass

### 6. Complete a match

Keep the match runtime fast and ordinary.

Say:

`The game is still server-authoritative and offchain. Solana is only used where portability matters.`

### 7. Seal the receipt

Issue a match receipt after the result.

Show:

- receipt count increments
- latest receipt timestamp updates
- receipt row appears in the profile

### 8. Close on the profile

Show the competitive profile as the punchline:

- human proof
- linked wallet
- pass count
- sealed receipts

## Architecture Summary

Keep the current stack.

- `React + Vite`
- `Supabase`
- `Railway`
- existing BOARD game runtime

Add only a thin Solana competitive layer.

### Offchain

- room creation
- matchmaking
- live gameplay
- match execution
- ranking updates

### Solana-linked layer

- linked competitive wallet
- room pass issuance
- match receipt issuance

### World-linked layer

- app distribution
- wallet auth in World App
- proof-of-human gate

## Scope Discipline

### In scope

- one linked Solana wallet
- one season or room pass flow
- one ranked or tournament room flow
- one match receipt flow
- one profile/history surface

### Out of scope

- token rewards
- staking
- speculative economy
- marketplace-first pitch
- full onchain gameplay
- broad protocol surface

## Current Product Mapping

Already implemented in repo:

- World-bound identity and verification flow
- Solana wallet link challenge and signed completion
- ranked pass issuance
- pass-backed ranked entry path
- sealed match receipt issuance
- profile surface for pass and receipt history

Primary files:

- [server/index.ts](C:/Users/mzwin/Documents/hexoogy/server/index.ts)
- [src/pages/WorldAppHome.tsx](C:/Users/mzwin/Documents/hexoogy/src/pages/WorldAppHome.tsx)
- [src/lib/competitiveIdentity.ts](C:/Users/mzwin/Documents/hexoogy/src/lib/competitiveIdentity.ts)
- [src/hooks/useSolanaCompetitive.ts](C:/Users/mzwin/Documents/hexoogy/src/hooks/useSolanaCompetitive.ts)
- [src/lib/worldApp/competitive.ts](C:/Users/mzwin/Documents/hexoogy/src/lib/worldApp/competitive.ts)

## Judging Message

BOARD uses Solana where competitive software actually benefits from portability:

- entry rights
- participation proof
- outcome records

That creates a stronger competitive identity layer without slowing down the game itself.

## Risks

### Narrative risk

If the demo talks too much about World App or wallet auth, judges may hear “mini app” instead of “competitive identity protocol.”

Mitigation:

- lead with passes and receipts
- keep World as the trust/distribution layer, not the headline

### Product risk

If the app presents both stacks with no hierarchy, the experience feels confused.

Mitigation:

- human proof first
- wallet proof second
- one clear pass-backed lane

### Scope risk

Adding tokenomics would dilute the product.

Mitigation:

- no rewards
- no emissions
- no speculative mechanics

## Submission Positioning

Recommended framing:

- category: consumer gaming infrastructure
- secondary framing: social coordination protocol for competitive rooms

Avoid framing it as:

- “a board game on Solana”
- “a World mini app ported to Solana”
- “play-to-earn”

## Final Submission Copy

### 140-char version

Competitive rooms for real players, with Solana-backed room passes and match receipts.

### 1-paragraph version

BOARD is a competitive room network for real-time strategy games. World proves the player is human, Solana carries pass-backed access and sealed match receipts, and the game runtime stays fast by remaining offchain.
