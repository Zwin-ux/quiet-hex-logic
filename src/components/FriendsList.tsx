/**
 * Enhanced Friends List Component
 * Shows online status, challenge buttons, and spectate options
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserAvatar } from '@/components/UserAvatar';
import { Swords, Eye, Users, UserPlus, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface FriendData {
  id: string;
  username: string;
  avatarColor: string;
  status: 'online' | 'in_match' | 'offline';
  lastSeen?: string;
  matchId?: string;
  elo?: number;
}

interface FriendsListProps {
  compact?: boolean;
  maxHeight?: string;
}

export function FriendsList({ compact = false, maxHeight = '400px' }: FriendsListProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFriends = useCallback(async () => {
    if (!user) return;
    
    try {
      // Get accepted friends
      const { data: friendsData } = await supabase
        .from('friends')
        .select(`
          a, b,
          profile_a:profiles!friends_a_fkey(id, username, avatar_color, elo_rating),
          profile_b:profiles!friends_b_fkey(id, username, avatar_color, elo_rating)
        `)
        .eq('status', 'accepted')
        .or(`a.eq.${user.id},b.eq.${user.id}`);

      if (!friendsData) {
        setFriends([]);
        setLoading(false);
        return;
      }

      // Get friend IDs
      const friendIds = friendsData.map((f: any) => 
        f.a === user.id ? f.b : f.a
      );

      // Get presence data
      const { data: presenceData } = await supabase
        .from('user_presence')
        .select('*')
        .in('profile_id', friendIds);

      const presenceMap = new Map(
        (presenceData || []).map(p => [p.profile_id, p])
      );

      // Build friend list with presence
      const enrichedFriends: FriendData[] = friendsData.map((f: any) => {
        const isFriendA = f.a !== user.id;
        const profile = isFriendA ? f.profile_a : f.profile_b;
        const presence = presenceMap.get(profile.id);
        
        const rawStatus = presence?.status || 'offline';
        const validStatus: 'online' | 'in_match' | 'offline' = 
          rawStatus === 'online' ? 'online' : 
          rawStatus === 'in_match' ? 'in_match' : 'offline';

        return {
          id: profile.id,
          username: profile.username,
          avatarColor: profile.avatar_color || 'indigo',
          status: validStatus,
          lastSeen: presence?.updated_at,
          matchId: presence?.match_id,
          elo: profile.elo_rating
        };
      });

      // Sort: online first, then in_match, then offline
      enrichedFriends.sort((a, b) => {
        const order: Record<string, number> = { online: 0, in_match: 1, offline: 2 };
        return order[a.status] - order[b.status];
      });

      setFriends(enrichedFriends);
    } catch (error) {
      console.error('Failed to fetch friends:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void fetchFriends();

    // Subscribe to presence changes
    const channel = supabase
      .channel('friends-presence')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_presence' },
        () => {
          void fetchFriends();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchFriends, user]);

  const handleChallenge = async (friend: FriendData) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('create-friend-challenge', {
        body: {
          friendId: friend.id,
          boardSize: 11,
          pieRule: true,
          turnTimer: 45
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success(`Challenge sent to ${friend.username}!`);
      navigate(`/lobby/${data.lobby_id}`);
    } catch (err: any) {
      toast.error('Failed to send challenge', {
        description: err.message
      });
    }
  };

  const handleSpectate = (matchId: string) => {
    navigate(`/match/${matchId}`);
    toast.info('Joining as spectator');
  };

  const getStatusIndicator = (status: FriendData['status']) => {
    switch (status) {
      case 'online':
        return <Circle className="h-2.5 w-2.5 fill-current text-emerald-600" />;
      case 'in_match':
        return <Circle className="h-2.5 w-2.5 fill-current text-ochre animate-pulse" />;
      default:
        return <Circle className="h-2.5 w-2.5 fill-muted-foreground text-muted-foreground" />;
    }
  };

  const getStatusText = (friend: FriendData) => {
    switch (friend.status) {
      case 'online':
        return 'Online';
      case 'in_match':
        return 'In match';
      default:
        return friend.lastSeen 
          ? `${formatDistanceToNow(new Date(friend.lastSeen), { addSuffix: true })}`
          : 'Offline';
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-8">
          <div className="animate-pulse text-muted-foreground">Loading friends...</div>
        </div>
      </Card>
    );
  }

  if (friends.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-muted-foreground mb-4">No friends yet</p>
        <Button variant="outline" onClick={() => navigate('/friends')} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Friends
        </Button>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {!compact && (
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo" />
            <h3 className="font-semibold">Friends</h3>
            <Badge variant="secondary">{friends.length}</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/friends')}>
            View All
          </Button>
        </div>
      )}
      
      <ScrollArea style={{ maxHeight }}>
        <div className="divide-y">
          {friends.map((friend) => (
            <div 
              key={friend.id}
              className="p-3 flex items-center justify-between hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <UserAvatar
                    username={friend.username}
                    color={friend.avatarColor}
                    size="sm"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5">
                    {getStatusIndicator(friend.status)}
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{friend.username}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {getStatusText(friend)}
                    {friend.elo && (
                      <>
                        <span>·</span>
                        <span className="font-mono">{friend.elo}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex gap-1">
                {friend.status === 'in_match' && friend.matchId && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleSpectate(friend.matchId!)}
                    className="h-8 px-2"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                {friend.status !== 'in_match' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleChallenge(friend)}
                    className="h-8 px-2"
                  >
                    <Swords className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
