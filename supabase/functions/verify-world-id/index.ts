import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Hono } from "https://deno.land/x/hono@v4.3.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const app = new Hono();

interface WorldIDProof {
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
  verification_level: string;
}

app.options("/*", (c) => {
  return c.text("OK", 200, corsHeaders);
});

app.post("/", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json({ error: "Unauthorized" }, 401, corsHeaders);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const worldIdApiKey = Deno.env.get("WORLD_ID_API_KEY");
    const worldIdAppId = "app_8d9cada1f2ced37b03654cf63e62d540";
    const worldIdAction = "verify-hexology-player";

    if (!worldIdApiKey) {
      console.error("[verify-world-id] WORLD_ID_API_KEY not configured");
      return c.json({ error: "World ID not configured" }, 500, corsHeaders);
    }

    // Get user from auth
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error("[verify-world-id] Auth error:", claimsError);
      return c.json({ error: "Unauthorized" }, 401, corsHeaders);
    }

    const userId = claimsData.claims.sub;
    console.log(`[verify-world-id] Verifying for user: ${userId}`);

    // Parse request body
    const body: WorldIDProof = await c.req.json();
    const { merkle_root, nullifier_hash, proof, verification_level } = body;

    if (!merkle_root || !nullifier_hash || !proof) {
      return c.json({ error: "Missing required proof fields" }, 400, corsHeaders);
    }

    // Use service role client for database operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if nullifier already used by another account
    const { data: existingUser, error: lookupError } = await adminClient
      .from("profiles")
      .select("id, username")
      .eq("world_id_nullifier", nullifier_hash)
      .maybeSingle();

    if (lookupError) {
      console.error("[verify-world-id] Nullifier lookup error:", lookupError);
      return c.json({ error: "Database error" }, 500, corsHeaders);
    }

    if (existingUser && existingUser.id !== userId) {
      console.warn(`[verify-world-id] Nullifier already used by user: ${existingUser.id}`);
      return c.json({ 
        error: "This World ID has already been used to verify another account" 
      }, 409, corsHeaders);
    }

    // Call World ID verification API
    console.log(`[verify-world-id] Calling World ID API for app: ${worldIdAppId}`);
    const verifyResponse = await fetch(
      `https://developer.worldcoin.org/api/v2/verify/${worldIdAppId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merkle_root,
          nullifier_hash,
          proof,
          action: worldIdAction,
          signal: userId,
        }),
      }
    );

    const verifyResult = await verifyResponse.json();
    console.log(`[verify-world-id] World ID API response:`, verifyResult);

    if (!verifyResponse.ok) {
      console.error("[verify-world-id] World ID verification failed:", verifyResult);
      return c.json({ 
        error: verifyResult.detail || verifyResult.message || "Verification failed" 
      }, 400, corsHeaders);
    }

    // Update user profile with verification status
    const { error: updateError } = await adminClient
      .from("profiles")
      .update({
        is_verified_human: true,
        world_id_nullifier: nullifier_hash,
        world_id_verified_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) {
      console.error("[verify-world-id] Profile update error:", updateError);
      return c.json({ error: "Failed to update verification status" }, 500, corsHeaders);
    }

    console.log(`[verify-world-id] Successfully verified user: ${userId}`);
    return c.json({ 
      success: true, 
      verified_at: new Date().toISOString() 
    }, 200, corsHeaders);

  } catch (error) {
    console.error("[verify-world-id] Unexpected error:", error);
    return c.json({ error: "Internal server error" }, 500, corsHeaders);
  }
});

Deno.serve(app.fetch);
