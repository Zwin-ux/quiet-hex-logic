import { supabase } from "@/integrations/supabase/client";

export type WorldSubscriptionPlan = "free_trial" | "club_host";
export type WorldSubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "inactive";

export type WorldSubscription = {
  world_id: string;
  billing_profile_id: string | null;
  plan: WorldSubscriptionPlan;
  status: WorldSubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  founding_price_locked: boolean;
  created_at: string;
  updated_at: string;
};

function db() {
  return supabase as any;
}

function isMissingWorldSubscriptionsTable(error: any) {
  const message = typeof error?.message === "string" ? error.message : "";
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    message.includes("world_subscriptions")
  );
}

export function isWorldSubscriptionActive(
  subscription: Pick<WorldSubscription, "status"> | null | undefined,
) {
  return subscription?.status === "active" || subscription?.status === "trialing";
}

export function formatWorldSubscriptionStatus(
  status: WorldSubscriptionStatus | null | undefined,
) {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past due";
    case "canceled":
      return "canceled";
    default:
      return "inactive";
  }
}

export async function loadWorldSubscription(worldId: string) {
  const { data, error } = await db()
    .from("world_subscriptions")
    .select(
      "world_id, billing_profile_id, plan, status, stripe_customer_id, stripe_subscription_id, current_period_start, current_period_end, founding_price_locked, created_at, updated_at",
    )
    .eq("world_id", worldId)
    .maybeSingle();

  if (error) {
    if (isMissingWorldSubscriptionsTable(error)) {
      return null;
    }
    throw error;
  }
  return (data ?? null) as WorldSubscription | null;
}

export async function listWorldSubscriptions(worldIds: string[]) {
  if (worldIds.length === 0) {
    return new Map<string, WorldSubscription>();
  }

  const { data, error } = await db()
    .from("world_subscriptions")
    .select(
      "world_id, billing_profile_id, plan, status, stripe_customer_id, stripe_subscription_id, current_period_start, current_period_end, founding_price_locked, created_at, updated_at",
    )
    .in("world_id", worldIds);

  if (error) {
    if (isMissingWorldSubscriptionsTable(error)) {
      return new Map<string, WorldSubscription>();
    }
    throw error;
  }

  return new Map<string, WorldSubscription>(
    ((data ?? []) as WorldSubscription[]).map((subscription) => [
      subscription.world_id,
      subscription,
    ]),
  );
}

async function invokeBillingFunction(
  fn: "create-checkout" | "create-billing-portal",
  body: Record<string, unknown>,
) {
  const { data, error } = await supabase.functions.invoke(fn, { body });

  if (error) throw error;

  if (data?.error) {
    throw new Error(data.error);
  }

  if (!data?.url || typeof data.url !== "string") {
    throw new Error("Billing session did not return a redirect URL.");
  }

  return data.url as string;
}

export async function startWorldHostCheckout(worldId: string) {
  return invokeBillingFunction("create-checkout", {
    kind: "world_host",
    worldId,
  });
}

export async function openWorldBillingPortal(worldId: string) {
  return invokeBillingFunction("create-billing-portal", {
    kind: "world_host",
    worldId,
  });
}
