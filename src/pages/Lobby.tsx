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
import { Users, LogOut, User, Lock, Play, Loader2, Zap, BookOpen, Brain, Skull, Flame, Trophy, Target, History as HistoryIcon, Crown } from 'lucide-react';
import { SpectateButton } from '@/components/SpectateButton';
import { CreateLobby } from '@/components/CreateLobby';
import { JoinLobby } from '@/components/JoinLobby';
import { JoinGameCTA } from '@/components/JoinGameCTA';
import { LobbyCard } from '@/components/LobbyCard';
import { GuestModeBanner } from '@/components/GuestModeBanner';
import { ConvertAccountModal } from '@/components/ConvertAccountModal';
import { usePresence } from '@/hooks/usePresence';

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
  const [activeMatches, setActiveMatches] = useState<Match[]>([]);
  const [lobbies, setLobbies] = useState<LobbyWithDetails[]>([]);
  const [creatingMatch, setCreatingMatch] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('medium');
  const [loadingLobbies, setLoadingLobbies] = useState(true);
  const { user, loading, signOut, signInAnonymously } = useAuth();
  const { isGuest, guestUsername, loading: guestLoading } = useGuestMode();
  const { showConversionModal, setShowConversionModal, matchesCompleted } = useGuestConversion();
  const navigate = useNavigate();
  const location = useLocation();

  // Auto sign-in guest users
  useEffect(() => {
    if (!loading && !user) {
      signInAnonymously();
    }
  }, [loading, user, signInAnonymously]);

  usePresence(user?.id);

  const [handledAutoCreate, setHandledAutoCreate] = useState(false);

  // Handle auto-create AI match from location state
  useEffect(() => {
    if (loading || !user) return;
    const state = location.state as { createAI?: boolean; difficulty?: string; boardSize?: number };
    if (state?.createAI && state?.difficulty && !handledAutoCreate) {
      setHandledAutoCreate(true);
      const difficulty = state.difficulty as 'easy' | 'medium' | 'hard' | 'expert';
      const boardSize = state.boardSize || 11;
      navigate(location.pathname, { replace: true, state: {} });
      createAIMatch(difficulty, boardSize);
    }
  }, [loading, user, location.state, handledAutoCreate]);

  const createAIMatch = async (difficulty: 'easy' | 'medium' | 'hard' | 'expert', size: number = 11) => {
    if (!user) {
      toast.error('Please wait while we set up your session...');
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

      const { error: playersError } = await supabase.from('match_players').insert({
        match_id: newMatch.id,
        profile_id: user.id,
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
        {user && <JoinGameCTA userId={user.id} />}

        {/* Quick Play */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-ochre" />
            <h2 className="text-xl font-bold">Quick Play vs AI</h2>
          </div>

          {/* Difficulty */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {[
              { diff: 'easy' as const, icon: Zap, label: 'Easy' },
              { diff: 'medium' as const, icon: Flame, label: 'Medium' },
              { diff: 'hard' as const, icon: Brain, label: 'Hard' },
              { diff: 'expert' as const, icon: Skull, label: 'Expert' },
            ].map(({ diff, icon: Icon, label }) => (
              <button
                key={diff}
                onClick={() => setAiDifficulty(diff)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                  aiDifficulty === diff 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Board sizes */}
          <div className="grid grid-cols-4 gap-3">
            {[7, 9, 11, 13].map((size) => (
              <button
                key={size}
                onClick={() => createAIMatch(aiDifficulty, size)}
                disabled={creatingMatch}
                className="p-4 rounded-xl border-2 border-border hover:border-primary/50 bg-card transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                {creatingMatch ? (
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                ) : (
                  <span className="text-2xl font-bold font-mono">{size}×{size}</span>
                )}
              </button>
            ))}
          </div>

          <Button variant="ghost" size="sm" onClick={() => navigate('/tutorial')} className="mt-3 gap-2 text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            Learn the basics
          </Button>
        </section>

        {/* Multiplayer */}
        {user && !isGuest && (
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
        )}

        {isGuest && !guestLoading && (
          <Card className="p-4 border-dashed flex items-center gap-4">
            <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Multiplayer locked</p>
              <p className="text-sm text-muted-foreground">Sign up to play with friends</p>
            </div>
            <Button onClick={() => navigate('/auth')} variant="outline" size="sm">Sign Up</Button>
          </Card>
        )}

        {/* Open Lobbies */}
        {user && !isGuest && lobbies.length > 0 && (
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
        )}

        {/* Live Matches */}
        {activeMatches.length > 0 && (
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
        )}
      </div>

      {user && isGuest && (
        <ConvertAccountModal 
          open={showConversionModal}
          onOpenChange={setShowConversionModal}
          guestId={user.id}
          matchesCompleted={matchesCompleted}
          onConversionComplete={() => toast.success('Welcome to Hexology!')}
        />
      )}
    </div>
  );
}
