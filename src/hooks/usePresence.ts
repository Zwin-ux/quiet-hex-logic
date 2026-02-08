import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type PresenceStatus = 'offline' | 'online' | 'in_match';

export const usePresence = (userId: string | undefined, matchId?: string) => {
  useEffect(() => {
    if (!userId) return;

    const status: PresenceStatus = matchId ? 'in_match' : 'online';

    // Upsert presence on mount and when status changes
    const updatePresence = async () => {
      await supabase
        .from('user_presence')
        .upsert({
          profile_id: userId,
          status,
          match_id: matchId || null,
          updated_at: new Date().toISOString()
        });
    };

    updatePresence();

    // Update presence every 30 seconds to keep it fresh
    const interval = setInterval(updatePresence, 30000);

    // Set to offline on unmount
    return () => {
      clearInterval(interval);
      supabase
        .from('user_presence')
        .upsert({
          profile_id: userId,
          status: 'offline',
          match_id: null,
          updated_at: new Date().toISOString()
        })
        .then(({ error }) => {
          if (error) console.error('Failed to set presence offline:', error);
        });
    };
  }, [userId, matchId]);
};

