import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type NotificationType = 'friend_challenge' | 'match_invitation';

interface Notification {
  id: string;
  type: NotificationType;
  sender_id: string;
  receiver_id: string;
  payload: {
    sender_name?: string;
    match_id?: string;
    board_size?: number;
  };
  read: boolean;
  created_at: string;
}

export const useNotifications = (userId: string | undefined) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!userId) return;

    // Fetch initial notifications
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('receiver_id', userId)
        .eq('read', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      setNotifications(data as Notification[]);
    };

    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `receiver_id=eq.${userId}`
        },
        (payload) => {
          const notification = payload.new as Notification;
          setNotifications(prev => [notification, ...prev]);
          
          // Show toast for new notifications
          if (notification.type === 'friend_challenge') {
            toast({
              title: "Challenge Received!",
              description: `${notification.payload.sender_name} challenged you to a ${notification.payload.board_size}×${notification.payload.board_size} game`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return;
    }

    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const deleteNotification = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
      return;
    }

    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  return { notifications, markAsRead, deleteNotification };
};
