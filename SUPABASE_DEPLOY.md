# Supabase Deploy (The Open Board)

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
- `ptuxqfwicdpdslqwnswd`

```powershell
npx supabase link --project-ref ptuxqfwicdpdslqwnswd
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
```

## Regenerate Types (Optional but Recommended)

After migrations land, regenerate the generated TS types:

```powershell
npx supabase gen types typescript --project-id ptuxqfwicdpdslqwnswd --schema public > src/integrations/supabase/types.ts
```

