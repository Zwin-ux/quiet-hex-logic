-- Prevent duplicate bot move requests per (match, ply, bot).
CREATE UNIQUE INDEX IF NOT EXISTS bot_move_requests_match_ply_bot_unique
  ON public.bot_move_requests(match_id, ply, bot_id);

