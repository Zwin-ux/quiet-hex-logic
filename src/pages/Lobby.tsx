import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useGuestMode } from '@/hooks/useGuestMode';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Sparkles, Users, LogOut, History as HistoryIcon, UserPlus, Copy, Check, Bell, User, Lock } from 'lucide-react';
import { SpectateButton } from '@/components/SpectateButton';
import { CreateLobby } from '@/components/CreateLobby';
import { JoinLobby } from '@/components/JoinLobby';
import { JoinGameCTA } from '@/components/JoinGameCTA';
import { LobbyCard } from '@/components/LobbyCard';
import { GuestModeBanner } from '@/components/GuestModeBanner';
import { GuestBadge } from '@/components/GuestBadge';
import { FeatureLockedModal } from '@/components/FeatureLockedModal';
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

  // Handle auto-create AI match from location state (e.g., Play Again)
  useEffect(() => {
    if (!user) return;
    const state = location.state as any;
    if (state?.createAI && state?.difficulty) {
      const difficulty = state.difficulty;
      const boardSize = state.boardSize || 11;
      
      // Clear the state to prevent re-triggering
      navigate(location.pathname, { replace: true, state: {} });
      
      // Create AI match automatically
      setAiDifficulty(difficulty);
      setTimeout(() => {
        createAIMatch(difficulty, boardSize);
      }, 100);
    }
  }, [user, location.state]);

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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent/10">
      {/* Decorative floating hexagons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-5">
        <div className="absolute top-20 left-10 text-6xl animate-float" style={{ animationDelay: '0s' }}>⬡</div>
        <div className="absolute top-40 right-20 text-5xl animate-float" style={{ animationDelay: '2s' }}>⬡</div>
        <div className="absolute bottom-32 left-1/4 text-7xl animate-float" style={{ animationDelay: '4s' }}>⬡</div>
        <div className="absolute bottom-20 right-1/3 text-4xl animate-float" style={{ animationDelay: '1s' }}>⬡</div>
      </div>

      <div className="relative max-w-7xl mx-auto p-4 md:p-8">
        {/* Floating Navigation Bar */}
        <div className="fixed top-4 right-4 z-50 flex flex-col sm:flex-row gap-2">
          {isGuest && !guestLoading && (
            <GuestBadge username={guestUsername} />
          )}
          {user && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="relative shadow-lg hover:shadow-xl transition-all hover:scale-105 bg-card/95 backdrop-blur h-11 w-11"
                  >
                    <Bell className="h-5 w-5" />
                    {notifications.length > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-ochre animate-gentle-pulse">
                        {notifications.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-card/95 backdrop-blur shadow-xl border-2" align="end">
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
                                  try {
                                    const payload = notif.payload as any;
                                    if (payload.lobby_code) {
                                      const { data, error } = await supabase.functions.invoke('join-lobby', {
                                        body: { code: payload.lobby_code }
                                      });
                                      if (error) throw error;
                                      if (data.error) throw new Error(data.error);
                                      await markAsRead(notif.id);
                                      toast.success('Joined challenge lobby!');
                                      navigate(`/lobby/${data.lobby.id}`);
                                    } else if (notif.payload.match_id) {
                                      await markAsRead(notif.id);
                                      navigate(`/match/${notif.payload.match_id}`);
                                    }
                                  } catch (err: any) {
                                    toast.error('Failed to accept challenge', { description: err.message });
                                  }
                                }}
                              >
                                Accept
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => markAsRead(notif.id)}>
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
              
              <div className="flex gap-1 bg-card/95 backdrop-blur rounded-lg shadow-lg p-1">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate('/profile')}
                  className="hover:bg-accent transition-all h-9 w-9"
                >
                  <User className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate('/friends')}
                  className="hover:bg-accent transition-all h-9 w-9"
                >
                  <UserPlus className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate('/history')}
                  className="hover:bg-accent transition-all h-9 w-9"
                >
                  <HistoryIcon className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleSignOut}
                  className="hover:bg-destructive/10 hover:text-destructive transition-all h-9 w-9"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </>
          )}
          
          {!user && (
            <Button 
              onClick={() => navigate('/auth')} 
              className="shadow-lg hover:shadow-xl transition-all hover:scale-105 bg-card/95 backdrop-blur h-11"
              size="sm"
            >
              Sign In
            </Button>
          )}
        </div>
        
        {/* Guest Mode Banner */}
        {isGuest && !guestLoading && (
          <GuestModeBanner guestUsername={guestUsername} />
        )}

        {/* Hero Header */}
        <div className="mb-12 sm:mb-16 text-center animate-in fade-in slide-in-from-bottom-8 duration-700 px-4">
          <div className="inline-block mb-4">
            <div className="text-5xl sm:text-6xl mb-2 animate-gentle-pulse">⬡</div>
          </div>
          <h1 className="font-body text-4xl sm:text-5xl md:text-7xl font-bold text-foreground mb-4 tracking-tight">
            The Lobby
          </h1>
          <p className="text-muted-foreground text-base sm:text-xl font-body max-w-2xl mx-auto">
            Challenge friends, practice with AI, or join open games
          </p>
        </div>

        {/* Recovery CTA for pending lobbies */}
        {user && <JoinGameCTA userId={user.id} />}

        {/* Lobby Creation Section - Hidden for guests */}
        {user && !isGuest && (
          <div className="grid md:grid-cols-2 gap-6 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CreateLobby userId={user.id} />
            <JoinLobby userId={user.id} />
          </div>
        )}
        
        {/* Locked Multiplayer for Guests */}
        {isGuest && !guestLoading && (
          <Card className="p-6 sm:p-8 mb-12 border-2 border-border/50 bg-muted/30 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="h-16 w-16 rounded-full bg-violet/20 flex items-center justify-center">
                <Lock className="h-8 w-8 text-violet" />
              </div>
              <div>
                <h3 className="font-body text-xl font-bold text-foreground mb-2">
                  Multiplayer Lobbies Locked
                </h3>
                <p className="text-muted-foreground mb-4 max-w-md">
                  Create a free account to challenge friends, join lobbies, and compete in tournaments!
                </p>
              </div>
              <Button 
                onClick={() => navigate('/auth')}
                size="lg"
                className="bg-gradient-to-r from-violet to-indigo hover:from-violet/90 hover:to-indigo/90"
              >
                Create Free Account
              </Button>
            </div>
          </Card>
        )}

        {/* AI Practice Section - Featured Design */}
        <Card className="relative p-6 sm:p-8 mb-12 overflow-hidden shadow-xl border-2 border-ochre/20 hover:border-ochre/40 transition-all duration-500 hover:shadow-2xl group animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-ochre/5 via-transparent to-indigo/5 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
          
          <div className="relative">
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-xl bg-gradient-to-br from-ochre to-ochre/70 flex items-center justify-center shadow-lg">
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h2 className="font-body text-xl sm:text-2xl font-bold text-foreground">
                  AI Practice Arena
                </h2>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Master your strategy against adaptive AI opponents
                </p>
              </div>
            </div>
            
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 mt-6">
              <div className="lg:w-80">
                <label className="text-xs sm:text-sm font-semibold mb-3 block text-foreground flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-ochre animate-gentle-pulse" />
                  Difficulty Level
                </label>
                <Select value={aiDifficulty} onValueChange={(value: any) => setAiDifficulty(value)}>
                  <SelectTrigger className="h-12 bg-card hover:bg-accent transition-colors border-2 text-base">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent className="bg-card/95 backdrop-blur border-2">
                    <SelectItem value="easy">🎮 Easy - Beginner</SelectItem>
                    <SelectItem value="medium">⚡ Medium - Intermediate</SelectItem>
                    <SelectItem value="hard">🔥 Hard - Advanced</SelectItem>
                    <SelectItem value="expert">👑 Expert - Master</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <label className="text-xs sm:text-sm font-semibold mb-3 block text-foreground flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-indigo animate-gentle-pulse" />
                  Board Size
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  {[7, 9, 11, 13].map((size) => (
                    <Button
                      key={size}
                      onClick={() => createAIMatch(aiDifficulty, size)}
                      disabled={creatingMatch}
                      className="h-14 sm:h-16 font-mono text-base sm:text-lg font-bold hover:scale-105 transition-all shadow-md hover:shadow-xl touch-manipulation"
                      variant="secondary"
                    >
                      {creatingMatch ? '...' : `${size}×${size}`}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Open Lobbies Section - Hidden for guests */}
        {user && !isGuest && lobbies.length > 0 && (
          <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-body text-3xl font-bold text-foreground mb-1">
                  Open Lobbies
                </h2>
                <p className="text-muted-foreground">
                  Jump into a waiting game or create your own
                </p>
              </div>
              <Badge variant="outline" className="font-mono text-sm px-4 py-2 border-2">
                {lobbies.length} open
              </Badge>
            </div>

            {loadingLobbies ? (
              <div className="grid gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-6 animate-pulse">
                    <div className="flex items-center gap-6">
                      <div className="h-12 w-12 bg-muted rounded" />
                      <div className="flex-1 space-y-2">
                        <div className="h-6 bg-muted rounded w-32" />
                        <div className="h-4 bg-muted rounded w-48" />
                      </div>
                      <div className="h-10 w-24 bg-muted rounded" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : lobbies.length === 0 ? (
              <Card className="p-12 sm:p-16 text-center shadow-lg border-2 border-dashed hover:border-solid hover:border-ochre/30 transition-all duration-300">
                <div className="text-5xl sm:text-6xl mb-4 opacity-10 animate-gentle-pulse">⬡</div>
                <p className="text-base sm:text-lg font-medium text-muted-foreground mb-2">No open lobbies</p>
                <p className="text-sm text-muted-foreground">
                  Be the first to create a lobby!
                </p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {lobbies.map((lobby) => (
                  <LobbyCard
                    key={lobby.id}
                    lobby={lobby}
                    playerCount={lobby.player_count || 0}
                    currentUserId={user.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Live Matches Section */}
        <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-body text-3xl font-bold text-foreground mb-1">
                Live Matches
              </h2>
              <p className="text-muted-foreground">
                Watch games in progress and learn from others
              </p>
            </div>
            <Badge variant="outline" className="font-mono text-sm px-4 py-2 border-2">
              {activeMatches.length} live
            </Badge>
          </div>
          {loadingMatches ? (
            <div className="grid gap-3">
              {[1, 2].map((i) => (
                <Card key={i} className="p-5 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="h-10 w-10 bg-muted rounded" />
                      <div className="space-y-2 flex-1">
                        <div className="h-5 bg-muted rounded w-40" />
                        <div className="h-4 bg-muted rounded w-24" />
                      </div>
                    </div>
                    <div className="h-9 w-24 bg-muted rounded" />
                  </div>
                </Card>
              ))}
            </div>
          ) : activeMatches.length === 0 ? (
            <Card className="p-12 sm:p-16 text-center shadow-lg border-2 border-dashed hover:border-solid hover:border-indigo/30 transition-all duration-300">
              <div className="text-5xl sm:text-6xl mb-4 opacity-10 animate-gentle-pulse">⬡</div>
              <p className="text-base sm:text-lg font-medium text-muted-foreground mb-2">No active matches</p>
              <p className="text-sm text-muted-foreground">
                Start a game to see it here!
              </p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {activeMatches.map((match) => {
                const elapsed = Math.floor((Date.now() - new Date(match.created_at).getTime()) / 60000);
                return (
                  <Card
                    key={match.id}
                    className="p-5 flex items-center justify-between shadow-md hover:shadow-xl transition-all duration-300 border-2 hover:border-indigo/40 hover:scale-[1.02] group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-4xl text-muted-foreground/20 group-hover:text-indigo/30 transition-colors">⬡</div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="font-mono bg-indigo text-primary-foreground px-3 py-1">
                            {match.size}×{match.size}
                          </Badge>
                          <span className="text-sm font-medium text-muted-foreground">
                            <span className="text-indigo font-bold">Indigo</span> vs <span className="text-ochre font-bold">Ochre</span>
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

        {/* Open Matches Section - Hidden for guests */}
        {user && !isGuest && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-400">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-body text-3xl font-bold text-foreground mb-1">
                Open Matches
              </h2>
              <p className="text-muted-foreground">
                Challenge someone directly with a match code
              </p>
            </div>
            <Badge variant="outline" className="font-mono text-sm px-4 py-2 border-2">
              {matches.length} open
            </Badge>
          </div>
          
          {matches.length === 0 ? (
            <Card className="p-16 text-center shadow-lg border-2 border-dashed hover:border-solid hover:border-primary/30 transition-all duration-300">
              <div className="text-6xl mb-4 opacity-10 animate-gentle-pulse">⬡</div>
              <p className="text-lg font-medium text-muted-foreground mb-2">No open matches</p>
              <p className="text-sm text-muted-foreground">
                Direct matches will appear here when created
              </p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {matches.map((match) => (
                <Card
                  key={match.id}
                  className="p-6 flex items-center justify-between shadow-md hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/40 hover:scale-[1.01] group"
                >
                  <div className="flex items-center gap-6">
                    <div className="text-5xl text-muted-foreground/20 group-hover:text-primary/30 transition-colors">⬡</div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className="font-mono bg-primary text-primary-foreground px-3 py-1">
                          {match.size}×{match.size}
                        </Badge>
                        {match.pie_rule && (
                          <Badge variant="outline" className="font-mono text-xs px-2 py-1 border-2">
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
                          className="gap-2 hover:scale-105 transition-all"
                        >
                          {copiedCode === match.id ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                          {copiedCode === match.id ? 'Copied!' : 'Copy Code'}
                        </Button>
                        <Button 
                          onClick={() => navigate(`/match/${match.id}`)}
                          className="hover:scale-105 transition-all shadow-md"
                        >
                          Enter Match
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        onClick={() => joinMatch(match.id)}
                        className="hover:scale-105 transition-all shadow-md"
                      >
                        Join Match
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
        )}
      </div>
      
      {/* Feature Locked Modal */}
      <FeatureLockedModal 
        open={!!lockedFeatureModal}
        onOpenChange={(open) => !open && setLockedFeatureModal(null)}
        featureName={lockedFeatureModal || ''}
      />
    </div>
  );
}
