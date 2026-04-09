# ACTIVE_QUESTIONS.md

## Product questions
- Is chess-first organizer hosting the real commercial wedge, or is the repo still being pulled by player-facing experimentation?
- Which global routes should remain after worlds become the organizer entry point, and which should be reframed as directories only?
- What exact permissions should world admins get in v1 versus owners?

## Design questions
- How aggressively should the interior app be flattened into the monochrome BOARD system right now?
- Which pages are most damaging to trust because they still feel like old Hexology?
- Should world pages feel venue-like and operational, or closer to a club hub?

## Engineering questions
- Should the world slice stay as lightweight foreign keys on existing tables, or graduate into stronger server-side orchestration soon?
- Which existing RLS policies will fight the world model as more context is exposed?
- How should tournament-created matches be linked and surfaced inside worlds once round generation matures?
- Should standalone lobby/event creation stay alive once world-first organizer IA hardens, or become an explicit exception path?

## Go / no-go questions
Questions whose answers should meaningfully change scope or architecture:
- Do we commit to worlds as the top-level IA now, or keep straddling the old lobby-first structure?
- Do we freeze off-thesis features until the organizer slice is excellent?
- Do we treat BOARD as the public brand immediately across all high-traffic screens?

## Questions we are avoiding
- Whether premium/player monetization is distorting the product away from host infrastructure.
- Whether the app is still trying to be both a hacker toybox and organizer software at the same time.
- Whether brand transition debt is already large enough to require a deliberate cleanup sprint.
