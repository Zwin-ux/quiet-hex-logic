import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LeaderboardEntry {
  id: string;
  username: string;
  avatar_color: string | null;
  elo_rating: number;
  games_rated: number;
  is_premium: boolean;
  is_verified_human: boolean;
  rank: number;
}

export function useLeaderboard(limit = 100) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_color, elo_rating, games_rated, is_premium, is_verified_human')
        .gt('games_rated', 0)
        .order('elo_rating', { ascending: false })
        .limit(limit);

      if (!error && data) {
        const ranked = data.map((entry, index) => ({
          ...entry,
          elo_rating: entry.elo_rating || 1200,
          games_rated: entry.games_rated || 0,
          is_premium: entry.is_premium || false,
          is_verified_human: entry.is_verified_human || false,
          rank: index + 1,
        }));
        setEntries(ranked);
      }
      
      setLoading(false);
    };

    fetchLeaderboard();
  }, [limit]);

  const fetchUserRank = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('elo_rating')
      .eq('id', userId)
      .maybeSingle();

    if (data?.elo_rating) {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('elo_rating', data.elo_rating)
        .gt('games_rated', 0);

      setUserRank((count || 0) + 1);
    }
  };

  return { entries, loading, userRank, fetchUserRank };
}
