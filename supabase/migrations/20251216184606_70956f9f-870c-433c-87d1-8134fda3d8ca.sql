-- Create puzzles table
CREATE TABLE public.puzzles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'master')),
  category TEXT NOT NULL DEFAULT 'tactics',
  board_size INTEGER NOT NULL DEFAULT 11,
  setup_moves JSONB NOT NULL DEFAULT '[]'::jsonb,
  solution_moves JSONB NOT NULL DEFAULT '[]'::jsonb,
  rating INTEGER NOT NULL DEFAULT 1200,
  times_played INTEGER NOT NULL DEFAULT 0,
  times_solved INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_daily BOOLEAN NOT NULL DEFAULT false,
  daily_date DATE
);

-- Create user puzzle attempts table
CREATE TABLE public.user_puzzle_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  puzzle_id UUID NOT NULL REFERENCES public.puzzles(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  attempts INTEGER NOT NULL DEFAULT 1,
  time_seconds INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, puzzle_id)
);

-- Create daily puzzle tracking table
CREATE TABLE public.user_daily_puzzles (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  puzzle_date DATE NOT NULL DEFAULT CURRENT_DATE,
  puzzle_id UUID NOT NULL REFERENCES public.puzzles(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, puzzle_date)
);

-- Enable RLS
ALTER TABLE public.puzzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_puzzle_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_puzzles ENABLE ROW LEVEL SECURITY;

-- Puzzles are viewable by everyone
CREATE POLICY "puzzles_select" ON public.puzzles FOR SELECT USING (true);

-- User puzzle attempts
CREATE POLICY "user_puzzle_attempts_select" ON public.user_puzzle_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_puzzle_attempts_insert" ON public.user_puzzle_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_puzzle_attempts_update" ON public.user_puzzle_attempts FOR UPDATE USING (auth.uid() = user_id);

-- User daily puzzles
CREATE POLICY "user_daily_puzzles_select" ON public.user_daily_puzzles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_daily_puzzles_insert" ON public.user_daily_puzzles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_daily_puzzles_update" ON public.user_daily_puzzles FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_puzzles_difficulty ON public.puzzles(difficulty);
CREATE INDEX idx_puzzles_category ON public.puzzles(category);
CREATE INDEX idx_puzzles_daily_date ON public.puzzles(daily_date) WHERE is_daily = true;
CREATE INDEX idx_user_puzzle_attempts_user ON public.user_puzzle_attempts(user_id);
CREATE INDEX idx_user_daily_puzzles_date ON public.user_daily_puzzles(puzzle_date);

-- Insert some starter puzzles
INSERT INTO public.puzzles (title, description, difficulty, category, board_size, setup_moves, solution_moves, rating) VALUES
('First Connection', 'Connect your edges with a single move', 'beginner', 'tactics', 5, '[{"cell": 0, "color": 1}, {"cell": 1, "color": 2}, {"cell": 5, "color": 1}, {"cell": 6, "color": 2}, {"cell": 10, "color": 1}, {"cell": 11, "color": 2}, {"cell": 15, "color": 1}, {"cell": 16, "color": 2}]', '[{"cell": 20, "color": 1}]', 800),
('Block the Path', 'Find the move that blocks your opponent', 'beginner', 'blocking', 5, '[{"cell": 2, "color": 2}, {"cell": 7, "color": 2}, {"cell": 12, "color": 2}]', '[{"cell": 17, "color": 1}]', 900),
('Bridge Building', 'Create a bridge connection', 'intermediate', 'tactics', 7, '[{"cell": 8, "color": 1}, {"cell": 15, "color": 2}, {"cell": 22, "color": 1}, {"cell": 23, "color": 2}]', '[{"cell": 16, "color": 1}]', 1100),
('Double Threat', 'Create two winning threats at once', 'intermediate', 'tactics', 7, '[{"cell": 10, "color": 1}, {"cell": 11, "color": 2}, {"cell": 17, "color": 1}, {"cell": 18, "color": 2}, {"cell": 24, "color": 1}]', '[{"cell": 25, "color": 1}]', 1200),
('Edge Defense', 'Defend your edge efficiently', 'advanced', 'defense', 9, '[{"cell": 20, "color": 2}, {"cell": 29, "color": 2}, {"cell": 38, "color": 2}]', '[{"cell": 47, "color": 1}]', 1400),
('Master Ladder', 'Execute the ladder escape', 'master', 'advanced', 11, '[{"cell": 55, "color": 1}, {"cell": 56, "color": 2}, {"cell": 66, "color": 1}, {"cell": 67, "color": 2}, {"cell": 77, "color": 1}]', '[{"cell": 78, "color": 1}]', 1600);