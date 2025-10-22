-- Create global chat messages table
CREATE TABLE public.global_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.global_chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow signed-in users to read all messages
CREATE POLICY "Anyone can view chat messages"
ON public.global_chat_messages
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Allow signed-in users to send messages
CREATE POLICY "Users can send chat messages"
ON public.global_chat_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_chat_messages;

-- Create index for better performance
CREATE INDEX idx_global_chat_created_at ON public.global_chat_messages(created_at DESC);