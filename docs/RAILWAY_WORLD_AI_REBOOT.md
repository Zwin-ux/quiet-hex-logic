# Railway + World + AI Reboot

Date: 2026-03-30

## What Changes

This app should stop thinking in "Vercel app with a few edge functions" terms.

The right shape is:

- Railway hosts the app-facing server.
- Supabase stays in place for auth, Postgres, realtime, and existing game functions.
- World integration moves toward MiniKit + Wallet Auth for World App users.
- The Vercel AI SDK is used as a library, not as a reason to deploy on Vercel.

## Current Repo Reality

- Web app: Vite + React
- Mobile shell: Expo
- Backend today: Supabase auth, Postgres, realtime, and Deno edge functions
- Previous deployment assumption: a legacy `vercel.json` rewrite layer sent `/api/*` to Supabase functions
- Current World integration:
  - `@worldcoin/idkit` `^2.4.2`
  - `@worldcoin/idkit-react-native` `^2.1.0`
  - client hook in [`src/hooks/useWorldID.ts`](../src/hooks/useWorldID.ts)
  - proof verification in [`supabase/functions/verify-world-id/index.ts`](../supabase/functions/verify-world-id/index.ts)
- Current AI integration:
  - [`supabase/functions/analyze-game/index.ts`](../supabase/functions/analyze-game/index.ts)
  - tied to `LOVABLE_API_KEY`
  - not using the AI SDK stream/chat model

## Recommendation

### 1. Railway should own the public app API

Do not keep the Vercel pattern where `/api/*` is just a blind rewrite layer.

Railway should expose first-party app routes:

- `POST /api/chat`
- `POST /api/world/wallet-auth/nonce`
- `POST /api/world/wallet-auth/verify`
- `POST /api/world/idkit/sign` if we keep web IDKit fallback
- `POST /api/world/idkit/verify` if we keep server-side proof verification outside Supabase

Supabase can still handle:

- matches
- lobbies
- chat persistence
- rankings
- realtime
- existing game edge functions that are already working

### 2. Use the Vercel AI SDK on Railway, not the Vercel chatbot template

The repo should use:

- `@ai-sdk/react` in the client UI
- `ai` on the Railway server
- a provider package such as `@ai-sdk/openai` or the AI Gateway path if we want one key across models

The Vercel chatbot starter is useful as reference only. It is a Next.js app template and would pull this repo toward the wrong architecture.

For this codebase, the clean fit is:

- keep Vite for the product UI
- add one Railway Node service for streaming chat + World auth verification
- point `useChat` at that Railway API with a custom transport config

### 3. World App flow should favor MiniKit wallet auth

For World App / Mini App usage:

- prefer MiniKit + Wallet Authentication as the primary sign-in path
- verify payloads on the backend
- treat client-side payloads as untrusted

Important:

- The old "Sign in with World ID" path is no longer a good foundation.
- World's deprecation notice says Sign in with World ID v1 was shut down on January 31, 2026.

### 4. Keep IDKit only as a fallback, and only after upgrading it

If we still want non-World-App web verification:

- upgrade from `@worldcoin/idkit` 2.x to current 4.x
- add RP-signature generation on the backend
- stop relying on the old client-only shape

If we do not need browser-based World ID outside World App, we can simplify further:

- remove the old IDKit dependency entirely
- standardize on MiniKit + Wallet Auth for World-native users
- keep email/social/guest auth for everyone else

## Target Architecture

```text
World App / Web / Expo client
  -> Vite / Expo UI
  -> @ai-sdk/react for chat UI
  -> MiniKit in World App contexts
  -> Supabase client for auth/data/realtime

Railway API service
  -> /api/chat via AI SDK streamText()
  -> /api/world/* verification + wallet auth exchange
  -> issues app-safe responses for client consumption

Supabase
  -> auth
  -> profiles
  -> matches / moves / ratings
  -> realtime chat tables
  -> existing Deno functions that remain worth keeping
```

## Concrete Package Direction

Checked on 2026-03-30:

- `@worldcoin/minikit-js`: `2.0.0`
- `@worldcoin/minikit-react`: `2.0.0`
- `@worldcoin/idkit`: `4.0.11`
- `@ai-sdk/react`: `3.0.143`
- `ai`: `6.0.141`
- `@ai-sdk/openai`: `3.0.49`

Planned dependency direction:

- add `ai`
- add `@ai-sdk/react`
- add one provider package
- add MiniKit packages if we are shipping World-native UX
- retire `@worldcoin/idkit` 2.x after migration

## Migration Order

### Phase 1: Unblock architecture

1. Stop treating Vercel rewrites as part of the product architecture.
2. Introduce a Railway API base URL config for web + Expo.
3. Add a Railway server entrypoint for `/api/chat`.
4. Keep Supabase for game state and persistence.

### Phase 2: AI chat foundation

1. Add a dedicated assistant surface with `useChat`.
2. Stream via `POST /api/chat`.
3. Give the assistant real game-aware tools:
   - replay summary
   - opening explanation
   - position analysis
   - lobby helper / onboarding
4. Replace the one-off `analyze-game` implementation once the streamed assistant path is proven.

### Phase 3: World-native auth and UX

1. Detect World App / MiniKit context cleanly.
2. Add Wallet Auth nonce + verify routes on Railway.
3. Map successful wallet auth into the app's auth model.
4. Decide whether Supabase remains source-of-truth auth or whether World wallet auth becomes the primary identity for World users with profile linking layered on top.

### Phase 4: World-specific social hooks

1. Add World Chat sharing hooks for challenges, invite links, and replay shares.
2. Add profile-card hooks where usernames are shown.
3. Gate World-only entry points so they degrade cleanly on web and Expo.

## Repo-Specific Traps

### Legacy `vercel.json` shaped the old API story

The old `vercel.json` rewrote `/api/:path*` to Supabase functions. That worked for Vercel deployment, but it blocked a normal Railway-owned `/api/chat` route design.

This file should be treated as legacy deployment config once Railway becomes the source of truth.

### Current World code is on an old generation

[`src/components/WorldID/index.tsx`](../src/components/WorldID/index.tsx) and [`src/hooks/useWorldID.ts`](../src/hooks/useWorldID.ts) reflect the older IDKit setup. That is not where new World-native work should start.

### AI analysis is isolated and not reusable

[`supabase/functions/analyze-game/index.ts`](../supabase/functions/analyze-game/index.ts) is a single-purpose analysis endpoint. It is not yet a reusable conversational assistant architecture.

## Recommended First Build Slice

If we want the smallest meaningful reboot slice, do this first:

1. Add a Railway API service with `POST /api/chat`.
2. Add one "Hex coach" chat surface in the replay or match experience.
3. Use `@ai-sdk/react` on the client and `ai` on the server.
4. Keep the assistant tool set narrow:
   - explain last move
   - summarize replay
   - suggest next plan
5. After chat works, add World MiniKit context detection and wallet auth.

Reason:

- chat is easier to validate than auth migration
- it proves the Railway service shape
- it gives the product a visibly better feature fast

## Acceptance Criteria

- The app can run without Vercel-specific routing assumptions.
- A Railway-hosted API can stream chat responses to web and Expo clients.
- World-native users have a clean, intentional auth path.
- Non-World users still have a sane auth path.
- No core match, replay, or lobby flows depend on Vercel.

## References

- World Mini Apps docs: <https://docs.world.org/>
- World Chat command: <https://docs.world.org/mini-apps/commands/chat>
- World Wallet Auth command: <https://docs.world.org/mini-apps/commands/wallet-auth>
- World ID integrate docs: <https://docs.world.org/world-id/idkit/integrate>
- Sign in with World ID deprecation: <https://docs.world.org/world-id/sign-in/deprecation>
- AI SDK Node quickstart: <https://ai-sdk.dev/docs/getting-started/nodejs>
- AI SDK Expo quickstart: <https://ai-sdk.dev/docs/getting-started/expo>
- AI SDK chatbot transport: <https://ai-sdk.dev/docs/ai-sdk-ui/chatbot>
