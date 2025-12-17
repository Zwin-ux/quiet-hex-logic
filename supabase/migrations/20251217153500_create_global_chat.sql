-- Create global messages table
CREATE TABLE public.global_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 500),
  is_premium BOOLEAN DEFAULT false,
  is_guest BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.global_messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view messages
CREATE POLICY "global_messages_select" ON public.global_messages FOR SELECT USING (true);

-- Allow authenticated users and guests to insert messages
CREATE POLICY "global_messages_insert" ON public.global_messages FOR INSERT WITH CHECK (true);

-- Enable realtime for global messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_messages;

-- Create index for performance
CREATE INDEX idx_global_messages_created_at ON public.global_messages(created_at DESC);
