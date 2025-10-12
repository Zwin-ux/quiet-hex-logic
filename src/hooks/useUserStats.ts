import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserStats {
  total_games: number;
  wins: number;
  losses: number;
  avg_game_length_minutes: number;
  favorite_board_size: number;
  last_played_at: string;
}

export const useUserStats = (userId: string | undefined) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('profile_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user stats:', error);
      } else {
        setStats(data);
      }
      setLoading(false);
    };

    fetchStats();
  }, [userId]);

  return { stats, loading };
};
