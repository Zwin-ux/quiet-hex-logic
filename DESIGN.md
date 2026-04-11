# BOARD Design System

## Source of truth

- Public product name: `BOARD`
- Engine lineage: `Quiet Hex Logic`
- Current Figma workbench: `https://www.figma.com/design/JvFTSuiGPWJAefzY6hGEKZ`

This file is the implementation-facing design source of truth for BOARD. It exists to keep
the product visually disciplined while the brand shifts away from Hexology and toward a
future venue identity.

## North star

BOARD should feel like host-owned competition infrastructure.

Not:

- a generic SaaS dashboard
- an old-school game portal
- an esports brand
- a fantasy chess product
- a crypto clone with effects pasted on top

It should feel like:

- a future venue system
- a calm live-event surface
- a durable product object
- a host-first control layer
- a live board world OS

## Quality bar

The benchmark is not "good enough for an indie game site."

The benchmark is:

- clearer than Chess.com
- calmer than Lichess
- more intentional than most tournament software
- simple enough to trust at a glance

Every screen should be judged against:

1. Is there one obvious focal point?
2. Is the hierarchy immediate?
3. Is there any portal clutter or repeated navigation?
4. Would this still feel premium in black and white?
5. Does this feel like a host venue, not a landing page template?

## Visual direction

### Palette

Default to a light-gallery monochrome system:

- `#0A0A0A` primary black
- `#101114` deep surface
- `#23252B` graphite structure
- `#5D5D5D` muted copy
- `#D5D0C5` soft dividers
- `#EFECE3` bone support surface
- `#F8F6EF` page canvas
- `#FFFFFF` white surface

Rules:

- Use black, white, bone, and restrained grays as the full system by default.
- Do not rely on yellow or game-specific accent colors for primary identity.
- If color appears, it should be sparse and functional, not decorative.

### Typography

Use a tight editorial stack with clear role separation.

- Display: `Space Grotesk`, dense, black weight, tight tracking
- Body: `Instrument Sans`, medium and readable
- Labels: `IBM Plex Mono`, sparse and structural only

Tone:

- sharp
- direct
- restrained
- infrastructural

Avoid:

- oversized hype copy
- vague startup slogans
- decorative type pairings

## Layout rules

- Prefer large outer margins and simple stacking.
- Keep sections few and clearly separated.
- Avoid nested card mazes.
- On desktop, use one dominant text block and one supporting object.
- On mobile, reduce to a single clear column with strong vertical rhythm.
- Primary surfaces should feel like rails, frames, and venue panels rather than card mosaics.

Spacing scale:

- `8, 12, 16, 24, 32, 48, 72`

Corner logic:

- soft-square corners
- avoid overly bubbly radii
- use cut corners selectively on major venue panels and shells
- use the same radius family across buttons, inputs, and utility panels

### Signature motif

The core object language is the **skeletal board frame**.

It should suggest:

- exposed structure
- board geometry without literal tabletop cosplay
- room rigging and seat positions
- live playable objects inside a venue

It should not become:

- generic glassmorphism
- neon blobs
- noisy Web3 gradients
- decorative 3D for its own sake

## Component direction

### Navigation

- Navigation should be sparse and structural.
- Keep only the links that matter.
- Remove duplicate routes and icon clutter.
- Brand should read `BOARD`, not `Hexology`.
- The shell should feel like a rail + stage system, not a toolbar plus cards.

### Hero

The hero should communicate:

1. what BOARD is
2. who it is for
3. why it is different
4. what to do next

The hero should not try to summarize the whole app.
The first viewport should show a spatial object and live-system cues, not feature bullets.

### Title system

`BOARD` is not ordinary headline copy. It is a product object.

Rules:

- The wordmark should feel authored, dense, and slightly ambiguous.
- A blocked or domino-like shape can interrupt the title if readability survives.
- The title should carry more identity than any supporting panel or scene note.
- Supporting 3D should sit behind or around the title, not replace it.

Avoid:

- plain bold text dropped into a hero
- decorative outlines with no compositional role
- turning the wordmark into a soft tech logo

### Panels and object surfaces

- Use venue panels, strips, rails, and stage frames instead of repeating generic cards.
- White panels on light backgrounds should be structural and quiet.
- Black panels only when they create strong contrast and focus.
- Prefer thin borders and low-contrast depth over shadows.
- No floating glow effects.
- No pills as the default status/navigation shape.

### Practice and directories

- Practice should feel instant.
- Practice selection should feel like a room index or desk, not a game store.
- Worlds should feel like venues.
- Events should feel like orchestration layers.
- Live rooms should feel attached to host identity.

## Product copy rules

Prefer:

- world
- host
- room
- instance
- ruleset
- event
- live
- venue
- control

Avoid:

- platform buzzwords
- "community" as filler
- "empower"
- "seamless"
- "revolutionary"
- vague "play everything" language

## Motion

- Use hybrid depth: perspective drift, structural wipes, masked reveals, and quiet orbit motion.
- No heavy always-on WebGL in phase 1.
- Reduced-motion fallbacks are required.
- No decorative float blobs.

Motion should clarify state, not add personality by itself.

## Homepage structure

The homepage should stay radically simple:

1. Poster-stage hero
2. Host-world thesis
3. Instant practice desk
4. Quiet footer

Do not reintroduce:

- duplicate CTA bands
- feature bloat
- mod showcases on the front page unless they serve the core pitch
- random badges or decorative pills
- three-column marketing card grids
- giant left headline + small gray paragraph + dual CTA + floating mockup
- explanatory copy that talks about the design instead of the product

## Anti-slop bans

Permanent bans for BOARD public surfaces:

- no template-first SaaS hero skeleton
- no section-stitching from common landing-page libraries
- no fake dashboard card floating next to the headline
- no feature taxonomy pretending to be product design
- no copy that says what the page is not instead of showing what BOARD is
- no pages that could be mistaken for fintech, AI, productivity, or healthcare startup templates

## Implementation notes

- Prefer explicit BOARD tokens and primitives over inherited legacy theme styles.
- Preserve the existing stack.
- Reuse components where possible, but do not preserve weak visuals for the sake of reuse.
- If a section does not clearly improve understanding or action, cut it.
- Public surfaces should bias toward `Worlds`, `Play`, `Events`, and `Live Instance` vocabulary.
