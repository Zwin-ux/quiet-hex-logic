ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS competitive_mode boolean NOT NULL DEFAULT false;
