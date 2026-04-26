import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const STRIPE_API_VERSION = "2026-02-25.clover" as any;

function isoFromStripeTimestamp(timestamp?: number | null) {
  return typeof timestamp === "number"
    ? new Date(timestamp * 1000).toISOString()
    : null;
}

async function upsertPlayerSubscription(
  supabase: ReturnType<typeof createClient>,
  input: {
    userId: string;
    customerId: string | null;
    subscription: Stripe.Subscription;
  },
) {
  await supabase.from("subscriptions").upsert(
    {
      user_id: input.userId,
      stripe_customer_id: input.customerId,
      stripe_subscription_id: input.subscription.id,
      plan: "hexology_plus",
      status: input.subscription.status,
      current_period_start: isoFromStripeTimestamp(
        input.subscription.current_period_start,
      ),
      current_period_end: isoFromStripeTimestamp(
        input.subscription.current_period_end,
      ),
      cancel_at_period_end: input.subscription.cancel_at_period_end,
    },
    { onConflict: "user_id" },
  );
}

async function upsertWorldSubscription(
  supabase: ReturnType<typeof createClient>,
  input: {
    worldId: string;
    billingProfileId: string | null;
    customerId: string | null;
    subscription: Stripe.Subscription;
  },
) {
  await supabase.from("world_subscriptions").upsert(
    {
      world_id: input.worldId,
      billing_profile_id: input.billingProfileId,
      stripe_customer_id: input.customerId,
      stripe_subscription_id: input.subscription.id,
      plan: "club_host",
      status: input.subscription.status,
      current_period_start: isoFromStripeTimestamp(
        input.subscription.current_period_start,
      ),
      current_period_end: isoFromStripeTimestamp(
        input.subscription.current_period_end,
      ),
      founding_price_locked: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "world_id" },
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeKey || !webhookSecret) {
    console.error("Missing Stripe configuration");
    return new Response("Server error", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: STRIPE_API_VERSION });
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    console.log("Webhook event:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (!session.subscription) break;

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string,
        );

        const kind = session.metadata?.kind;

        if (kind === "world_host" && session.metadata?.world_id) {
          await upsertWorldSubscription(supabase, {
            worldId: session.metadata.world_id,
            billingProfileId: session.metadata.billing_profile_id ?? null,
            customerId: (session.customer as string) ?? null,
            subscription,
          });
          console.log("World subscription activated:", session.metadata.world_id);
          break;
        }

        const userId = session.metadata?.user_id;
        if (userId) {
          await upsertPlayerSubscription(supabase, {
            userId,
            customerId: (session.customer as string) ?? null,
            subscription,
          });
          console.log("Player subscription activated:", userId);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const kind = subscription.metadata?.kind;

        if (kind === "world_host" && subscription.metadata?.world_id) {
          await supabase
            .from("world_subscriptions")
            .update({
              status: subscription.status,
              stripe_customer_id:
                typeof subscription.customer === "string"
                  ? subscription.customer
                  : null,
              current_period_start: isoFromStripeTimestamp(
                subscription.current_period_start,
              ),
              current_period_end: isoFromStripeTimestamp(
                subscription.current_period_end,
              ),
              updated_at: new Date().toISOString(),
            })
            .eq("world_id", subscription.metadata.world_id);
          console.log("World subscription updated:", subscription.id);
          break;
        }

        const userId = subscription.metadata?.user_id;
        if (userId) {
          await supabase
            .from("subscriptions")
            .update({
              status: subscription.status,
              current_period_start: isoFromStripeTimestamp(
                subscription.current_period_start,
              ),
              current_period_end: isoFromStripeTimestamp(
                subscription.current_period_end,
              ),
              cancel_at_period_end: subscription.cancel_at_period_end,
            })
            .eq("user_id", userId);
          console.log("Player subscription updated:", subscription.id);
          break;
        }

        await supabase
          .from("subscriptions")
          .update({
            status: subscription.status,
            current_period_start: isoFromStripeTimestamp(
              subscription.current_period_start,
            ),
            current_period_end: isoFromStripeTimestamp(
              subscription.current_period_end,
            ),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq("stripe_subscription_id", subscription.id);

        await supabase
          .from("world_subscriptions")
          .update({
            status: subscription.status,
            current_period_start: isoFromStripeTimestamp(
              subscription.current_period_start,
            ),
            current_period_end: isoFromStripeTimestamp(
              subscription.current_period_end,
            ),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          typeof invoice.subscription === "string" ? invoice.subscription : null;

        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const kind = subscription.metadata?.kind;

        if (kind === "world_host" && subscription.metadata?.world_id) {
          await supabase
            .from("world_subscriptions")
            .update({
              status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("world_id", subscription.metadata.world_id);
          console.log("World subscription payment failed:", subscriptionId);
          break;
        }

        await supabase
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("stripe_subscription_id", subscriptionId);
        console.log("Player subscription payment failed:", subscriptionId);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
