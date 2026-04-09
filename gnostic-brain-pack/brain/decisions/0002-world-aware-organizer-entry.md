# 0002 - Make Global Organizer Entry World-Aware by Default

- Status: Accepted
- Date: 2026-04-04

## Context
After introducing `worlds`, organizer creation was still split-brain. Hosts could create lobbies
and tournaments from global pages with no visible world context, which meant the new domain model
existed without actually shaping the user flow.

## Decision
Keep the existing `lobbies`, `tournaments`, and `matches` tables, but make organizer entry world-aware:
- if a signed-in user can manage worlds, global lobby/event creation should default toward a world
- keep standalone creation available as an explicit fallback, not the silent default
- show world context in global directories and linked detail pages so organizer objects stop feeling detached

## Consequences
### Positive
- reduces the gap between "world" marketing and actual organizer behavior
- keeps the migration incremental instead of forcing a full IA rewrite in one step
- makes future deprecation of legacy global routes easier because creation already points toward worlds

### Negative
- creates a temporary in-between state where both world-first and global organizer surfaces still exist
- adds more query and state complexity to pages that were previously simpler
- risks preserving standalone creation too long if the team avoids the harder IA decision

## Guardrails
- do not let "world-aware" become the stopping point; the goal is still world-first organizer IA
- keep standalone creation visibly secondary
- if a global page survives, define it as a cross-world directory or utility, not a competing product home
