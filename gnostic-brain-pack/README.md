# Gnostic Brain Pack

A drop-in markdown operating layer for Codex / Claude Code / Cursor-style project work.

This pack is built around one idea:

> Repos usually have code memory and doc memory, but no judgment memory.

The pack adds a **persistent product cognition loop** so your agent can:
- remember what the product is
- detect drift
- separate truth from narrative
- preserve important decisions
- compress daily changes into action

## Philosophy

This is **gnostic** in the literal sense:
- the repo should know itself
- the repo should know where it is lying to itself
- the repo should know what changed
- the repo should know what must happen next

The brain is not a diary.
It is not a second README.
It is not “AI thoughts.”

It is a **repo-native control layer**:
**observe -> interpret -> compress -> decide -> steer**

## What is inside

- `BRAIN.md` — front-door compressed state
- `AGENTS.md` — rules every agent should read before acting
- `brain/core/*` — stable memory
- `brain/state/*` — current operational state
- `brain/reflection/*` — patterns, drift, lessons
- `brain/decisions/*` — ADR-style decision records
- `prompts/*` — prompts for daily and weekly updating
- `.github/workflows/brain-daily.yml` — automation skeleton
- `scripts/update_brain.sh` — local entrypoint skeleton

## Install

1. Copy this folder into your repo root.
2. Customize:
   - `brain/core/IDENTITY.md`
   - `brain/core/PRODUCT_THESIS.md`
   - `brain/core/CONSTRAINTS.md`
3. Update `AGENTS.md` to fit the repo.
4. Wire the daily updater to your preferred agent or CLI.
5. Commit it.

## Operating rules

### Stable files
Rarely change these except when the product actually changes:
- `brain/core/IDENTITY.md`
- `brain/core/PRODUCT_THESIS.md`
- `brain/core/CONSTRAINTS.md`

### Volatile files
Update these continuously:
- `brain/state/CURRENT_REALITY.md`
- `brain/state/ACTIVE_QUESTIONS.md`
- `brain/state/PRIORITIES.md`
- `brain/reflection/DRIFT_LOG.md`
- `brain/daily/YYYY-MM-DD.md`

### Decision records
Whenever a decision has lasting consequences, add a new file in:
- `brain/decisions/`

Do not rewrite history. Supersede old decisions with new ones.

## Update cadence

### Daily
- scan commits/issues/docs/notes
- write a daily note
- update current reality
- update active questions
- update priorities
- add contradictions if needed

### Weekly
- run a retro
- update patterns
- update decision learnings
- resolve or escalate drift

## Best use with coding agents

Before any substantial work, the agent should read:
1. `AGENTS.md`
2. `BRAIN.md`
3. `brain/state/CURRENT_REALITY.md`
4. `brain/state/ACTIVE_QUESTIONS.md`
5. recent decision files

Then it should act.

## Golden rule

Every update must answer:
- What changed?
- Why does it matter?
- What tension did it create?
- What should happen next?

If it does not change future action, it does not belong in the brain.
