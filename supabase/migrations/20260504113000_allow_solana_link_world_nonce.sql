ALTER TABLE public.world_app_auth_nonces
  DROP CONSTRAINT IF EXISTS world_app_auth_nonces_purpose_check;

ALTER TABLE public.world_app_auth_nonces
  ADD CONSTRAINT world_app_auth_nonces_purpose_check
  CHECK (purpose IN ('wallet_auth', 'solana_link'));
