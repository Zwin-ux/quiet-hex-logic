import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { UserPlus, UserCheck, UserX, Check, X, Swords, AlertCircle, Eye } from 'lucide-react';
import { NavBar } from '@/components/NavBar';
import { usePresence } from '@/hooks/usePresence';

type FriendRow = {
  a: string;
  b: string;
  status: string;
  requested_at: string;
  profile_a: { username: string; };
  profile_b: { username: string; };
};

type Friend = {
  a: string;
  b: string;
  status: string;
  requested_at: string;
  profile: { username: string; };
  presenceStatus?: 'offline' | 'online' | 'in_match';
  matchId?: string;
  stats?: { wins: number; total_games: number; };
};

type BlockedUser = {
  blocker: string;
  blocked: string;
  created_at: string;
  profile: { username: string; };
};

export default function Friends() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [searching, setSearching] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  usePresence(user?.id);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchFriends();
    
    const friendsChannel = supabase
      .channel('friends-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friends' }, fetchFriends)
      .subscribe();

    const presenceChannel = supabase
      .channel('presence-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_presence' }, fetchFriends)
      .subscribe();

    return () => { 
      supabase.removeChannel(friendsChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [user]);

  const fetchFriends = async () => {
    if (!user) return;

    const { data: friendsData } = await supabase
      .from('friends')
      .select(`a, b, status, requested_at, profile_a:profiles!friends_a_fkey(username), profile_b:profiles!friends_b_fkey(username)`)
      .or(`a.eq.${user.id},b.eq.${user.id}`);

    const friendIds = (friendsData as any)?.filter((f: any) => f.status === 'accepted').map((f: any) => f.a === user.id ? f.b : f.a) || [];

    const { data: presenceData } = await supabase.from('user_presence').select('*').in('profile_id', friendIds);
    const presenceMap = new Map((presenceData || []).map(p => [p.profile_id, { status: p.status, matchId: p.match_id }]));

    const { data: statsData } = await supabase.from('user_stats').select('profile_id, wins, total_games').in('profile_id', friendIds);
    const statsMap = new Map((statsData || []).map(s => [s.profile_id, { wins: s.wins, total_games: s.total_games }]));

    const accepted = (friendsData as any)?.filter((f: any) => f.status === 'accepted').map((f: any) => {
      const friendId = f.a === user.id ? f.b : f.a;
      const presence = presenceMap.get(friendId);
      const stats = statsMap.get(friendId);
      return {
        a: f.a, b: f.b, status: f.status, requested_at: f.requested_at,
        profile: f.a === user.id ? f.profile_b : f.profile_a,
        presenceStatus: presence?.status || 'offline', matchId: presence?.matchId, stats
      };
    }) || [];

    const pending = (friendsData as any)?.filter((f: any) => f.status === 'pending' && f.b === user.id).map((f: any) => ({
      a: f.a, b: f.b, status: f.status, requested_at: f.requested_at, profile: f.profile_a
    })) || [];

    const { data: blocksData } = await supabase.from('blocks').select(`blocker, blocked, created_at, profile:profiles!blocks_blocked_fkey(username)`).eq('blocker', user.id);
    const blocked = (blocksData as any)?.map((b: any) => ({ blocker: b.blocker, blocked: b.blocked, created_at: b.created_at, profile: { username: b.profile?.username || 'Unknown' }})) || [];

    setFriends(accepted);
    setPendingRequests(pending);
    setBlockedUsers(blocked);
  };

  const sendChallenge = async (friendId: string, friendUsername: string) => {
    if (!user) return;

    try {
      // Create lobby using new friend challenge endpoint
      const { data, error } = await supabase.functions.invoke('create-friend-challenge', {
        body: {
          friendId,
          boardSize: 11,
          pieRule: true,
          turnTimer: 45
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success(`Challenge sent to ${friendUsername}!`, {
        description: 'Navigating to lobby...'
      });

      // Navigate challenger to the lobby immediately
      navigate(`/lobby/${data.lobby_id}`);
    } catch (err: any) {
      console.error('[Friends] Error sending challenge:', err);
      toast.error('Failed to send challenge', {
        description: err.message
      });
    }
  };

  const sendFriendRequest = async () => {
    if (!user || !searchUsername.trim()) return;
    setSearching(true);
    try {
      const { data: profiles } = await supabase.from('profiles').select('id, username').ilike('username', searchUsername.trim()).limit(1);
      if (!profiles || profiles.length === 0) { toast.error('User not found'); return; }
      const targetUser = profiles[0];
      if (targetUser.id === user.id) { toast.error('Cannot add yourself'); return; }
      const { error } = await supabase.from('friends').insert({ a: user.id, b: targetUser.id, status: 'pending' });
      if (error) throw error;
      toast.success('Friend request sent!');
      setSearchUsername('');
    } catch (error: any) {
      toast.error('Failed to send request', { description: error.message });
    } finally {
      setSearching(false);
    }
  };

  const acceptRequest = async (requesterUserId: string) => {
    if (!user) return;
    try {
      await supabase.from('friends').update({ status: 'accepted' }).eq('a', requesterUserId).eq('b', user.id);
      toast.success('Friend request accepted!');
      fetchFriends();
    } catch (error: any) {
      toast.error('Failed to accept', { description: error.message });
    }
  };

  const rejectRequest = async (requesterUserId: string) => {
    if (!user) return;
    try {
      await supabase.from('friends').delete().eq('a', requesterUserId).eq('b', user.id);
      toast.success('Friend request rejected');
      fetchFriends();
    } catch (error: any) {
      toast.error('Failed to reject', { description: error.message });
    }
  };

  const blockUser = async (userIdA: string, userIdB: string, blockedUserId: string) => {
    if (!user) return;
    try {
      await supabase.from('blocks').insert({ blocker: user.id, blocked: blockedUserId });
      await supabase.from('friends').delete().eq('a', userIdA).eq('b', userIdB);
      toast.success('User blocked');
      fetchFriends();
    } catch (error: any) {
      toast.error('Failed to block', { description: error.message });
    }
  };

  const unblockUser = async (blockedUserId: string) => {
    if (!user) return;
    try {
      await supabase.from('blocks').delete().eq('blocker', user.id).eq('blocked', blockedUserId);
      toast.success('User unblocked');
      fetchFriends();
    } catch (error: any) {
      toast.error('Failed to unblock', { description: error.message });
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-gentle-pulse text-4xl">⬡</div></div>;

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="p-4 md:p-8 pt-14">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="font-body text-5xl font-bold mb-3 animate-in fade-in slide-in-from-bottom-4 duration-700">Friends</h1>
          <p className="text-muted-foreground font-body text-lg">Connect, challenge, compete</p>
        </div>

        {/* Add Friend Card */}
        <Card className="p-8 mb-8 shadow-lg border-2 hover:shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-indigo/10">
              <UserPlus className="h-6 w-6 text-indigo" />
            </div>
            <h2 className="font-body text-2xl font-semibold">Add Friend</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Enter username..."
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendFriendRequest()}
              className="text-lg"
            />
            <Button onClick={sendFriendRequest} disabled={searching || !searchUsername.trim()} size="lg" className="sm:min-w-[140px]">
              {searching ? 'Searching...' : 'Send Request'}
            </Button>
          </div>
        </Card>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <Card className="p-8 mb-8 shadow-lg border-2 border-ochre/30 bg-ochre/5 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-ochre/20">
                <AlertCircle className="h-6 w-6 text-ochre" />
              </div>
              <h2 className="font-body text-2xl font-semibold">Pending Requests</h2>
              <Badge className="bg-ochre text-primary-foreground text-base px-3 py-1">{pendingRequests.length}</Badge>
            </div>
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={`${request.a}-${request.b}`} className="flex items-center justify-between p-5 bg-background rounded-xl border-2 hover:border-ochre/50 transition-all group">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border-2 border-indigo ring-2 ring-indigo/20 group-hover:scale-110 transition-transform">
                      <AvatarFallback className="bg-indigo text-primary-foreground font-body text-lg">
                        {request.profile.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-body font-semibold text-lg">{request.profile.username}</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {new Date(request.requested_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => acceptRequest(request.a)} className="gap-2 hover:scale-105 transition-transform">
                      <Check className="h-4 w-4" /> Accept
                    </Button>
                    <Button variant="outline" onClick={() => rejectRequest(request.a)} className="gap-2">
                      <X className="h-4 w-4" /> Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Friends List */}
        <Card className="p-8 mb-8 shadow-lg border-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-indigo/10">
              <UserCheck className="h-6 w-6 text-indigo" />
            </div>
            <h2 className="font-body text-2xl font-semibold">Your Friends</h2>
            <Badge variant="outline" className="text-base px-3 py-1">{friends.length}</Badge>
          </div>
          {friends.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <UserPlus className="h-16 w-16 mx-auto mb-6 opacity-20 animate-gentle-pulse" />
              <p className="text-lg font-body mb-2">No friends yet</p>
              <p className="text-sm">Add someone above to start playing together!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {friends.map((friend, idx) => {
                const friendUserId = friend.a === user?.id ? friend.b : friend.a;
                return (
                  <div 
                    key={`${friend.a}-${friend.b}`} 
                    className="flex items-center justify-between p-5 bg-accent/30 rounded-xl border-2 hover:border-indigo/50 transition-all group hover:shadow-md animate-in fade-in slide-in-from-left-4 duration-500"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative group-hover:scale-110 transition-transform">
                        <Avatar className="h-14 w-14 border-2 border-indigo ring-2 ring-indigo/20">
                          <AvatarFallback className="bg-indigo text-primary-foreground font-body text-xl">
                            {friend.profile.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-background transition-all ${
                            friend.presenceStatus === 'online' ? 'bg-emerald-500 animate-pulse' :
                            friend.presenceStatus === 'in_match' ? 'bg-ochre animate-pulse' : 'bg-muted'
                          }`}
                        />
                      </div>
                      <div>
                        <p className="font-body font-semibold text-lg">{friend.profile.username}</p>
                        <div className="flex items-center gap-2 text-sm">
                          <span className={`font-medium ${
                            friend.presenceStatus === 'online' ? 'text-emerald-500' :
                            friend.presenceStatus === 'in_match' ? 'text-ochre' : 'text-muted-foreground'
                          }`}>
                            {friend.presenceStatus === 'in_match' && '🎮 In match'}
                            {friend.presenceStatus === 'online' && '● Online'}
                            {friend.presenceStatus === 'offline' && '○ Offline'}
                          </span>
                          {friend.stats && friend.stats.total_games > 0 && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <Badge variant="outline" className="font-mono text-xs">
                                {friend.stats.wins}W-{friend.stats.total_games - friend.stats.wins}L
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {friend.presenceStatus === 'in_match' && friend.matchId ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/match/${friend.matchId}`)}
                          className="gap-2 hover:scale-105 transition-transform"
                        >
                          <Eye className="h-4 w-4" /> Watch
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => sendChallenge(friendUserId, friend.profile.username)}
                          className="gap-2 hover:scale-105 transition-transform"
                        >
                          <Swords className="h-4 w-4" /> Challenge
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => blockUser(friend.a, friend.b, friendUserId)}
                        className="gap-2 text-muted-foreground hover:text-destructive"
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Blocked Users */}
        {blockedUsers.length > 0 && (
          <Card className="p-8 shadow-lg border-2 border-destructive/20 animate-in fade-in duration-500">
            <div className="flex items-center gap-3 mb-6">
              <UserX className="h-6 w-6 text-destructive" />
              <h2 className="font-body text-2xl font-semibold">Blocked Users</h2>
              <Badge variant="destructive">{blockedUsers.length}</Badge>
            </div>
            <div className="space-y-3">
              {blockedUsers.map((blocked) => (
                <div key={blocked.blocked} className="flex items-center justify-between p-4 bg-destructive/5 rounded-lg border">
                  <p className="font-mono">{blocked.profile.username}</p>
                  <Button size="sm" variant="outline" onClick={() => unblockUser(blocked.blocked)}>
                    Unblock
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
      </div>
    </div>
  );
}
