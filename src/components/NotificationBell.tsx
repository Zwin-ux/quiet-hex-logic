import { Bell, Check, Swords, Trophy, UserPlus, Award, Gamepad2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

function getNotificationIcon(type: string) {
  switch (type) {
    case 'friend_challenge': return <Swords className="h-4 w-4 text-ochre" />;
    case 'match_invitation': return <Gamepad2 className="h-4 w-4 text-indigo" />;
    case 'tournament_start': return <Trophy className="h-4 w-4 text-amber-500" />;
    case 'match_ready': return <Gamepad2 className="h-4 w-4 text-green-500" />;
    case 'friend_request': return <UserPlus className="h-4 w-4 text-indigo" />;
    case 'achievement_earned': return <Award className="h-4 w-4 text-amber-500" />;
    default: return <Bell className="h-4 w-4" />;
  }
}

function getNotificationText(notification: { type: string; payload: any }) {
  switch (notification.type) {
    case 'friend_challenge':
      return `${notification.payload.sender_name || 'Someone'} challenged you`;
    case 'tournament_start':
      return `${notification.payload.tournament_name || 'Tournament'} is starting`;
    case 'match_ready':
      return 'Your match is ready';
    case 'friend_request':
      return `${notification.payload.sender_name || 'Someone'} sent a friend request`;
    case 'achievement_earned':
      return `Earned: ${notification.payload.achievement_name || 'Achievement'}`;
    default:
      return 'New notification';
  }
}

export function NotificationBell() {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(user?.id);
  const navigate = useNavigate();

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    if (notification.payload.match_id) {
      navigate(`/match/${notification.payload.match_id}`);
    } else if (notification.payload.tournament_id) {
      navigate(`/tournament/${notification.payload.tournament_id}`);
    } else if (notification.type === 'friend_request') {
      navigate('/friends');
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-10 w-10 p-0">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-in zoom-in duration-200">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <span className="font-semibold text-sm">Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllAsRead}>
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No new notifications
            </div>
          ) : (
            notifications.slice(0, 10).map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className="w-full flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors text-left border-b last:border-0"
              >
                <div className="mt-0.5 shrink-0">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {getNotificationText(notification)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
