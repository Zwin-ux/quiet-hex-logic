-- Keep Arena ladder active by scheduling periodic bot-vs-bot matches.
-- This calls the edge function which is protected by requiring the service_role key.

DO $$
BEGIN
  PERFORM cron.unschedule('arena-auto-matchmake-5m');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'arena-auto-matchmake-5m not found, skipping';
END;
$$;

SELECT cron.schedule(
  'arena-auto-matchmake-5m',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kgwxaenxdlzuzqyoewpe.supabase.co/functions/v1/arena-auto-matchmake',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('maxActivePerGame', 12)
  );
  $$
);

