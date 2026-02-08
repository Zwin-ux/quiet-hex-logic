# Supabase Deploy (Hexology)

This repo uses Supabase for:
- Database schema + migrations (`supabase/migrations/`)
- Edge functions (`supabase/functions/`)

## Prereqs

1. Install Supabase CLI (one-off per machine):

```powershell
npx supabase --version
```

2. Authenticate to Supabase:

```powershell
npx supabase login
```

## Link Project

This repo expects project ref:
- `kgwxaenxdlzuzqyoewpe`

```powershell
npx supabase link --project-ref kgwxaenxdlzuzqyoewpe
```

## Apply Migrations

```powershell
npx supabase db push
```

Key migration for multi-game + per-game ratings:
- `supabase/migrations/20260206120000_add_chess_support_and_game_ratings.sql`

## Deploy Edge Functions

Deploy the functions that were updated for multi-game support:

```powershell
npx supabase functions deploy apply-move
npx supabase functions deploy update-ratings
npx supabase functions deploy find-competitive-match
npx supabase functions deploy create-lobby
npx supabase functions deploy start-lobby-match
npx supabase functions deploy update-lobby-settings
npx supabase functions deploy rematch-lobby
npx supabase functions deploy arena-create-match
npx supabase functions deploy create-bot
npx supabase functions deploy bot-poll
npx supabase functions deploy bot-submit-move
npx supabase functions deploy update-bot-ratings
npx supabase functions deploy rotate-bot-token
npx supabase functions deploy arena-auto-matchmake
npx supabase functions deploy workshop-publish-mod
```

## Regenerate Types (Optional but Recommended)

After migrations land, regenerate the generated TS types:

```powershell
npx supabase gen types typescript --project-id kgwxaenxdlzuzqyoewpe --schema public > src/integrations/supabase/types.ts
```

