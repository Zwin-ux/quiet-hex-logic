# The Open Board: "Clean Break" Deployment

Use this guide to move the entire project (Frontend + Backend) away from Lovable and into your own controlled accounts.

## 1. Supabase "Escape" (The Backend)

To get out of Lovable's managed Supabase:

1.  Go to [supabase.com/dashboard](https://supabase.com/dashboard).
2.  Click **New Project** and name it `The Open Board`.
3.  **IMPORTANT**: Copy your **Database Password** and **Project Reference**.

Then run this "Lazy Command" (replace the brackets):

```powershell
# 1. Link to your NEW project
npx supabase link --project-ref [YOUR_NEW_REF];

# 2. Push the database schema
npx supabase db push;

# 3. Deploy all game logic
npx supabase functions deploy apply-move update-ratings find-competitive-match create-lobby start-lobby-match update-lobby-settings rematch-lobby;
```

## 2. Vercel Migration (The Frontend)

Once your Supabase project is live, deploy the site to Vercel:

1.  Get your **Project URL** and **Anon Key** from Supabase (Settings > API).
2.  Run this in your terminal:

```powershell
# Link project to Vercel
vercel link --yes;

# Add your Supabase keys to Vercel
vercel env add VITE_SUPABASE_URL [YOUR_NEW_URL];
vercel env add VITE_SUPABASE_PUBLISHABLE_KEY [YOUR_NEW_ANON_KEY];

# Deploy to production
vercel --prod --yes;
```

## 3. Post-Migration Cleanup

- Clear your local cache: `localStorage.clear()` (since keys might have changed).
- Update `supabase/config.toml` with your new `project_id`.
- Update `VERCEL_DEPLOY.md` if you use it for CI/CD.

---

> [!NOTE]
> This process creates a fresh database. If you need to migrate existing user data from Lovable's Supabase, you would need to export the data from their dashboard first.
