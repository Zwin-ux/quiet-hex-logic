-- Ensure all required columns exist for guest mode and AI matches
-- This migration is idempotent and safe to run multiple times

-- Add ai_difficulty enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE ai_difficulty AS ENUM ('easy', 'medium', 'hard', 'expert');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add ai_difficulty column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.matches ADD COLUMN ai_difficulty ai_difficulty;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add allow_spectators column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.matches ADD COLUMN allow_spectators boolean NOT NULL DEFAULT true;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Create index for querying by difficulty if it doesn't exist
DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS matches_ai_difficulty_idx ON public.matches(ai_difficulty);
END $$;

-- Add comment
COMMENT ON COLUMN public.matches.ai_difficulty IS 'AI difficulty level for bot matches (null for human-only matches)';
COMMENT ON COLUMN public.matches.allow_spectators IS 'Whether spectators can watch this match';
