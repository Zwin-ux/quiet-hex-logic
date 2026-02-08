-- Performance indexes for hot query paths

-- Competitive matchmaking (find-competitive-match)
CREATE INDEX IF NOT EXISTS idx_matches_competitive_queue
  ON public.matches(status, is_ranked, game_key, size)
  WHERE status = 'waiting' AND is_ranked = true;

-- Rating history lookup by match (useMatchState.ts)
CREATE INDEX IF NOT EXISTS idx_rating_history_match_id
  ON public.rating_history(match_id);

-- Lobby cleanup cron
CREATE INDEX IF NOT EXISTS idx_lobbies_status_created
  ON public.lobbies(status, created_at)
  WHERE status = 'waiting';

-- Active match queries (timeouts, arena)
CREATE INDEX IF NOT EXISTS idx_matches_active
  ON public.matches(status, updated_at)
  WHERE status = 'active';
