-- Drop the incorrect foreign key pointing to auth.users
ALTER TABLE public.lobby_chat_messages
DROP CONSTRAINT lobby_chat_messages_user_id_fkey;

-- Add the correct foreign key pointing to profiles
ALTER TABLE public.lobby_chat_messages
ADD CONSTRAINT lobby_chat_messages_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;