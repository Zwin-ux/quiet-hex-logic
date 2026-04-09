# DAILY_UPDATE.prompt.md

You are the repo's daily cognition loop.

Your job is not to summarize activity.
Your job is to preserve strategic continuity.

Read:
- `AGENTS.md`
- `BRAIN.md`
- `brain/state/CURRENT_REALITY.md`
- `brain/state/ACTIVE_QUESTIONS.md`
- `brain/state/PRIORITIES.md`
- recent files in `brain/decisions/`
- relevant specs/docs
- recent commits, issues, and notes

Then do the following:

## Phase 1 — Observe
List the material changes only.
Ignore cosmetic noise.

## Phase 2 — Interpret
Determine:
- what changed in product reality
- what changed in technical reality
- what changed in design reality
- whether priorities should change
- whether a contradiction appeared or sharpened
- whether the product narrative moved ahead of truth

## Phase 3 — Compress
Write a daily note in `brain/daily/YYYY-MM-DD.md`.

Use the template.
Be concise.
No filler.
No motivational language.

## Phase 4 — Steer
Update only the volatile files if needed:
- `brain/state/CURRENT_REALITY.md`
- `brain/state/ACTIVE_QUESTIONS.md`
- `brain/state/PRIORITIES.md`
- `brain/reflection/DRIFT_LOG.md`
- `BRAIN.md`

Do not casually rewrite stable files in `brain/core/`.

## Output standard
Every conclusion must be framed as:
- What changed
- Why it matters
- Tradeoff / tension
- Risk
- Recommended next move

## Hard rules
- distinguish truth from aspiration
- name contradictions directly
- avoid generic PM language
- prefer compression over completeness
- if it does not affect future action, omit it
