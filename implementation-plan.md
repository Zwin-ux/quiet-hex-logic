# Hexology Roadmap Implementation Plan

This plan covers the remaining 4 roadmap items for the Hexology board game platform.

---

## PHASE 1: Draw Offer/Accept Feature (Item #4)

**Priority:** HIGH | **Complexity:** MEDIUM | **Time:** 6-8 hours

### 1.1 Database Schema
**File:** supabase/migrations/20260208000000_add_draw_offer.sql
```sql
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS draw_offered_by SMALLINT NULL;
```

### 1.2 Update Types
**File:** src/hooks/useMatchState.ts - Add to MatchData interface:
```typescript
draw_offered_by?: number | null;
```

### 1.3 Edge Functions
**Files to create:**
- supabase/functions/offer-draw/index.ts
- supabase/functions/respond-draw/index.ts

### 1.4 Handlers
**File:** src/hooks/useMatchActions.ts - Add:
- handleOfferDraw()
- handleAcceptDraw()
- handleDeclineDraw()

### 1.5 UI
**File:** src/components/match/MatchHeader.tsx - Add draw buttons

---

## PHASE 2: as any Cleanup (Item #8)

**Priority:** MEDIUM | **Complexity:** LOW-MEDIUM | **Time:** 8-12 hours

119 occurrences → target 51 (fix 68, leave 51)

### 2.1 Registry boardComponent (5 fixes)
Make boardComponent optional in GameDefinition

### 2.2 Chess.js casts (6 fixes)
Remove double-casts in src/lib/chess/engine.ts

### 2.3 Game key casts (7 fixes)
Define GameKey type, add getGameKey() helper

### 2.4 Supabase results (10 fixes)
Define result interfaces for query returns

### 2.5 MatchData gaps (10 fixes)
Add version, updated_at to MatchData interface

### 2.6 Location state (3 fixes)
Type location.state in Lobby.tsx

---

## PHASE 3: Hook/Component Tests (Item #9)

**Priority:** MEDIUM | **Complexity:** MEDIUM | **Time:** 12-16 hours

Target: 95 → 139+ tests

### 3.1 Registry Tests (7 tests)
File: src/lib/engine/__tests__/registry.test.ts

### 3.2 Adapter Tests (25 tests)
Files: src/lib/engine/adapters/__tests__/*.test.ts (5 per game)

### 3.3 Storage Tests (6 tests)
File: src/lib/localMatches/__tests__/storage.test.ts

### 3.4 AI Selection Tests (6 tests)
File: src/lib/engine/__tests__/aiSelection.test.ts

---

## PHASE 4: Apple IAP (Item #10) - DEFERRED

**Priority:** LOW | **Complexity:** HIGH | **Time:** 16-20 hours

**Status:** Blocked on Apple Developer credentials
**Defer until:** Mobile app ready for TestFlight

