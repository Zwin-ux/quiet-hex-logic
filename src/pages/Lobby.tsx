import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useGuestMode } from '@/hooks/useGuestMode';
import { useGuestConversion } from '@/hooks/useGuestConversion';
import { useDiscord } from '@/lib/discord/DiscordContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Users, LogOut, User, Lock, Play, Loader2, Zap, Trophy, Target, History as HistoryIcon, Crown, BookOpen } from 'lucide-react';
import { SpectateButton } from '@/components/SpectateButton';
import { CreateLobby } from '@/components/CreateLobby';
import { JoinLobby } from '@/components/JoinLobby';
import { JoinGameCTA } from '@/components/JoinGameCTA';
import { LobbyCard } from '@/components/LobbyCard';
import { GuestModeBanner } from '@/components/GuestModeBanner';
import { ConvertAccountModal } from '@/components/ConvertAccountModal';
import { WelcomeOnboarding } from '@/components/WelcomeOnboarding';
import { usePresence } from '@/hooks/usePresence';
import { UserAvatar } from '@/components/UserAvatar';

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
  const { user, loading, signOut, signInAnonymously } = useAuth();
  const [activeMatches, setActiveMatches] = useState<Match[]>([]);
  const [lobbies, setLobbies] = useState<LobbyWithDetails[]>([]);
  const [creatingMatch, setCreatingMatch] = useState(false);
  const [profile, setProfile] = useState<{ username: string; elo_rating: number } | null>(null);

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('username, elo_rating').eq('id', user.id).single()
        .then(({ data }) => {
          if (data) setProfile(data);
        });
    }
  }, [user]);

  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('medium');
  const [loadingLobbies, setLoadingLobbies] = useState(true);
  const { isGuest, guestUsername, loading: guestLoading } = useGuestMode();
  const { showConversionModal, setShowConversionModal, matchesCompleted } = useGuestConversion();
  const { isDiscordEnvironment, isAuthenticated: isDiscordAuth, discordUser } = useDiscord();
  const navigate = useNavigate();
  const location = useLocation();

  // For Discord users, we'll use local state for AI matches
  const [discordMatchId, setDiscordMatchId] = useState<string | null>(null);
  
  // Track if user has visited before (for onboarding)
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Show onboarding for first-time visitors (not Discord, not already signed in)
  useEffect(() => {
    if (!isDiscordEnvironment && !loading && !user) {
      // Check if they've seen onboarding before
      const hasSeenOnboarding = localStorage.getItem('hexology_onboarded');
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      } else {
        // Returning visitor, auto sign-in as guest
        signInAnonymously();
      }
    }
  }, [loading, user, signInAnonymously, isDiscordEnvironment]);

  const handleOnboardingComplete = () => {
    localStorage.setItem('hexology_onboarded', 'true');
    setShowOnboarding(false);
  };

  usePresence(user?.id);

  const [handledAutoCreate, setHandledAutoCreate] = useState(false);

  // Determine if user is ready to play
  const isReadyToPlay = isDiscordEnvironment ? isDiscordAuth : !!user;
  const isLoading = isDiscordEnvironment ? !isDiscordAuth : loading;

  // Handle auto-create AI match from location state
  useEffect(() => {
    if (isLoading || !isReadyToPlay) return;
    const state = location.state as { createAI?: boolean; difficulty?: string; boardSize?: number };
    if (state?.createAI && state?.difficulty && !handledAutoCreate) {
      setHandledAutoCreate(true);
      const difficulty = state.difficulty as 'easy' | 'medium' | 'hard' | 'expert';
      const boardSize = state.boardSize || 7;
      navigate(location.pathname, { replace: true, state: {} });
      createAIMatch(difficulty, boardSize);
    } else if ((state as any)?.competitive && !handledAutoCreate && !isGuest) {
      setHandledAutoCreate(true);
      navigate(location.pathname, { replace: true, state: {} });
      findOrCreateCompetitiveMatch();
    }
  }, [isLoading, isReadyToPlay, location.state, handledAutoCreate, isGuest]);

  const createAIMatch = async (difficulty: 'easy' | 'medium' | 'hard' | 'expert', size: number = 11) => {
    setCreatingMatch(true);
    try {
      // Discord users: navigate directly to a local AI match
      if (isDiscordEnvironment && discordUser) {
        console.log('[Discord] Creating local AI match for Discord user:', discordUser.username);
        // Generate a local match ID for Discord (no database needed for single-player AI)
        const localMatchId = `discord-${discordUser.id}-${Date.now()}`;

        // Persist init payload so refresh/deeplink still works
        const initPayload = {
          isDiscordLocal: true,
          aiDifficulty: difficulty,
          boardSize: size,
          discordUser: { id: discordUser.id, username: discordUser.username },
        };
        try {
          sessionStorage.setItem(`discord_local_match:${localMatchId}`, JSON.stringify(initPayload));
        } catch {
          // ignore storage failures
        }

        toast.success(`Starting ${difficulty} AI match!`);
        // Navigate to match page with Discord-specific state
        navigate(`/match/${localMatchId}`, {
          state: initPayload,
        });
        setCreatingMatch(false);
        return;
      }

      // Standard Supabase flow for non-Discord users
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error('Please wait while we set up your session...');
        setCreatingMatch(false);
        return;
      }
      const currentUserId = session.user.id;

      const { data: newMatch, error } = await supabase
        .from('matches')
        .insert({
          size,
          pie_rule: true,
          status: 'active',
          turn: 1,
          owner: currentUserId,
          ai_difficulty: difficulty,
          allow_spectators: false
        })
        .select()
        .single();

      if (error) throw error;

      const { error: playersError } = await supabase.from('match_players').insert({
        match_id: newMatch.id,
        profile_id: currentUserId,
        color: 1,
        is_bot: false
      });

      if (playersError) throw new Error('Failed to add player to match');

      toast.success(`Starting ${difficulty} AI match!`);
      navigate(`/match/${newMatch.id}`);
    } catch (error: any) {
      console.error('Error creating AI match:', error);
      toast.error(error.message || 'Failed to create AI match');
    } finally {
      setCreatingMatch(false);
    }
  };

  const findOrCreateCompetitiveMatch = async () => {
    if (!user) {
      toast.error('You must be signed in to play Competitive');
      return;
    }

    if (isGuest) {
      toast.error('Guests cannot play Competitive mode. Please create an account to access ranked matches.');
      return;
    }

    setCreatingMatch(true);
    try {
      // 1. Try to find an existing waiting match
      const { data: waitingMatches, error: searchError } = await supabase
        .from('matches')
        .select('id')
        .eq('status', 'waiting')
        .eq('is_ranked', true)
        .eq('size', 13) // Standard size for competitive
        .neq('owner', user.id) // Don't match with self
        .limit(1);

      if (searchError) throw searchError;

      if (waitingMatches && waitingMatches.length > 0) {
        const matchId = waitingMatches[0].id;

        // Join this match
        const { error: joinError } = await supabase
          .from('match_players')
          .insert({
            match_id: matchId,
            profile_id: user.id,
            color: 2, // Joiner is always white (2) if owner is black (1) - simplfied logic for now
            is_bot: false
          });

        if (joinError) throw joinError;

        // Update match status to active
        await supabase
          .from('matches')
          .update({
            status: 'active',
            turn_started_at: new Date().toISOString()
          })
          .eq('id', matchId);

        toast.success('Opponent found! Starting match...');
        navigate(`/match/${matchId}`);
        return;
      }

      // 2. No match found, create a new one
      const { data: newMatch, error: createError } = await supabase
        .from('matches')
        .insert({
          size: 13,
          pie_rule: true,
          status: 'waiting',
          turn: 1,
          owner: user.id,
          is_ranked: true,
          allow_spectators: true
        })
        .select()
        .single();

      if (createError) throw createError;

      // Add self as player 1
      const { error: playerError } = await supabase
        .from('match_players')
        .insert({
          match_id: newMatch.id,
          profile_id: user.id,
          color: 1,
          is_bot: false
        });

      if (playerError) throw new Error('Failed to join created match');

      toast.success('Searching for opponent...');
      navigate(`/match/${newMatch.id}`);

    } catch (error: any) {
      console.error('Competitive matchmaking error:', error);
      toast.error(error.message || 'Failed to find match');
    } finally {
      setCreatingMatch(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchActiveMatches();
    fetchWaitingLobbies();

    const channel = supabase
      .channel('lobby')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `status=eq.active` }, fetchActiveMatches)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lobbies', filter: `status=eq.waiting` }, fetchWaitingLobbies)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lobby_players' }, fetchWaitingLobbies)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchActiveMatches = async () => {
    const { data } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'active')
      .eq('allow_spectators', true)
      .order('created_at', { ascending: false })
      .limit(5);
    setActiveMatches(data || []);
  };

  const fetchWaitingLobbies = async () => {
    setLoadingLobbies(true);
    const { data: lobbyData } = await supabase
      .from('lobbies')
      .select('id, code, host_id, board_size, pie_rule, status, created_at, profiles!lobbies_host_id_fkey(username)')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })
      .limit(10);

    const lobbiesWithCounts = await Promise.all(
      (lobbyData || []).map(async (lobby) => {
        const { count } = await supabase
          .from('lobby_players')
          .select('*', { count: 'exact', head: true })
          .eq('lobby_id', lobby.id);
        return { ...lobby, player_count: count || 0 } as LobbyWithDetails;
      })
    );

    setLobbies(lobbiesWithCounts);
    setLoadingLobbies(false);
  };

  // Show welcome onboarding for first-time visitors
  if (showOnboarding) {
    return (
      <WelcomeOnboarding 
        onComplete={handleOnboardingComplete}
        onCreateMatch={(difficulty, size) => {
          handleOnboardingComplete();
          signInAnonymously().then(() => {
            setTimeout(() => createAIMatch(difficulty, size), 500);
          });
        }}
        isCreating={creatingMatch}
      />
    );
  }

  // Show loading for non-Discord users while auth loads
  if (!isDiscordEnvironment && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // For Discord, show loading until authenticated
  if (isDiscordEnvironment && !isDiscordAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Connecting to Discord...</p>
        </div>
      </div>
    );
  }

  // Prevent flash when auto-creating AI match
  const isAutoCreating = (location.state as any)?.createAI && !handledAutoCreate;
  if (isAutoCreating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 animate-in fade-in duration-500">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-lg font-medium text-foreground">Preparing your match...</p>
        </div>
      </div>
    );
  }

  const isCompetitive = (location.state as any)?.competitive && !handledAutoCreate;
  if (isCompetitive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 animate-in fade-in duration-500">
          <Loader2 className="h-8 w-8 animate-spin text-ochre mx-auto" />
          <p className="text-lg font-medium text-foreground">Finding opponent...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="font-display text-xl font-bold hover:text-primary transition-colors">
            Hexology
          </button>
          <div className="flex items-center gap-1">
            {user && (
              <>
                {[
                  { icon: User, path: '/profile' },
                  { icon: Trophy, path: '/leaderboard' },
                  { icon: Target, path: '/puzzles' },
                  { icon: HistoryIcon, path: '/history' },
                  { icon: Crown, path: '/premium', className: 'text-amber-500' },
                ].map(({ icon: Icon, path, className }) => (
                  <Button key={path} variant="ghost" size="icon" onClick={() => navigate(path)} className={`h-9 w-9 ${className || ''}`}>
                    <Icon className="h-4 w-4" />
                  </Button>
                ))}
                <Button variant="ghost" size="icon" onClick={() => { signOut(); navigate('/auth'); }} className="h-9 w-9 text-muted-foreground">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            )}
            {!user && <Button onClick={() => navigate('/auth')} size="sm">Sign In</Button>}
          </div>
        </div>
      </div>

      <div className="pt-20 pb-12 px-4 max-w-4xl mx-auto space-y-8">
        {isGuest && !guestLoading && <GuestModeBanner guestUsername={guestUsername} />}

        {/* Playing As Card */}
        {user && !isGuest && (
          <Card className="p-4 bg-card border-border shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <UserAvatar
                username={user.email?.split('@')[0] || 'User'}
                color="indigo"
                size="lg"
              />
              <div>
                <p className="text-sm text-muted-foreground font-medium">Playing as</p>
                <p className="text-lg font-bold flex items-center gap-2">
                  {user.email?.split('@')[0] || 'User'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground font-medium">ELO Rating</p>
              <p className="text-2xl font-bold font-mono text-ochre">
                {profile?.elo_rating ?? 1200}
              </p>
            </div>
          </Card>
        )}

        {user && <JoinGameCTA userId={user.id} />}

        {/* Play Options Grid */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-ochre/10">
              <Zap className="h-5 w-5 text-ochre" />
            </div>
            <h2 className="text-xl font-bold">Play</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Competitive Mode */}
            {user && !isGuest && (
              <Button
                onClick={findOrCreateCompetitiveMatch}
                disabled={creatingMatch}
                className="w-full h-32 rounded-2xl bg-gradient-to-br from-ochre via-ochre to-amber-600 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg border-2 border-ochre/20 flex flex-col gap-1 items-center justify-center text-background p-0 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <Trophy className="w-16 h-16" />
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <span className="text-2xl font-bold font-display tracking-tight">Competitive</span>
                  <span className="text-xs font-mono opacity-90 font-bold uppercase tracking-widest bg-black/20 px-2 py-0.5 rounded-full mt-1">13×13 • ELO Rated</span>
                </div>
              </Button>
            )}

            {/* Quick Play vs AI */}
            <div className="space-y-4 bg-muted/30 p-4 rounded-2xl border border-border/50">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" /> vs AI
                </span>
                {/* Difficulty */}
                <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
                  {[
                    { diff: 'easy' as const, label: 'Easy', color: 'text-green-600' },
                    { diff: 'medium' as const, label: 'Med', color: 'text-amber-600' },
                    { diff: 'hard' as const, label: 'Hard', color: 'text-red-600' },
                  ].map(({ diff, label, color }) => (
                    <button
                      key={diff}
                      onClick={() => setAiDifficulty(diff)}
                      className={`px-2.5 py-1 rounded-md text-xs transition-all font-medium ${aiDifficulty === diff
                        ? 'bg-background shadow-sm ' + color
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                onClick={() => createAIMatch(aiDifficulty, 7)}
                disabled={creatingMatch}
                className="w-full h-14 rounded-xl bg-indigo hover:bg-indigo/90 transition-all shadow-sm"
              >
                {creatingMatch ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <span className="text-base font-semibold">Start AI Match</span>
                )}
              </Button>
              
              {/* Tutorial link for guests */}
              {isGuest && (
                <Button
                  variant="ghost"
                  onClick={() => navigate('/tutorial')}
                  className="w-full gap-2 text-muted-foreground hover:text-foreground"
                >
                  <BookOpen className="h-4 w-4" />
                  Learn the Rules
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Multiplayer */}
        {
          user && !isGuest && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold">Multiplayer</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <CreateLobby userId={user.id} />
                <JoinLobby userId={user.id} />
              </div>
            </section>
          )
        }

        {
          isGuest && !guestLoading && (
            <Card className="p-4 border-dashed flex items-center gap-4">
              <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <p className="font-medium">Multiplayer locked</p>
                <p className="text-sm text-muted-foreground">Sign up to play with friends</p>
              </div>
              <Button onClick={() => navigate('/auth')} variant="outline" size="sm">Sign Up</Button>
            </Card>
          )
        }

        {/* Open Lobbies */}
        {
          user && !isGuest && lobbies.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Open Lobbies</h2>
                <Badge variant="outline">{lobbies.length}</Badge>
              </div>
              <div className="space-y-2">
                {lobbies.map((lobby) => (
                  <LobbyCard key={lobby.id} lobby={lobby} playerCount={lobby.player_count || 0} currentUserId={user.id} />
                ))}
              </div>
            </section>
          )
        }

        {/* Live Matches */}
        {
          activeMatches.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Live Matches</h2>
                <Badge variant="outline">{activeMatches.length}</Badge>
              </div>
              <div className="space-y-2">
                {activeMatches.map((match) => (
                  <Card key={match.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Play className="h-4 w-4 text-primary" />
                      <span className="font-mono">{match.size}×{match.size}</span>
                    </div>
                    <SpectateButton matchId={match.id} />
                  </Card>
                ))}
              </div>
            </section>
          )
        }
      </div >

      {user && isGuest && (
        <ConvertAccountModal
          open={showConversionModal}
          onOpenChange={setShowConversionModal}
          guestId={user.id}
          matchesCompleted={matchesCompleted}
          onConversionComplete={() => toast.success('Welcome to Hexology!')}
        />
      )
      }
    </div >
  );
}
