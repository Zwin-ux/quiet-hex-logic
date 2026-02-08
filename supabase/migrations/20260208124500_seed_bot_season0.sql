-- Ensure Season 0 exists so the Ladder UI has a stable active season immediately.

INSERT INTO public.bot_seasons (name, is_active)
VALUES ('Season 0', true)
ON CONFLICT (name) DO UPDATE SET is_active = EXCLUDED.is_active;

-- Ensure only one active season.
UPDATE public.bot_seasons
SET is_active = false
WHERE name <> 'Season 0' AND is_active = true;

