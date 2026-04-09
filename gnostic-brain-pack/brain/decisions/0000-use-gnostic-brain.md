# 0000 — Use a Gnostic Brain as the Repo Judgment Layer

- Status: Accepted
- Date: 2026-04-04

## Context
The repo needs durable judgment memory, not just code and docs. Important reasoning currently evaporates across chats, commits, and ad hoc notes.

## Decision
Adopt a markdown-based brain structure with:
- stable core memory
- volatile state files
- ADR-style decision records
- daily updates
- weekly reflection

## Consequences
### Positive
- preserves strategic continuity
- reduces re-explanation cost for agents
- makes contradictions explicit
- improves product-level thinking

### Negative
- creates documentation maintenance overhead
- can decay into fluff if not compressed aggressively
- requires workflow discipline

## Guardrails
- update deltas, not full rewrites
- preserve history; supersede decisions instead of deleting them
- keep the front-door brain compressed
- never use the system as a generic changelog
