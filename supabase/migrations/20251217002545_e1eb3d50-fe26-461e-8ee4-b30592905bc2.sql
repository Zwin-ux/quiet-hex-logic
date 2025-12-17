-- Create puzzle rush scores table for leaderboard
CREATE TABLE public.puzzle_rush_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  time_limit_seconds INTEGER NOT NULL DEFAULT 300,
  puzzles_solved INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.puzzle_rush_scores ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view puzzle rush scores"
  ON public.puzzle_rush_scores FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own scores"
  ON public.puzzle_rush_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for leaderboard queries
CREATE INDEX idx_puzzle_rush_scores_leaderboard ON public.puzzle_rush_scores(score DESC, created_at ASC);
CREATE INDEX idx_puzzle_rush_scores_user ON public.puzzle_rush_scores(user_id);