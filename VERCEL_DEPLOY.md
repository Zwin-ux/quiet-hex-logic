# Deploying to Vercel (Hexology)

This guide covers migrating the frontend from Lovable to Vercel.

## 1. Prerequisites

1.  **Vercel Account**: Sign up at [vercel.com](https://vercel.com).
2.  **Vercel CLI (Optional)**: If you want to deploy from your terminal.
    ```powershell
    npm install -g vercel
    ```

## 2. Environment Variables

Vercel needs these variables to connect to your Supabase backend. You can find these in your Supabase Dashboard under **Project Settings > API**.

| Variable                        | Description                     |
| :------------------------------ | :------------------------------ |
| `VITE_SUPABASE_URL`             | Your Supabase Project URL       |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase `anon` public key |

## 3. Deployment Steps

### Option A: Vercel Dashboard (Recommended)

1.  Push your code to a GitHub repository.
2.  Go to the [Vercel Dashboard](https://vercel.com/new).
3.  Import the repository.
4.  In **Environment Variables**, add the two variables listed above.
5.  Click **Deploy**.

### Option B: Vercel CLI

1.  Run the login command:
    ```powershell
    vercel login
    ```
2.  Initialize the project:
    ```powershell
    vercel
    ```
3.  Add environment variables when prompted or via the dashboard later.
4.  Deploy to production:
    ```powershell
    vercel --prod
    ```

## 4. Build Configuration

If prompted for build settings, use the defaults for Vite/React:

- **Build Command**: `vite build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

## 5. Deployment Result

Once deployed, Vercel will provide a URL (e.g., `hexology.vercel.app`). You can link a custom domain in the project settings.
