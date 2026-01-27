import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Hono } from "https://deno.land/x/hono@v4.3.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const app = new Hono();

// EAS contract address on Base
const EAS_CONTRACT_ADDRESS = "0x4200000000000000000000000000000000000021";

// Schema UID for World ID verification attestation (you would register this schema on Base)
// For now, we'll use a placeholder - in production, you'd register the schema first
const ATTESTATION_SCHEMA_UID = "0x0000000000000000000000000000000000000000000000000000000000000000";

app.options("/*", (c) => {
  return c.text("OK", 200, corsHeaders);
});

// Create attestation data for a verified human
app.post("/", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json({ error: "Unauthorized" }, 401, corsHeaders);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get user from auth
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error("[create-base-attestation] Auth error:", claimsError);
      return c.json({ error: "Unauthorized" }, 401, corsHeaders);
    }

    const userId = claimsData.claims.sub;
    console.log(`[create-base-attestation] Creating attestation for user: ${userId}`);

    // Use service role for profile lookup
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user has completed World ID verification
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("is_verified_human, wallet_address, world_id_verified_at, base_attestation_uid")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("[create-base-attestation] Profile lookup error:", profileError);
      return c.json({ error: "Profile not found" }, 404, corsHeaders);
    }

    if (!profile.is_verified_human) {
      return c.json({ 
        error: "You must complete World ID verification first" 
      }, 400, corsHeaders);
    }

    if (!profile.wallet_address) {
      return c.json({ 
        error: "You must connect and link a Base wallet first" 
      }, 400, corsHeaders);
    }

    if (profile.base_attestation_uid) {
      return c.json({ 
        error: "Attestation already exists",
        attestation_uid: profile.base_attestation_uid,
      }, 409, corsHeaders);
    }

    // Create the attestation data
    // In a full implementation, you would:
    // 1. Create the attestation transaction data
    // 2. Return it for the user to sign with their wallet
    // 3. After signature, submit to Base and get the attestation UID
    
    // For now, we return the data needed to create the attestation client-side
    const attestationData = {
      schemaUid: ATTESTATION_SCHEMA_UID,
      recipient: profile.wallet_address,
      expirationTime: 0n, // No expiration
      revocable: false,
      data: {
        isVerifiedHuman: true,
        platform: "hexology",
        verifiedAt: Math.floor(new Date(profile.world_id_verified_at).getTime() / 1000),
      },
    };

    console.log(`[create-base-attestation] Attestation data prepared for wallet: ${profile.wallet_address}`);

    return c.json({
      success: true,
      attestation_data: attestationData,
      eas_contract: EAS_CONTRACT_ADDRESS,
      chain_id: 8453, // Base mainnet
      message: "Sign and submit this attestation with your wallet",
    }, 200, corsHeaders);

  } catch (error) {
    console.error("[create-base-attestation] Unexpected error:", error);
    return c.json({ error: "Internal server error" }, 500, corsHeaders);
  }
});

// Save attestation UID after user submits it on-chain
app.put("/", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json({ error: "Unauthorized" }, 401, corsHeaders);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return c.json({ error: "Unauthorized" }, 401, corsHeaders);
    }

    const userId = claimsData.claims.sub;
    const body = await c.req.json();
    const { attestation_uid } = body;

    if (!attestation_uid || typeof attestation_uid !== 'string') {
      return c.json({ error: "Invalid attestation_uid" }, 400, corsHeaders);
    }

    // Validate attestation UID format (should be a hex string)
    if (!/^0x[a-fA-F0-9]{64}$/.test(attestation_uid)) {
      return c.json({ error: "Invalid attestation UID format" }, 400, corsHeaders);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Update profile with attestation UID
    const { error: updateError } = await adminClient
      .from("profiles")
      .update({ base_attestation_uid: attestation_uid })
      .eq("id", userId);

    if (updateError) {
      console.error("[create-base-attestation] Update error:", updateError);
      return c.json({ error: "Failed to save attestation" }, 500, corsHeaders);
    }

    console.log(`[create-base-attestation] Saved attestation UID for user ${userId}: ${attestation_uid}`);

    return c.json({ 
      success: true, 
      attestation_uid,
    }, 200, corsHeaders);

  } catch (error) {
    console.error("[create-base-attestation] Unexpected error:", error);
    return c.json({ error: "Internal server error" }, 500, corsHeaders);
  }
});

Deno.serve(app.fetch);
