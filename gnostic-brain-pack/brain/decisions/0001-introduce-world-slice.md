# 0001 — Introduce Worlds as the First Real Organizer Container

- Status: Accepted
- Date: 2026-04-04

## Context
The repo has been talking about BOARD as a host-owned world / event / instance system, but the actual app has still been organized around global portal surfaces like lobby, tournaments, and arena. That mismatch was becoming a trust problem.

## Decision
Introduce a first real world slice:
- add `worlds` and `world_members`
- link `tournaments`, `lobbies`, and `matches` with `world_id`
- expose `/worlds` and `/worlds/:worldId`
- allow world organizers to create events and instances inside a persistent host-owned container

## Consequences
### Positive
- makes BOARD language less fake
- gives organizers a real top-level object to own
- creates a path to restructure IA around host primitives instead of feature buckets

### Negative
- increases RLS and query complexity
- creates another layer of product transition debt until older routes are refactored
- does not solve the full organizer system by itself

## Guardrails
- do not invent a second event system; reuse `tournaments`, `lobbies`, and `matches`
- do not treat the new world pages as enough; the rest of the app still needs alignment
- use this slice to remove contradictions, not to add more nouns
