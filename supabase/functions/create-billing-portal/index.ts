import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STRIPE_API_VERSION = "2026-02-25.clover" as any;

type PortalKind = "premium" | "world_host";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeOrigin(req: Request) {
  return (
    req.headers.get("origin") ||
    Deno.env.get("PUBLIC_APP_URL") ||
    Deno.env.get("APP_URL") ||
    "http://localhost:5173"
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const authHeader = req.headers.get("Authorization");

    if (!stripeKey) throw new Error("Stripe secret key not configured");
    if (!supabaseUrl || !anonKey) {
      throw new Error("Supabase environment not configured");
    }
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: STRIPE_API_VERSION });
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      kind = "premium",
      worldId,
    } = (await req.json().catch(() => ({}))) as {
      kind?: PortalKind;
      worldId?: string;
    };

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const origin = normalizeOrigin(req);

    if (kind === "world_host") {
      if (!worldId) {
        return json({ error: "worldId is required" }, 400);
      }

      const { data: membership, error: membershipError } = await supabase
        .from("world_members")
        .select("role")
        .eq("world_id", worldId)
        .eq("profile_id", user.id)
        .in("role", ["owner", "admin"])
        .maybeSingle();

      if (membershipError) throw membershipError;
      if (!membership) {
        return json({ error: "Only hosts can open venue billing." }, 403);
      }

      const { data: subscription, error: subscriptionError } = await (supabase as any)
        .from("world_subscriptions")
        .select("stripe_customer_id")
        .eq("world_id", worldId)
        .maybeSingle();

      if (subscriptionError) throw subscriptionError;
      if (!subscription?.stripe_customer_id) {
        return json({ error: "No hosted plan found for this world." }, 404);
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripe_customer_id,
        return_url: `${origin}/worlds/${worldId}/settings`,
      });

      return json({ url: session.url });
    }

    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subscriptionError) throw subscriptionError;
    if (!subscription?.stripe_customer_id) {
      return json({ error: "No subscription found" }, 404);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${origin}/premium`,
    });

    return json({ url: session.url });
  } catch (error: unknown) {
    console.error("Billing portal error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
