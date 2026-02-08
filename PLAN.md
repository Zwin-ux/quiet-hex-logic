# Hexology — Full Audit Fix Plan

Comprehensive audit of all pages, hooks, components, edge functions, and config.
133 tests passing, build succeeds. Issues found and prioritized below.

---

## HIGH PRIORITY (Functional / Correctness)

### 1. World ID action string — old branding
**File:** `src/hooks/useWorldID.ts:178`
**Problem:** `WORLD_ID_ACTION = 'verify-openboard-player'` — references old branding. World ID verification uses this to scope proofs; if the World ID developer portal was updated to "hexology", verifications will fail.
**Fix:** Change to `'verify-hexology-player'`.

### 2. TTT excluded from ranked rating updates
**File:** `supabase/functions/apply-move/index.ts:231`
**Problem:** `if (gameKey !== 'ttt' && ...)` — TTT matches are explicitly excluded from Elo rating updates after completion. But TTT has `player_ratings` backend support and now appears on the leaderboard.
**Fix:** Remove `gameKey !== 'ttt'` guard so TTT ranked matches update ratings like all other games.

### 3. Validator factory silent fallback to Hex
**File:** `supabase/functions/_shared/gameValidators.ts:29-32`
**Problem:** `default:` case silently creates a Hex validator for any unknown `gameKey`. If a match has a corrupted/missing game_key, moves get validated against the wrong game with no logging.
**Fix:** Add `console.warn('Unknown game_key, defaulting to hex:', gameKey);` before the Hex fallback.

### 4. Workbench env var typo: HEXLOGY → HEXOLOGY
**File:** `src/pages/Workbench.tsx:30-31`
**Problem:** `$env:HEXLOGY_FUNCTIONS_URL` and `$env:HEXLOGY_BOT_TOKEN` — missing 'O'. This is copy-paste instructions for bot runners. Users following these docs will set the wrong env vars.
**Fix:** Change to `HEXOLOGY_FUNCTIONS_URL` and `HEXOLOGY_BOT_TOKEN`.

---

## MEDIUM PRIORITY (Dead Code / Polish)

### 5. Delete orphaned arena directory
**File:** `src/pages/arena/ArenaPage.tsx`
**Problem:** This file is never routed or imported. It imports non-existent files (`arenaTypes`, `arenaApi`, `variants`). Dead WIP code.
**Fix:** Delete `src/pages/arena/` directory entirely.

### 6. Delete unused useAIWorker hook
**File:** `src/hooks/useAIWorker.ts`
**Problem:** Never imported anywhere in the codebase. Dead code left over from earlier architecture.
**Fix:** Delete the file.

### 7. Animation float duration mismatch
**Files:** `tailwind.config.ts:115` and `src/index.css:105`
**Problem:** Tailwind defines `float` as 8s, CSS utility `.animate-float` defines it as 10s. Components using `animate-float` class get 10s (CSS wins), but if any component used the Tailwind `animate-float` utility token, it would be 8s.
**Fix:** Align both to 10s — change `tailwind.config.ts` line 115 to `"float": "float 10s ease-in-out infinite"`.

### 8. respond-draw loose equality
**File:** `supabase/functions/respond-draw/index.ts:66`
**Problem:** `if (drawOfferedBy == null)` uses `==` instead of `===`. Since `draw_offered_by` is SMALLINT NULL from the DB, the value is either `null` or a number. `== null` catches both `null` and `undefined`, which is actually correct here (defensive). But it's inconsistent with the rest of the codebase which uses strict equality.
**Fix:** Change to `=== null || drawOfferedBy === undefined` for clarity, or keep `== null` with a comment.

### 9. Premium.tsx dead priceId param
**File:** `src/pages/Premium.tsx:43`
**Problem:** Sends `{ priceId: 'openboard_plus_monthly' }` to `create-checkout`, but the edge function ignores this param entirely (uses `STRIPE_PRICE_ID` env var). Dead data with old branding.
**Fix:** Remove the `priceId` from the request body since the server doesn't use it.

---

## LOW PRIORITY (Code Style)

### 10. App.tsx indentation inconsistency
**File:** `src/App.tsx:67-68, 100-102`
**Problem:** `<ErrorBoundary>` and `<DiscordActivityWrapper>` have inconsistent indentation.
**Fix:** Align indentation of provider wrapper JSX.

---

## NOT BUGS (Verified False Positives)

- **Turn calculation inconsistency across validators**: `this.turn` (post-increment) in TTT/Hex/Connect4 produces the same value as `ctx.currentTurn + 1` in Checkers/Chess. Both are correct — stylistically different but functionally equivalent.
- **localStorage `openboard_*` keys**: Intentionally preserved per CLAUDE.md.
- **`.openboardmod` file extension**: Intentionally preserved.
- **Hardcoded Supabase URL in cron migration**: Already applied, migration SQL is immutable.
- **Vitest missing `globals: true`**: Tests explicitly import from 'vitest', so globals aren't needed. Both approaches work.

---

## Files to modify
1. `src/hooks/useWorldID.ts` — fix action string
2. `supabase/functions/apply-move/index.ts` — remove TTT rating exclusion
3. `supabase/functions/_shared/gameValidators.ts` — add warning log for unknown gameKey
4. `src/pages/Workbench.tsx` — fix env var typo
5. `src/pages/arena/ArenaPage.tsx` — **delete file**
6. `src/hooks/useAIWorker.ts` — **delete file**
7. `tailwind.config.ts` — fix float animation duration
8. `supabase/functions/respond-draw/index.ts` — strict equality
9. `src/pages/Premium.tsx` — remove dead priceId param
10. `src/App.tsx` — fix indentation (optional)

## Verification
- `npm test` — 133 tests still pass
- `npm run build` — production build succeeds
