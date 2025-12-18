import { useEffect, useState, useCallback, useRef } from 'react';
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
import { Sparkles, BookOpen, ArrowLeft, Eye, EyeOff, RotateCcw, RefreshCw } from 'lucide-react';
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
}

export default function Match() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const { isDiscordEnvironment, discordUser } = useDiscord();
  
  const [match, setMatch] = useState<MatchData | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [engine, setEngine] = useState<Hex | null>(null);
  const [lastMove, setLastMove] = useState<number | undefined>();
  const [winningPath, setWinningPath] = useState<number[]>([]);
  const [showTutorial, setShowTutorial] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string>('');
  const [showAIReasoning, setShowAIReasoning] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [boardSkin, setBoardSkin] = useState<BoardSkin>(getSkinById('classic'));
  const [requestingRematch, setRequestingRematch] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [matchStartTime, setMatchStartTime] = useState<number>(Date.now());
  const [matchStats, setMatchStats] = useState<{ moves: number; duration: string } | null>(null);

  const loadMatchRef = useRef<() => Promise<void>>();

  const aiMoveInProgress = useRef(false);
  const moveInProgress = useRef(false);
  const lastAITurnProcessed = useRef<number | null>(null);
  const loadInFlight = useRef(false);

  const isDiscordLocalMatch = matchId?.startsWith('discord-');
  const discordLocalState = location.state as { 
    isDiscordLocal?: boolean; 
    aiDifficulty?: AIDifficulty; 
    boardSize?: number;
    discordUser?: { id: string; username: string; } 
  } | null;

  usePresence(isDiscordLocalMatch ? undefined : user?.id, isDiscordLocalMatch ? undefined : matchId);
  const { spectators, isSpectating, joinAsSpectator, leaveAsSpectator } = useSpectators(isDiscordLocalMatch ? undefined : matchId);
  const { playPlaceSound, playWinSound, playLoseSound, playErrorSound } = useGameSounds();
  const { 
    isPlaying: isMusicPlaying, 
    volume: musicVolume, 
    isMuted: isMusicMuted,
    toggleMusic, 
    toggleMute: toggleMusicMute, 
    updateVolume: updateMusicVolume,
    stopMusic 
  } = useAmbientMusic();

  useEffect(() => {
    return () => {
      stopMusic();
    };
  }, [stopMusic]);

  const formatDuration = useCallback((ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const loadBoardSkin = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('board_skin')
        .eq('id', user.id)
        .single();
      if (data && data.board_skin) {
        setBoardSkin(getSkinById(data.board_skin as string));
      }
    } catch (error) {
      console.error('Failed to load board skin:', error);
    }
  }, [user]);

  const triggerAIMove = useCallback(async (hexEngine: Hex, matchData: MatchData, retryCount = 0) => {
    if (aiMoveInProgress.current) return;
    aiMoveInProgress.current = true;
    setAiThinking(true);

    try {
      const difficulty = matchData.ai_difficulty || 'medium';
      let cell: number;
      let reasoning: string;

      if (difficulty === 'expert' || difficulty === 'hard') {
        const { data: aiResult, error: aiError } = await supabase.functions.invoke('ai-move-v2', {
          body: { matchId: matchData.id, difficulty }
        });

        if (aiError || !aiResult?.cell) {
          const ai = new SimpleHexAI(hexEngine, difficulty as AIDifficulty);
          const result = ai.getMove();
          cell = result.cell;
          reasoning = result.reasoning + ' (fallback)';
        } else {
          cell = aiResult.cell;
          reasoning = aiResult.reasoning;
        }
      } else {
        const ai = new SimpleHexAI(hexEngine, difficulty as AIDifficulty);
        const result = ai.getMove();
        cell = result.cell;
        reasoning = result.reasoning;
      }
      
      setAiReasoning(reasoning);
      const actionId = crypto.randomUUID();

      const { data: result, error } = await supabase.functions.invoke('apply-ai-move', {
        body: { matchId: matchData.id, cell, actionId }
      });

      if (error || !result?.success) {
        const errorMsg = result?.error || error?.message || 'Failed to apply AI move';
        if ((errorMsg.includes('Rate limit') || error?.status === 429) && retryCount < 3) {
          setTimeout(() => {
            aiMoveInProgress.current = false;
            setAiThinking(false);
            triggerAIMove(hexEngine, matchData, retryCount + 1);
          }, Math.pow(2, retryCount) * 1000);
          return;
        }
        return;
      }

      playPlaceSound();
      if (result.winner) playLoseSound();
      if (loadMatchRef.current) await loadMatchRef.current();
    } catch (error) {
      console.error('AI move error:', error);
    } finally {
      aiMoveInProgress.current = false;
      setAiThinking(false);
    }
  }, [playPlaceSound, playLoseSound]);

  const loadMatch = useCallback(async () => {
    if (!matchId || loadInFlight.current || isDiscordLocalMatch) return;
    loadInFlight.current = true;

    try {
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

      const { data: playersData } = await supabase
        .from('match_players')
        .select(`
          profile_id,
          color,
          is_bot,
          profiles!inner(username, avatar_color)
        `)
        .eq('match_id', matchId);

      if (playersData) {
        const enrichedPlayers: Player[] = playersData.map(p => {
          const profile = p.profiles as { username: string; avatar_color: string | null };
          return {
            profile_id: p.profile_id,
            color: p.color,
            is_bot: p.is_bot,
            username: profile.username,
            avatar_color: profile.avatar_color || 'indigo'
          };
        });
        
        if (matchData.ai_difficulty && !enrichedPlayers.find(p => p.color === 2)) {
          const difficultyLabel = matchData.ai_difficulty.charAt(0).toUpperCase() + matchData.ai_difficulty.slice(1);
          enrichedPlayers.push({
            profile_id: 'ai-player',
            color: 2,
            is_bot: true,
            username: `Computer (${difficultyLabel})`,
            avatar_color: 'slate'
          });
        }
        
        setPlayers(enrichedPlayers);
      }

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

      const winner = hexEngine.winner();
      if (winner) {
        setWinningPath(hexEngine.getWinningPath() || []);
      }

      if (matchData.status === 'active') {
        const currentColor = matchData.turn % 2 === 1 ? 1 : 2;
        const isAITurn = !!matchData.ai_difficulty && currentColor === 2;
        
        if (isAITurn && !hexEngine.winner() && lastAITurnProcessed.current !== matchData.turn) {
          lastAITurnProcessed.current = matchData.turn;
          triggerAIMove(hexEngine, matchData);
        }
      }
    } catch (e) {
      console.error('Failed to load match:', e);
    } finally {
      loadInFlight.current = false;
    }
  }, [matchId, navigate, isDiscordLocalMatch, triggerAIMove]);

  const makeDiscordLocalAIMove = useCallback(async (hexEngine: Hex, difficulty: AIDifficulty) => {
    if (aiMoveInProgress.current) return;
    aiMoveInProgress.current = true;
    setAiThinking(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const ai = new SimpleHexAI(hexEngine, difficulty);
      const result = ai.getMove();
      setAiReasoning(result.reasoning);

      hexEngine.play(result.cell);
      setEngine(hexEngine.clone());
      setLastMove(result.cell);
      playPlaceSound();
      setMatch(prev => prev ? { ...prev, turn: prev.turn + 1 } : null);

      const winner = hexEngine.winner();
      if (winner) {
        setWinningPath(hexEngine.getWinningPath() || []);
        setMatch(prev => prev ? { ...prev, status: 'finished', winner } : null);
        const duration = formatDuration(Date.now() - matchStartTime);
        setMatchStats({ moves: hexEngine.ply, duration });
        playLoseSound();
        toast.success('Game Over', { description: `Computer wins in ${hexEngine.ply} moves (${duration})` });
      }
    } finally {
      aiMoveInProgress.current = false;
      setAiThinking(false);
    }
  }, [playPlaceSound, playLoseSound, formatDuration, matchStartTime]);

  const handleCellClick = useCallback(async (cell: number) => {
    if (!engine || !match) return;

    if (isDiscordLocalMatch) {
      if (moveInProgress.current || aiMoveInProgress.current) return;
      const currentColor = match.turn % 2 === 1 ? 1 : 2;
      if (currentColor !== 1) {
        playErrorSound();
        return;
      }
      if (!engine.legal(cell)) {
        playErrorSound();
        return;
      }

      moveInProgress.current = true;
      playPlaceSound();
      const newEngine = engine.clone();
      newEngine.play(cell);
      setEngine(newEngine);
      setLastMove(cell);
      setMatch(prev => prev ? { ...prev, turn: prev.turn + 1 } : null);

      const winner = newEngine.winner();
      if (winner) {
        setWinningPath(newEngine.getWinningPath() || []);
        setMatch(prev => prev ? { ...prev, status: 'finished', winner } : null);
        const duration = formatDuration(Date.now() - matchStartTime);
        setMatchStats({ moves: newEngine.ply, duration });
        playWinSound();
        toast.success('Victory!', { description: `You won in ${newEngine.ply} moves (${duration})!` });
        moveInProgress.current = false;
        return;
      }

      moveInProgress.current = false;
      if (match.ai_difficulty && !newEngine.winner()) {
        setTimeout(() => makeDiscordLocalAIMove(newEngine, match.ai_difficulty!), 100);
      }
      return;
    }

    if (!user || moveInProgress.current || isSpectating) return;

    const currentColor = match.turn % 2 === 1 ? 1 : 2;
    const isPlayerTurn = players.find(p => p.color === currentColor)?.profile_id === user.id;
    if (!isPlayerTurn || !engine.legal(cell)) {
      playErrorSound();
      return;
    }

    moveInProgress.current = true;
    playPlaceSound();
    const actionId = crypto.randomUUID();

    try {
      const { data: result, error } = await supabase.functions.invoke('apply-move', {
        body: { matchId: match.id, cell, actionId }
      });

      if (error || !result?.success) {
        await loadMatch();
        toast.error(result?.error || 'Failed to make move');
        return;
      }

      await loadMatch();
      if (result.winner) {
        if (result.winner === currentColor) playWinSound();
        else playLoseSound();
      }
    } catch (error) {
      await loadMatch();
    } finally {
      moveInProgress.current = false;
    }
  }, [engine, match, user, players, isSpectating, isDiscordLocalMatch, loadMatch, makeDiscordLocalAIMove, playPlaceSound, playWinSound, playLoseSound, playErrorSound, formatDuration, matchStartTime]);

  const handleSwapColors = useCallback(async () => {
    if (!engine || !match || !user) return;
    const currentColor = match.turn % 2 === 1 ? 1 : 2;
    if (players.find(p => p.color === currentColor)?.profile_id !== user.id) return;

    const actionId = crypto.randomUUID();
    try {
      const { data: result, error } = await supabase.functions.invoke('apply-move', {
        body: { matchId: match.id, cell: null, actionId }
      });
      if (error || !result?.success) return;
      await loadMatch();
      toast.success('Colors swapped!');
    } catch (error) {
      console.error(error);
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
    if (!matchId || !user) return;
    setRequestingRematch(true);
    try {
      const { data, error } = await supabase.functions.invoke('rematch-lobby', {
        body: { matchId }
      });
      if (error || data?.error) throw new Error(error || data?.error);
      toast.success('Rematch lobby created!');
      navigate(`/lobby/${data.lobby.id}`);
    } catch (error) {
      const err = error as Error;
      toast.error('Failed to create rematch', { description: err.message });
    } finally {
      setRequestingRematch(false);
    }
  };

  const handlePlayAgainAI = () => {
    if (!match) return;
    navigate('/lobby', { 
      state: { createAI: true, difficulty: match.ai_difficulty, boardSize: match.size } 
    });
  };

  const handleDiscordRematch = useCallback(() => {
    if (!match) return;
    const boardSize = match.size;
    setEngine(new Hex(boardSize));
    setLastMove(undefined);
    setWinningPath([]);
    setMatch({ ...match, status: 'active', turn: 1, winner: null, turn_started_at: null });
    setMatchStartTime(Date.now());
    setMatchStats(null);
    setAiReasoning('');
    toast.success('New game started!');
  }, [match]);

  useEffect(() => {
    if (!matchId || isDiscordLocalMatch) return;
    if (!loading && !user && !isDiscordEnvironment) {
      navigate('/auth');
      return;
    }
    loadBoardSkin();
    loadMatch();
    
    const channel = supabase
      .channel(`match:${matchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` }, () => loadMatch())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'moves', filter: `match_id=eq.${matchId}` }, () => loadMatch())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, user, loading, navigate, isDiscordEnvironment, isDiscordLocalMatch, loadBoardSkin, loadMatch]);

  useEffect(() => {
    if (!match || match.status !== 'active' || !match.turn_timer_seconds || !match.turn_started_at) {
      setTimeRemaining(null);
      return;
    }
    const updateTimer = () => {
      const turnStartTime = new Date(match.turn_started_at!).getTime();
      const elapsed = Math.floor((Date.now() - turnStartTime) / 1000);
      const remaining = Math.max(0, match.turn_timer_seconds! - elapsed);
      setTimeRemaining(remaining);
      if (remaining === 0) setTimeout(() => loadMatch(), 2000);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [match, loadMatch]);

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

  const player1 = players.find(p => p.color === 1);
  const player2 = players.find(p => p.color === 2);
  const currentColor = match.turn % 2 === 1 ? 1 : 2;
  const currentPlayer = players.find(p => p.color === currentColor);
  const userPlayer = players.find(p => p.profile_id === user?.id || p.profile_id === 'discord-player');
  const isPlayer = !!userPlayer || isDiscordLocalMatch;
  const isAIMatch = match.ai_difficulty != null;
  const isAITurn = isAIMatch && currentColor === 2;

  const getDiscordAvatarUrl = (userId?: string, avatarHash?: string | null) => {
    if (!userId || !avatarHash) return undefined;
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=128`;
  };

  const discordAvatarUrl = isDiscordLocalMatch && discordUser?.avatar 
    ? getDiscordAvatarUrl(discordUser.id, discordUser.avatar) 
    : undefined;

  return (
    <div className="min-h-screen p-4 md:p-8">
      {showTutorial && <TutorialOverlay onClose={() => setShowTutorial(false)} />}
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-body text-3xl font-semibold mb-2">{isAIMatch ? 'Practice Mode' : 'Match in Progress'}</h1>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="font-mono">{match.size}×{match.size}</Badge>
              {match.status === 'finished' && match.winner && (
                <Badge className="bg-indigo text-primary-foreground">{match.winner === userPlayer?.color ? 'Victory' : 'Defeat'}</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {match.status === 'finished' && !isAIMatch && isPlayer && (
              <Button variant="default" size="sm" onClick={handleRematch} disabled={requestingRematch}>
                <RotateCcw className="h-4 w-4 mr-2" />
                {requestingRematch ? 'Creating...' : 'Rematch'}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate('/lobby')}><ArrowLeft className="h-4 w-4 mr-2" />Exit</Button>
            {!isAIMatch && !isPlayer && (
              <Button variant={isSpectating ? "default" : "outline"} size="sm" onClick={handleToggleSpectate}>
                {isSpectating ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {isSpectating ? 'Leave' : 'Watch'}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowTutorial(true)}><BookOpen className="h-4 w-4 mr-2" />How to Play</Button>
            <MusicControls isPlaying={isMusicPlaying} volume={musicVolume} isMuted={isMusicMuted} onToggleMusic={toggleMusic} onToggleMute={toggleMusicMute} onVolumeChange={updateMusicVolume} />
            {isAIMatch && match.ai_difficulty === 'expert' && aiReasoning && (
              <Button variant={showAIReasoning ? "default" : "outline"} size="sm" onClick={() => setShowAIReasoning(!showAIReasoning)}>
                <Sparkles className="h-4 w-4 mr-2" />
                {showAIReasoning ? 'Hide' : 'Explain Move'}
              </Button>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-[300px_1fr_300px] gap-8 items-start">
          <div className="order-2 lg:order-1">
            {player1 && <PlayerPanel username={player1.username} color={1} isCurrentTurn={currentColor === 1 && match.status === 'active'} timeRemaining={currentColor === 1 && match.status === 'active' ? timeRemaining ?? undefined : undefined} isAI={player1.is_bot} avatarColor={player1.avatar_color} discordAvatarUrl={player1.profile_id === 'discord-player' ? discordAvatarUrl : undefined} />}
          </div>
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
            <HexBoard size={match.size} board={engine.board} lastMove={lastMove} winningPath={winningPath} onCellClick={handleCellClick} skin={boardSkin} disabled={match.status !== 'active' || !(currentPlayer?.profile_id === user?.id || (isDiscordLocalMatch && currentPlayer?.profile_id === 'discord-player')) || isAITurn || isSpectating || !isPlayer} canSwap={match.pie_rule && engine.ply === 1 && !engine.swapped && (currentPlayer?.profile_id === user?.id || (isDiscordLocalMatch && currentPlayer?.profile_id === 'discord-player')) && match.status === 'active'} onSwapColors={handleSwapColors} />
            {match.status === 'active' && <p className="font-mono text-sm text-muted-foreground">{isSpectating ? `Watching ${currentPlayer?.username}'s turn` : (currentPlayer?.profile_id === user?.id || (isDiscordLocalMatch && currentPlayer?.profile_id === 'discord-player')) ? "Your turn" : `Waiting for ${currentPlayer?.username}...`}</p>}
            {match.status === 'finished' && match.winner && (
              <div className="mt-6 p-8 border-2 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center space-y-4">
                  <div className="text-6xl mb-2">{match.winner === userPlayer?.color ? '🎉' : match.winner === 2 && isAIMatch ? '🤖' : '💫'}</div>
                  <h2 className="font-body text-4xl font-bold text-primary">{match.winner === userPlayer?.color ? '🏆 Victory!' : isAIMatch && match.winner === 2 ? '🤖 Computer Wins!' : '🎮 Game Over'}</h2>
                  <div className="space-y-3 p-4 bg-card rounded-lg border">
                    <p className="text-2xl font-bold" style={{ color: match.winner === 1 ? 'hsl(223 45% 29%)' : 'hsl(40 76% 43%)' }}>{match.winner === 1 ? player1?.username : player2?.username} wins!</p>
                    <div className="flex items-center justify-center gap-3 text-lg font-semibold">
                      <span className="px-3 py-1 rounded-full" style={{ backgroundColor: match.winner === 1 ? 'hsl(223 45% 29% / 0.2)' : 'hsl(40 76% 43% / 0.2)', color: match.winner === 1 ? 'hsl(223 45% 29%)' : 'hsl(40 76% 43%)' }}>{match.winner === 1 ? '🔵 Indigo' : '🟡 Ochre'}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">{match.winner === 1 ? 'West ← → East' : 'North ↑ ↓ South'}</span>
                    </div>
                    {matchStats && (
                      <div className="pt-2 flex justify-center gap-6 text-sm font-mono border-t border-white/5 mt-2">
                        <div className="flex flex-col items-center">
                          <span className="text-muted-foreground uppercase text-[10px] tracking-wider">Moves Made</span>
                          <span className="text-primary font-bold">{matchStats.moves}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-muted-foreground uppercase text-[10px] tracking-wider">Time Played</span>
                          <span className="text-primary font-bold">{matchStats.duration}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  {isAIMatch && match.winner === userPlayer?.color && <p className="text-lg text-primary font-semibold">🎯 You defeated the {match.ai_difficulty?.toUpperCase()} AI!</p>}
                  {isAIMatch && match.winner !== userPlayer?.color && <div className="text-base text-muted-foreground space-y-1"><p className="font-semibold">The AI found a winning path!</p><p className="text-sm italic">Analyze the board and try a different strategy next time.</p></div>}
                  <div className="flex gap-3 justify-center pt-4">
                    {isDiscordEnvironment ? <Button size="lg" onClick={handleDiscordRematch} className="gap-2 font-semibold bg-primary hover:bg-primary/90"><RefreshCw className="h-5 w-5" />Quick Rematch</Button> : isAIMatch ? <Button size="lg" onClick={handlePlayAgainAI} className="gap-2 font-semibold"><RefreshCw className="h-5 w-5" />Play Again</Button> : isPlayer && <Button size="lg" onClick={handleRematch} disabled={requestingRematch} className="gap-2 font-semibold"><RefreshCw className={`h-5 w-5 ${requestingRematch ? 'animate-spin' : ''}`} />{requestingRematch ? 'Creating Rematch...' : 'Instant Rematch'}</Button>}
                    <Button size="lg" variant="outline" onClick={() => navigate('/lobby')} className="gap-2"><ArrowLeft className="h-5 w-5" />{isAIMatch ? 'New Game' : 'Back to Lobby'}</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="order-3">
            {player2 && (
              <div className="relative">
                <PlayerPanel username={player2.username} color={2} isCurrentTurn={currentColor === 2 && match.status === 'active'} timeRemaining={currentColor === 2 && match.status === 'active' ? timeRemaining ?? undefined : undefined} isAI={player2.is_bot} avatarColor={player2.avatar_color} discordAvatarUrl={player2.profile_id === 'discord-player' ? discordAvatarUrl : undefined} />
                {aiThinking && isAIMatch && currentColor === 2 && <div className="mt-3 p-3 rounded-lg bg-card border border-ochre/30 animate-in fade-in slide-in-from-top-2"><div className="flex items-center gap-2 text-sm text-ochre"><div className="animate-spin h-4 w-4 border-2 border-ochre border-t-transparent rounded-full" /><span className="font-medium">Computing move...</span></div></div>}
              </div>
            )}
            {!isAIMatch && spectators.length > 0 && <div className="mt-6 p-4 border rounded-lg bg-card"><div className="flex items-center gap-2 mb-3"><Eye className="h-4 w-4 text-muted-foreground" /><span className="font-mono text-sm text-muted-foreground">{spectators.length} watching</span></div><div className="space-y-2">{spectators.slice(0, 5).map((spectator) => <div key={spectator.profile_id} className="text-sm text-muted-foreground font-mono">{spectator.profiles?.username || 'Anonymous'}</div>)}{spectators.length > 5 && <div className="text-xs text-muted-foreground">+{spectators.length - 5} more</div>}</div></div>}
          </div>
        </div>
      </div>
    </div>
  );
}
