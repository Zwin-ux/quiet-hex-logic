import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RatingHistoryEntry {
  id: string;
  match_id: string | null;
  old_rating: number;
  new_rating: number;
  rating_change: number;
  created_at: string;
}

export function useRatingHistory(userId: string | undefined, limit = 30) {
  const [history, setHistory] = useState<RatingHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('rating_history')
        .select('id, match_id, old_rating, new_rating, rating_change, created_at')
        .eq('profile_id', userId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error fetching rating history:', error);
      } else if (data) {
        setHistory(data);
      }

      setLoading(false);
    };

    fetchHistory();
  }, [userId, limit]);

  return { history, loading };
}
