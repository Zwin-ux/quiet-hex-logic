import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export function useGuestMode() {
  const { user, session } = useAuth();
  const [isGuest, setIsGuest] = useState(false);
  const [guestUsername, setGuestUsername] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkGuestStatus() {
      if (!user) {
        setIsGuest(false);
        setLoading(false);
        return;
      }

      // Check if user is anonymous via session
      const isAnonymous = session?.user?.is_anonymous || false;
      
      if (isAnonymous) {
        // Fetch guest profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, is_guest')
          .eq('id', user.id)
          .single();

        setIsGuest(profile?.is_guest || false);
        setGuestUsername(profile?.username || '');
      } else {
        setIsGuest(false);
      }
      
      setLoading(false);
    }

    checkGuestStatus();
  }, [user, session]);

  return { isGuest, guestUsername, loading };
}
