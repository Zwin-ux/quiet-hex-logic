# Hex Game - Comprehensive Testing Checklist

## Critical Bug Fixes Verification

### 1. Pie Rule Logic in apply-move Edge Function
- [ ] **Test pie swap on turn 2**: Create a match, make first move, attempt pie swap
  - Expected: Turn should increment to 3 (not stay at 3)
  - Expected: Colors should be swapped on board
  - Expected: Next player should be able to play normally

### 2. DSU State Preservation
- [ ] **Test game cloning**: Play several moves, check if clone has correct connectivity
  - Use browser dev tools to inspect cloned game state
  - Verify winner detection works on cloned state
  - Verify winning path can be found

### 3. AI Matches with Pie Rule
- [ ] **Create AI match with each difficulty**: Verify pie rule is enabled
  - Easy difficulty: Pie rule checkbox should be enabled
  - Medium difficulty: Pie rule checkbox should be enabled
  - Hard difficulty: Pie rule checkbox should be enabled
  - Expert difficulty: Pie rule checkbox should be enabled
- [ ] **Test AI pie swap decision**: Make strong center opening, see if AI swaps

### 4. AI Turn Detection
- [ ] **Verify AI plays automatically**: After human move, AI should play within 1.2s
- [ ] **Test all board sizes**: 7x7, 9x9, 11x11, 13x13
- [ ] **Verify correct color assignment**: AI should play correct color each turn

---

## AI Difficulty Testing

### Easy Difficulty
- [ ] Create 7x7 match with Easy AI
- [ ] Verify AI makes random-ish moves with center bias
- [ ] Verify AI reasoning shows "Playing near center" or similar
- [ ] Play 3-5 moves and verify AI doesn't make obvious strategic plays

### Medium Difficulty
- [ ] Create 9x9 match with Medium AI
- [ ] Verify AI plays more strategically (blocking, connecting)
- [ ] Verify AI reasoning mentions "Advancing west-east" or "Building north-south"
- [ ] Test if AI swaps when opponent plays center

### Hard Difficulty
- [ ] Create 11x11 match with Hard AI
- [ ] Verify AI uses Monte Carlo reasoning in messages
- [ ] AI should make stronger moves than Medium
- [ ] Test if AI can win from a favorable position

### Expert Difficulty
- [ ] Create 13x13 match with Expert AI
- [ ] Verify AI uses LLM (check for more detailed reasoning)
- [ ] Verify fallback to Hard if LLM unavailable
- [ ] AI should provide meaningful strategic explanations

---

## Multiplayer Testing

### Match Creation
- [ ] **Create waiting match**: Should appear in lobby
- [ ] **Join match**: Second player should be able to join
- [ ] **Match code sharing**: Copy code and verify it can be used to join
- [ ] **Real-time updates**: Lobby should update when match status changes

### Gameplay
- [ ] **Turn validation**: Cannot play out of turn
- [ ] **Move synchronization**: Moves appear on both clients in real-time
- [ ] **Win detection**: Game ends when player connects their sides
- [ ] **Winning path highlight**: Path should be highlighted correctly

### Spectator Mode
- [ ] **Join as spectator**: Can spectate active or finished matches
- [ ] **Real-time updates**: Spectators see moves in real-time
- [ ] **Spectator list**: Shows current spectators
- [ ] **Cannot make moves**: Spectators can only watch

---

## Gameplay Features

### Pie Rule
- [ ] **Visual indicator**: Shows when pie rule is available
- [ ] **Pie swap button**: Appears on turn 2 if pie rule enabled
- [ ] **Color swap**: Correctly swaps all stones on board
- [ ] **Turn continuation**: Game continues correctly after swap

### Board Sizes
- [ ] **7x7 board**: Renders correctly, gameplay works
- [ ] **9x9 board**: Renders correctly, gameplay works
- [ ] **11x11 board**: Renders correctly, gameplay works
- [ ] **13x13 board**: Renders correctly, gameplay works

### Win Detection
- [ ] **Indigo wins (W-E)**: Place stones connecting west to east
- [ ] **Ochre wins (N-S)**: Place stones connecting north to south
- [ ] **Winning path**: Highlighted correctly for both colors
- [ ] **Game ends**: No more moves allowed after win

---

## UI/UX Testing

### Lobby
- [ ] **AI difficulty selector**: Dropdown shows all 4 options
- [ ] **Difficulty descriptions**: Show meaningful descriptions
- [ ] **Selected difficulty**: Persists when creating multiple matches
- [ ] **Notifications**: Match invites appear correctly
- [ ] **Friends list**: Can view and manage friends

### Match Page
- [ ] **Board rendering**: Hex grid renders correctly on all screen sizes
- [ ] **Move highlighting**: Last move is highlighted
- [ ] **Current player indicator**: Shows whose turn it is
- [ ] **AI thinking indicator**: Shows when AI is thinking
- [ ] **AI reasoning**: Displays AI's reasoning for move
- [ ] **Timer/turn count**: Shows game progress

### Profile & Stats
- [ ] **Win/loss record**: Displays correctly
- [ ] **Match history**: Shows past games
- [ ] **Achievements**: Tracks and displays achievements
- [ ] **Favorite board size**: Calculated correctly

---

## Performance Testing

### Board Rendering
- [ ] **13x13 board**: Should render smoothly
- [ ] **Move animation**: Smooth placement animation
- [ ] **No lag**: Game should be responsive even with many pieces

### AI Performance
- [ ] **Easy AI**: Responds within 1-2 seconds
- [ ] **Medium AI**: Responds within 2-3 seconds
- [ ] **Hard AI**: Responds within 3-5 seconds
- [ ] **Expert AI**: Responds within 3-6 seconds (LLM latency)

### Real-time Sync
- [ ] **Two clients**: Open match in two tabs/browsers
- [ ] **Move latency**: Moves should sync within 500ms
- [ ] **No race conditions**: Concurrent moves are handled correctly

---

## Edge Cases

### Game Logic
- [ ] **Full board**: What happens if board fills (shouldn't happen in Hex)
- [ ] **Rapid moves**: Spam clicking doesn't break game state
- [ ] **Invalid moves**: Cannot place on occupied cells
- [ ] **Browser refresh**: Game state persists after page reload

### Multiplayer
- [ ] **Player disconnects**: Game should handle disconnect gracefully
- [ ] **Opponent leaves**: Show appropriate message
- [ ] **Network error**: Handle Supabase connection errors

### AI
- [ ] **No valid moves**: AI handles edge case (shouldn't happen)
- [ ] **LLM failure**: Falls back to Hard difficulty
- [ ] **Invalid AI move**: System rejects and requests new move

---

## Security Testing

### Authentication
- [ ] **Logged out users**: Redirected to auth page
- [ ] **Can only move in own matches**: Cannot play for opponent
- [ ] **RLS policies**: Cannot access other users' private data

### Move Validation
- [ ] **Server-side validation**: Moves validated by edge function
- [ ] **Cannot cheat**: Direct API calls don't bypass validation
- [ ] **Turn enforcement**: Cannot play out of turn via API

---

## Database Integrity

### Migrations
- [ ] **ai_difficulty column**: Added successfully
- [ ] **Enum type**: 'easy', 'medium', 'hard', 'expert' are valid
- [ ] **Nullable**: AI difficulty is null for human-only matches

### Data Consistency
- [ ] **Moves table**: Append-only, no deletions
- [ ] **Match state**: Matches have correct status
- [ ] **Player colors**: Colors are 1 (indigo) or 2 (ochre)

---

## Browser Compatibility

### Desktop Browsers
- [ ] **Chrome/Edge**: Full functionality
- [ ] **Firefox**: Full functionality
- [ ] **Safari**: Full functionality

### Mobile Browsers
- [ ] **Mobile Chrome**: Touch controls work
- [ ] **Mobile Safari**: Touch controls work
- [ ] **Responsive design**: UI adapts to small screens

---

## Accessibility

### Keyboard Navigation
- [ ] **Tab navigation**: Can navigate lobby with Tab
- [ ] **Enter to select**: Can join matches with keyboard
- [ ] **Focus indicators**: Visible focus states

### Screen Readers
- [ ] **ARIA labels**: Important elements have labels
- [ ] **Game state**: Screen reader can announce game state

---

## Regression Testing

After each major change, verify:
- [ ] Can create AI match
- [ ] Can create human match
- [ ] Can join match
- [ ] Can make moves
- [ ] Game detects winner
- [ ] Pie rule works
- [ ] Spectator mode works
- [ ] Match history saves

---

## Final Smoke Test Sequence

1. **Sign up** → Create account
2. **Create Easy AI match (7x7)** → Play to completion
3. **Create Medium AI match (9x9)** → Test pie swap
4. **Create Hard AI match (11x11)** → Play 10 moves
5. **Create Expert AI match (13x13)** → Verify LLM reasoning
6. **Create human match** → Copy code
7. **Open second browser** → Join with code
8. **Play multiplayer game** → Complete game
9. **Check stats** → Verify win/loss recorded
10. **Spectate active match** → Join as spectator
11. **Check match history** → Verify all games saved
12. **Sign out and sign in** → Verify session persistence

---

## Known Issues to Watch For

1. **Pie swap turn logic**: Ensure turn = 3 after swap (not stuck at 3)
2. **AI difficulty null**: Some existing matches may have null difficulty
3. **LLM unavailability**: Expert mode should fall back gracefully
4. **Real-time lag**: Occasionally Supabase real-time can lag
5. **Mobile touch precision**: Small hexes on mobile may be hard to tap

---

## Testing Tools

- **Browser DevTools**: Inspect network, check console for errors
- **Supabase Dashboard**: Monitor database, check edge function logs
- **Multiple Browsers**: Test cross-browser compatibility
- **Mobile Simulators**: Test responsive design
- **Slow Network**: Throttle network to test real-time sync

---

## Success Criteria

### Critical (Must Pass)
- ✅ All 4 AI difficulties work correctly
- ✅ Pie rule works in AI and human matches
- ✅ Multiplayer synchronization is reliable
- ✅ Win detection is accurate
- ✅ No game-breaking bugs

### Important (Should Pass)
- 🎯 AI difficulty is perceptibly different
- 🎯 Real-time updates are fast (<1s)
- 🎯 UI is responsive and polished
- 🎯 Error messages are helpful
- 🎯 Game state is always consistent

### Nice to Have (May Pass)
- 💡 AI provides insightful reasoning
- 💡 Performance is smooth on all devices
- 💡 Accessibility is excellent
- 💡 All edge cases handled gracefully

---

## Bug Report Template

```
**Bug Title**: [Short description]

**Severity**: Critical / High / Medium / Low

**Steps to Reproduce**:
1.
2.
3.

**Expected Behavior**:

**Actual Behavior**:

**Environment**:
- Browser:
- OS:
- Match ID (if applicable):

**Screenshots/Logs**:

**Related Code**:
- File:
- Line:
```

---

**Testing Status**: 🔄 In Progress
**Last Updated**: 2025-10-21
**Tester**: [Your Name]
**Build Version**: [Git commit hash]
