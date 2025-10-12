import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Spectator {
  profile_id: string;
  joined_at: string;
  profiles?: {
    username: string;
  };
}

export const useSpectators = (matchId: string | undefined) => {
  const [spectators, setSpectators] = useState<Spectator[]>([]);
  const [isSpectating, setIsSpectating] = useState(false);

  useEffect(() => {
    if (!matchId) return;

    // Fetch initial spectators
    const fetchSpectators = async () => {
      const { data, error } = await supabase
        .from('spectators')
        .select('profile_id, joined_at, profiles(username)')
        .eq('match_id', matchId);

      if (error) {
        console.error('Error fetching spectators:', error);
        return;
      }

      setSpectators(data as Spectator[]);

      // Check if current user is spectating
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const isCurrentUserSpectating = data.some(s => s.profile_id === user.id);
        setIsSpectating(isCurrentUserSpectating);
      }
    };

    fetchSpectators();

    // Subscribe to spectator changes
    const channel = supabase
      .channel(`spectators:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'spectators',
          filter: `match_id=eq.${matchId}`
        },
        () => {
          fetchSpectators();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  const joinAsSpectator = async (userId: string) => {
    if (!matchId) return;

    const { error } = await supabase
      .from('spectators')
      .insert({
        match_id: matchId,
        profile_id: userId
      });

    if (error) {
      console.error('Error joining as spectator:', error);
      throw error;
    }

    setIsSpectating(true);
  };

  const leaveAsSpectator = async (userId: string) => {
    if (!matchId) return;

    const { error } = await supabase
      .from('spectators')
      .delete()
      .eq('match_id', matchId)
      .eq('profile_id', userId);

    if (error) {
      console.error('Error leaving as spectator:', error);
      throw error;
    }

    setIsSpectating(false);
  };

  return {
    spectators,
    isSpectating,
    joinAsSpectator,
    leaveAsSpectator
  };
};
