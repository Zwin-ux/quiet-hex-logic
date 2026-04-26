# Variant Pack v1

## Summary

This spec defines the first hosted variant package for the four flagship games:

- Hex
- Chess
- Checkers
- Connect 4

The product split is:

- `Hosted cloud`: curated official variants, private club variants, safe structured editing, rules-only package uploads
- `Self-host dev kit`: full engine editing, validator editing, new game engines, arbitrary function changes

This spec does **not** add arbitrary code execution to the shared hosted network.

## Product goals

- Make BOARD look like a serious competition product, not a toy mod gallery
- Give every flagship game at least one strong hosted alternative
- Keep official hosted variants curated and legible
- Let hosts clone and tune variants without writing code
- Keep full engine editing open-source and real, but out of the shared cloud

## Launch catalog

### Official Variant Pack 01

| Preset key | Game | Label | Hosted v1 | Source |
|---|---|---|---|---|
| `official.hex.classic_swap_11` | Hex | 11x11 Swap | Yes | existing defaults |
| `official.hex.championship_13` | Hex | 13x13 Championship | Yes | structured rules |
| `official.hex.no_pie_classic` | Hex | No Pie Classic | Yes | existing sample |
| `official.chess.standard` | Chess | Standard | Yes | existing defaults |
| `official.chess.freestyle_960` | Chess | Freestyle Chess | Yes, gated by engine check | new |
| `official.chess.endgame_arena` | Chess | Endgame Arena | Yes | existing sample |
| `official.checkers.american_standard` | Checkers | American Standard | Yes | existing defaults |
| `official.checkers.chill` | Checkers | Chill Checkers | Yes | existing sample |
| `official.connect4.classic_7x6` | Connect 4 | Classic 7x6 | Yes | existing defaults |
| `official.connect4.connect3_blitz` | Connect 4 | Connect 3 Blitz | Yes | existing sample |

### Phase 2 variants

These belong in the engine-tier backlog, not the first hosted pack:

- `official.checkers.international_draughts`
- `official.connect4.popout`
- `official.hex.reverse_hex`
- `official.hex.dark_hex`
- `official.chess.crazyhouse`
- `official.chess.bughouse`

## Preset behavior

### Hex

#### `official.hex.classic_swap_11`

- board size: `11`
- pie rule: `true`
- turn timer: host-configurable
- ranked eligible: `true` if no mod attached and event is standard

#### `official.hex.championship_13`

- board size: `13`
- pie rule: `true`
- turn timer: host-configurable
- ranked eligible: `false`

#### `official.hex.no_pie_classic`

- board size: `11`
- pie rule: `false`
- turn timer: host-configurable
- ranked eligible: `false`

Rules payload:

```json
{
  "boardSize": 11,
  "pieRule": false
}
```

### Chess

#### `official.chess.standard`

- standard start position
- turn timer: host-configurable
- ranked eligible: `true` if no variant attached and event is standard

#### `official.chess.freestyle_960`

- engine mode: `freestyle_chess`
- start position: generated from a legal Chess960 seed
- turn timer: host-configurable
- ranked eligible: `false`

Event behavior:

- lobby matches: random seed per match
- tournament matches: one seed generated at tournament activation and reused for the full event

Required data:

```json
{
  "engineMode": "freestyle_chess",
  "startSeed": 417
}
```

#### `official.chess.endgame_arena`

- engine mode: `standard`
- fixed `startFen`
- turn timer: host-configurable
- ranked eligible: `false`

Rules payload:

```json
{
  "startFen": "8/8/8/8/8/2k5/2P5/2K5 w - - 0 1"
}
```

### Checkers

#### `official.checkers.american_standard`

- standard American rules
- ranked eligible: `true` if no variant attached and event is standard

#### `official.checkers.chill`

- mandatory capture: `false`
- shorter no-capture draw window
- ranked eligible: `false`

Rules payload:

```json
{
  "mandatoryCapture": false,
  "draw": {
    "threefoldRepetition": true,
    "noCaptureHalfMoves": 20
  }
}
```

### Connect 4

#### `official.connect4.classic_7x6`

- standard board
- connect length: `4`
- ranked eligible: `true` if standard ranked support is later enabled

#### `official.connect4.connect3_blitz`

- standard board
- connect length: `3`
- ranked eligible: `false`

Rules payload:

```json
{
  "connect": 3
}
```

## Hosted editing model

### 1. Official presets

BOARD-managed variants:

- immutable
- globally visible
- high-quality naming and art treatment
- no direct editing by hosts

### 2. Club variants

Host workflow:

1. pick an official preset
2. clone it into the current world
3. tune safe knobs
4. attach it to a lobby or tournament

Club variants are:

- scoped to one `world`
- private by default
- editable by world owner/admin
- versioned

### 3. Workshop public registry

Public registry remains available, but it is not the first choice in host flows.

The picker order should be:

1. Official
2. Club
3. Workshop

## Simple editor surface

The hosted simple editor edits safe declarative knobs only.

### Field matrix

| Game | Field | Hosted v1 |
|---|---|---|
| Hex | `boardSize` | Yes |
| Hex | `pieRule` | Yes |
| Hex | `turnTimerSeconds` | Yes |
| Chess | `startFen` | Yes |
| Chess | `engineMode=freestyle_chess` | Yes |
| Chess | `turnTimerSeconds` | Yes |
| Checkers | `mandatoryCapture` | Yes |
| Checkers | `draw.noCaptureHalfMoves` | Yes |
| Checkers | `turnTimerSeconds` | Yes |
| Connect 4 | `connect` | Yes |
| Connect 4 | `turnTimerSeconds` | Yes |

Not supported in hosted v1:

- arbitrary JS
- arbitrary WASM
- custom server validators uploaded by hosts
- custom board UI code
- asset bundles beyond simple preset metadata

## Rules-only package upload

Supported hosted package format:

- `.openboardmod`
- `.zip`
- `manifest.json`
- `rules/{game}.json`

Hosted validation rules:

- package must unpack cleanly
- `manifest.json` must pass schema validation
- `game_key` must be one of the supported hosted games
- rules payload must match the per-game hosted rules schema
- package must not include executable code
- package must not exceed size cap

Upload sources:

- `simple_editor`
- `package_upload`

Both sources land in the same version table.

## Data model changes

### Reuse existing tables

Reuse:

- `workshop_mods`
- `workshop_mod_versions`
- `lobbies.mod_version_id`
- `matches.mod_version_id`

Add or extend:

### `workshop_mods`

Add:

- `world_id uuid null references worlds(id) on delete cascade`
- `scope text not null check (scope in ('official_global','public_registry','world_private')) default 'world_private'`
- `is_official boolean not null default false`
- `featured_rank integer null`
- `availability text not null check (availability in ('hosted','self_host','beta')) default 'hosted'`
- `engine_mode text not null default 'standard'`
- `validation_status text not null check (validation_status in ('draft','validating','published','rejected')) default 'draft'`

Rules:

- official presets: `world_id = null`, `scope = 'official_global'`, `is_official = true`
- club presets: `world_id != null`, `scope = 'world_private'`
- public workshop mods: `scope = 'public_registry'`

### `workshop_mod_versions`

Add:

- `source_kind text not null check (source_kind in ('official_seed','simple_editor','package_upload','engine_pack'))`
- `start_fen text null`
- `start_seed integer null`
- `capabilities jsonb not null default '{}'::jsonb`
- `validation_notes jsonb not null default '{}'::jsonb`

### `tournaments`

Add:

- `mod_version_id uuid null references workshop_mod_versions(id) on delete set null`
- `variant_seed integer null`

`variant_seed` is required for event-wide deterministic presets such as `Freestyle Chess`.

## Seed data

Seed the official pack in SQL or a service-role script.

Required properties per official preset:

- `manifest_id`
- `game_key`
- `name`
- `description`
- `rules`
- `engine_mode`
- `scope = official_global`
- `is_official = true`
- `featured_rank`
- `availability = hosted`
- `validation_status = published`

## UI states

### World variant library

Tabs:

- `Official`
- `Club`
- `Workshop`

Card fields:

- label
- game
- short descriptor
- official/club/workshop badge
- safe rules summary
- `Use`
- `Clone`

Club actions:

- `Edit`
- `Duplicate`
- `Archive`

### Lobby rules picker

Replace the flat workshop select with grouped picks:

- `Standard`
- `Official variants`
- `Club variants`
- `Workshop variants`

Behavior:

- selecting a variant updates `mod_version_id`
- ranked toggle is disabled when variant is non-standard
- short inline summary appears below the picker

### Tournament creation

Add:

- `Variant` picker
- `Registration link`
- inline badge when the event uses an official variant

For `official.chess.freestyle_960`:

- show `Freestyle seed locked at start`
- generate `variant_seed` when event status moves from `registration` to `active`

### Public event page

Show:

- game
- variant label
- official badge if relevant
- short rules summary

Do not expose raw JSON.

## Engineering changes

### Chess engine gate

Before enabling `official.chess.freestyle_960` in production:

1. verify that current `chess.js@1.4.0` fully supports Chess960 castling from arbitrary generated start positions
2. verify the server validator mirrors that behavior
3. if either fails, replace the chess adapter and validator with a Chess960-capable implementation before shipping the preset

This is the main engine risk in Variant Pack 01.

### Mutation paths

Add or update these paths:

- official preset seeding path
- world-scoped variant creation path
- hosted package validation path
- tournament creation path to accept `mod_version_id`
- tournament activation path to freeze `variant_seed` when required

### Ranking rules

Hosted rule:

- only untouched standard presets may remain ranked
- any attached variant or non-default rules force unranked

## Acceptance criteria

- hosts can attach an official variant to a lobby
- hosts can clone an official variant into a world-private preset
- hosts can edit safe knobs without touching JSON
- hosts can upload a valid rules-only package and attach it
- tournament pages render a human-readable variant label
- `Freestyle Chess` uses deterministic event-wide seeding
- ranked play is blocked for non-standard variants
- no hosted path allows arbitrary executable mod code

## Rollout

### Phase 1

- seed official presets
- grouped picker in lobbies
- grouped picker in tournaments
- public event variant labels

### Phase 2

- world-private clone flow
- simple editor
- validation status pipeline

### Phase 3

- rules-only package upload in host world context
- moderation / rejection notes

### Phase 4

- self-host dev kit docs for full engine editing
- engine-tier backlog variants

