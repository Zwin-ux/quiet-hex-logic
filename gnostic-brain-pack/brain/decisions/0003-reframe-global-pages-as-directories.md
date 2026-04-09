# 0003 - Reframe Global Organizer Pages as Directories, Not Homes

- Status: Accepted
- Date: 2026-04-04

## Context
After making organizer creation world-aware, the app still had a second problem: global pages like
`/lobby` and `/tournaments` continued to read like product homes. That kept teaching the wrong
mental model even when the data model had moved on.

## Decision
Keep the global pages for now, but change their meaning:
- `lobby` becomes the cross-world play desk for practice, quick rooms, and live match discovery
- `tournaments` becomes the cross-world event directory
- add `/play` and `/events` as clearer route aliases while legacy paths remain for compatibility
- world-hosted vs standalone objects should be visibly separated on those pages
- navigation should make `Worlds` primary and treat these pages as secondary utilities

## Consequences
### Positive
- reduces the product contradiction without forcing a full route rewrite in one step
- makes the current IA more honest for hosts and players
- gives the team a cleaner bridge toward eventual world-first route naming

### Negative
- preserves legacy URLs longer than ideal
- requires more copy and UI discipline so the pages do not drift back into "home" status
- still leaves off-thesis pages like arena and premium in the repo until they are deliberately cut back

## Guardrails
- do not let the directory framing become an excuse to keep legacy IA forever
- if a page is global, state why it exists globally
- keep worlds as the organizer center of gravity in nav, copy, and creation flows
