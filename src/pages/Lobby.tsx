import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useGuestMode } from '@/hooks/useGuestMode';
import { useGuestConversion } from '@/hooks/useGuestConversion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Sparkles, Users, LogOut, History as HistoryIcon, UserPlus, Copy, Check, Bell, User, Lock, Trophy, Crown, Play } from 'lucide-react';
import { SpectateButton } from '@/components/SpectateButton';
import { CreateLobby } from '@/components/CreateLobby';
import { JoinLobby } from '@/components/JoinLobby';
import { JoinGameCTA } from '@/components/JoinGameCTA';
import { LobbyCard } from '@/components/LobbyCard';
import { GuestModeBanner } from '@/components/GuestModeBanner';
import { GuestBadge } from '@/components/GuestBadge';
import { FeatureLockedModal } from '@/components/FeatureLockedModal';
import { ConvertAccountModal } from '@/components/ConvertAccountModal';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type Match = {
  id: string;
  size: number;
  pie_rule: boolean;
  status: string;
  created_at: string;
  owner: string;
  allow_spectators: boolean;
};

type LobbyWithDetails = {
  id: string;
  code: string;
  host_id: string;
  board_size: number;
  pie_rule: boolean;
  status: string;
  created_at: string;
  profiles?: { username: string } | null;
  player_count?: number;
};

export default function Lobby() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeMatches, setActiveMatches] = useState<Match[]>([]);
  const [lobbies, setLobbies] = useState<LobbyWithDetails[]>([]);
  const [creatingMatch, setCreatingMatch] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('medium');
  const [aiBoardSize, setAiBoardSize] = useState<number>(11);
  const [loadingLobbies, setLoadingLobbies] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [lockedFeatureModal, setLockedFeatureModal] = useState<string | null>(null);
  const { user, loading, signOut, signInAnonymously } = useAuth();
  const { isGuest, guestUsername, loading: guestLoading } = useGuestMode();
  const { showConversionModal, setShowConversionModal, matchesCompleted } = useGuestConversion();
  const navigate = useNavigate();
  const location = useLocation();

  // Auto sign-in guest users anonymously
  useEffect(() => {
    if (!loading && !user) {
      signInAnonymously();
    }
  }, [loading, user, signInAnonymously]);

  // Track user presence
  usePresence(user?.id);

  // Listen for notifications
  const { notifications, markAsRead } = useNotifications(user?.id);

  // Track if we've already handled the auto-create
  const [handledAutoCreate, setHandledAutoCreate] = useState(false);

  // Handle auto-create AI match from location state (e.g., Quick Play, Play Again)
  useEffect(() => {
    // Wait for user to be ready
    if (loading || !user) return;
    
    const state = location.state as { createAI?: boolean; difficulty?: string; boardSize?: number };
    
    // Only process once and only if we have the right state
    if (state?.createAI && state?.difficulty && !handledAutoCreate) {
      setHandledAutoCreate(true);
      
      const difficulty = state.difficulty as 'easy' | 'medium' | 'hard' | 'expert';
      const boardSize = state.boardSize || 11;
      
      // Clear the navigation state
      navigate(location.pathname, { replace: true, state: {} });
      
      // Create AI match immediately
      setAiDifficulty(difficulty);
      createAIMatch(difficulty, boardSize);
    }
  }, [loading, user, location.state, handledAutoCreate]);

  const createAIMatch = async (difficulty: 'easy' | 'medium' | 'hard' | 'expert', size: number = 11) => {
    if (!user) {
      toast.error('Please wait while we set up your guest session...');
      return;
    }
    
    setCreatingMatch(true);
    try {
      const { data: newMatch, error } = await supabase
        .from('matches')
        .insert({
          size,
          pie_rule: true,
          status: 'active',
          turn: 1,
          owner: user.id,
          ai_difficulty: difficulty,
          allow_spectators: false
        })
        .select()
        .single();

      if (error) throw error;

      // Add only the human player; AI is synthetic and handled server-side
      const { error: playersError } = await supabase.from('match_players').insert({
        match_id: newMatch.id,
        profile_id: user.id,
        color: 1,
        is_bot: false
      });

      if (playersError) {
        console.error('Error inserting match players:', playersError);
        throw new Error('Failed to add players to match');
      }

      toast.success(`AI match created! Difficulty: ${difficulty.toUpperCase()}`);
      navigate(`/match/${newMatch.id}`);
    } catch (error: any) {
      console.error('Error creating AI match:', error);
      toast.error(error.message || 'Failed to create AI match');
    } finally {
      setCreatingMatch(false);
    }
  };

  // Allow guest access - don't redirect to auth
  // useEffect(() => {
  //   if (!loading && !user) {
  //     navigate('/auth');
  //   }
  // }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;

    // Fetch waiting and active matches + lobbies
    fetchWaitingMatches();
    fetchActiveMatches();
    fetchWaitingLobbies();

    // Subscribe to match and lobby changes
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lobbies',
          filter: `status=eq.waiting`,
        },
        () => {
          fetchWaitingLobbies();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lobby_players',
        },
        () => {
          fetchWaitingLobbies(); // Refetch when players join/leave
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchWaitingMatches = async () => {
    setLoadingMatches(true);
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching matches:', error);
      toast.error('Failed to load matches');
    } else {
      setMatches(data || []);
    }
    setLoadingMatches(false);
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

  const fetchWaitingLobbies = async () => {
    setLoadingLobbies(true);
    const { data: lobbyData, error } = await supabase
      .from('lobbies')
      .select('id, code, host_id, board_size, pie_rule, status, created_at, profiles!lobbies_host_id_fkey(username)')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching lobbies:', error);
      toast.error('Failed to load lobbies');
      setLoadingLobbies(false);
      return;
    }

    // Get player counts for each lobby
    const lobbiesWithCounts = await Promise.all(
      (lobbyData || []).map(async (lobby) => {
        const { count } = await supabase
          .from('lobby_players')
          .select('*', { count: 'exact', head: true })
          .eq('lobby_id', lobby.id);

        return {
          ...lobby,
          player_count: count || 0
        } as LobbyWithDetails;
      })
    );

    setLobbies(lobbiesWithCounts);
    setLoadingLobbies(false);
  };

  const createMatch = async (size: number, withAI: boolean = false, aiDifficulty?: 'easy' | 'medium' | 'hard' | 'expert') => {
    // Guests can only play AI matches
    if (!user && !withAI) {
      toast.error('Sign in required', {
        description: 'Guest users can only play against AI. Sign in to challenge friends!'
      });
      navigate('/auth');
      return;
    }
    
    // Use dedicated AI match creation function
    if (withAI) {
      await createAIMatch(aiDifficulty || 'medium', size);
      return;
    }
    
    setCreatingMatch(true);

    try {
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .insert({
          owner: user?.id || null,
          size,
          pie_rule: true,
          status: 'waiting',
          ai_difficulty: null,
        })
        .select()
        .single();

      if (matchError) throw matchError;

      // Add player record
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

      // For friend matches, stay on lobby and show the code
      const code = await getMatchCode(match.id);
      await copyMatchCode(match.id);
      toast.success('Match created!', {
        description: `Share code ${code} with your friend. Code copied to clipboard!`,
        duration: 6000,
      });
      // Refresh matches list to show the new match
      fetchWaitingMatches();
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
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <button 
            onClick={() => navigate('/')}
            className="font-display text-xl font-bold tracking-tight hover:text-primary transition-colors"
          >
            Hexology
          </button>
          
          <div className="flex items-center gap-2">
            {isGuest && !guestLoading && (
              <GuestBadge username={guestUsername} />
            )}
            {user && (
              <>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-9 w-9">
                      <Bell className="h-4 w-4" />
                      {notifications.length > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-ochre text-[10px] font-bold flex items-center justify-center text-white">
                          {notifications.length}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm">Challenges</h3>
                      {notifications.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No pending challenges</p>
                      ) : (
                        notifications.map((notif) => (
                          <Card key={notif.id} className="p-3">
                            <div className="flex flex-col gap-2">
                              <p className="text-sm">
                                <span className="font-semibold">{notif.payload.sender_name}</span> challenged you
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      const payload = notif.payload as any;
                                      if (payload.lobby_code) {
                                        const { data, error } = await supabase.functions.invoke('join-lobby', {
                                          body: { code: payload.lobby_code }
                                        });
                                        if (error) throw error;
                                        if (data.error) throw new Error(data.error);
                                        await markAsRead(notif.id);
                                        toast.success('Joined!');
                                        navigate(`/lobby/${data.lobby.id}`);
                                      } else if (notif.payload.match_id) {
                                        await markAsRead(notif.id);
                                        navigate(`/match/${notif.payload.match_id}`);
                                      }
                                    } catch (err: any) {
                                      toast.error(err.message);
                                    }
                                  }}
                                >
                                  Accept
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => markAsRead(notif.id)}>
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
                
                <div className="flex items-center border-l border-border/50 ml-2 pl-2">
                  <TooltipProvider>
                    {[
                      { icon: User, path: '/profile', label: 'Profile' },
                      { icon: UserPlus, path: '/friends', label: 'Friends' },
                      { icon: HistoryIcon, path: '/history', label: 'History' },
                      { icon: Trophy, path: '/leaderboard', label: 'Leaderboard' },
                    ].map(({ icon: Icon, path, label }) => (
                      <Tooltip key={path}>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => navigate(path)} className="h-9 w-9">
                            <Icon className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{label}</TooltipContent>
                      </Tooltip>
                    ))}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => navigate('/premium')}
                          className="h-9 w-9 text-amber-500"
                        >
                          <Crown className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Hexology+</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button variant="ghost" size="icon" onClick={handleSignOut} className="h-9 w-9 text-muted-foreground hover:text-destructive">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
            {!user && (
              <Button onClick={() => navigate('/auth')} size="sm">Sign In</Button>
            )}
          </div>
        </div>
      </div>

      <div className="pt-20 pb-12 px-4 max-w-5xl mx-auto">
        {/* Guest Mode Banner */}
        {isGuest && !guestLoading && (
          <div className="mb-6">
            <GuestModeBanner guestUsername={guestUsername} />
          </div>
        )}

        {/* Recovery CTA */}
        {user && <JoinGameCTA userId={user.id} />}

        {/* Quick Play Hero - Main Focus */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Play Hexology</h1>
          <p className="text-muted-foreground mb-8">Choose your challenge</p>
          
          {/* Quick AI Play - Primary Action */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { size: 7, label: '7×7', desc: 'Quick' },
              { size: 9, label: '9×9', desc: 'Standard' },
              { size: 11, label: '11×11', desc: 'Classic' },
              { size: 13, label: '13×13', desc: 'Extended' },
            ].map(({ size, label, desc }) => (
              <button
                key={size}
                onClick={() => createAIMatch(aiDifficulty, size)}
                disabled={creatingMatch}
                className="group relative h-24 sm:h-28 rounded-xl bg-gradient-to-br from-ochre/10 to-ochre/5 border-2 border-ochre/20 hover:border-ochre/50 hover:from-ochre/20 hover:to-ochre/10 transition-all duration-200 disabled:opacity-50"
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-ochre group-hover:scale-110 transition-transform">
                    {label}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">{desc}</span>
                </div>
              </button>
            ))}
          </div>
          
          {/* Difficulty Selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-muted-foreground">AI Difficulty:</span>
            <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
              {(['easy', 'medium', 'hard', 'expert'] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => setAiDifficulty(diff)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                    aiDifficulty === diff 
                      ? 'bg-background shadow-sm font-medium' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {diff.charAt(0).toUpperCase() + diff.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Multiplayer Section */}
        {user && !isGuest && (
          <div className="grid md:grid-cols-2 gap-4 mb-10">
            <CreateLobby userId={user.id} />
            <JoinLobby userId={user.id} />
          </div>
        )}
        
        {/* Locked for Guests */}
        {isGuest && !guestLoading && (
          <Card className="p-6 mb-10 border-dashed">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Multiplayer Locked</h3>
                <p className="text-sm text-muted-foreground">Create a free account to play with friends</p>
              </div>
              <Button onClick={() => navigate('/auth')} variant="outline">
                Sign Up
              </Button>
            </div>
          </Card>
        )}

        {/* Open Lobbies */}
        {user && !isGuest && lobbies.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Open Lobbies</h2>
              <Badge variant="outline" className="font-mono">{lobbies.length} open</Badge>
            </div>
            <div className="grid gap-3">
              {lobbies.map((lobby) => (
                <LobbyCard
                  key={lobby.id}
                  lobby={lobby}
                  playerCount={lobby.player_count || 0}
                  currentUserId={user.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* Live Matches */}
        {activeMatches.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Live Matches</h2>
              <Badge variant="outline" className="font-mono">{activeMatches.length} live</Badge>
            </div>
            <div className="grid gap-2">
              {activeMatches.map((match) => {
                const elapsed = Math.floor((Date.now() - new Date(match.created_at).getTime()) / 60000);
                return (
                  <Card key={match.id} className="p-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-indigo/10 flex items-center justify-center">
                        <Play className="h-3.5 w-3.5 text-indigo" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium">{match.size}×{match.size}</span>
                          <span className="text-xs text-muted-foreground">
                            {elapsed < 1 ? 'Just started' : `${elapsed}m`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <SpectateButton matchId={match.id} />
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Open Matches */}
        {user && !isGuest && matches.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Open Matches</h2>
              <Badge variant="outline" className="font-mono">{matches.length} open</Badge>
            </div>
            <div className="grid gap-2">
              {matches.map((match) => (
                <Card key={match.id} className="p-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">{match.size}×{match.size}</span>
                        {match.pie_rule && <Badge variant="secondary" className="text-xs">Pie</Badge>}
                      </div>
                    </div>
                  </div>
                  {match.owner === user?.id ? (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => copyMatchCode(match.id)}>
                        {copiedCode === match.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <Button size="sm" onClick={() => navigate(`/match/${match.id}`)}>Enter</Button>
                    </div>
                  ) : (
                    <Button size="sm" onClick={() => joinMatch(match.id)}>Join</Button>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Feature Locked Modal */}
      <FeatureLockedModal 
        open={!!lockedFeatureModal}
        onOpenChange={(open) => !open && setLockedFeatureModal(null)}
        featureName={lockedFeatureModal || ''}
      />
      
      {/* Guest Account Conversion Modal */}
      {user && isGuest && (
        <ConvertAccountModal 
          open={showConversionModal}
          onOpenChange={setShowConversionModal}
          guestId={user.id}
          matchesCompleted={matchesCompleted}
          onConversionComplete={() => {
            toast.success('Welcome to Hexology!');
          }}
        />
      )}
    </div>
  );
}
