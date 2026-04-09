# BRAIN.md

This file is the compressed front door to the repo's judgment layer.

## Identity Snapshot
- Product: BOARD
- One-line purpose: Host-owned board game world infrastructure for clubs, organizers, and creators.
- Primary user: Chess-first organizers who want their own recurring competitive venue.
- Core pain: Existing chess platforms give play, not ownership; hosts borrow someone else's space and rules.
- Desired emotional effect: Controlled, calm, credible, and host-owned.
- Category: Live board game world / event / instance system.

## Product Truth
- What actually works: Multi-game engine core, solo practice, live matches, lobbies, tournaments, replay, Railway server, AI coach, and a real world container that can own lobbies, tournaments, and linked matches.
- What is still brittle: Auth split, brand split, RLS complexity, and an IA that still has legacy routes even though they are now being reframed as utilities.
- What users can rely on today: Practice works without guest auth, worlds can be created, organizer creation flows can bind events/instances to worlds, linked detail pages preserve world context, and global lobby/event pages now behave like cross-world directories instead of primary homes.
- What the current implementation is **not** yet: A fully coherent host OS for running live chess communities.

## Product Narrative
- What we say the product is: A host-owned board game world system.
- What we want it to become: The default infrastructure layer for local chess clubs, creator leagues, and recurring competitive communities.

## Gap Between Truth and Narrative
- Where messaging is ahead of reality: Most interior app surfaces still look and behave like old Hexology, and some legacy pages still exist even after being demoted in meaning.
- Where reality is stronger than messaging: The engine, replay, AI, and live game architecture are more real than the current product story gives them credit for.

## Current Priorities
1. Make worlds the default organizer IA instead of letting global pages keep equal narrative weight.
2. Collapse the app around the chess-first organizer wedge and stop rewarding off-thesis sprawl.
3. Unify brand, IA, and auth around BOARD truth instead of legacy Hexology habits.

## Active Contradictions
- Landing says BOARD; major interior surfaces still say Hexology.
- Product language says world/event/instance; many routes still organize around legacy feature buckets.
- Organizer creation now prefers worlds, and global lobby/tournament pages have been reframed as secondary utilities, but the route structure still preserves old names and legacy mental models.

## Pressure Points
- The thing most likely to break trust: Claiming host ownership while the organizer stack still leaks portal-era behavior.
- The thing we keep postponing: Rebuilding the inside of the app around worlds instead of polishing the shell.
- The thing we may be overengineering: Wallet / social side quests before the core organizer wedge is excellent.
- The thing that matters more than current work suggests: Clear product primitives that line up with real stored objects.

## State Scores
- User clarity: 3/5
- Technical reliability: 3/5
- Design coherence: 2/5
- Strategic focus: 3/5
- Shipping momentum: 4/5
- Narrative honesty: 3/5

## Best Next Move
- Keep cutting old mental models: rename or reroute legacy global pages so the URL and route vocabulary stop fighting the world-first product shape.

## Read Next
- `brain/state/CURRENT_REALITY.md`
- `brain/state/ACTIVE_QUESTIONS.md`
- `brain/state/PRIORITIES.md`
- latest file in `brain/decisions/`
