-- Add AI difficulty column to matches table
create type ai_difficulty as enum ('easy', 'medium', 'hard', 'expert');

alter table public.matches
add column ai_difficulty ai_difficulty;

-- Create index for querying by difficulty
create index matches_ai_difficulty_idx on public.matches(ai_difficulty);

-- Update the view to show AI difficulty stats (optional enhancement)
comment on column public.matches.ai_difficulty is 'AI difficulty level for bot matches (null for human-only matches)';
