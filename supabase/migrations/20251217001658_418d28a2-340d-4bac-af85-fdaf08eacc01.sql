-- Add puzzle streak tracking to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS puzzle_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS puzzle_streak_best INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_daily_puzzle_date DATE DEFAULT NULL;

-- Create index for daily puzzle lookup
CREATE INDEX IF NOT EXISTS idx_puzzles_daily_date ON public.puzzles (daily_date) WHERE is_daily = true;