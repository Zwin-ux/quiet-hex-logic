-- Create user_presence table for tracking online status
CREATE TABLE public.user_presence (
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('offline', 'online', 'in_match')),
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id)
);

-- Enable RLS
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Anyone can view presence (to see friend status)
CREATE POLICY "user_presence_select"
  ON public.user_presence
  FOR SELECT
  USING (true);

-- Users can only update their own presence
CREATE POLICY "user_presence_upsert"
  ON public.user_presence
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "user_presence_update"
  ON public.user_presence
  FOR UPDATE
  USING (auth.uid() = profile_id);

-- Enable realtime for presence
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;

-- Auto-update timestamp trigger
CREATE TRIGGER update_user_presence_updated_at
  BEFORE UPDATE ON public.user_presence
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create notifications table for challenges and invitations
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('friend_challenge', 'match_invitation')),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "notifications_select"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = receiver_id);

-- Users can send notifications
CREATE POLICY "notifications_insert"
  ON public.notifications
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "notifications_update"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = receiver_id);

-- Users can delete their own notifications
CREATE POLICY "notifications_delete"
  ON public.notifications
  FOR DELETE
  USING (auth.uid() = receiver_id);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;