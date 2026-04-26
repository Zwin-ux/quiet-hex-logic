import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STRIPE_API_VERSION = "2026-02-25.clover" as any;

type CheckoutKind = "premium" | "world_host";

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

async function ensureCustomer(args: {
  stripe: Stripe;
  email: string;
  name: string | null | undefined;
  supabaseUserId: string;
}) {
  const existing = await args.stripe.customers.list({
    email: args.email,
    limit: 1,
  });

  if (existing.data[0]?.id) {
    return existing.data[0].id;
  }

  const customer = await args.stripe.customers.create({
    email: args.email,
    name: args.name ?? undefined,
    metadata: { supabase_user_id: args.supabaseUserId },
  });

  return customer.id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization");

    if (!stripeKey) throw new Error("Stripe secret key not configured");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Supabase environment not configured");
    }
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: STRIPE_API_VERSION });
    const authedSupabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey);

    const {
      kind = "premium",
      worldId,
    } = (await req.json().catch(() => ({}))) as {
      kind?: CheckoutKind;
      worldId?: string;
    };

    const {
      data: { user },
      error: userError,
    } = await authedSupabase.auth.getUser();

    if (userError || !user || !user.email) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { data: profile } = await authedSupabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();

    const customerId = await ensureCustomer({
      stripe,
      email: user.email,
      name: profile?.username,
      supabaseUserId: user.id,
    });

    const origin = normalizeOrigin(req);

    if (kind === "world_host") {
      if (!worldId) {
        return json({ error: "worldId is required" }, 400);
      }

      const { data: membership, error: membershipError } = await authedSupabase
        .from("world_members")
        .select("role")
        .eq("world_id", worldId)
        .eq("profile_id", user.id)
        .in("role", ["owner", "admin"])
        .maybeSingle();

      if (membershipError) throw membershipError;
      if (!membership) {
        return json({ error: "Only hosts can start venue billing." }, 403);
      }

      const { data: world, error: worldError } = await authedSupabase
        .from("worlds")
        .select("id, name")
        .eq("id", worldId)
        .single();

      if (worldError || !world) {
        return json({ error: "World not found" }, 404);
      }

      const { data: existingWorldSubscription, error: existingWorldSubscriptionError } =
        await serviceSupabase
          .from("world_subscriptions")
          .select("status, founding_price_locked")
          .eq("world_id", worldId)
          .maybeSingle();

      if (existingWorldSubscriptionError) throw existingWorldSubscriptionError;
      if (
        existingWorldSubscription?.status === "active" ||
        existingWorldSubscription?.status === "trialing"
      ) {
        return json({ error: "This world already has an active hosted plan." }, 400);
      }

      const priceId = Deno.env.get("STRIPE_HOST_PRICE_ID");
      if (!priceId) {
        throw new Error("STRIPE_HOST_PRICE_ID is not configured");
      }

      const successUrl = `${origin}/worlds/${worldId}/settings?billing=success`;
      const cancelUrl = `${origin}/worlds/${worldId}/settings?billing=cancel`;

      const metadata = {
        kind: "world_host",
        world_id: worldId,
        billing_profile_id: user.id,
      } as const;

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata,
        subscription_data: {
          metadata,
        },
      });

      const { error: upsertError } = await serviceSupabase
        .from("world_subscriptions")
        .upsert(
          {
            world_id: worldId,
            billing_profile_id: user.id,
            plan: "club_host",
            status: existingWorldSubscription?.status ?? "inactive",
            stripe_customer_id: customerId,
            founding_price_locked:
              existingWorldSubscription?.founding_price_locked ?? true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "world_id" },
        );

      if (upsertError) throw upsertError;

      return json({ url: session.url, worldName: world.name });
    }

    const { data: existingSubscription, error: existingSubscriptionError } =
      await serviceSupabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();

    if (existingSubscriptionError) throw existingSubscriptionError;
    if (existingSubscription?.status === "active") {
      return json({ error: "Already subscribed" }, 400);
    }

    const priceId =
      Deno.env.get("STRIPE_PRICE_ID") || "price_1Sf366KHzChTixtj9IVQyey9";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/premium?success=true`,
      cancel_url: `${origin}/premium?canceled=true`,
      metadata: { kind: "premium", user_id: user.id },
      subscription_data: {
        metadata: { kind: "premium", user_id: user.id },
      },
    });

    const { error: upsertError } = await serviceSupabase.from("subscriptions").upsert(
      {
        user_id: user.id,
        stripe_customer_id: customerId,
        plan: "hexology_plus",
        status: "inactive",
      },
      { onConflict: "user_id" },
    );

    if (upsertError) throw upsertError;

    return json({ url: session.url });
  } catch (error: unknown) {
    console.error("Checkout error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
