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

export function useLeaderboard(limit = 100, gameKey: 'hex' | 'chess' | 'checkers' = 'hex') {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('player_ratings')
        .select('profile_id, elo_rating, games_rated, profiles(id, username, avatar_color, is_premium, is_verified_human)')
        .eq('game_key', gameKey)
        .gt('games_rated', 0)
        .order('elo_rating', { ascending: false })
        .limit(limit);

      if (!error && data) {
        const ranked = (data as any[]).map((row, index) => ({
          id: row.profiles?.id ?? row.profile_id,
          username: row.profiles?.username ?? 'Unknown',
          avatar_color: row.profiles?.avatar_color ?? 'indigo',
          elo_rating: row.elo_rating || 1200,
          games_rated: row.games_rated || 0,
          is_premium: row.profiles?.is_premium || false,
          is_verified_human: row.profiles?.is_verified_human || false,
          rank: index + 1,
        }));
        setEntries(ranked);
      } else if (error) {
        console.error('Leaderboard error:', error);
        setEntries([]);
      }
      
      setLoading(false);
    };

    fetchLeaderboard();
  }, [limit, gameKey]);

  const fetchUserRank = async (userId: string) => {
    const { data } = await supabase
      .from('player_ratings')
      .select('elo_rating')
      .eq('profile_id', userId)
      .eq('game_key', gameKey)
      .maybeSingle();

    const elo = (data as any)?.elo_rating;
    if (elo) {
      const { count } = await supabase
        .from('player_ratings')
        .select('*', { count: 'exact', head: true })
        .eq('game_key', gameKey)
        .gt('elo_rating', elo)
        .gt('games_rated', 0);

      setUserRank((count || 0) + 1);
    } else {
      setUserRank(null);
    }
  };

  return { entries, loading, userRank, fetchUserRank };
}
