

# Quick Play Speed Optimization Plan

## Problem Analysis

The current Quick Play flow has multiple sources of latency:

1. **Auth Loading Delay**: `useAuth()` hook starts loading when component mounts, not when the app boots
2. **Intermediate Route**: Hero navigates to `/lobby` which then handles match creation and navigates to `/match/:id`
3. **WelcomeOnboarding Delays**: 1500ms artificial delay before showing choices, 500ms delay after auth before match creation
4. **Match Page Loading**: Shows only a spinner until both `match` and `engine` state are available (line 985-990)
5. **Sequential DB Operations**: Match creation and player insertion happen sequentially, blocking navigation

Current flow timeline (estimated):
```text
Click Quick Play → Navigate to /lobby → Auth loading → Welcome onboarding (1500ms)
→ Sign in anonymously → Wait 500ms → Create match → Insert player → Navigate to /match
→ Load match from DB → Initialize engine → Render board
Total: 3-4 seconds
```

---

## Solution Architecture

### Target Flow
```text
Click Quick Play → Parallel: [Auth + Create match] → Navigate immediately to /match/:id
→ Optimistic skeleton → Background: Insert player → Hydrate board
Total: 1-2 seconds
```

---

## Implementation Tasks

### Task 1: Auth Session Prefetching

**File**: `src/App.tsx`

Add an `AuthPrefetcher` component at the app root that warms the auth session immediately on app load, before any user interaction.

```typescript
// New component to prefetch auth state
function AuthPrefetcher() {
  useEffect(() => {
    // Warm auth session cache immediately
    supabase.auth.getSession();
  }, []);
  return null;
}
```

Insert `<AuthPrefetcher />` near the top of the provider tree, before routes are rendered. This ensures auth state is already loaded by the time a user clicks "Quick Play".

---

### Task 2: Direct Match Creation in Hero

**File**: `src/components/Hero.tsx`

Replace the current `navigate('/lobby', { state: {...} })` with direct match creation:

1. Check if user exists; if not, call `signInAnonymously()` inline
2. Create match row directly via Supabase
3. Navigate immediately to `/match/:id` as soon as match ID is obtained
4. Pass `optimistic: true` flag in router state to signal Match page to show skeleton

```typescript
const handleQuickPlay = async () => {
  setIsLoading(true);
  try {
    // Get or create user session
    let currentUser = user;
    if (!currentUser) {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      currentUser = data.user;
    }
    
    if (!currentUser) throw new Error('Failed to create session');

    // Create match row (minimal fields for speed)
    const { data: newMatch, error: matchError } = await supabase
      .from('matches')
      .insert({
        size: 7,
        pie_rule: true,
        status: 'active',
        turn: 1,
        owner: currentUser.id,
        ai_difficulty: 'easy',
        allow_spectators: false
      })
      .select('id')
      .single();

    if (matchError) throw matchError;

    // Navigate immediately with optimistic flag
    navigate(`/match/${newMatch.id}`, { 
      state: { optimistic: true, userId: currentUser.id } 
    });

    // Insert player record in background (non-blocking)
    supabase.from('match_players').insert({
      match_id: newMatch.id,
      profile_id: currentUser.id,
      color: 1,
      is_bot: false
    }).then(({ error }) => {
      if (error) console.error('Background player insert failed:', error);
    });

  } catch (error) {
    console.error('Quick play error:', error);
    toast.error('Failed to start game. Please try again.');
    setIsLoading(false);
  }
};
```

This change requires importing `supabase` directly in Hero.tsx.

---

### Task 3: Match Page Loading Skeleton

**File**: `src/pages/Match.tsx`

Replace the simple spinner (lines 985-990) with a proper skeleton UI that mimics the game layout:

```typescript
// New skeleton component or inline skeleton UI
if (!match || !engine) {
  return (
    <div className="min-h-screen ios-safe-area bg-background">
      <div className="max-w-7xl mx-auto px-3 py-4 md:p-8">
        {/* Header skeleton */}
        <div className="mb-4 md:mb-8 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
        
        {/* Board area skeleton */}
        <div className="flex flex-col lg:grid lg:grid-cols-[280px_1fr_280px] gap-4 lg:gap-6">
          {/* Player panel skeleton */}
          <div className="hidden lg:block">
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
          
          {/* Board skeleton - centered hex pattern placeholder */}
          <div className="flex justify-center">
            <div className="aspect-square w-full max-w-[500px] bg-muted/50 rounded-2xl flex items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary/50" />
            </div>
          </div>
          
          {/* Player panel skeleton */}
          <div className="hidden lg:block">
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
```

Import `Skeleton` from `@/components/ui/skeleton`.

---

### Task 4: Streamline WelcomeOnboarding Delays

**File**: `src/components/WelcomeOnboarding.tsx`

Reduce artificial delays to minimize perceived wait time:

1. **Line 31**: Change `1500` to `600` - faster transition from splash to choices
2. **Lines 40-42**: Remove the 500ms delay after auth; call `onCreateMatch` immediately

```typescript
// Line 29-32: Reduce splash delay
useEffect(() => {
  const timer = setTimeout(() => {
    setStep('choice');
  }, 600); // Was 1500
  return () => clearTimeout(timer);
}, []);

// Lines 35-46: Remove auth propagation delay
const handleQuickPlay = async () => {
  setIsSigningIn(true);
  try {
    await signInAnonymously();
    onCreateMatch('easy', 7); // Call immediately, no setTimeout
  } catch (error) {
    console.error('Failed to create guest session:', error);
    setIsSigningIn(false);
  }
};
```

---

### Task 5: Error Recovery in Match Page

**File**: `src/pages/Match.tsx`

Add error handling for when optimistic navigation fails (e.g., match not found because background insert failed):

```typescript
// Near line 276-280, in loadMatch catch block or after match not found
if (!matchData) {
  toast.error('Match not found', {
    description: 'Would you like to try again?',
    action: {
      label: 'Retry',
      onClick: () => navigate('/lobby', { state: { createAI: true } })
    }
  });
  setTimeout(() => navigate('/lobby'), 3000);
  return;
}
```

Also add a timeout for skeleton display - if match doesn't load within 5 seconds, show an error with retry option.

---

## Technical Details

### Files Modified

| File | Changes |
|------|---------|
| `src/App.tsx` | Add `AuthPrefetcher` component at app root |
| `src/components/Hero.tsx` | Direct match creation, optimistic navigation |
| `src/pages/Match.tsx` | Loading skeleton UI, error recovery |
| `src/components/WelcomeOnboarding.tsx` | Reduce delays from 1500ms/500ms to 600ms/0ms |

### Dependencies
- Import `Skeleton` in Match.tsx
- Import `supabase` directly in Hero.tsx

### Database Considerations
- Match row is created first (blocking)
- Player row is created in background (non-blocking)
- Match page already handles missing player data gracefully for AI matches

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Player insert fails silently | Add retry logic in background; Match page handles missing player |
| User sees broken match page | Timeout with error toast and auto-redirect to lobby |
| Auth session not ready | Inline anonymous sign-in in handleQuickPlay |
| Race condition: navigate before match fully created | Only navigate after `.select('id').single()` succeeds |

---

## Testing Checklist

- [ ] Click Quick Play from homepage → lands on /match within 1-2 seconds
- [ ] Skeleton displays immediately while match data loads
- [ ] Game is fully interactive once board renders
- [ ] AI makes first move correctly (if player is color 1)
- [ ] Multiplayer lobby flow still works correctly
- [ ] Competitive mode still requires full account
- [ ] Mobile experience is smooth (sub-2s to gameplay)
- [ ] Error case: slow network shows skeleton, then game
- [ ] Error case: match creation fails shows toast with retry option

