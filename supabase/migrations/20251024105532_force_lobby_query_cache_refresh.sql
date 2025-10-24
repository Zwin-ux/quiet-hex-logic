-- Force invalidation of all cached query plans for lobby_players + profiles joins
-- This fixes the "avatar_url does not exist" error by forcing query recompilation
--
-- Root cause: Supabase cached old query plans that reference avatar_url column
-- which never existed. This migration forces recompilation with current schema.

-- Method 1: Trivial change to lobby_players table to invalidate cache
ALTER TABLE public.lobby_players ADD COLUMN IF NOT EXISTS _query_cache_refresh BOOLEAN DEFAULT NULL;
ALTER TABLE public.lobby_players DROP COLUMN IF EXISTS _query_cache_refresh;

-- Method 2: Also refresh profiles table cache to ensure all join queries are recompiled
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS _query_cache_refresh2 BOOLEAN DEFAULT NULL;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS _query_cache_refresh2;

-- Method 3: Update table statistics to force query planner to use fresh data
ANALYZE public.lobby_players;
ANALYZE public.profiles;
ANALYZE public.lobbies;

-- This ensures all queries like:
-- SELECT * FROM lobby_players JOIN profiles ON ...
-- will be recompiled and use the current schema (with avatar_color, not avatar_url)
