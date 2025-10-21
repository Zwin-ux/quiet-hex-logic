# Testing Guide - Guest Mode & Tutorial

## Quick Start

### 1. Apply Database Migration
The migration needs to be applied to your Supabase project to fix the RLS policy issue.

**Option A: Using Supabase CLI** (if installed)
```bash
supabase db push
```

**Option B: Using Supabase Dashboard**
1. Go to https://supabase.com/dashboard/project/ptuxqfwicdpdslqwnswd
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/migrations/20251021090000_allow_guest_matches.sql`
4. Run the SQL

### 2. Start Development Server
```bash
npm run dev
```

## Testing Scenarios

### Scenario 1: Guest User Flow (Incognito/Private Window)
1. Open app in incognito/private browsing mode
2. Click "Start Tutorial" button on landing page
3. Navigate through all 8 tutorial steps
4. At the end, click "Play as Guest (vs Easy AI)"
5. Verify match is created and playable
6. Return to lobby and try creating other matches

**Expected Results**:
- ✅ No authentication required
- ✅ Guest banner appears in lobby
- ✅ Can create AI matches
- ✅ Can create multiplayer matches
- ✅ User-specific features (Profile, Friends, History) are hidden

### Scenario 2: Tutorial Navigation
1. Navigate to `/tutorial` directly
2. Use "Next" and "Previous" buttons
3. Test keyboard arrow keys for navigation
4. Verify interactive board appears on appropriate steps
5. Complete tutorial and verify redirect to lobby

**Expected Results**:
- ✅ Progress bar updates correctly
- ✅ All 8 steps display properly
- ✅ Interactive board works on step 3
- ✅ Navigation is smooth

### Scenario 3: Authenticated User (Regular Window)
1. Sign in with existing account
2. Navigate to lobby
3. Verify all features are available
4. Create matches and verify they're saved to history

**Expected Results**:
- ✅ No guest banner
- ✅ All buttons visible (Profile, Friends, History, Notifications)
- ✅ Matches saved to profile
- ✅ Can challenge friends

### Scenario 4: Guest to Authenticated Transition
1. Start as guest (incognito)
2. Create a match as guest
3. Click "Sign In" button
4. Sign in or create account
5. Return to lobby

**Expected Results**:
- ✅ Guest banner disappears after sign-in
- ✅ All authenticated features become available
- ✅ Previous guest match may not be in history (expected behavior)

## Common Issues & Solutions

### Issue: "Failed to create match" Error
**Solution**: Database migration not applied. Follow Step 1 above.

### Issue: TypeScript Errors in IDE
**Solution**: These are configuration warnings and don't affect runtime. Run `npm install` if dependencies are missing.

### Issue: Tutorial Board Not Showing
**Solution**: Check browser console for errors. Verify HexBoard component is working.

### Issue: Guest Banner Not Appearing
**Solution**: Clear browser cache and cookies, then test in incognito mode.

## Feature Verification Checklist

### Guest Mode Features
- [ ] Can access `/lobby` without authentication
- [ ] Guest banner displays with sign-in option
- [ ] Can create AI matches (7×7, 9×9, 11×11, 13×13)
- [ ] Can select AI difficulty (Easy, Medium, Hard, Expert)
- [ ] Can create multiplayer matches
- [ ] Cannot see Profile, Friends, History buttons
- [ ] Cannot see Notifications
- [ ] Cannot use "Join with Code" feature

### Tutorial Features
- [ ] Accessible from landing page "Start Tutorial" button
- [ ] Accessible via `/tutorial` route
- [ ] 8 steps display correctly
- [ ] Progress bar updates
- [ ] Interactive board on step 3
- [ ] "Play as Guest" creates AI match
- [ ] "Sign In" navigates to auth page
- [ ] "Go to Lobby" button on final step

### Database & Security
- [ ] Guest matches have `owner = NULL`
- [ ] Authenticated matches have `owner = user_id`
- [ ] RLS policies allow guest operations
- [ ] RLS policies still protect user data
- [ ] Spectator mode works for both guest and auth users

## Performance Testing

### Load Testing
1. Create multiple guest matches
2. Create multiple authenticated matches
3. Verify database handles both types
4. Check for memory leaks in long sessions

### Browser Compatibility
Test in:
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers

## Rollback Plan

If issues occur, rollback the database migration:

```sql
-- Restore original RLS policies
DROP POLICY IF EXISTS "matches_insert" ON public.matches;
DROP POLICY IF EXISTS "matches_select" ON public.matches;
DROP POLICY IF EXISTS "matches_update" ON public.matches;

-- Original policies (require authentication)
CREATE POLICY "matches_insert" ON public.matches
  FOR INSERT WITH CHECK (auth.uid() = owner);

CREATE POLICY "matches_select" ON public.matches
  FOR SELECT USING (
    EXISTS(
      SELECT 1 FROM public.match_players mp 
      WHERE mp.match_id = id AND mp.profile_id = auth.uid()
    ) OR status = 'waiting'
  );

CREATE POLICY "matches_update" ON public.matches
  FOR UPDATE USING (
    EXISTS(
      SELECT 1 FROM public.match_players mp 
      WHERE mp.match_id = id AND mp.profile_id = auth.uid()
    )
  );

-- Restore NOT NULL constraint
ALTER TABLE public.matches ALTER COLUMN owner SET NOT NULL;
```

## Success Criteria

✅ Guest users can play without authentication
✅ Tutorial is comprehensive and interactive
✅ No security vulnerabilities introduced
✅ Authenticated users retain all features
✅ Database migration applies cleanly
✅ No breaking changes to existing functionality
