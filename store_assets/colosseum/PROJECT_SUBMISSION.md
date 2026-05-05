# BOARD for Colosseum

## Project Name

BOARD

## Tagline

Competitive events for real players, with Solana-backed passes, event entry, and match receipts.

## Elevator Pitch

BOARD is a competitive event network for real-time strategy games. World proves the player is human, Solana carries event access and sealed competitive history, and the gameplay runtime stays offchain so the product still feels instant.

## Why Solana

We use Solana for the parts that need to persist and travel:

- event passes
- tournament entry
- match receipts

We do not use Solana to slow the game down with full onchain simulation.

## Demo Flow

1. Open BOARD.
2. Bind the human seat with World.
3. Link a Solana wallet.
4. Activate an event pass.
5. Enter a pass-backed event.
6. Open the bracket.
7. Finish a match.
8. Seal a receipt and show it in the competitive profile.

## Core Entities

- `PlayerIdentity`
- `RoomPass`
- `TournamentEntry`
- `MatchReceipt`
- `CompetitiveProfile`

## What Makes It Different

- human verification and wallet-linked competitive state are separated cleanly
- gameplay stays offchain and fast
- entry rights and result history become portable artifacts
- the product is about competition, not token speculation

## Scope

### In scope

- linked Solana wallet
- pass-backed event access
- event-linked receipts
- profile/history surface

### Out of scope

- reward token
- staking
- marketplace
- full onchain gameplay

## Technical Stack

- React + Vite
- Supabase
- Railway
- World App identity and proof-of-human
- Solana-linked pass and receipt layer

## Repo References

- [docs/BOARD_COLOSSEUM_SUBMISSION_PACKET.md](C:/Users/mzwin/Documents/hexoogy/docs/BOARD_COLOSSEUM_SUBMISSION_PACKET.md)
- [src/pages/WorldAppHome.tsx](C:/Users/mzwin/Documents/hexoogy/src/pages/WorldAppHome.tsx)
- [src/pages/TournamentView.tsx](C:/Users/mzwin/Documents/hexoogy/src/pages/TournamentView.tsx)
- [server/index.ts](C:/Users/mzwin/Documents/hexoogy/server/index.ts)
