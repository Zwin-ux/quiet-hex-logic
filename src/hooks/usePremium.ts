import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Subscription {
  id: string;
  plan: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export function usePremium(userId: string | undefined) {
  const [isPremium, setIsPremium] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchPremiumStatus = async () => {
      // First check profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_premium, premium_expires_at')
        .eq('id', userId)
        .maybeSingle();

      if (profile?.is_premium) {
        setIsPremium(true);
      }

      // Then check subscription
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (sub) {
        setSubscription(sub as Subscription);
        setIsPremium(sub.status === 'active');
      }
      
      setLoading(false);
    };

    fetchPremiumStatus();
  }, [userId]);

  return { isPremium, subscription, loading };
}
