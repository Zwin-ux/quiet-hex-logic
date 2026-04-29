# BOARD Fintech UI Prompt Pack

Updated: April 28, 2026

## Why this exists

BOARD is closest to high-quality consumer finance and trading apps when it is:

- calm
- dense
- precise
- trustworthy
- utility-first

The target is not "make it look like crypto."
The target is "make it feel as operationally sharp as Coinbase and Kalshi."

What that means in practice:

- little border dependence
- more tonal separation
- stronger numeric hierarchy
- cleaner navigation
- denser rows
- shorter copy
- fewer decorative shells
- one dominant task per screen

This file is a reusable prompt pack plus an implementation spec mapped to the current BOARD codebase.

## Research takeaways

### Coinbase

Coinbase’s official design and product writing point to three repeated values:

- simple
- accessible
- trusted

The quality is driven by:

- heavy use of semantic tokens
- very few typography roles
- restrained color
- dense but legible data surfaces
- accessibility as a quality constraint, not a compliance afterthought

Official references:

- [Coinbase Design System](https://cds.coinbase.com/)
- [Coinbase has open sourced its design system](https://www.coinbase.com/blog/Coinbase-has-open-sourced-its-design-system)
- [Building economic freedom, one pixel at a time](https://www.coinbase.com/blog/building-economic-freedom-one-pixel-at-a-time)
- [How accessibility drives product quality at Coinbase](https://www.coinbase.com/en-br/blog/how-accessibility-drives-product-quality-at-Coinbase)

### Kalshi

Kalshi’s quality is more information-architecture-driven than decorative:

- category and topic tabs
- dense market rows
- strong odds / price numerics
- explicit rules and source-of-truth surfaces
- crisp distinction between browse, trade, orderbook, and market detail

This is less about a special aesthetic and more about operational clarity.

Official references:

- [Finding Markets](https://help.kalshi.com/en/articles/13823842-finding-markets)
- [The Orderbook](https://help.kalshi.com/en/articles/13823828-the-orderbook)
- [Using the Orderbook](https://news.kalshi.com/p/using-the-orderbook)
- [Get Market Orderbook API](https://docs.kalshi.com/api-reference/market/get-market-orderbook)

## Current BOARD architecture

These are the current surfaces this pack should influence:

- global tokens in [src/index.css](C:/Users/mzwin/Documents/hexoogy/src/index.css)
- shared shell in [src/components/board/SiteFrame.tsx](C:/Users/mzwin/Documents/hexoogy/src/components/board/SiteFrame.tsx)
- shared navigation in [src/components/NavBar.tsx](C:/Users/mzwin/Documents/hexoogy/src/components/NavBar.tsx)
- content rail panels in [src/components/board/VenuePanel.tsx](C:/Users/mzwin/Documents/hexoogy/src/components/board/VenuePanel.tsx)
- state chips in [src/components/board/StateTag.tsx](C:/Users/mzwin/Documents/hexoogy/src/components/board/StateTag.tsx)

Current design debt:

- too many hard outlines doing the work instead of surface tone and spacing
- too much retro shell language on screens that should feel more operational
- page headers sometimes speak like host setup even on play-first surfaces
- panel shapes are stronger than the data inside them
- hierarchy is good in places, but not yet consistently "trading-grade"

## Non-negotiable style rules

1. No generic SaaS hero patterns.
2. No floating-card grids.
3. No fake dashboard clutter.
4. No visual noise used to imply quality.
5. No thick borders as the default grouping mechanism.
6. No multi-accent rainbow state system.
7. No soft motivational copy.
8. No giant empty whitespace if the screen should be operational.

## Target visual model

Think:

- Coinbase for system discipline
- Kalshi for market density
- Apple Wallet level restraint on chrome

Not:

- crypto casino
- startup landing page
- gaming UI overload
- "modern fintech" Dribbble slop

### Personality

- calm
- surgical
- fast
- literate
- credible

### Visual principle

Surfaces should feel like paper, glass, or muted instrument panels.
They should not feel like framed collectibles.

## Prompt Pack

### 1. Master prompt

```text
Redesign this interface with the structural discipline of Coinbase and Kalshi.

The result should feel calm, precise, trusted, and operational.

Rules:
- No generic SaaS hero layouts.
- No feature-card grids.
- No decorative floating panels.
- Use tonal separation before borders.
- Borders are optional and should usually be 1px with 8% to 14% opacity only.
- Prioritize spacing, alignment, type hierarchy, and data density.
- Use a very small typography system with strict roles.
- Use tabular numerals for counts, records, prices, ratings, timers, and percentages.
- Navigation should be compact and utility-first.
- Lists and rows should carry the product, not giant cards.
- Keep one dominant action per screen.
- Motion should be subtle and fast, never ornamental.
- Copy should be concise, factual, and operational.

The UI should feel like a premium consumer trading product adapted for a board-game network.
```

### 2. App shell prompt

```text
Design a premium app shell for BOARD inspired by high-quality finance apps.

Shell requirements:
- compact utility navigation
- strong logo presence without marketing theatrics
- tonal page background
- subtle section dividers
- one high-contrast primary action at most
- no thick frames around every region
- low-noise top bar
- consistent content width and spacing rhythm

The shell should feel like it exists to move the user into data and action quickly.
```

### 3. Directory page prompt

Use for Worlds, Events, Mods, and similar browse pages.

```text
Redesign this directory page like a serious market browser.

Requirements:
- compact summary at top
- tabs or filters near the top
- dense rows with clear primary metric
- one supporting right rail only if it adds immediate value
- rows should scan quickly on desktop and mobile
- no empty promotional cards
- no repeated explanatory copy
- all numerics must use tabular alignment
- category and state tags must be compact and consistent

The page should feel like a place to assess live opportunities quickly.
```

### 4. Detail page prompt

Use for WorldView, TournamentView, Match shell side rails, profile stats.

```text
Design this detail page like a market detail or account detail screen.

Requirements:
- large numeric or title anchor
- immediate state summary
- compact action cluster
- secondary details in clean sections
- support dense information without visual clutter
- use tonal grouping instead of obvious card stacks
- emphasize relevance order: current state, actionable controls, secondary history

This should feel like a control surface, not a landing page.
```

### 5. Mobile wrapper prompt

```text
Design the mobile version as a focused play and monitoring surface.

Rules:
- hide web-authoring energy
- keep only quickplay, join, spectate, readiness, and live-room control patterns
- use fewer visible actions
- compress navigation
- preserve legibility with larger touch targets
- keep the structure dense but breathable
- do not show desktop host ambitions on mobile

The mobile app should feel like a serious companion, not a crippled desktop clone.
```

### 6. Copy rewrite prompt

```text
Rewrite this UI copy in the style of a premium trading or finance app.

Rules:
- short labels
- factual tone
- no filler
- no hype
- no tutorial language
- no cute metaphors
- no startup language
- no "discover", "unlock", "empower", "seamless", or "powerful"

Prefer verbs like:
Open
Join
Start
Queue
Watch
Review
Copy
Manage
Verify

The copy should assume competence.
```

### 7. Critique prompt

```text
Audit this UI against Coinbase/Kalshi quality standards.

Flag:
- excessive borders
- card bloat
- weak numeric hierarchy
- weak row density
- repeated copy
- over-decorated panels
- unclear navigation
- surfaces that should be calmer
- empty space where useful information should exist

Then propose a cleaner version that uses fewer, stronger design decisions.
```

## BOARD-specific prompts

### Landing / home

```text
Treat BOARD home as a quickplay-first launcher with the restraint of a premium finance app.

Requirements:
- fast scan
- minimal chrome
- one short line of framing copy
- four direct game entries
- small route to events
- no explanation of the whole product
- no giant illustration
- no promo block stack

The page should feel like an exchange home screen adapted for fast game entry.
```

### Worlds

```text
Treat Worlds like venues plus live market boards.

Requirements:
- each row should communicate venue name, live state, participation, and joinability fast
- de-emphasize framing borders
- strengthen the count typography
- use compact status chips
- right rail should feel like a selected market summary, not a separate marketing card
```

### Events

```text
Treat Events like a contract or market directory.

Requirements:
- compact top-level summary
- rows that emphasize title, state, player count, and timing
- stronger numeric weight
- less descriptive paragraph copy
- one featured event at most
- no hiring or promo clutter
```

### Host / organizer

```text
Treat Host like a product pricing and operations surface, not a marketing page.

Requirements:
- operational trust
- quiet billing language
- concise explanation of what is billed and what is organizer-owned
- strong venue list rows
- minimal decorative shell language
- pricing and status should feel like account management, not a landing campaign
```

## Token spec for BOARD

This is not a request to mimic Coinbase’s exact palette.
It is a request to adopt their token discipline.

### Recommended token model

Add or normalize these semantic layers in [src/index.css](C:/Users/mzwin/Documents/hexoogy/src/index.css):

#### Surface tokens

```text
--surface-canvas
--surface-base
--surface-elev-1
--surface-elev-2
--surface-inverse
--surface-accent-wash
```

Meaning:

- `canvas`: app background
- `base`: default panel
- `elev-1`: slightly lifted region
- `elev-2`: stronger but still quiet elevation
- `inverse`: dark contrast region
- `accent-wash`: pale accent tint for selected state only

#### Text tokens

```text
--text-primary
--text-secondary
--text-tertiary
--text-inverse
--text-positive
--text-negative
--text-warning
```

#### Line tokens

```text
--line-subtle
--line-default
--line-strong
--line-inverse
```

Recommended behavior:

- `line-subtle`: 8% to 10% opacity
- `line-default`: 12% to 14% opacity
- `line-strong`: only for selected state, table structure, or destructive emphasis

#### Accent tokens

Keep one product accent as primary.
BOARD can keep a deep blue or near-black accent and use game colors only as secondary identifiers.

```text
--accent-primary
--accent-primary-hover
--accent-primary-wash
--accent-success
--accent-warning
--accent-danger
```

#### Numeric emphasis

```text
--font-ui: Instrument Sans, sans-serif
--font-mono: IBM Plex Mono, monospace
```

Rules:

- use `Instrument Sans` for UI and display
- use `IBM Plex Mono` sparingly for micro labels, timers, and machine-like references
- all important counts should use `font-variant-numeric: tabular-nums`

## Type system for BOARD

Reduce to a strict set of roles:

```text
display
title
section
body
label
caption
legal
numeric-hero
numeric-row
```

Recommended behavior:

- `display`: landing and key detail page anchors only
- `title`: page and panel titles
- `section`: grouped region headers
- `body`: default paragraph text
- `label`: buttons, tabs, chips, rails
- `caption`: support text
- `legal`: terms / policy / billing support
- `numeric-hero`: large stats
- `numeric-row`: row-level metrics

Avoid inventing one-off type sizes.

## Motion spec

Coinbase-level motion is present but restrained.

Apply these defaults:

```text
hover/focus transitions: 120ms to 180ms
content reveal: 180ms to 240ms
modal/tray: 200ms to 260ms
easing: cubic-bezier(0.22, 1, 0.36, 1)
```

Do not use:

- floating idle animation
- ornamental bounce
- exaggerated parallax
- looping glow

Use motion only for:

- selection change
- list filtering
- tray/modal entry
- chart scrub response
- hover/focus clarity

## Component checklist

These are the current components or patterns most worth refactoring.

### High priority

#### 1. `SiteFrame`

File:

- [src/components/board/SiteFrame.tsx](C:/Users/mzwin/Documents/hexoogy/src/components/board/SiteFrame.tsx)

Refactor target:

- lower ambient texture intensity
- cleaner page padding rhythm
- stronger shell consistency between landing and utility surfaces
- reduce "theme effect" feeling

#### 2. `NavBar`

File:

- [src/components/NavBar.tsx](C:/Users/mzwin/Documents/hexoogy/src/components/NavBar.tsx)

Refactor target:

- treat it like a utility bar
- shrink visual noise
- improve spacing and label weight
- better current-location treatment
- fewer ornamental shell gestures

#### 3. `VenuePanel`

File:

- [src/components/board/VenuePanel.tsx](C:/Users/mzwin/Documents/hexoogy/src/components/board/VenuePanel.tsx)

Refactor target:

- move away from the retro framed window metaphor as default
- use softer tonal separation
- reserve framed titlebars for rare emphasis only
- make the component feel more like a quiet data region than a themed panel

#### 4. `StateTag`

File:

- [src/components/board/StateTag.tsx](C:/Users/mzwin/Documents/hexoogy/src/components/board/StateTag.tsx)

Refactor target:

- smaller
- tighter
- more uniform
- more tonal
- less arcade-coded

#### 5. Directory row patterns

Files:

- [src/pages/Worlds.tsx](C:/Users/mzwin/Documents/hexoogy/src/pages/Worlds.tsx)
- [src/pages/Tournaments.tsx](C:/Users/mzwin/Documents/hexoogy/src/pages/Tournaments.tsx)

Refactor target:

- rows should do more than shells
- sharpen metric alignment
- reduce row framing contrast
- strengthen selection state
- make the page feel market-list-like

### Medium priority

#### 6. Support/legal surfaces

Files:

- [src/pages/Support.tsx](C:/Users/mzwin/Documents/hexoogy/src/pages/Support.tsx)
- [src/pages/Privacy.tsx](C:/Users/mzwin/Documents/hexoogy/src/pages/Privacy.tsx)
- [src/pages/Terms.tsx](C:/Users/mzwin/Documents/hexoogy/src/pages/Terms.tsx)

Refactor target:

- reduce theme novelty
- make them read more like credible support/account/legal surfaces
- keep the stronger visual system but with less border choreography

#### 7. Host and settings surfaces

Files:

- [src/pages/Host.tsx](C:/Users/mzwin/Documents/hexoogy/src/pages/Host.tsx)
- [src/pages/WorldSettings.tsx](C:/Users/mzwin/Documents/hexoogy/src/pages/WorldSettings.tsx)
- [src/pages/WorldVariants.tsx](C:/Users/mzwin/Documents/hexoogy/src/pages/WorldVariants.tsx)

Refactor target:

- more account-management energy
- less brochure energy
- stronger row structures
- billing and variant status should feel native to a financial control surface

## What "little borders" actually means

Do not interpret it as "remove all borders."

Use this order of operations:

1. spacing
2. alignment
3. surface tone
4. typography contrast
5. only then a subtle line

Good:

- off-white page
- slightly different off-white panel
- one 1px low-opacity separator
- bold number
- muted label

Bad:

- every section boxed
- thick black outlines
- multiple nested borders
- decorative double frames

## Anti-pattern kill list

If a design pass produces any of these, reject it:

- giant hero with two CTA buttons and nothing else
- feature-card grid
- game tiles floating independently with large shadows
- redundant explanatory subtitles
- more than one dominant accent
- empty right rails
- "coming soon" blocks taking prime space
- ornamental badges everywhere
- thick frames around every panel
- low-information sections that exist just to fill the page

## Acceptance criteria for a successful BOARD redesign

The redesign is successful if:

1. The screen is understandable in under five seconds.
2. One task dominates the page.
3. Counts, records, states, and actions are easier to scan than before.
4. The interface uses fewer borders than the current version.
5. The interface feels more expensive with less decoration, not more.
6. Mobile still feels serious and not like a compressed desktop.
7. The design could plausibly sit next to Coinbase or Kalshi without looking toy-like.

## Fast implementation guidance

If implementing this in the current codebase:

1. Start with [src/index.css](C:/Users/mzwin/Documents/hexoogy/src/index.css)
   - normalize semantic surface and line tokens
   - reduce hard border dependence
   - add tabular numerics utility

2. Refactor [src/components/board/VenuePanel.tsx](C:/Users/mzwin/Documents/hexoogy/src/components/board/VenuePanel.tsx)
   - create quieter default panel
   - keep stronger titlebar variant as exception, not default

3. Refactor [src/components/NavBar.tsx](C:/Users/mzwin/Documents/hexoogy/src/components/NavBar.tsx)
   - compress utility layout
   - reduce visual mass

4. Rebuild directory rows in:
   - [src/pages/Worlds.tsx](C:/Users/mzwin/Documents/hexoogy/src/pages/Worlds.tsx)
   - [src/pages/Tournaments.tsx](C:/Users/mzwin/Documents/hexoogy/src/pages/Tournaments.tsx)

5. Re-check support/legal pages so they match the calmer token system.

## Short prompt for future design agents

```text
Make BOARD feel like a premium consumer trading app for board games.
Take structural cues from Coinbase and Kalshi:
quiet shell, strong numerics, dense rows, compact nav, tonal surfaces, minimal borders, factual copy.
No SaaS hero. No feature grid. No floating promo cards. No thick outlines.
Optimize for scanability, trust, and speed.
```
