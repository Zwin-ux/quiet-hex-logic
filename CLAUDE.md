# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hexology+ is a cross-platform Hex board game application built with React/Vite for web and Expo for mobile (iOS/Android). It features multiplayer lobbies, tournaments, AI opponents, puzzles, and Discord Activity integration.

## Development Commands

```bash
# Web development
npm run dev          # Start Vite dev server on port 8080
npm run build        # Production build
npm run lint         # ESLint

# Mobile (Expo)
npm run ios          # Start Expo for iOS
npm run android      # Start Expo for Android
npm start            # Start Expo dev server
```

## Architecture

### Frontend Stack
- **React 18** with TypeScript, Vite, and react-router-dom
- **Tailwind CSS** with shadcn/ui components (in `src/components/ui/`)
- **TanStack React Query** for data fetching
- **Supabase** for auth, database, and realtime subscriptions

### Key Directories
- `src/pages/` - Route components (Index, Match, Lobby, Tournament, etc.)
- `src/components/` - UI components (HexBoard, PlayerPanel, GameClock, etc.)
- `src/hooks/` - Custom hooks (useLobby, usePremium, useLeaderboard, etc.)
- `src/lib/hex/` - Hex game engine and AI implementations
- `src/lib/discord/` - Discord Activity SDK integration
- `src/integrations/supabase/` - Supabase client and types (auto-generated)
- `supabase/functions/` - Edge Functions for game logic

### Hex Game Engine (`src/lib/hex/engine.ts`)
Core game engine using Disjoint Set Union (DSU) for win detection:
- Uses odd-q offset hex coordinates
- Player 1 (indigo) connects West-East
- Player 2 (ochre) connects North-South
- Supports pie rule (swap after first move)

### AI System (`src/lib/hex/ai.ts`)
Multiple difficulty levels:
- **Easy**: Random with center bias
- **Medium**: Minimax with depth 2
- **Hard**: MCTS with UCB1 (200+ iterations)
- **Expert**: LLM-based (via `ai-move` edge function)

### Supabase Edge Functions
Game actions are validated server-side via edge functions in `supabase/functions/`:
- `apply-move`, `validate-move` - Move validation and application
- `create-lobby`, `join-lobby`, `start-lobby-match` - Lobby management
- `create-tournament`, `join-tournament`, `start-tournament` - Tournament management
- `ai-move`, `ai-move-v2` - AI move computation
- `update-ratings` - Elo rating updates

### Discord Integration
The app runs as a Discord Activity. `DiscordContext` (`src/lib/discord/DiscordContext.tsx`) handles SDK initialization, authentication, and participant tracking.

## Path Alias
`@/*` maps to `./src/*` (configured in tsconfig.json and vite.config.ts)

## Styling
- Custom theme colors: `paper`, `ink`, `indigo`, `ochre`, `graphite` (defined via CSS variables)
- Fonts: Spectral (body), IBM Plex Mono (mono)
- Dark mode is the default (`userInterfaceStyle: "dark"` in app.json)

## Lovable Project
This is a Lovable (lovable.dev) project. The `lovable-tagger` dev dependency adds component tagging in development mode.
