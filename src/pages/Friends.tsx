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
import { UserPlus, UserCheck, UserX, Check, X, ArrowLeft } from 'lucide-react';

type FriendRow = {
  id: string;
  a: string;
  b: string;
  status: string;
  requested_at: string;
  profile_a: {
    username: string;
  };
  profile_b: {
    username: string;
  };
};

type Friend = {
  id: string;
  a: string;
  b: string;
  status: string;
  requested_at: string;
  profile: {
    username: string;
  };
};

type BlockedUser = {
  blocker: string;
  blocked: string;
  created_at: string;
  profile: {
    username: string;
  };
};

export default function Friends() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [searching, setSearching] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchFriends();
    
    const channel = supabase
      .channel('friends-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friends' }, () => {
        fetchFriends();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchFriends = async () => {
    if (!user) return;

    const { data: friendsData } = await supabase
      .from('friends')
      .select(`
        id,
        a,
        b,
        status,
        requested_at,
        profile_a:profiles!friends_a_fkey(username),
        profile_b:profiles!friends_b_fkey(username)
      `)
      .or(`a.eq.${user.id},b.eq.${user.id}`);

    const accepted = (friendsData as any)?.filter((f: any) => f.status === 'accepted').map((f: any) => ({
      id: f.id,
      a: f.a,
      b: f.b,
      status: f.status,
      requested_at: f.requested_at,
      profile: f.a === user.id ? f.profile_b : f.profile_a
    })) || [];

    const pending = (friendsData as any)?.filter((f: any) => f.status === 'pending' && f.b === user.id).map((f: any) => ({
      id: f.id,
      a: f.a,
      b: f.b,
      status: f.status,
      requested_at: f.requested_at,
      profile: f.profile_a
    })) || [];

    // Fetch blocked users
    const { data: blocksData } = await supabase
      .from('blocks')
      .select(`
        blocker,
        blocked,
        created_at,
        profile:profiles!blocks_blocked_fkey(username)
      `)
      .eq('blocker', user.id);

    const blocked = (blocksData as any)?.map((b: any) => ({
      blocker: b.blocker,
      blocked: b.blocked,
      created_at: b.created_at,
      profile: { username: b.profile?.username || 'Unknown' }
    })) || [];

    setFriends(accepted);
    setPendingRequests(pending);
    setBlockedUsers(blocked);
  };

  const sendFriendRequest = async () => {
    if (!user || !searchUsername.trim()) return;
    setSearching(true);

    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', searchUsername.trim())
        .limit(1);

      if (!profiles || profiles.length === 0) {
        toast.error('User not found');
        return;
      }

      const targetUser = profiles[0];
      if (targetUser.id === user.id) {
        toast.error('Cannot add yourself');
        return;
      }

      const { error } = await supabase
        .from('friends')
        .insert({
          a: user.id,
          b: targetUser.id,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Friend request sent!');
      setSearchUsername('');
    } catch (error: any) {
      toast.error('Failed to send request', { description: error.message });
    } finally {
      setSearching(false);
    }
  };

  const acceptRequest = async (friendId: string) => {
    try {
      await (supabase as any)
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', friendId);
      
      toast.success('Friend request accepted!');
      fetchFriends();
    } catch (error: any) {
      toast.error('Failed to accept', { description: error.message });
    }
  };

  const rejectRequest = async (friendId: string) => {
    try {
      await (supabase as any)
        .from('friends')
        .delete()
        .eq('id', friendId);
      
      toast.success('Friend request rejected');
      fetchFriends();
    } catch (error: any) {
      toast.error('Failed to reject', { description: error.message });
    }
  };

  const blockUser = async (friendId: string, blockedUserId: string) => {
    if (!user) return;

    try {
      await (supabase as any)
        .from('blocks')
        .insert({
          blocker: user.id,
          blocked: blockedUserId
        });

      await (supabase as any).from('friends').delete().eq('id', friendId);
      toast.success('User blocked');
      fetchFriends();
    } catch (error: any) {
      toast.error('Failed to block', { description: error.message });
    }
  };

  const unblockUser = async (blockedUserId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('blocks')
        .delete()
        .eq('blocker', user.id)
        .eq('blocked', blockedUserId);

      toast.success('User unblocked');
      fetchFriends();
    } catch (error: any) {
      toast.error('Failed to unblock', { description: error.message });
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate('/lobby')} className="mb-4 gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Lobby
          </Button>
          <h1 className="font-body text-4xl font-semibold text-foreground mb-2">Friends</h1>
          <p className="text-muted-foreground font-body">Manage your connections and game partners</p>
        </div>

        {/* Add Friend */}
        <Card className="p-6 mb-8 shadow-paper border-2">
          <div className="flex items-center gap-3 mb-4">
            <UserPlus className="h-5 w-5 text-indigo" />
            <h2 className="font-body text-xl font-semibold">Add Friend</h2>
          </div>
          <div className="flex gap-3">
            <Input
              placeholder="Enter username"
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendFriendRequest()}
            />
            <Button onClick={sendFriendRequest} disabled={searching || !searchUsername.trim()}>
              Send Request
            </Button>
          </div>
        </Card>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <Card className="p-6 mb-8 shadow-paper border-2">
            <div className="flex items-center gap-3 mb-4">
              <UserCheck className="h-5 w-5 text-ochre" />
              <h2 className="font-body text-xl font-semibold">Pending Requests</h2>
              <Badge variant="outline">{pendingRequests.length}</Badge>
            </div>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 bg-accent/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-indigo">
                      <AvatarFallback className="bg-indigo text-primary-foreground font-body">
                        {request.profile.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-body font-semibold">{request.profile.username}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {new Date(request.requested_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => acceptRequest(request.id)} className="gap-2">
                      <Check className="h-4 w-4" /> Accept
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => rejectRequest(request.id)} className="gap-2">
                      <X className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Friends List */}
        <Card className="p-6 mb-8 shadow-paper border-2">
          <div className="flex items-center gap-3 mb-4">
            <UserCheck className="h-5 w-5 text-indigo" />
            <h2 className="font-body text-xl font-semibold">Your Friends</h2>
            <Badge variant="outline">{friends.length}</Badge>
          </div>
          {friends.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No friends yet. Add some above!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {friends.map((friend) => {
                const friendUserId = friend.a === user?.id ? friend.b : friend.a;
                return (
                  <div key={friend.id} className="flex items-center justify-between p-4 bg-accent/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-indigo">
                        <AvatarFallback className="bg-indigo text-primary-foreground font-body">
                          {friend.profile.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <p className="font-body font-semibold">{friend.profile.username}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => blockUser(friend.id, friendUserId)}
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      <UserX className="h-4 w-4" /> Block
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Blocked Users */}
        {blockedUsers.length > 0 && (
          <Card className="p-6 shadow-paper border-2">
            <div className="flex items-center gap-3 mb-4">
              <UserX className="h-5 w-5 text-destructive" />
              <h2 className="font-body text-xl font-semibold">Blocked Users</h2>
              <Badge variant="outline">{blockedUsers.length}</Badge>
            </div>
            <div className="space-y-3">
              {blockedUsers.map((blocked) => (
                <div key={blocked.blocked} className="flex items-center justify-between p-4 bg-accent/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-destructive">
                      <AvatarFallback className="bg-destructive/20 text-destructive font-body">
                        {blocked.profile.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-body font-semibold">{blocked.profile.username}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        Blocked {new Date(blocked.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => unblockUser(blocked.blocked)}
                    className="gap-2"
                  >
                    <Check className="h-4 w-4" /> Unblock
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
