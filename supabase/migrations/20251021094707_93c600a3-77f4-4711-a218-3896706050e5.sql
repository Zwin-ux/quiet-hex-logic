-- Add ai_difficulty column to matches table for AI practice games

-- Create enum type for AI difficulty levels
DO $$ BEGIN
    CREATE TYPE ai_difficulty AS ENUM ('easy', 'medium', 'hard', 'expert');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add ai_difficulty column to matches
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS ai_difficulty ai_difficulty DEFAULT NULL;

-- Add index for querying AI matches
CREATE INDEX IF NOT EXISTS matches_ai_difficulty_idx ON public.matches(ai_difficulty);

-- Add comment explaining the column
COMMENT ON COLUMN public.matches.ai_difficulty IS 'AI difficulty level for AI practice matches (null for human vs human matches)';