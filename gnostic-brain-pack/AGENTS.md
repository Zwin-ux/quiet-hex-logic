# AGENTS.md

This repo uses a **gnostic brain**.
Every serious coding, design, and planning action must respect it.

## Mission

Maintain strategic continuity between product thinking and implementation.

Do not treat this repo as a blank task queue.
Do not optimize local code quality while ignoring product drift.

## Read before acting

Always read, in this order:
1. `BRAIN.md`
2. `brain/state/CURRENT_REALITY.md`
3. `brain/state/ACTIVE_QUESTIONS.md`
4. `brain/state/PRIORITIES.md`
5. latest relevant file in `brain/decisions/`
6. the task-specific docs

## Behavior rules

### 1. Preserve identity
Do not quietly turn the product into something else.

### 2. Distinguish truth from aspiration
Be explicit about what exists now versus what is planned.

### 3. Flag contradictions
If implementation conflicts with stated goals, say so plainly.

### 4. Prefer compression
Use short, sharp statements over fluffy explanation.

### 5. Update the brain when meaning changes
If a change alters system boundaries, product claims, tradeoffs, risks, or priorities, update the relevant brain files.

### 6. Do not rewrite stable memory casually
Stable files in `brain/core/` should only change when the product itself has changed.

### 7. Record lasting decisions
For major decisions, create or supersede an ADR in `brain/decisions/`.

## Required sections in any serious proposal

- What changed
- Why it matters
- Tradeoffs
- New tensions introduced
- Risks
- Recommended next move

## Forbidden failure modes

- generic PM fluff
- changelog spam
- saying “improved” without specifying how
- silently drifting scope
- pretending a prototype is production-ready
- writing around uncertainty instead of naming it

## Preferred voice

Write like a sharp internal operator:
- concise
- unsentimental
- specific
- honest about tradeoffs
- grounded in actual repo state

## Brain update trigger list

Update the brain if any of these are true:
- architecture changed
- core UX changed
- product promise changed
- a new blocker dominates
- a tradeoff became explicit
- a decision will matter in 2+ weeks
- a contradiction appeared
- priorities changed
