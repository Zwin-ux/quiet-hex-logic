import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const AchievementToast = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`achievements:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_achievements',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          // Fetch the achievement details
          const { data: achievement } = await supabase
            .from('achievements')
            .select('name, description, icon')
            .eq('id', payload.new.achievement_id)
            .single();

          if (achievement) {
            toast.success('Achievement Unlocked!', {
              description: `${achievement.icon} ${achievement.name}`,
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return null;
};
