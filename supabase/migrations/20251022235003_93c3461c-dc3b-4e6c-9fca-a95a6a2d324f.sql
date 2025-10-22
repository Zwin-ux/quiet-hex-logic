-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP calls from the database
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the cleanup function to run daily at 3 AM UTC
SELECT cron.schedule(
  'cleanup-empty-lobbies-daily',
  '0 3 * * *', -- Every day at 3 AM UTC
  $$
  SELECT
    net.http_post(
      url:='https://ptuxqfwicdpdslqwnswd.supabase.co/functions/v1/cleanup-empty-lobbies',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0dXhxZndpY2RwZHNscXduc3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMjEyMzUsImV4cCI6MjA3NTY5NzIzNX0.mGSTdRYHrspbl-6EOi9Av9H0d-qdra0pSpRmEyIN5D0"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);