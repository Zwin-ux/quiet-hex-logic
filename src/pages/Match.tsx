import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDiscord } from '@/lib/discord/DiscordContext';
import { usePresence } from '@/hooks/usePresence';
import { useSpectators } from '@/hooks/useSpectators';
import { useGameSounds } from '@/hooks/useGameSounds';
import { useAmbientMusic } from '@/hooks/useAmbientMusic';
import { HexBoard } from '@/components/HexBoard';
import { PlayerPanel } from '@/components/PlayerPanel';
import { TutorialOverlay } from '@/components/TutorialOverlay';
import { MusicControls } from '@/components/MusicControls';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Hex } from '@/lib/hex/engine';
import { SimpleHexAI, AIDifficulty } from '@/lib/hex/simpleAI';
import { BoardSkin, getSkinById } from '@/lib/boardSkins';
import { Sparkles, BookOpen, ArrowLeft, Eye, EyeOff, RotateCcw, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface MatchData {
  id: string;
  size: number;
  pie_rule: boolean;
  status: string;
  turn: number;
  winner: number | null;
  ai_difficulty?: AIDifficulty | null;
  turn_timer_seconds?: number | null;
  turn_started_at?: string | null;
}

interface Player {
  profile_id: string;
  color: number;
  is_bot: boolean;
  username: string;
  avatar_color?: string;
  elo?: number;
  rating_change?: number;
}

export default function Match() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const { isDiscordEnvironment, isAuthenticated: isDiscordAuth, discordUser } = useDiscord();
  const [match, setMatch] = useState<MatchData | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [engine, setEngine] = useState<Hex | null>(null);
  const [lastMove, setLastMove] = useState<number | undefined>();
  const [winningPath, setWinningPath] = useState<number[]>([]);
  const [showTutorial, setShowTutorial] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string>('');
  const [showAIReasoning, setShowAIReasoning] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [isAggressiveMove, setIsAggressiveMove] = useState(false);
  const aiMoveInProgress = useRef(false);
  const moveInProgress = useRef(false);
  const lastAITurnProcessed = useRef<number | null>(null);
  const loadInFlight = useRef(false);
  const [rematchLoading, setRematchLoading] = useState(false);
  const [boardSkin, setBoardSkin] = useState<BoardSkin>(getSkinById('classic'));
  const [requestingRematch, setRequestingRematch] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [debugFinishing, setDebugFinishing] = useState(false);

  // Check if this is a Discord local match
  const isDiscordLocalMatch = matchId?.startsWith('discord-');
  const discordLocalState = location.state as {
    isDiscordLocal?: boolean;
    aiDifficulty?: AIDifficulty;
    boardSize?: number;
    discordUser?: { id: string; username: string };
  } | null;

  const discordLocalInit = useMemo(() => {
    if (!isDiscordLocalMatch || !matchId) return null;

    // Preferred: router state
    if (discordLocalState?.isDiscordLocal) return discordLocalState;

    // Fallback: sessionStorage (handles refresh/deeplink)
    try {
      const raw = sessionStorage.getItem(`discord_local_match:${matchId}`);
      if (raw) return JSON.parse(raw) as typeof discordLocalState;
    } catch {
      // ignore
    }

    // Last resort: defaults if we're in Discord env
    if (isDiscordEnvironment && discordUser) {
      return {
        isDiscordLocal: true,
        aiDifficulty: 'medium' as AIDifficulty,
        boardSize: 11,
        discordUser: { id: discordUser.id, username: discordUser.username },
      };
    }

    return null;
  }, [isDiscordLocalMatch, matchId, discordLocalState, isDiscordEnvironment, discordUser]);

  // Track presence in this match (skip for Discord local matches)
  usePresence(isDiscordLocalMatch ? undefined : user?.id, isDiscordLocalMatch ? undefined : matchId);

  // Track spectators (skip for Discord local matches)
  const { spectators, isSpectating, joinAsSpectator, leaveAsSpectator } = useSpectators(
    isDiscordLocalMatch ? undefined : matchId
  );

  // Game sounds
  const { playPlaceSound, playWinSound, playLoseSound, playErrorSound } = useGameSounds();

  // Ambient music
  const {
    isPlaying: isMusicPlaying,
    volume: musicVolume,
    isMuted: isMusicMuted,
    toggleMusic,
    toggleMute: toggleMusicMute,
    updateVolume: updateMusicVolume,
    stopMusic,
  } = useAmbientMusic();

  // Stop music when leaving the match
  useEffect(() => {
    return () => {
      stopMusic();
    };
  }, [stopMusic]);

  // Initialize Discord local match
  useEffect(() => {
    if (!isDiscordLocalMatch || !discordLocalInit?.isDiscordLocal) return;

    console.log('[Discord Match] Initializing local match:', matchId);

    const boardSize = discordLocalInit.boardSize || 11;
    const difficulty = (discordLocalInit.aiDifficulty || 'easy') as AIDifficulty;
    const discordUsername =
      discordLocalInit.discordUser?.username || discordUser?.username || 'Player';

    // Create local match data
    setMatch({
      id: matchId!,
      size: boardSize,
      pie_rule: true,
      status: 'active',
      turn: 1,
      winner: null,
      ai_difficulty: difficulty,
      turn_timer_seconds: null,
      turn_started_at: null,
    });

    // Create players
    const difficultyLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    setPlayers([
      {
        profile_id: 'discord-player',
        color: 1,
        is_bot: false,
        username: discordUsername,
        avatar_color: 'indigo',
      },
      {
        profile_id: 'ai-player',
        color: 2,
        is_bot: true,
        username: `Computer (${difficultyLabel})`,
        avatar_color: 'slate',
      },
    ]);

    // Initialize engine
    setEngine(new Hex(boardSize));
  }, [isDiscordLocalMatch, discordLocalInit, matchId, discordUser]);

  useEffect(() => {
    if (!matchId || isDiscordLocalMatch) return;

    // Check authentication for AI games (skip for Discord)
    if (!isDiscordEnvironment && !loading && !user) {
      toast.error('Please sign in to play');
      navigate('/auth');
      return;
    }

    if (!isDiscordEnvironment && !user) return;

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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_players',
          filter: `match_id=eq.${matchId}`
        },
        () => loadMatch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, user, loading, navigate]);

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
    if (!matchId || loadInFlight.current) return;
    loadInFlight.current = true;

    try {
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
          rating_change,
          profiles!inner(username, avatar_color, elo_rating)
        `)
        .eq('match_id', matchId);

      if (playersData) {
        const enrichedPlayers = playersData.map(p => ({
          profile_id: p.profile_id,
          color: p.color,
          is_bot: p.is_bot,
          username: (p.profiles as any).username,
          avatar_color: (p.profiles as any).avatar_color || 'indigo',
          elo: (p.profiles as any).elo_rating,
          rating_change: p.rating_change
        }));

        // For AI matches, add synthetic AI player as color 2
        if (matchData.ai_difficulty && !enrichedPlayers.find(p => p.color === 2)) {
          const difficultyLabel = matchData.ai_difficulty.charAt(0).toUpperCase() + matchData.ai_difficulty.slice(1);
          enrichedPlayers.push({
            profile_id: 'ai-player',
            color: 2,
            is_bot: true,
            username: `Computer (${difficultyLabel})`,
            avatar_color: 'slate',
            elo: undefined,
            rating_change: undefined
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

      // Check if AI should play (immediate, no delay) and only once per turn
      if (matchData.status === 'active') {
        const currentColor = matchData.turn % 2 === 1 ? 1 : 2;
        const isAIMatch = matchData.ai_difficulty != null;
        const isAITurn = isAIMatch && currentColor === 2;

        if (isAITurn && !hexEngine.winner() && lastAITurnProcessed.current !== matchData.turn) {
          lastAITurnProcessed.current = matchData.turn;
          makeAIMove(hexEngine, matchData);
        }
      }
    } catch (e) {
      console.error('Failed to load match:', e);
    } finally {
      loadInFlight.current = false;
    }
  }, [matchId, navigate]);

  // Timer countdown effect
  useEffect(() => {
    if (!match || match.status !== 'active' || !match.turn_timer_seconds || !match.turn_started_at) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const turnStartTime = new Date(match.turn_started_at!).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - turnStartTime) / 1000);
      const remaining = Math.max(0, match.turn_timer_seconds! - elapsed);

      setTimeRemaining(remaining);

      // If time runs out, reload to see the forfeit
      if (remaining === 0) {
        setTimeout(() => loadMatch(), 2000);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [match, loadMatch]);

  const makeAIMove = async (hexEngine: Hex, matchData: MatchData, retryCount = 0) => {
    // Prevent concurrent AI moves
    if (aiMoveInProgress.current) {
      return;
    }

    aiMoveInProgress.current = true;
    setAiThinking(true);

    try {
      const difficulty = matchData.ai_difficulty || 'medium';
      let cell: number;
      let reasoning: string;

      if (difficulty === 'expert' || difficulty === 'hard') {
        // Use server-side MCTS AI for hard/expert
        const { data: aiResult, error: aiError } = await supabase.functions.invoke('ai-move-v2', {
          body: {
            matchId: matchData.id,
            difficulty
          }
        });

        if (aiError || !aiResult?.cell) {
          // Fallback to client AI if server fails
          const ai = new SimpleHexAI(hexEngine, difficulty as AIDifficulty);
          const result = ai.getMove();
          cell = result.cell;
          reasoning = result.reasoning + ' (fallback)';
        } else {
          cell = aiResult.cell;
          reasoning = aiResult.reasoning;
        }
      } else {
        // Use client-side AI for easy/medium (instant)
        const ai = new SimpleHexAI(hexEngine, difficulty as AIDifficulty);
        const result = ai.getMove();
        cell = result.cell;
        reasoning = result.reasoning;
      }

      const isAggressive = reasoning.includes('🛑') || reasoning.includes('🧠') || reasoning.includes('🛡️');
      setAiReasoning(reasoning);

      // Optimistically apply move locally
      hexEngine.play(cell);
      setIsAggressiveMove(isAggressive);
      playPlaceSound();
      setAiThinking(false);
      aiMoveInProgress.current = false;

      // Generate action_id for idempotency
      const actionId = crypto.randomUUID();

      // Apply move through server for validation and persistence
      const { data: result, error } = await supabase.functions.invoke('apply-ai-move', {
        body: {
          matchId: matchData.id,
          cell,
          actionId
        }
      });

      if (error || !result?.success) {
        const errorMsg = result?.error || error?.message || 'Failed to apply AI move';

        console.error('AI move failed:', {
          error: errorMsg,
          statusCode: error?.status,
          cell,
          matchId: matchData.id,
          turn: matchData.turn,
          retryCount
        });

        // Handle rate limits with exponential backoff retry
        if ((errorMsg.includes('Rate limit') || error?.status === 429) && retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
          console.log(`Rate limited, retrying in ${delay}ms...`);
          setTimeout(() => {
            // Re-enable AI move for retry
            aiMoveInProgress.current = false;
            setAiThinking(false);
            makeAIMove(hexEngine, matchData, retryCount + 1);
          }, delay);
          return;
        }

        // Don't throw on "Not your turn" - this can happen if another move was already made
        if (!errorMsg.includes('Not your turn') && !errorMsg.includes('Not AI turn')) {
          toast.error('Computer move failed', {
            description: retryCount > 0 ? 'Failed after retries' : 'The game will continue when ready'
          });
        }
        return;
      }

      if (result.winner) {
        console.log('AI move resulted in win:', result.winner);
        // AI won, play lose sound for player
        playLoseSound();
      }

      // Still load match to ensure server sync, but the UI is already updated
      await loadMatch();
    } catch (error) {
      console.error('AI move error:', error);
      toast.error('Unexpected error', {
        description: 'AI move encountered an error'
      });
    } finally {
      aiMoveInProgress.current = false;
      setAiThinking(false);
    }
  };

  // Discord local AI move handler
  const makeDiscordLocalAIMove = useCallback(
    async (baseEngine: Hex, difficulty: AIDifficulty) => {
      if (aiMoveInProgress.current) return;
      aiMoveInProgress.current = true;
      setAiThinking(true);

      try {
        // Small delay for better UX
        await new Promise((resolve) => setTimeout(resolve, 500));

        const ai = new SimpleHexAI(baseEngine, difficulty);
        const result = ai.getMove();

        const isAggressive =
          result.reasoning.includes('🛑') ||
          result.reasoning.includes('🧠') ||
          result.reasoning.includes('🛡️');
        setAiReasoning(result.reasoning);
        setIsAggressiveMove(isAggressive);

        const nextEngine = baseEngine.clone();
        nextEngine.play(result.cell);

        setEngine(nextEngine);
        setLastMove(result.cell);
        playPlaceSound();

        // Advance turn locally
        setMatch((prev) => (prev ? { ...prev, turn: prev.turn + 1 } : null));

        // Check for win
        const winner = nextEngine.winner();
        if (winner) {
          setWinningPath(nextEngine.getWinningPath() || []);
          setMatch((prev) => (prev ? { ...prev, status: 'finished', winner } : null));
          playLoseSound(); // AI won
          toast.success('Game Over', {
            description: 'Computer wins!',
            duration: 5000,
          });
        }
      } catch (e) {
        console.error('[Discord Match] AI move failed:', e);
        toast.error('Computer move failed');
      } finally {
        aiMoveInProgress.current = false;
        setAiThinking(false);
      }
    },
    [playPlaceSound, playLoseSound]
  );

  const handleCellClick = useCallback(async (cell: number) => {
    if (!engine || !match) return;

    // Discord local match handling
    if (isDiscordLocalMatch) {
      if (moveInProgress.current || aiMoveInProgress.current) return;

      const currentColor = match.turn % 2 === 1 ? 1 : 2;
      if (currentColor !== 1) {
        playErrorSound();
        toast.error('Wait for the computer to move');
        return;
      }

      if (!engine.legal(cell)) {
        playErrorSound();
        toast.error('Invalid move');
        return;
      }

      moveInProgress.current = true;
      setIsAggressiveMove(false);
      playPlaceSound();

      // Apply move locally
      const newEngine = engine.clone();
      newEngine.play(cell);
      setEngine(newEngine);
      setLastMove(cell);
      setMatch(prev => prev ? { ...prev, turn: prev.turn + 1 } : null);

      // Check for win
      const winner = newEngine.winner();
      if (winner) {
        setWinningPath(newEngine.getWinningPath() || []);
        setMatch(prev => prev ? { ...prev, status: 'finished', winner } : null);
        playWinSound();
        toast.success('Victory!', {
          description: 'You won!',
          duration: 5000
        });
        moveInProgress.current = false;
        return;
      }

      moveInProgress.current = false;

      // Trigger AI move
      if (match.ai_difficulty && !newEngine.winner()) {
        setTimeout(() => {
          makeDiscordLocalAIMove(newEngine, match.ai_difficulty!);
        }, 100);
      }
      return;
    }

    // Standard Supabase flow (requires user)
    if (!user) return;

    // Prevent duplicate submissions
    if (moveInProgress.current) {
      return;
    }

    // Spectators can't make moves
    if (isSpectating) {
      playErrorSound();
      toast.error('Spectators cannot make moves');
      return;
    }

    // Check if it's user's turn
    const currentColor = match.turn % 2 === 1 ? 1 : 2;
    const currentPlayer = players.find(p => p.color === currentColor);
    const isAITurn = !!match.ai_difficulty && currentColor === 2;
    if (isAITurn) {
      playErrorSound();
      toast.error('Wait for the computer to move');
      return;
    }
    if (!currentPlayer || currentPlayer.profile_id !== user.id) {
      playErrorSound();
      toast.error('Not your turn');
      return;
    }

    // Client-side validation
    if (!engine.legal(cell)) {
      playErrorSound();
      toast.error('Invalid move');
      return;
    }

    // Lock to prevent duplicate submissions
    moveInProgress.current = true;

    // Play place sound immediately for responsive feedback
    setIsAggressiveMove(false);
    playPlaceSound();

    // Optimistic UI update
    const optimisticEngine = engine.clone();
    optimisticEngine.play(cell);
    setEngine(optimisticEngine);
    setLastMove(cell);

    // Generate action_id for idempotency
    const actionId = crypto.randomUUID();

    try {
      // Server-side move application with validation
      const { data: result, error } = await supabase.functions.invoke('apply-move', {
        body: {
          matchId: match.id,
          cell,
          actionId
        }
      });

      if (error || !result?.success) {
        // Revert optimistic update on error
        await loadMatch();

        // Check for specific error types
        if (error?.message?.includes('Rate limit') || result?.error?.includes('Rate limit')) {
          toast.error('Too many moves too quickly');
          return;
        }
        if (result?.error?.includes('Match state changed')) {
          return;
        }
        toast.error(result?.error || error?.message || 'Invalid move');
        return;
      }

      // Check if this was a cached/duplicate result
      if (result.cached) {
        return;
      }

      // Reload match for server state sync
      await loadMatch();

      const winner = result.winner;
      if (winner) {
        const isVictory = winner === currentPlayer.color;
        // Play win/lose sound
        if (isVictory) {
          playWinSound();
        } else {
          playLoseSound();
        }
        toast.success(isVictory ? 'Victory!' : 'Game Over', {
          description: isVictory
            ? `You won as ${winner === 1 ? 'Indigo' : 'Ochre'}!`
            : `${winner === 1 ? 'Indigo' : 'Ochre'} wins!`,
          duration: 5000
        });
      }
    } catch (error) {
      // Revert optimistic update
      await loadMatch();
      console.error('Move error:', error);
      toast.error('Failed to make move');
    } finally {
      // Release lock
      moveInProgress.current = false;
    }
  }, [engine, match, user, players, isSpectating, isDiscordLocalMatch, loadMatch, makeDiscordLocalAIMove, playPlaceSound, playWinSound, playLoseSound, playErrorSound]);

  const handleSwapColors = useCallback(async () => {
    if (!engine || !match || !user) return;

    const currentColor = match.turn % 2 === 1 ? 1 : 2;
    const currentPlayer = players.find(p => p.color === currentColor);
    if (!currentPlayer || currentPlayer.profile_id !== user.id) {
      toast.error('Not your turn');
      return;
    }

    // Generate action_id for idempotency
    const actionId = crypto.randomUUID();

    try {
      // Server-side pie rule swap with validation
      const { data: result, error } = await supabase.functions.invoke('apply-move', {
        body: {
          matchId: match.id,
          cell: null,
          actionId
        }
      });

      if (error || !result?.success) {
        toast.error(result?.error || error?.message || 'Cannot swap colors');
        return;
      }

      if (result.cached) {
        console.log('Swap already processed');
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

  const handleRematch = async () => {
    if (!matchId || !isPlayer) return;

    setRequestingRematch(true);
    try {
      const { data, error } = await supabase.functions.invoke('rematch-lobby', {
        body: { matchId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Rematch lobby created! 🎮', {
        description: `Navigating to new lobby...`,
        duration: 3000
      });

      navigate(`/lobby/${data.lobby.id}`);
    } catch (error: any) {
      console.error('Rematch error:', error);
      toast.error('Failed to create rematch', {
        description: error.message
      });
    } finally {
      setRequestingRematch(false);
    }
  };

  const handlePlayAgainAI = () => {
    if (!match) return;
    navigate('/lobby', {
      state: {
        createAI: true,
        difficulty: match.ai_difficulty,
        boardSize: match.size
      }
    });
  };

  const handleDebugFinish = async () => {
    if (!match || !matchId) return;

    setDebugFinishing(true);
    try {
      const { data, error } = await supabase.functions.invoke('debug-finish-match', {
        body: { matchId }
      });

      if (error) throw error;

      toast.success('🔧 Debug: Match finished!', {
        description: 'You have been declared the winner'
      });

      // Reload match to see updated state
      await loadMatch();
    } catch (error: any) {
      console.error('Debug finish error:', error);
      toast.error('Failed to finish match', {
        description: error.message
      });
    } finally {
      setDebugFinishing(false);
    }
  };

  if (!match || !engine) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (match?.status === 'waiting') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background space-y-6">
        <div className="relative">
          <div className="absolute inset-0 bg-ochre/20 blur-xl rounded-full animate-pulse" />
          <Loader2 className="h-16 w-16 animate-spin text-ochre relative z-10" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold font-display">Searching for opponent...</h2>
          <p className="text-muted-foreground font-mono">13×13 • Competitive • ELO Rated</p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/lobby')}
          className="mt-8"
        >
          Cancel
        </Button>
      </div>
    );
  }

  const player1 = players.find(p => p.color === 1);
  const player2 = players.find(p => p.color === 2);
  const currentColor = match.turn % 2 === 1 ? 1 : 2;
  const currentPlayer = players.find(p => p.color === currentColor);
  const userPlayer = players.find(p => p.profile_id === user?.id || p.profile_id === 'discord-player');
  const isPlayer = !!userPlayer || isDiscordLocalMatch;
  const isAIMatch = match.ai_difficulty != null;
  const isAITurn = isAIMatch && currentColor === 2;

  // Build Discord avatar URL if available
  const getDiscordAvatarUrl = (userId?: string, avatarHash?: string | null) => {
    if (!userId || !avatarHash) return undefined;
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=128`;
  };

  // Get Discord avatar URL for the human player in Discord local matches
  const discordAvatarUrl = isDiscordLocalMatch && discordUser?.avatar
    ? getDiscordAvatarUrl(discordUser.id, discordUser.avatar)
    : undefined;

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
            {/* DEBUG BUTTON - Remove in production */}
            {match.status === 'active' && isPlayer && !isDiscordLocalMatch && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDebugFinish}
                disabled={debugFinishing}
                className="opacity-50 hover:opacity-100"
              >
                {debugFinishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : '🔧'}
                {debugFinishing ? 'Finishing...' : 'Debug: Win'}
              </Button>
            )}

            {match.status === 'finished' && !isAIMatch && isPlayer && (
              <Button
                variant="default"
                size="sm"
                onClick={handleRematch}
                disabled={requestingRematch}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {requestingRematch ? 'Creating...' : 'Rematch'}
              </Button>
            )}
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
            <MusicControls
              isPlaying={isMusicPlaying}
              volume={musicVolume}
              isMuted={isMusicMuted}
              onToggleMusic={toggleMusic}
              onToggleMute={toggleMusicMute}
              onVolumeChange={updateMusicVolume}
            />
            {isAIMatch && match.ai_difficulty === 'expert' && aiReasoning && (
              <Button
                variant={showAIReasoning ? "default" : "outline"}
                size="sm"
                onClick={() => setShowAIReasoning(!showAIReasoning)}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {showAIReasoning ? 'Hide' : 'Explain Move'}
              </Button>
            )}
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
                timeRemaining={currentColor === 1 && match.status === 'active' ? timeRemaining ?? undefined : undefined}
                isAI={player1.is_bot}
                avatarColor={player1.avatar_color}
                discordAvatarUrl={player1.profile_id === 'discord-player' ? discordAvatarUrl : undefined}
                elo={player1.elo}
              />
            )}
          </div>

          {/* Game Board */}
          <div className="order-1 lg:order-2 flex flex-col items-center gap-6">
            {showAIReasoning && aiReasoning && (
              <div className="p-4 border rounded-lg bg-card max-w-md">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-mono text-sm font-medium mb-1">AI Reasoning</p>
                    <p className="text-sm text-muted-foreground">{aiReasoning}</p>
                  </div>
                </div>
              </div>
            )}

            <HexBoard
              size={match.size}
              board={engine.board}
              lastMove={lastMove}
              winningPath={winningPath}
              onCellClick={handleCellClick}
              skin={boardSkin}
              isAggressive={isAggressiveMove}
              disabled={
                match.status !== 'active' ||
                !(currentPlayer?.profile_id === user?.id || (isDiscordLocalMatch && currentPlayer?.profile_id === 'discord-player')) ||
                isAITurn ||
                isSpectating ||
                !isPlayer
              }
              canSwap={
                match.pie_rule &&
                engine.ply === 1 &&
                !engine.swapped &&
                (currentPlayer?.profile_id === user?.id || (isDiscordLocalMatch && currentPlayer?.profile_id === 'discord-player')) &&
                match.status === 'active'
              }
              onSwapColors={handleSwapColors}
            />

            {match.status === 'active' && (
              <p className="font-mono text-sm text-muted-foreground">
                {isSpectating
                  ? `Watching ${currentPlayer?.username}'s turn`
                  : (currentPlayer?.profile_id === user?.id || (isDiscordLocalMatch && currentPlayer?.profile_id === 'discord-player'))
                    ? "Your turn"
                    : `Waiting for ${currentPlayer?.username}...`}
              </p>
            )}

            {match.status === 'finished' && match.winner && (
              <div className="mt-6 p-8 border-2 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center space-y-4">
                  <div className="text-6xl mb-2">
                    {match.winner === userPlayer?.color ? '🎉' : match.winner === 2 && isAIMatch ? '🤖' : '💫'}
                  </div>
                  <h2 className="font-body text-4xl font-bold text-primary">
                    {match.winner === userPlayer?.color ? '🏆 Victory!' : isAIMatch && match.winner === 2 ? '🤖 Computer Wins!' : '🎮 Game Over'}
                  </h2>
                  <div className="space-y-3 p-4 bg-card rounded-lg border">
                    <p className="text-2xl font-bold" style={{ color: match.winner === 1 ? 'hsl(223 45% 29%)' : 'hsl(40 76% 43%)' }}>
                      {match.winner === 1 ? player1?.username : player2?.username} wins!
                    </p>
                    <div className="flex items-center justify-center gap-3 text-lg font-semibold">
                      <span className="px-3 py-1 rounded-full" style={{
                        backgroundColor: match.winner === 1 ? 'hsl(223 45% 29% / 0.2)' : 'hsl(40 76% 43% / 0.2)',
                        color: match.winner === 1 ? 'hsl(223 45% 29%)' : 'hsl(40 76% 43%)'
                      }}>
                        {match.winner === 1 ? '🔵 Indigo' : '🟡 Ochre'}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">
                        {match.winner === 1 ? 'West ← → East' : 'North ↑ ↓ South'}
                      </span>
                    </div>
                    {userPlayer?.rating_change !== undefined && userPlayer.rating_change !== null && (
                      <div className={`text-lg font-bold ${userPlayer.rating_change >= 0 ? 'text-green-600' : 'text-red-500'} animate-in zoom-in duration-500 delay-300`}>
                        {userPlayer.rating_change > 0 ? '+' : ''}{userPlayer.rating_change} ELO
                      </div>
                    )}
                  </div>
                  {isAIMatch && match.winner === userPlayer?.color && (
                    <p className="text-lg text-primary font-semibold">
                      🎯 You defeated the {match.ai_difficulty?.toUpperCase()} AI!
                    </p>
                  )}
                  {isAIMatch && match.winner !== userPlayer?.color && (
                    <div className="text-base text-muted-foreground space-y-1">
                      <p className="font-semibold">The AI found a winning path!</p>
                      <p className="text-sm italic">Analyze the board and try a different strategy next time.</p>
                    </div>
                  )}

                  {/* Rematch Buttons */}
                  <div className="flex gap-3 justify-center pt-4">
                    {isAIMatch ? (
                      <Button
                        size="lg"
                        onClick={handlePlayAgainAI}
                        className="gap-2 font-semibold"
                      >
                        <RefreshCw className="h-5 w-5" />
                        Play Again
                      </Button>
                    ) : isPlayer && (
                      <Button
                        size="lg"
                        onClick={handleRematch}
                        disabled={requestingRematch}
                        className="gap-2 font-semibold"
                      >
                        <RefreshCw className={`h-5 w-5 ${requestingRematch ? 'animate-spin' : ''}`} />
                        {requestingRematch ? 'Creating Rematch...' : 'Instant Rematch'}
                      </Button>
                    )}
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => navigate('/lobby')}
                      className="gap-2"
                    >
                      <ArrowLeft className="h-5 w-5" />
                      {isAIMatch ? 'New Game' : 'Back to Lobby'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Player 2 Panel */}
          <div className="order-3">
            {player2 && (
              <div className="relative">
                <PlayerPanel
                  username={player2.username}
                  color={2}
                  isCurrentTurn={currentColor === 2 && match.status === 'active'}
                  timeRemaining={currentColor === 2 && match.status === 'active' ? timeRemaining ?? undefined : undefined}
                  isAI={player2.is_bot}
                  avatarColor={player2.avatar_color}
                  discordAvatarUrl={player2.profile_id === 'discord-player' ? discordAvatarUrl : undefined}
                  elo={player2.elo}
                />
                {aiThinking && isAIMatch && currentColor === 2 && (
                  <div className="mt-3 p-3 rounded-lg bg-card border border-ochre/30 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 text-sm text-ochre">
                      <div className="animate-spin h-4 w-4 border-2 border-ochre border-t-transparent rounded-full" />
                      <span className="font-medium">Computing move...</span>
                    </div>
                  </div>
                )}
              </div>
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
