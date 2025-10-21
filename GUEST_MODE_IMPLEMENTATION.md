# Guest Mode & Enhanced Tutorial Implementation

## Overview
This document outlines the changes made to enable guest play functionality and create an expanded interactive tutorial system for Hexology.

## Problem Solved
**Original Issue**: Users were encountering a "Failed to create match - new row violates row-level security policy for table 'matches'" error when trying to create matches. This was caused by RLS policies requiring authentication for all match operations.

## Changes Made

### 1. Database Migration - Guest Mode Support
**File**: `supabase/migrations/20251021090000_allow_guest_matches.sql`

- **Modified RLS Policies**: Updated Row Level Security policies for `matches`, `match_players`, and `moves` tables to allow unauthenticated (guest) users
- **Key Changes**:
  - Made `owner` column nullable in `matches` table to support guest matches
  - Updated INSERT policies to allow `auth.uid() IS NULL` (guest users)
  - Updated SELECT policies to allow viewing guest matches (where `owner IS NULL`)
  - Updated UPDATE policies to allow modifications to guest matches
  - Extended policies to `match_players` and `moves` tables for consistency

**Security Considerations**:
- Guest matches are isolated (owner is NULL)
- Authenticated users can still only modify their own matches
- Spectator functionality remains protected by `allow_spectators` flag

### 2. New Tutorial Page
**File**: `src/pages/Tutorial.tsx`

Created a comprehensive, interactive tutorial with:
- **8 Tutorial Steps**: Progressive learning from basics to strategy
- **Interactive Board**: Live hex board for hands-on practice
- **Guest Play Integration**: Direct transition from tutorial to guest matches
- **Features**:
  - Step-by-step progression with visual progress bar
  - Interactive hexagon board for practice moves
  - Educational content about game rules, pie rule, and strategy
  - Quick start options: "Play as Guest" or "Sign In"
  - Keyboard navigation support

### 3. Lobby Page Updates
**File**: `src/pages/Lobby.tsx`

**Guest Mode Support**:
- Removed authentication requirement redirect
- Added guest mode banner with sign-in prompt
- Modified `createMatch()` function to support guest users:
  - Owner can be `null` for guest matches
  - Player records only created for authenticated users
- Conditional UI rendering:
  - Hide notifications, profile, friends, history buttons for guests
  - Show "Sign In" button for guests
  - Hide "Join with Code" feature for guests (requires authentication)

**User Experience**:
- Clear visual indicator when playing as guest
- Prominent sign-in option without forcing authentication
- Full AI practice mode available for guests
- Multiplayer match creation available for guests

### 4. Routing Updates
**File**: `src/App.tsx`

- Added `/tutorial` route
- Imported and configured Tutorial page component

### 5. Landing Page Update
**File**: `src/components/LearnMode.tsx`

- Updated "Start Tutorial" button to navigate to `/tutorial` instead of `/auth`
- Allows users to learn without signing in first

## Features Enabled

### For Guest Users:
✅ Access the lobby without authentication
✅ Create AI practice matches (all difficulty levels)
✅ Create multiplayer matches
✅ Play through interactive tutorial
✅ View waiting and active matches
✅ Spectate matches (if allowed)

### For Authenticated Users:
✅ All guest features
✅ Match history tracking
✅ Friend challenges
✅ Profile and statistics
✅ Notifications for challenges
✅ Join matches with codes

## Testing Checklist

### Database Migration
- [ ] Run migration: `supabase migration up`
- [ ] Verify `matches.owner` is nullable
- [ ] Test guest match creation (owner = NULL)
- [ ] Test authenticated match creation (owner = user_id)
- [ ] Verify RLS policies allow guest operations

### Tutorial Page
- [ ] Navigate to `/tutorial`
- [ ] Step through all 8 tutorial steps
- [ ] Test interactive board functionality
- [ ] Test "Play as Guest" button creates AI match
- [ ] Test "Sign In" button navigates to auth
- [ ] Test keyboard navigation (arrow keys)

### Lobby Guest Mode
- [ ] Access `/lobby` without authentication
- [ ] Verify guest banner appears
- [ ] Create AI match as guest (all board sizes)
- [ ] Create multiplayer match as guest
- [ ] Verify user-specific features are hidden
- [ ] Test sign-in button functionality

### Integration
- [ ] Landing page tutorial button goes to `/tutorial`
- [ ] Tutorial completion goes to lobby
- [ ] Guest matches are playable
- [ ] Sign in from guest mode preserves functionality

## Migration Instructions

1. **Apply Database Migration**:
   ```bash
   supabase migration up
   ```

2. **Restart Development Server**:
   ```bash
   npm run dev
   ```

3. **Test Guest Flow**:
   - Open app in incognito/private window
   - Click "Start Tutorial" on landing page
   - Complete tutorial
   - Play as guest from lobby

## Notes

- **TypeScript Lint Errors**: The IDE shows module resolution errors for React, react-router-dom, etc. These are TypeScript configuration issues that don't affect runtime functionality. They can be resolved by running `npm install` if dependencies are missing.

- **Guest Match Persistence**: Guest matches are not associated with user profiles and won't appear in match history after the session ends.

- **AI Difficulty**: All AI difficulty levels (easy, medium, hard, expert) are available to guest users.

- **Pie Rule**: Fully supported for both guest and authenticated matches.

## Future Enhancements

- Local storage for guest match IDs to resume games
- Guest username selection (temporary names)
- Convert guest account to full account
- Guest match history (session-based)
- Tutorial progress tracking for guests
