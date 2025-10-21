-- Add board_skin column to profiles table for theme customization
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS board_skin TEXT DEFAULT 'classic';

-- Add comment
COMMENT ON COLUMN public.profiles.board_skin IS 'Selected board theme/skin ID';