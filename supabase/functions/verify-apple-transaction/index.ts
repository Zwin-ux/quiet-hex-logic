import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const verifySchema = z.object({
  transactionId: z.string().min(1),
  originalTransactionId: z.string().min(1),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Apple App Store Server API v2 verification flow:
//
// Required Supabase secrets (not yet configured):
//   APPLE_SHARED_SECRET
//   APPLE_KEY_ID
//   APPLE_ISSUER_ID
//   APPLE_SUBSCRIPTION_KEY (p8 private key contents)
//
// Steps:
// 1. Generate a signed JWT using the Apple private key
// 2. Call https://api.storekit.itunes.apple.com/inApps/v1/transactions/{transactionId}
// 3. Decode the signed transaction (JWS) from the response
// 4. Verify the transaction belongs to the authenticated user
// 5. Upsert a subscription record and set profiles.is_premium = true
//
// Sandbox endpoint: https://api.storekit-sandbox.itunes.apple.com/inApps/v1/transactions/{transactionId}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const validationResult = verifySchema.safeParse(body);
    if (!validationResult.success) {
      return json({ error: 'Invalid input', details: validationResult.error.format() }, 400);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    // Apple IAP validation not yet configured — return 501
    return json({ error: 'Apple IAP validation not yet configured' }, 501);
  } catch (error) {
    console.error('Error in verify-apple-transaction:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: message }, 500);
  }
});
