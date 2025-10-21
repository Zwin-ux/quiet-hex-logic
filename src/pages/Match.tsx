import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/hooks/usePresence';
import { useSpectators } from '@/hooks/useSpectators';
import { HexBoard } from '@/components/HexBoard';
import { PlayerPanel } from '@/components/PlayerPanel';
import { TutorialOverlay } from '@/components/TutorialOverlay';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Hex } from '@/lib/hex/engine';
import { SimpleHexAI, AIDifficulty } from '@/lib/hex/simpleAI';
import { BoardSkin, getSkinById } from '@/lib/boardSkins';
import { Sparkles, BookOpen, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface MatchData {
  id: string;
  size: number;
  pie_rule: boolean;
  status: string;
  turn: number;
  winner: number | null;
  ai_difficulty?: AIDifficulty | null;
}

interface Player {
  profile_id: string;
  color: number;
  is_bot: boolean;
  username: string;
}

export default function Match() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [match, setMatch] = useState<MatchData | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [engine, setEngine] = useState<Hex | null>(null);
  const [lastMove, setLastMove] = useState<number | undefined>();
  const [winningPath, setWinningPath] = useState<number[]>([]);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string>('');
  const [boardSkin, setBoardSkin] = useState<BoardSkin>(getSkinById('classic'));

  // Track presence in this match
  usePresence(user?.id, matchId);

  // Track spectators
  const { spectators, isSpectating, joinAsSpectator, leaveAsSpectator } = useSpectators(matchId);

  useEffect(() => {
    if (!matchId || !user) return;

    // Load board skin preference
    loadBoardSkin();
    loadMatch();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`match:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`
        },
        () => loadMatch()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'moves',
          filter: `match_id=eq.${matchId}`
        },
        () => loadMatch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, user]);

  const loadBoardSkin = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('board_skin')
        .eq('id', user.id)
        .single();
      if (data && (data as any).board_skin) {
        setBoardSkin(getSkinById((data as any).board_skin));
      }
    } catch (error) {
      console.error('Failed to load board skin:', error);
    }
  }, [user]);

  const loadMatch = useCallback(async () => {
    if (!matchId) return;

    // Load match data
    const { data: matchData } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (!matchData) {
      toast.error('Match not found');
      navigate('/lobby');
      return;
    }

    setMatch(matchData);

    // Load players
    const { data: playersData } = await supabase
      .from('match_players')
      .select(`
        profile_id,
        color,
        is_bot,
        profiles!inner(username)
      `)
      .eq('match_id', matchId);

    if (playersData) {
      const enrichedPlayers = playersData.map(p => ({
        profile_id: p.profile_id,
        color: p.color,
        is_bot: p.is_bot,
        username: (p.profiles as any).username
      }));
      
      // For AI matches, add synthetic AI player as color 2
      if (matchData.ai_difficulty && !enrichedPlayers.find(p => p.color === 2)) {
        const difficultyLabel = matchData.ai_difficulty.charAt(0).toUpperCase() + matchData.ai_difficulty.slice(1);
        enrichedPlayers.push({
          profile_id: 'ai-player',
          color: 2,
          is_bot: true,
          username: `Computer (${difficultyLabel})`
        });
      }
      
      setPlayers(enrichedPlayers);
    }

    // Load moves and reconstruct game state
    const { data: moves } = await supabase
      .from('moves')
      .select('*')
      .eq('match_id', matchId)
      .order('ply', { ascending: true });

    const hexEngine = new Hex(matchData.size);
    
    if (moves) {
      moves.forEach(move => {
        try {
          hexEngine.play(move.cell);
          setLastMove(move.cell ?? undefined);
        } catch (e) {
          console.error('Invalid move in history:', e);
        }
      });
    }

    setEngine(hexEngine);

    // Check for winning path
    const winner = hexEngine.winner();
    if (winner) {
      const path = hexEngine.getWinningPath();
      setWinningPath(path || []);
    }

    // Check if AI should play
    if (matchData.status === 'active') {
      const currentColor = matchData.turn % 2 === 1 ? 1 : 2;
      const isAIMatch = matchData.ai_difficulty != null;
      const isAITurn = isAIMatch && currentColor === 2;
      
      if (isAITurn && !hexEngine.winner()) {
      setTimeout(() => makeAIMove(hexEngine, matchData), 800);
      }
    }
  }, [matchId, navigate]);

  const makeAIMove = async (hexEngine: Hex, matchData: MatchData) => {
    setIsAIThinking(true);
    setAiReasoning('');

    try {
      // Use simple client-side AI
      const difficulty = matchData.ai_difficulty || 'medium';
      const ai = new SimpleHexAI(hexEngine, difficulty as AIDifficulty);
      const { cell, reasoning } = ai.getMove();
      
      setAiReasoning(reasoning);

      // Apply move through server for validation and persistence
      const { data: result, error } = await supabase.functions.invoke('apply-ai-move', {
        body: { 
          matchId: matchData.id, 
          cell
        }
      });

      if (error || !result?.success) {
        throw new Error(result?.error || error?.message || 'Failed to apply AI move');
      }

      // Reload match to get updated state
      await loadMatch();

      toast.success('Computer played', {
        description: reasoning
      });
    } catch (error) {
      console.error('AI move error:', error);
      toast.error('Computer failed to move');
    } finally {
      setIsAIThinking(false);
    }
  };

  const handleCellClick = useCallback(async (cell: number) => {
    if (!engine || !match || !user) return;

    // Spectators can't make moves
    if (isSpectating) {
      toast.error('Spectators cannot make moves');
      return;
    }

    // Check if it's user's turn
    const currentColor = match.turn % 2 === 1 ? 1 : 2;
    const currentPlayer = players.find(p => p.color === currentColor);
    if (!currentPlayer || currentPlayer.profile_id !== user.id) {
      toast.error('Not your turn');
      return;
    }

    // Client-side validation
    if (!engine.legal(cell)) {
      toast.error('Invalid move');
      return;
    }

    try {
      // Server-side move application with validation
      const { data: result, error } = await supabase.functions.invoke('apply-move', {
        body: { 
          matchId: match.id, 
          cell
        }
      });

      if (error || !result?.success) {
        toast.error(result?.error || error?.message || 'Invalid move');
        return;
      }

      // Reload match
      await loadMatch();

      const winner = result.winner;
      if (winner) {
        toast.success(winner === currentPlayer.color ? 'You won!' : 'Computer won!');
      }
    } catch (error) {
      console.error('Move error:', error);
      toast.error('Failed to make move');
    }
  }, [engine, match, user, players, isSpectating, loadMatch]);

  const handleSwapColors = useCallback(async () => {
    if (!engine || !match || !user) return;

    const currentColor = match.turn % 2 === 1 ? 1 : 2;
    const currentPlayer = players.find(p => p.color === currentColor);
    if (!currentPlayer || currentPlayer.profile_id !== user.id) {
      toast.error('Not your turn');
      return;
    }

    try {
      // Server-side pie rule swap with validation
      const { data: result, error } = await supabase.functions.invoke('apply-move', {
        body: { 
          matchId: match.id, 
          cell: null
        }
      });

      if (error || !result?.success) {
        toast.error(result?.error || error?.message || 'Cannot swap colors');
        return;
      }

      await loadMatch();

      toast.success('Colors swapped!', {
        description: 'You are now playing as Indigo'
      });
    } catch (error) {
      console.error('Swap error:', error);
      toast.error('Failed to swap colors');
    }
  }, [engine, match, user, players, loadMatch]);

  const handleToggleSpectate = async () => {
    if (!user) return;

    try {
      if (isSpectating) {
        await leaveAsSpectator(user.id);
        toast.success('Left spectator mode');
      } else {
        await joinAsSpectator(user.id);
        toast.success('Joined as spectator');
      }
    } catch (error) {
      toast.error('Failed to toggle spectator mode');
    }
  };

  if (!match || !engine) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-gentle-pulse text-4xl mb-4">⬡</div>
          <p className="font-mono text-muted-foreground">Loading match...</p>
        </div>
      </div>
    );
  }

  const player1 = useMemo(() => players.find(p => p.color === 1), [players]);
  const player2 = useMemo(() => players.find(p => p.color === 2), [players]);
  const currentColor = useMemo(() => match.turn % 2 === 1 ? 1 : 2, [match.turn]);
  const currentPlayer = useMemo(() => players.find(p => p.color === currentColor), [players, currentColor]);
  const userPlayer = useMemo(() => players.find(p => p.profile_id === user?.id), [players, user?.id]);
  const isPlayer = !!userPlayer;
  const isAIMatch = match.ai_difficulty != null;

  return (
    <div className="min-h-screen p-4 md:p-8">
      {showTutorial && <TutorialOverlay onClose={() => setShowTutorial(false)} />}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-body text-3xl font-semibold mb-2">
              {isAIMatch ? 'Practice Mode' : 'Match in Progress'}
            </h1>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="font-mono">
                {match.size}×{match.size}
              </Badge>
              {match.status === 'finished' && match.winner && (
                <Badge className="bg-indigo text-primary-foreground">
                  {match.winner === userPlayer?.color ? 'Victory' : 'Defeat'}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/lobby')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Exit
            </Button>
            {!isAIMatch && !isPlayer && (
              <Button
                variant={isSpectating ? "default" : "outline"}
                size="sm"
                onClick={handleToggleSpectate}
              >
                {isSpectating ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {isSpectating ? 'Leave' : 'Watch'}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTutorial(true)}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              How to Play
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[300px_1fr_300px] gap-8 items-start">
          {/* Player 1 Panel */}
          <div className="order-2 lg:order-1">
            {player1 && (
              <PlayerPanel
                username={player1.username}
                color={1}
                isCurrentTurn={currentColor === 1 && match.status === 'active'}
                isAI={player1.is_bot}
              />
            )}
          </div>

          {/* Game Board */}
          <div className="order-1 lg:order-2 flex flex-col items-center gap-6">
            {isAIThinking && (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Sparkles className="h-5 w-5 animate-gentle-pulse" />
                  <span className="font-mono text-sm">Computer thinking...</span>
                </div>
                {aiReasoning && (
                  <p className="text-sm text-muted-foreground max-w-md text-center">
                    {aiReasoning}
                  </p>
                )}
              </div>
            )}

            <HexBoard
              size={match.size}
              board={engine.board}
              lastMove={lastMove}
              winningPath={winningPath}
              onCellClick={handleCellClick}
              skin={boardSkin}
              disabled={
                match.status !== 'active' || 
                currentPlayer?.profile_id !== user?.id ||
                isAIThinking ||
                isSpectating ||
                !isPlayer
              }
              canSwap={
                match.pie_rule &&
                engine.ply === 1 &&
                !engine.swapped &&
                currentPlayer?.profile_id === user?.id &&
                match.status === 'active'
              }
              onSwapColors={handleSwapColors}
            />

            {match.status === 'active' && (
              <p className="font-mono text-sm text-muted-foreground">
                {isSpectating
                  ? `Watching ${currentPlayer?.username}'s turn`
                  : currentPlayer?.profile_id === user?.id
                  ? "Your turn"
                  : `Waiting for ${currentPlayer?.username}...`}
              </p>
            )}
          </div>

          {/* Player 2 Panel */}
          <div className="order-3">
            {player2 && (
              <PlayerPanel
                username={player2.username}
                color={2}
                isCurrentTurn={currentColor === 2 && match.status === 'active'}
                isAI={player2.is_bot}
              />
            )}

            {/* Spectators - only for non-AI matches */}
            {!isAIMatch && spectators.length > 0 && (
              <div className="mt-6 p-4 border rounded-lg bg-card">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-sm text-muted-foreground">
                    {spectators.length} watching
                  </span>
                </div>
                <div className="space-y-2">
                  {spectators.slice(0, 5).map((spectator) => (
                    <div key={spectator.profile_id} className="text-sm text-muted-foreground font-mono">
                      {spectator.profiles?.username || 'Anonymous'}
                    </div>
                  ))}
                  {spectators.length > 5 && (
                    <div className="text-xs text-muted-foreground">
                      +{spectators.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
