-- Add match code generation function
CREATE OR REPLACE FUNCTION public.generate_match_code(match_uuid uuid)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT upper(substring(encode(decode(replace(match_uuid::text, '-', ''), 'hex'), 'base32'), 1, 6))
$$;

-- Update friends table to support friend requests with status
ALTER TABLE public.friends ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked'));
ALTER TABLE public.friends ADD COLUMN IF NOT EXISTS requested_at timestamp with time zone DEFAULT now();

-- Update friends policies to handle pending requests
DROP POLICY IF EXISTS friends_select ON public.friends;
CREATE POLICY "friends_select" 
ON public.friends 
FOR SELECT 
USING ((a = auth.uid()) OR (b = auth.uid()));

DROP POLICY IF EXISTS friends_insert ON public.friends;
CREATE POLICY "friends_insert" 
ON public.friends 
FOR INSERT 
WITH CHECK (a = auth.uid());

-- Add update policy for accepting friend requests
CREATE POLICY "friends_update" 
ON public.friends 
FOR UPDATE 
USING (b = auth.uid() AND status = 'pending')
WITH CHECK (b = auth.uid() AND status = 'accepted');

-- Function to check if users are friends
CREATE OR REPLACE FUNCTION public.are_friends(_user_a uuid, _user_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.friends
    WHERE status = 'accepted'
      AND ((a = _user_a AND b = _user_b) OR (a = _user_b AND b = _user_a))
  )
$$;

-- Function to check if user is blocked
CREATE OR REPLACE FUNCTION public.is_blocked(_blocker uuid, _blocked uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.blocks
    WHERE blocker = _blocker AND blocked = _blocked
  )
$$;