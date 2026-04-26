CREATE TABLE IF NOT EXISTS public.world_subscriptions (
  world_id uuid PRIMARY KEY REFERENCES public.worlds(id) ON DELETE CASCADE,
  billing_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  plan text NOT NULL DEFAULT 'free_trial'
    CHECK (plan IN ('free_trial', 'club_host')),
  status text NOT NULL DEFAULT 'inactive'
    CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'inactive')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  founding_price_locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS world_subscriptions_stripe_subscription_id_key
ON public.world_subscriptions(stripe_subscription_id)
WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS world_subscriptions_billing_profile_id_idx
ON public.world_subscriptions(billing_profile_id);

ALTER TABLE public.world_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS world_subscriptions_select_manageable ON public.world_subscriptions;
CREATE POLICY world_subscriptions_select_manageable
ON public.world_subscriptions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.world_members wm
    WHERE wm.world_id = world_subscriptions.world_id
      AND wm.profile_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS world_subscriptions_service_role_manage ON public.world_subscriptions;
CREATE POLICY world_subscriptions_service_role_manage
ON public.world_subscriptions
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
