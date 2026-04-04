# BOARD Design System

## Source of truth

- Public product name: `BOARD`
- Engine lineage: `Quiet Hex Logic`
- Current Figma workbench: `https://www.figma.com/design/JvFTSuiGPWJAefzY6hGEKZ`

This file is the implementation-facing design source of truth for BOARD. It exists to keep the product visually disciplined while the brand shifts away from Hexology.

## North star

BOARD should feel like host-owned competition infrastructure.

Not:

- a generic SaaS dashboard
- an old-school game portal
- an esports brand
- a fantasy chess product

It should feel like:

- a premium venue system
- a calm live-event surface
- a durable product object
- a host-first control layer

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

Default to monochrome only:

- `#0A0A0A` primary black
- `#111111` deep surface
- `#1D1D1D` elevated dark surface
- `#3E3E3E` graphite text/supporting UI
- `#757575` muted copy
- `#CFCFCF` soft dividers on dark
- `#DDDDDD` light dividers
- `#F3F3F1` soft page background
- `#FFFFFF` white surface

Rules:

- Use black, white, and neutrals as the full system by default.
- Do not rely on yellow or game-specific accent colors for primary identity.
- If color returns later, it should be sparse and structural, not decorative.

### Typography

Use one family with disciplined scale.

- Display: dense, black weight, tight tracking
- Heading: bold or black, short line lengths
- Body: medium weight preferred over thin regular
- Labels: uppercase mono or tight bold sans only when needed

Tone:

- sharp
- direct
- restrained

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

Spacing scale:

- `8, 12, 16, 24, 32, 48, 72`

Corner logic:

- soft-square corners
- avoid overly bubbly radii
- use the same radius family across cards, buttons, and panels

## Component direction

### Navigation

- Landing nav should be minimal.
- Keep only the links that matter.
- Remove duplicate routes and icon clutter.
- Brand should read `BOARD`, not `Hexology`.

### Hero

The hero should communicate:

1. what BOARD is
2. who it is for
3. why it is different
4. what to do next

The hero should not try to summarize the whole app.

### Cards and panels

- white cards on light backgrounds
- black panels only when they create strong contrast and focus
- thin borders
- almost no shadows
- no floating glow effects

### Practice/game selection

- practice should feel instant
- game cards should be calm and legible
- difficulty selection should feel like a product sheet, not a game modal

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

- subtle only
- use fades and light vertical movement
- no glow pulses as identity
- no decorative float blobs

Motion should clarify state, not add personality by itself.

## Homepage structure

The homepage should stay radically simple:

1. Hero
2. Host-first product primitives
3. Instant practice/game selection
4. Quiet footer

Do not reintroduce:

- duplicate CTA bands
- feature bloat
- mod showcases on the front page unless they serve the core pitch
- random badges or decorative pills

## Implementation notes

- Prefer explicit monochrome styles on the landing page over inherited legacy theme tokens.
- Preserve the existing stack.
- Reuse components where possible, but do not preserve weak visuals for the sake of reuse.
- If a section does not clearly improve understanding or action, cut it.
