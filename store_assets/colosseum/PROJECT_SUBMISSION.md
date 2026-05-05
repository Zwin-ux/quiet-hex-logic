# BOARD for Colosseum

## Project Name

BOARD

## Tagline

Competitive rooms for real players, with Solana-backed room passes and match receipts.

## Elevator Pitch

BOARD is a competitive room network for real-time strategy games. World proves the player is human, Solana carries access and sealed match history, and the gameplay runtime stays offchain so the product still feels instant.

## Why Solana

We use Solana for the parts that need to persist and travel:

- room passes
- tournament access
- match receipts

We do not use Solana to slow the game down with full onchain simulation.

## Demo Flow

1. Open BOARD.
2. Bind the human seat with World.
3. Link a Solana wallet.
4. Activate a ranked pass.
5. Enter a pass-backed ranked room.
6. Finish a match.
7. Seal a receipt and show it in the competitive profile.

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
- pass-backed ranked access
- sealed match receipts
- profile/history surface

### Out of scope

- rewards token
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
- [server/index.ts](C:/Users/mzwin/Documents/hexoogy/server/index.ts)
