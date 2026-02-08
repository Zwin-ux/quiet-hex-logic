-- Fix cron jobs: point to new Supabase project and use dynamic service_role_key
-- Old jobs targeted the deleted project ptuxqfwicdpdslqwnswd

-- Unschedule old jobs (wrapped in exception handlers in case they don't exist)
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-empty-lobbies-daily');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'cleanup-empty-lobbies-daily not found, skipping';
END;
$$;

DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-old-matches-hourly');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'cleanup-old-matches-hourly not found, skipping';
END;
$$;

-- Reschedule with correct project URL and dynamic service_role_key
SELECT cron.schedule(
  'cleanup-empty-lobbies-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kgwxaenxdlzuzqyoewpe.supabase.co/functions/v1/cleanup-empty-lobbies',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'cleanup-old-matches-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kgwxaenxdlzuzqyoewpe.supabase.co/functions/v1/check-turn-timeouts',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
