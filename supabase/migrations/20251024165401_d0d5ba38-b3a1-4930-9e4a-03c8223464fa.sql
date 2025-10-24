-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create unique index on lobbies.code if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS lobbies_code_key ON public.lobbies(code);

-- Schedule cleanup job to run every hour
SELECT cron.schedule(
  'cleanup-old-matches-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://ptuxqfwicdpdslqwnswd.supabase.co/functions/v1/cleanup-old-matches',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0dXhxZndpY2RwZHNscXduc3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMjEyMzUsImV4cCI6MjA3NTY5NzIzNX0.mGSTdRYHrspbl-6EOi9Av9H0d-qdra0pSpRmEyIN5D0"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);