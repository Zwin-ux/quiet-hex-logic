import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Supabase environment not configured");
    }

    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const authedSupabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await authedSupabase.auth.getUser();

    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { data: premiumSubscription, error: premiumError } = await serviceSupabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing", "past_due"])
      .maybeSingle();

    if (premiumError) throw premiumError;

    const { data: hostedSubscriptions, error: hostedError } = await serviceSupabase
      .from("world_subscriptions")
      .select("world_id, status")
      .eq("billing_profile_id", user.id)
      .in("status", ["active", "trialing", "past_due"]);

    if (hostedError) throw hostedError;

    if (premiumSubscription || (hostedSubscriptions?.length ?? 0) > 0) {
      return json(
        {
          error:
            "Cancel active billing first. BOARD+ and hosted world plans must be closed before deleting this account.",
        },
        409,
      );
    }

    const { error: releaseMatchesError } = await serviceSupabase
      .from("matches")
      .update({ owner: null })
      .eq("owner", user.id);

    if (releaseMatchesError) throw releaseMatchesError;

    const { error: deleteProfileError } = await serviceSupabase
      .from("profiles")
      .delete()
      .eq("id", user.id);

    if (deleteProfileError) throw deleteProfileError;

    const { error: deleteUserError } = await serviceSupabase.auth.admin.deleteUser(user.id, true);
    if (deleteUserError) throw deleteUserError;

    return json({ success: true });
  } catch (error: unknown) {
    console.error("Delete account error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
