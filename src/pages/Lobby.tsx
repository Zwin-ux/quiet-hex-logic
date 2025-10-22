import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Sparkles, Users, LogOut, History as HistoryIcon, UserPlus, Copy, Check, Bell, User } from 'lucide-react';
import { SpectateButton } from '@/components/SpectateButton';
import { CreateLobby } from '@/components/CreateLobby';
import { JoinLobby } from '@/components/JoinLobby';
import { usePresence } from '@/hooks/usePresence';
import { useNotifications } from '@/hooks/useNotifications';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Match = {
  id: string;
  size: number;
  pie_rule: boolean;
  status: string;
  created_at: string;
  owner: string;
  allow_spectators: boolean;
};

export default function Lobby() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeMatches, setActiveMatches] = useState<Match[]>([]);
  const [creatingMatch, setCreatingMatch] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('medium');
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  // Track user presence
  usePresence(user?.id);

  // Listen for notifications
  const { notifications, markAsRead } = useNotifications(user?.id);

  // Allow guest access - don't redirect to auth
  // useEffect(() => {
  //   if (!loading && !user) {
  //     navigate('/auth');
  //   }
  // }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;

    // Fetch waiting and active matches
    fetchWaitingMatches();
    fetchActiveMatches();

    // Subscribe to match changes
    const channel = supabase
      .channel('lobby')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `status=eq.waiting`,
        },
        () => {
          fetchWaitingMatches();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `status=eq.active`,
        },
        () => {
          fetchActiveMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchWaitingMatches = async () => {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })
      .limit(20); // Limit to prevent performance issues

    if (error) {
      console.error('Error fetching matches:', error);
    } else {
      setMatches(data || []);
    }
  };

  const fetchActiveMatches = async () => {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'active')
      .eq('allow_spectators', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching active matches:', error);
    } else {
      setActiveMatches(data || []);
    }
  };

  const createMatch = async (size: number, withAI: boolean = false, aiDifficulty?: 'easy' | 'medium' | 'hard' | 'expert') => {
    // AI practice requires authentication
    if (withAI && !user) {
      toast.error('Sign in required', {
        description: 'Please sign in to play against AI'
      });
      navigate('/auth');
      return;
    }
    
    setCreatingMatch(true);

    try {
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .insert({
          owner: user?.id || null, // Allow guest matches
          size,
          pie_rule: true, // Enable pie rule for all matches
          status: withAI ? 'active' : 'waiting',
          ai_difficulty: withAI ? (aiDifficulty || 'medium') : null,
        })
        .select()
        .single();

      if (matchError) throw matchError;

      // Only add player record if user is authenticated
      if (user) {
        const { error: playerError } = await supabase
          .from('match_players')
          .insert({
            match_id: match.id,
            profile_id: user.id,
            color: 1, // indigo
          });

        if (playerError) throw playerError;
      }

      // For AI matches, go directly to the match
      if (withAI) {
        toast.success('AI match created!', {
          description: 'The AI will play as Ochre'
        });
        navigate(`/match/${match.id}`);
      } else {
        // For friend matches, stay on lobby and show the code
        const code = await getMatchCode(match.id);
        await copyMatchCode(match.id);
        toast.success('Match created!', {
          description: `Share code ${code} with your friend. Code copied to clipboard!`,
          duration: 6000,
        });
        // Refresh matches list to show the new match
        fetchWaitingMatches();
      }
    } catch (error: any) {
      toast.error('Failed to create match', {
        description: error.message
      });
    } finally {
      setCreatingMatch(false);
    }
  };

  const joinMatch = async (matchId: string) => {
    if (!user) return;

    try {
      // Use secure join-match edge function for atomic operation
      const { data, error } = await supabase.functions.invoke('join-match', {
        body: { matchId }
      });

      if (error) throw error;

      if (data?.error) {
        toast.error('Failed to join', { description: data.error });
        return;
      }

      toast.success('Joined match!');
      navigate(`/match/${matchId}`);
    } catch (error: any) {
      console.error('Join error:', error);
      toast.error('Failed to join', {
        description: error.message
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getMatchCode = async (matchId: string) => {
    const { data } = await supabase.rpc('generate_match_code', { match_uuid: matchId });
    return data as string;
  };

  const copyMatchCode = async (matchId: string) => {
    const code = await getMatchCode(matchId);
    if (code) {
      navigator.clipboard.writeText(code);
      setCopiedCode(matchId);
      toast.success('Match code copied!', { description: `Share ${code} with your friend` });
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <p className="text-ink/60">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Guest Mode Banner */}
        {!user && (
          <Card className="mb-6 p-4 bg-ochre/10 border-ochre/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-ochre" />
                <div>
                  <p className="font-body font-semibold text-foreground">Playing as Guest</p>
                  <p className="text-sm text-muted-foreground">
                    Sign in to save progress and challenge friends
                  </p>
                </div>
              </div>
              <Button onClick={() => navigate('/auth')} variant="default">
                Sign In
              </Button>
            </div>
          </Card>
        )}

        {/* Header */}
        <div className="flex justify-between items-start mb-12">
          <div>
            <h1 className="font-body text-4xl md:text-5xl font-semibold text-foreground mb-3">
              The Lobby
            </h1>
            <p className="text-muted-foreground text-lg font-body">
              Start a game
            </p>
          </div>
          <div className="flex gap-2">
            {user && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 relative">
                    <Bell className="h-4 w-4" />
                    {notifications.length > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-ochre">
                        {notifications.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <h3 className="font-semibold">Challenges</h3>
                  {notifications.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No pending challenges</p>
                  ) : (
                    notifications.map((notif) => (
                      <Card key={notif.id} className="p-3">
                        <div className="flex flex-col gap-2">
                          <p className="text-sm">
                            <span className="font-semibold">{notif.payload.sender_name}</span> challenged you to {notif.payload.board_size}×{notif.payload.board_size}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={async () => {
                                if (notif.payload.match_id) {
                                  await markAsRead(notif.id);
                                  navigate(`/match/${notif.payload.match_id}`);
                                }
                              }}
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markAsRead(notif.id)}
                            >
                              Decline
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
            )}

            {user && (
              <>
                <Button variant="outline" onClick={() => navigate('/profile')} className="gap-2">
                  <User className="h-4 w-4" />
                  Profile
                </Button>
                <Button variant="outline" onClick={() => navigate('/friends')} className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Friends
                </Button>
                <Button variant="outline" onClick={() => navigate('/history')} className="gap-2">
                  <HistoryIcon className="h-4 w-4" />
                  History
                </Button>
                <Button variant="outline" onClick={handleSignOut} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </>
            )}
            
            {!user && (
              <Button onClick={() => navigate('/auth')} className="gap-2">
                Sign In
              </Button>
            )}
          </div>
        </div>

        {/* Lobby Creation Section - UX: Horizontal layout for symmetry, clear flow */}
        {user && (
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <CreateLobby userId={user.id} />
            <JoinLobby userId={user.id} />
          </div>
        )}

        {/* AI Practice Section - UX: Separated for clarity, full-width for prominence */}
        <Card className="p-6 shadow-soft border-2 border-border hover:border-ochre/20 transition-all duration-300 mb-12">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="h-5 w-5 text-ochre" />
            <h2 className="font-body text-xl font-semibold text-foreground">
              AI Practice
            </h2>
          </div>
          <p className="text-muted-foreground mb-4 font-body text-sm leading-relaxed">
            Train against AI opponents with adjustable difficulty
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="sm:w-64">
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground">
                Difficulty Level
              </label>
              <Select value={aiDifficulty} onValueChange={(value: any) => setAiDifficulty(value)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy - Beginner</SelectItem>
                  <SelectItem value="medium">Medium - Intermediate</SelectItem>
                  <SelectItem value="hard">Hard - Advanced</SelectItem>
                  <SelectItem value="expert">Expert - Master</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground">
                Board Size
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[7, 9, 11, 13].map((size) => (
                  <Button
                    key={size}
                    onClick={() => createMatch(size, true, aiDifficulty)}
                    disabled={creatingMatch}
                    className="font-mono h-9 font-medium"
                    variant="secondary"
                  >
                    {size}×{size}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Live Matches Section - UX: Enhanced info (board size, players, time), clear CTA */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-body text-xl font-semibold text-foreground">
              Live Matches
            </h2>
            <Badge variant="outline" className="font-mono text-xs">
              {activeMatches.length} ongoing
            </Badge>
          </div>
          {activeMatches.length === 0 ? (
            <Card className="p-8 text-center shadow-soft border-2 border-dashed">
              <div className="text-4xl mb-3 opacity-20">⬡</div>
              <p className="text-sm text-muted-foreground font-body">
                No live matches yet — start one above
              </p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {activeMatches.map((match) => {
                const elapsed = Math.floor((Date.now() - new Date(match.created_at).getTime()) / 60000);
                return (
                  <Card
                    key={match.id}
                    className="p-4 flex items-center justify-between shadow-soft hover:shadow-medium transition-all duration-300 border hover:border-ochre/40"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-3xl text-muted-foreground/30">⬡</div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="font-mono bg-ochre text-primary-foreground text-xs px-2 py-0.5">
                            {match.size}×{match.size}
                          </Badge>
                          <span className="text-sm font-medium text-muted-foreground">
                            <span className="text-indigo font-semibold">Indigo</span> vs <span className="text-ochre font-semibold">Ochre</span>
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">
                          {elapsed < 1 ? 'Just started' : `${elapsed} min elapsed`}
                        </p>
                      </div>
                    </div>
                    <SpectateButton matchId={match.id} />
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Open Matches Section - UX: Clear empty state */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-body text-xl font-semibold text-foreground">
              Open Matches
            </h2>
            <Badge variant="outline" className="font-mono text-xs">
              {matches.length} waiting
            </Badge>
          </div>
          
          {matches.length === 0 ? (
            <Card className="p-8 text-center shadow-soft border-2 border-dashed">
              <div className="text-4xl mb-3 opacity-20">⬡</div>
              <p className="text-sm text-muted-foreground font-body">
                No open matches yet — create one above
              </p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {matches.map((match) => (
                <Card
                  key={match.id}
                  className="p-6 flex items-center justify-between shadow-soft hover:shadow-medium transition-all duration-300 border-2 hover:border-indigo/30"
                >
                  <div className="flex items-center gap-6">
                    <div className="text-4xl text-muted-foreground/30">⬡</div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className="font-mono bg-indigo text-primary-foreground">
                          {match.size}×{match.size}
                        </Badge>
                        {match.pie_rule && (
                          <Badge variant="outline" className="font-mono text-xs">
                            Pie Rule
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground font-mono">
                        Created {new Date(match.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {match.owner === user?.id ? (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => copyMatchCode(match.id)}
                          className="gap-2"
                        >
                          {copiedCode === match.id ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                          {copiedCode === match.id ? 'Copied!' : 'Copy Code'}
                        </Button>
                        <Button onClick={() => navigate(`/match/${match.id}`)}>
                          Enter Match
                        </Button>
                      </div>
                    ) : (
                      <Button onClick={() => joinMatch(match.id)}>
                        Join Match
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
