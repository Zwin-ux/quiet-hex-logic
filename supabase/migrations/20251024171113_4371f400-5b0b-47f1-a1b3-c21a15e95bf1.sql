-- Force schema cache refresh by making a trivial change to profiles table
-- This will invalidate cached query plans
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS _cache_refresh_temp BOOLEAN DEFAULT NULL;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS _cache_refresh_temp;