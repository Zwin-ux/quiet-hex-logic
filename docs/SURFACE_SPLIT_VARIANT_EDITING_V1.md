# BOARD Surface Split + Variant Editing v1

## Product split

- `Web`
  - full organizer surface
  - world creation and settings
  - tournament creation
  - surface rules editing
  - package upload and publishing
  - docs, workbench, arena
- `iOS / Android / Discord`
  - quickplay
  - join and play live matches
  - spectate
  - host-lite controls for existing rooms and events
  - web handoff for deep editing

## Editing modes

- `Surface editing`
  - form-driven
  - safe structured rules only
  - outputs `manifest + rules`
  - stored as `workshop_mod_version.source_kind = simple_editor`
- `Package editing`
  - upload `.openboardmod`, `.zip`, or `.json`
  - validate in browser
  - publish and version on web
  - stored as `workshop_mod_version.source_kind = package_upload`
- `Engine editing`
  - outside the browser
  - self-host / dev kit path

## Capability matrix

| Capability | Web | Mobile | Discord |
|---|---:|---:|---:|
| Quickplay | Yes | Yes | Yes |
| Join/play live | Yes | Yes | Yes |
| Spectate | Yes | Yes | Yes |
| Host-lite manage existing | Yes | Yes | Yes |
| Surface rules editing | Yes | No | No |
| Package upload/versioning | Yes | No | No |
| World settings/branding | Yes | No | No |
| Workbench/Arena/Docs | Yes | No | No |

## Official hosted variant pack

- `Hex`
  - `13x13 Championship`
  - `No Pie Classic`
- `Chess`
  - `Endgame Arena`
  - `Freestyle Chess` is held behind an engine gate until Chess960 castling is verified
- `Checkers`
  - `Chill Checkers`
- `Connect 4`
  - `Connect 3 Blitz`

## Runtime architecture

```mermaid
flowchart LR
  U["Players / Hosts"] --> W["Railway Web"]
  U --> N["Expo shell"]
  U --> D["Discord Activity"]

  W --> S["Supabase Auth + Postgres + Realtime + Storage"]
  N --> W
  D --> W

  W --> B["BOARD host billing"]
  W -. "registration_url" .-> P["Organizer-owned payments / signup"]

  S --> R["Workshop registry"]
  R --> L["Lobbies"]
  R --> T["Tournaments"]
  R --> M["Matches"]
```

## Surface split

```mermaid
flowchart LR
  A["Web"] --> A1["Quickplay + live play"]
  A --> A2["World and event creation"]
  A --> A3["Surface rules editor"]
  A --> A4["Package upload and versioning"]
  A --> A5["World settings / branding"]
  A --> A6["Workbench / Arena / Docs"]

  B["iOS / Android"] --> B1["Quickplay + live play"]
  B --> B2["Spectate"]
  B --> B3["Host-lite manage existing"]
  B -. blocked .-> B4["Open on web"]

  C["Discord"] --> C1["Quickplay + live play"]
  C --> C2["Spectate"]
  C --> C3["Host-lite manage existing"]
  C -. blocked .-> C4["Open on web"]
```

## Editing model

```mermaid
flowchart TD
  A["Host wants to change a game"] --> B["Surface editing"]
  A --> C["Package editing"]
  A --> D["Engine editing"]

  B --> B1["Web form"]
  B1 --> B2["rules JSON + manifest"]
  B2 --> B3["workshop_mod_version"]

  C --> C1["Web upload flow"]
  C1 --> C2["Validate package"]
  C2 --> C3["Version + attach"]
  C3 --> B3

  D --> D1["Local dev kit / source code"]
  D1 --> D2["Engine + validator changes"]
  D2 --> D3["Self-host or upstream contribution"]
```

## Database model

```mermaid
erDiagram
  PROFILES ||--o{ WORLDS : creates
  WORLDS ||--o{ WORLD_MEMBERS : contains
  WORLDS ||--o{ TOURNAMENTS : hosts
  WORLDS ||--o{ LOBBIES : hosts
  WORLDS ||--o{ WORKSHOP_MODS : owns

  WORKSHOP_MODS ||--o{ WORKSHOP_MOD_VERSIONS : versions
  WORKSHOP_MOD_VERSIONS o|--o{ TOURNAMENTS : powers
  WORKSHOP_MOD_VERSIONS o|--o{ LOBBIES : powers
  WORKSHOP_MOD_VERSIONS o|--o{ MATCHES : produced

  TOURNAMENTS ||--o{ TOURNAMENT_PARTICIPANTS : has
  TOURNAMENTS ||--o{ TOURNAMENT_ROUNDS : has
  TOURNAMENT_ROUNDS ||--o{ TOURNAMENT_MATCHES : has

  LOBBIES ||--o{ LOBBY_PLAYERS : contains
  MATCHES ||--o{ MATCH_PLAYERS : has
  MATCHES ||--o{ MOVES : records
```

## Schema additions

- `worlds`
  - `tagline`
  - `accent_color`
  - `public_status`
- `workshop_mods`
  - `world_id`
  - `scope`
  - `is_official`
  - `featured_rank`
  - `availability`
  - `engine_mode`
  - `validation_status`
- `workshop_mod_versions`
  - `source_kind`
  - `start_fen`
  - `start_seed`
  - `capabilities`
  - `validation_notes`
- `tournaments`
  - `mod_version_id`
  - `variant_seed`
  - `registration_url`
  - `access_type`
  - `access_code_hash`

## Current implementation notes

- Official variants are seeded into the workshop registry as `official_global`.
- World-private variants are readable by world members and writable by world organizers.
- Tournament live matches now inherit `mod_version_id` and the server rules snapshot from the tournament variant.
- `Freestyle Chess` remains a product-level gate until the Chess960 castling path is verified in both client and server validators.
