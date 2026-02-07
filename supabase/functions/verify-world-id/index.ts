import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// World ID proof validation schema
const worldIdProofSchema = z.object({
  merkle_root: z.string().min(1, 'merkle_root is required'),
  nullifier_hash: z.string().min(1, 'nullifier_hash is required'),
  proof: z.string().min(1, 'proof is required'),
  verification_level: z.enum(['orb', 'device']).optional().default('device'),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[verify-world-id] Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user-context client for auth
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('[verify-world-id] Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('[verify-world-id] User authenticated:', user.id);

    // Parse and validate request body
    const body = await req.json();
    const validationResult = worldIdProofSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('[verify-world-id] Validation error:', validationResult.error);
      return new Response(
        JSON.stringify({
          error: 'Invalid proof data',
          details: validationResult.error.format()
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { merkle_root, nullifier_hash, proof, verification_level } = validationResult.data;

    // Get World ID app ID from environment
    const appId = Deno.env.get('WORLD_ID_APP_ID');
    if (!appId) {
      console.error('[verify-world-id] WORLD_ID_APP_ID not configured');
      return new Response(
        JSON.stringify({ error: 'World ID not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if nullifier already used (prevent double-verification)
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('id, username')
      .eq('world_id_nullifier', nullifier_hash)
      .maybeSingle();

    if (checkError) {
      console.error('[verify-world-id] DB check error:', checkError);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingUser) {
      if (existingUser.id === user.id) {
        // User already verified with this nullifier
        console.log('[verify-world-id] User already verified:', user.id);
        return new Response(
          JSON.stringify({ success: true, already_verified: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Different user already used this World ID
        console.warn('[verify-world-id] Nullifier already used by another user');
        return new Response(
          JSON.stringify({ error: 'This World ID has already been used by another account' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Verify proof with World ID API
    console.log('[verify-world-id] Verifying proof with World ID API...');
    const verifyResponse = await fetch(
      `https://developer.worldcoin.org/api/v2/verify/${appId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merkle_root,
          nullifier_hash,
          proof,
          action: 'verify-openboard-player',
          signal: user.id, // Bind proof to this user
        }),
      }
    );

    const verifyData = await verifyResponse.json();
    console.log('[verify-world-id] World ID API response:', verifyResponse.status, verifyData);

    if (!verifyResponse.ok) {
      console.error('[verify-world-id] World ID verification failed:', verifyData);
      return new Response(
        JSON.stringify({
          error: 'World ID verification failed',
          details: verifyData.detail || verifyData.message || 'Unknown error'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update user profile with verification status
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        is_verified_human: true,
        world_id_nullifier: nullifier_hash,
        world_id_verified_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[verify-world-id] Profile update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save verification status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[verify-world-id] User verified successfully:', user.id);
    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        verification_level
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[verify-world-id] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
