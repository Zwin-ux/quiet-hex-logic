# Vercel Env (Hexology)

If you see errors like `ptuxqfwicdpdslqwnswd.supabase.co ... ERR_NAME_NOT_RESOLVED`, your deployed frontend is built with an old Supabase URL.

## Required Vercel Environment Variables

Set these for the Vercel project (Production + Preview):

- `VITE_SUPABASE_URL` = `https://kgwxaenxdlzuzqyoewpe.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` = (Supabase anon/publishable key for `kgwxaenxdlzuzqyoewpe`)
- Optional: `VITE_SUPABASE_PROJECT_ID` = `kgwxaenxdlzuzqyoewpe` (the client can derive the URL from this)

Then redeploy.

