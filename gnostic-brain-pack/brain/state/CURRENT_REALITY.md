# CURRENT_REALITY.md

## Current state
- Current version / branch reality: Main branch now carries a first real world slice on top of the existing Hexology engine stack.
- What is shipping: Railway web app, Supabase-backed auth/data, local AI practice, lobbies, tournaments, replay coach, and `/worlds` plus `/worlds/:worldId`.
- What is partially working: Worlds own tournaments and lobbies, global organizer creation now defaults toward worlds, global organizer pages now read more like directories, and `/play` plus `/events` now exist as truer aliases even though legacy routes still remain.
- What is fake / mocked / placeholder: Much of the world/event/instance language is still ahead of the older app shell and interior copy.
- What recently changed that matters: `worlds` and `world_members` were added as real data models, lobby/tournament creation can now link to a world, and world context now shows up in more organizer paths.

## User-visible truth
- What the user can count on: Solo play launches fast, public worlds can be browsed, and organizers can create a world plus linked room/event objects from both world pages and global organizer entry points.
- What breaks or feels weak: The product still changes tone and identity as you move between landing, auth, premium, arena, and organizer surfaces.
- What is confusing: Worlds are now structurally real, but the route vocabulary still leaks older product assumptions like `lobby` and `tournaments`.

## Technical truth
- Strongest subsystem: Registry-driven game engine plus match replay core.
- Weakest subsystem: Product shell coherence across routes and auth states.
- Most fragile dependency: Supabase RLS and environment correctness.
- Main operational bottleneck: Too many partially-real product directions competing for attention.
- Main architecture bottleneck: Legacy global surfaces still compete with the world container we actually need.

## Strategic truth
- What the project is really optimizing for this week: Turning BOARD's host-owned language into real stored objects and flows.
- What work looks productive but is not: More landing polish, more side integrations, or more player-only cosmetics.
- What risk is being underweighted: Shipping a half-converted product identity that promises organizer infrastructure without finishing the organizer core.

## Contradictions in current reality
- The world slice is real, but the app still centers old global routes like lobby, premium, and arena.
- Global creation now understands worlds, and the main directory pages have been reframed, but the URLs and some interior labels still preserve old product framing.
- The repo says BOARD, while many high-traffic screens still say Hexology.
- The design system says calm monochrome host software, while several interior pages still ship portal-era styling.

## Immediate recommendation
- Make the route model catch up to the product model: stop calling the global play desk `lobby`, and keep demoting off-thesis pages that still compete with world-first IA.
