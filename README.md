# Hexology

An open-source board game engine and platform: play classic games, mod the rules, and plug in your own AI to fight in the Bot Arena.

[![CI](https://github.com/Zwin-ux/quiet-hex-logic-2/actions/workflows/ci.yml/badge.svg)](https://github.com/Zwin-ux/quiet-hex-logic-2/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Built-in Games

| Game | Board | Multiplayer | Ranked | AI |
|------|-------|-------------|--------|----|
| Hex | Variable (7x7, 9x9, 11x11) | Online + Local | Yes | Easy / Medium / Hard / Expert |
| Chess | 8x8 | Online + Local | Yes | Easy / Medium |
| Checkers | 8x8 (American) | Online + Local | Yes | - |
| Tic Tac Toe | 3x3 | Online + Local | No | - |
| Connect 4 | 7x6 | Online + Local | No | Easy / Medium / Hard |

## Features

- **Multiplayer** — Create lobbies, share codes, play online with Elo-rated matchmaking
- **AI Opponents** — Multiple difficulty levels per game
- **Bot Arena (BYO AI)** — Run your own bot runner (local or hosted) and let it play unranked arena matches
- **Discord Activity** — Play directly inside Discord voice channels
- **Tournaments** — Bracket-based competitive play
- **Puzzles** — Practice mode for Hex
- **Replay System** — Review completed matches move-by-move
- **Mod Support** — Extend games with custom rules (v1: local-only)
- **Cross-platform** — Web (Vite/React) + iOS/Android (Expo)

## Architecture

```
src/
  lib/
    engine/           # GameEngine interface, adapters, and registry
      types.ts        # GameEngine<TMove> interface
      registry.ts     # Central game registry (GameDefinition)
      adapters/       # Wrappers: hex, chess, checkers, ttt, connect4
    hex/              # Hex engine (DSU-based win detection)
    chess/            # Chess engine (chess.js wrapper)
    checkers/         # Checkers engine (American rules)
    ttt/              # Tic Tac Toe engine
    connect4/         # Connect 4 engine
    mods/             # Mod system (schema, storage, import)
    discord/          # Discord Activity SDK integration
  hooks/              # React hooks (useMatchState, useMatchActions, etc.)
  components/         # UI components (boards, panels, modals)
  pages/              # Route components
  integrations/
    supabase/         # Supabase client and auto-generated types
supabase/
  functions/          # Deno Edge Functions (apply-move, create-lobby, etc.)
  migrations/         # SQL migration files
```

### Adding a New Game

Hexology uses a **game registry pattern**. To add a new game, you need:

1. **Engine** — `src/lib/<game>/engine.ts` with core game logic
2. **Adapter** — `src/lib/engine/adapters/<game>Adapter.ts` implementing `GameEngine<TMove>`
3. **Board component** — `src/components/<game>/<Game>Board.tsx`
4. **Register** — One call to `registerGame()` in `src/lib/engine/registry.ts`

That's it. The hooks, match page, lobby UI, and edge functions are all registry-driven.

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) v18+

### Quick Start

```bash
npm install --legacy-peer-deps
npm run dev       # Start dev server at http://localhost:8080
```

### Commands

```bash
npm run dev       # Vite dev server (port 8080)
npm run build     # Production build
npm run lint      # ESLint
npm test          # Run all tests (Vitest)
npm run test:watch  # Run tests in watch mode
```

### Mobile (Expo)

```bash
npm run ios       # Start Expo for iOS
npm run android   # Start Expo for Android
npm start         # Start Expo dev server
```

## Supabase

This repo uses Supabase for database, auth, realtime subscriptions, and edge functions.

- **Migrations**: `supabase/migrations/` (70 files)
- **Edge Functions**: `supabase/functions/` (apply-move, create-lobby, update-ratings, etc.)
- **Types**: `src/integrations/supabase/types.ts` (auto-generated, do not edit)

## Mods (v1)

Mods are **local-only** in v1: install from `/mods`, then start a local game.

Mod package format:
- `.zip` containing `manifest.json`
- Optional per-game rules overlays: `rules/hex.json`, `rules/chess.json`, etc.

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on the mod format and how to create mods.

## Bot Arena (MVP)

Hexology includes a Bot Arena where external AI runners can connect via a bot token and play unranked matches.

- UI: `/arena` and `/workbench`
- Reference runner: `tools/bot-runner/hex-random.mjs`

High level flow:
1. Create a bot in the Arena (token is shown once).
2. Run the bot runner with `HEXLOGY_BOT_TOKEN` set.
3. Create a bot-vs-bot arena match and spectate it in `/match/:id`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, branch conventions, and PR expectations.

## License

[MIT](LICENSE)
