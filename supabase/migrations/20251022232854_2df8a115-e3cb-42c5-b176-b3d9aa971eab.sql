-- Add avatar_color to profiles table for user customization
ALTER TABLE public.profiles
ADD COLUMN avatar_color TEXT DEFAULT 'indigo';

-- Add a check constraint to ensure valid color values
ALTER TABLE public.profiles
ADD CONSTRAINT avatar_color_check 
CHECK (avatar_color IN ('indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue'));

-- Add bio field for social profile
ALTER TABLE public.profiles
ADD COLUMN bio TEXT;

-- Add last_online tracking
ALTER TABLE public.profiles
ADD COLUMN last_online TIMESTAMP WITH TIME ZONE DEFAULT now();