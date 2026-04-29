# BOARD Scene Pack Spec

## Intent
Build a BOARD-owned icon system for the `Core 5` games that feels like system software, not stickers.

Reference qualities:
- Coinbase CDS: calm, rigorous, neutral primitives
- Kalshi: decision-first clarity
- Uber Base: component discipline and restrained interaction language

This pack is pure mono:
- black linework
- white or warm off-white planes
- no accent color dependence
- no decorative gradients, glows, or shadows

## Core 5
- `hex`
- `chess`
- `checkers`
- `ttt`
- `connect4`

## Forms
Each game ships in three related forms:
- `static mark`
- `micro scene`
- `compact badge`

The mark is for dense product UI.
The scene is for stateful onboarding, loading, and confirmation moments.
The badge is the scene or mark placed inside a simple mono container.

## Geometry
- Viewbox: `24 x 24`
- Safe drawing area: `18 x 18`
- Outer padding: `3px`
- Primary stroke: `1.65` to `1.85`
- Structural grid strokes: `1.45` to `1.55`
- Corners: rounded, but not bubbly
- Silhouette first, detail second

Rules:
- one clear silhouette at a glance
- no tiny interior noise
- every icon must still read at `16px`
- avoid filled black masses unless they communicate a resolved state

## Motion States
- `static`
  - no motion
- `idle`
  - optional low-amplitude pulse or opacity drift
  - max loop length: `3s`
- `selected`
  - one resolve motion
  - duration: `180ms` to `240ms`
- `loading`
  - one mechanical loop
  - duration: `800ms` to `1400ms`
- `success`
  - reuse the selected-state resolve, then stop

## Motion Rules
- easing: `cubic-bezier(0.22, 1, 0.36, 1)` for resolves
- loop easing: neutral mechanical easing, not playful easing
- no wobble
- no elastic bounce
- no blur trails
- no continuous ornament unless the state is genuinely loading

Reduced motion:
- all loops disabled
- state changes collapse to static swaps or opacity changes only

## Scene Language
### Hex
- motif: linked cells and one resolved route
- motion: path length resolving into a connection

### Chess
- motif: king/crown silhouette and one check-line sweep
- motion: a single directional sweep, not piece choreography

### Checkers
- motif: two discs and a jump cue
- motion: one controlled capture jump

### Tic-Tac-Toe
- motif: simple grid and third mark resolution
- motion: third mark resolves the board state

### Connect 4
- motif: slot board and one token drop
- motion: single token settles into column

## Product Use
Priority order:
1. `/play` onboarding
2. start/loading states tied to a selected game
3. other dense UI through static marks only

Do not scatter animated scenes across list surfaces like `/worlds` or `/events`.
Those screens stay text-first and operational.

## Interaction Layer
Pair the scene pack with the shared motion system:
- hover: optional `-1px` lift on desktop only
- press: `translateY(1px)`
- focus: monochrome high-contrast ring

The icon pack should reinforce that interaction language, not compete with it.
