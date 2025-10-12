import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria: any;
  earned?: boolean;
  earned_at?: string;
}

export const useAchievements = (userId: string | undefined) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchAchievements = async () => {
      // Fetch all achievements
      const { data: allAchievements, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .order('created_at', { ascending: true });

      if (achievementsError) {
        console.error('Error fetching achievements:', achievementsError);
        setLoading(false);
        return;
      }

      // Fetch user's earned achievements
      const { data: userAchievements, error: userAchievementsError } = await supabase
        .from('user_achievements')
        .select('achievement_id, earned_at')
        .eq('user_id', userId);

      if (userAchievementsError) {
        console.error('Error fetching user achievements:', userAchievementsError);
        setLoading(false);
        return;
      }

      // Combine data
      const earnedMap = new Map(
        userAchievements?.map(ua => [ua.achievement_id, ua.earned_at]) || []
      );

      const enrichedAchievements = allAchievements?.map(achievement => ({
        ...achievement,
        earned: earnedMap.has(achievement.id),
        earned_at: earnedMap.get(achievement.id)
      })) || [];

      setAchievements(enrichedAchievements);
      setLoading(false);
    };

    fetchAchievements();

    // Subscribe to new achievements
    const channel = supabase
      .channel(`user_achievements:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_achievements',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchAchievements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { achievements, loading };
};
