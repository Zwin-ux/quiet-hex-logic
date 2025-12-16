-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table for role-based access control
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Add rating columns to profiles
ALTER TABLE public.profiles
ADD COLUMN elo_rating INTEGER DEFAULT 1200,
ADD COLUMN rating_deviation INTEGER DEFAULT 350,
ADD COLUMN games_rated INTEGER DEFAULT 0,
ADD COLUMN is_premium BOOLEAN DEFAULT false,
ADD COLUMN premium_expires_at TIMESTAMP WITH TIME ZONE;

-- Create rating_history table
CREATE TABLE public.rating_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    match_id uuid REFERENCES public.matches(id) ON DELETE CASCADE,
    old_rating INTEGER NOT NULL,
    new_rating INTEGER NOT NULL,
    rating_change INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on rating_history
ALTER TABLE public.rating_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for rating_history
CREATE POLICY "Anyone can view rating history"
ON public.rating_history FOR SELECT
USING (true);

CREATE POLICY "Service role can insert rating history"
ON public.rating_history FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Create subscriptions table
CREATE TABLE public.subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'inactive',
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscriptions
CREATE POLICY "Users can view their own subscription"
ON public.subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
ON public.subscriptions FOR ALL
USING (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX idx_profiles_elo_rating ON public.profiles(elo_rating DESC);
CREATE INDEX idx_profiles_is_premium ON public.profiles(is_premium);
CREATE INDEX idx_rating_history_profile ON public.rating_history(profile_id);
CREATE INDEX idx_rating_history_created ON public.rating_history(created_at DESC);
CREATE INDEX idx_subscriptions_stripe ON public.subscriptions(stripe_subscription_id);

-- Add is_ranked column to matches
ALTER TABLE public.matches
ADD COLUMN is_ranked BOOLEAN DEFAULT false;

-- Create function to update profile premium status
CREATE OR REPLACE FUNCTION public.update_premium_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE public.profiles
    SET is_premium = true, premium_expires_at = NEW.current_period_end
    WHERE id = NEW.user_id;
  ELSE
    UPDATE public.profiles
    SET is_premium = false, premium_expires_at = NULL
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to sync premium status
CREATE TRIGGER sync_premium_status
AFTER INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_premium_status();