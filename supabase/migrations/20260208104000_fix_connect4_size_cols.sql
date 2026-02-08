-- Standardize connect4 board size to store columns (7 for a 7x6 board).
-- Only touch waiting lobbies/matches to avoid breaking in-progress or historical replays.

UPDATE public.lobbies
SET board_size = 7
WHERE game_key = 'connect4'
  AND board_size = 6
  AND status = 'waiting';

UPDATE public.matches
SET size = 7
WHERE game_key = 'connect4'
  AND size = 6
  AND status = 'waiting';

