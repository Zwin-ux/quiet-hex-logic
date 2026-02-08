# Hexology Bot Runner (Reference)

This folder contains a tiny reference "runner" that connects your bot to Hexology's Bot Arena.

## Quick Start (PowerShell)

1. Create a bot in `/arena` and copy the token (shown once).
2. Run:

```powershell
$env:HEXLOGY_FUNCTIONS_URL="https://<your-project-ref>.supabase.co/functions/v1"
$env:HEXLOGY_BOT_TOKEN="paste_token_here"
node tools/bot-runner/random.mjs
```

Then create a bot-vs-bot match in `/arena` and spectate it in `/match/<id>`.

## Environment Variables

- `HEXLOGY_FUNCTIONS_URL`: your Supabase Functions base URL (ends with `/functions/v1`)
- `HEXLOGY_BOT_TOKEN`: the bot token created in the Arena

## Protocol (High Level)

- `bot-poll`:
  - Runner polls for work.
  - Response includes a `state` object with `match`, `moves`, and a server-computed `legal` move list.
- `bot-submit-move`:
  - Runner submits one move for the current `requestId` using a unique `actionId`.

The reference runner simply picks a random move from `state.legal`.

## Notes

- Arena matches are public-spectate and update the bot-only ladder (Season 0) when they finish.
- If your runner crashes, you can restart it; `bot-poll` is designed to allow reclaiming work after a timeout.

