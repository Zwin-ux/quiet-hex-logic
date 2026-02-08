import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useMatchState, type GameKey } from '@/hooks/useMatchState';
import { useMatchActions } from '@/hooks/useMatchActions';
import { useAIOpponent } from '@/hooks/useAIOpponent';
import { useMatchTimer } from '@/hooks/useMatchTimer';
import { useAmbientMusic } from '@/hooks/useAmbientMusic';
import { TutorialOverlay } from '@/components/TutorialOverlay';
import { PlayerPanel } from '@/components/PlayerPanel';
import { MatchHeader } from '@/components/match/MatchHeader';
import { MatchBoard } from '@/components/match/MatchBoard';
import { MatchSidebar } from '@/components/match/MatchSidebar';
import { MatchLoading, MatchWaiting } from '@/components/match/MatchLoadingStates';
import { toast } from 'sonner';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function Match() {
  useDocumentTitle('Match');
  const { matchId } = useParams();
  const [showTutorial, setShowTutorial] = useState(false);
  const [showAIReasoning, setShowAIReasoning] = useState(false);
  const [requestingRematch, setRequestingRematch] = useState(false);

  const state = useMatchState(matchId);
  const {
    match, setMatch, players, engine, setEngine,
    lastMove, setLastMove, winningPath, setWinningPath,
    boardSkin, ratingResult, setRatingResult,
    showConfetti, setShowConfetti,
    lastAITurnProcessed,
    isDiscordLocalMatch, isLocalMatch, discordLocalInit,
    spectators, isSpectating, joinAsSpectator, leaveAsSpectator,
    user, discordUser, isDiscordEnvironment,
    loadMatch, navigate,
  } = state;

  const actions = useMatchActions({
    match, setMatch, engine, setEngine, players, user,
    isDiscordLocalMatch, isLocalMatch, isSpectating,
    setLastMove, setWinningPath, setRatingResult, setShowConfetti,
    loadMatch, navigate,
  });

  const ai = useAIOpponent({
    setEngine, setMatch, setLastMove, setWinningPath, setShowConfetti,
    loadMatch,
    playPlaceSound: actions.playPlaceSound,
    playWinSound: actions.playWinSound,
    playLoseSound: actions.playLoseSound,
  });

  const { timeRemaining } = useMatchTimer({ match, endMatch: actions.endMatch });

  const music = useAmbientMusic();

  // Stop music when leaving
  useEffect(() => {
    return () => { music.stopMusic(); };
  }, [music.stopMusic]);

  // Trigger AI move when it's AI's turn (for server-backed matches)
  useEffect(() => {
    if (!match || !engine || isDiscordLocalMatch || isLocalMatch) return;
    if (match.status !== 'active') return;
    const currentColor = match.turn % 2 === 1 ? 1 : 2;
    const isAIMatch = match.ai_difficulty != null;
    const isAITurn = isAIMatch && currentColor === 2;
    if (isAITurn && !engine.winner() && lastAITurnProcessed.current !== match.turn) {
      lastAITurnProcessed.current = match.turn;
      ai.makeAIMove(engine, match);
    }
  }, [match, engine, isDiscordLocalMatch]);

  /** Generic Discord local move handler for all games. */
  const handleDiscordLocalMove = useCallback((move: any) => {
    if (!engine || !match) return;
    if (actions.moveInProgress.current || ai.aiMoveInProgress.current) return;
    const gameKey = (match.game_key ?? 'hex') as string;
    const currentColor = match.turn % 2 === 1 ? 1 : 2;
    if (currentColor !== 1) {
      actions.playErrorSound();
      toast.error('Wait for the computer to move');
      return;
    }
    if (!engine.isLegal(move)) {
      actions.playErrorSound();
      toast.error('Invalid move');
      return;
    }

    actions.moveInProgress.current = true;
    ai.setIsAggressiveMove(false);
    actions.playPlaceSound();

    const newEngine = engine.clone();
    newEngine.applyMove(move);
    setEngine(newEngine);
    setLastMove(move);
    setMatch(prev => prev ? { ...prev, turn: prev.turn + 1 } : null);

    const winner = newEngine.winner();
    if (winner) {
      if (gameKey === 'hex') {
        setWinningPath((newEngine as any).getWinningPath?.() || (newEngine as any).hex?.getWinningPath?.() || []);
      }
      setMatch(prev => prev ? { ...prev, status: 'finished', winner } : null);
      actions.playWinSound();
      setShowConfetti(true);
      toast.success('Victory!', { description: 'You won!', duration: 5000 });
      actions.moveInProgress.current = false;
      return;
    }

    if (newEngine.isDraw()) {
      setMatch(prev => prev ? { ...prev, status: 'finished', winner: null, result: 'draw' } : null);
      toast.success('Draw', { description: 'Game ended in a draw', duration: 5000 });
      actions.moveInProgress.current = false;
      return;
    }

    actions.moveInProgress.current = false;

    if (match.ai_difficulty && !newEngine.winner() && !ai.aiMoveInProgress.current) {
      setTimeout(() => {
        if (!ai.aiMoveInProgress.current) {
          ai.makeDiscordLocalAIMove(newEngine, match.ai_difficulty!, gameKey);
        }
      }, 100);
    }
  }, [engine, match, actions, ai, setEngine, setLastMove, setMatch, setWinningPath, setShowConfetti]);

  const handleMove = useCallback((move: any) => {
    if (isDiscordLocalMatch) {
      handleDiscordLocalMove(move);
      return;
    }
    actions.handleMove(move);
  }, [isDiscordLocalMatch, actions, handleDiscordLocalMove]);

  // Loading / Waiting states
  if (!match || !engine) return <MatchLoading />;
  if (match.status === 'waiting') return <MatchWaiting onCancel={() => navigate('/lobby')} />;

  const player1 = players.find(p => p.color === 1);
  const player2 = players.find(p => p.color === 2);
  const currentColor = match.turn % 2 === 1 ? 1 : 2;
  const currentPlayer = players.find(p => p.color === currentColor);
  const userPlayer = players.find(p => p.profile_id === user?.id || p.profile_id === 'discord-player');
  const isPlayer = !!userPlayer || isDiscordLocalMatch || isLocalMatch;
  const isAIMatch = match.ai_difficulty != null;
  const isAITurn = isAIMatch && currentColor === 2;
  const gameKey = (match.game_key ?? 'hex') as string;

  const discordAvatarUrl = isDiscordLocalMatch && discordUser?.avatar
    ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=128`
    : undefined;

  // Local matches aren't associated with an authenticated profile; allow the current side-to-move to act.
  const userIdForMoves = isLocalMatch ? currentPlayer?.profile_id : user?.id;

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
    } catch { toast.error('Failed to toggle spectator mode'); }
  };

  const handleRematch = async () => {
    if (!matchId) return;
    setRequestingRematch(true);
    await actions.handleRematch(matchId, isPlayer);
    setRequestingRematch(false);
  };

  return (
    <div className="min-h-screen ios-safe-area">
      {showTutorial && <TutorialOverlay onClose={() => setShowTutorial(false)} />}

      <div className="max-w-7xl mx-auto px-3 py-4 md:p-8">
        <MatchHeader
          match={match}
          isAIMatch={isAIMatch}
          isPlayer={isPlayer}
          isSpectating={isSpectating}
          isLocalMatch={isLocalMatch}
          userPlayer={userPlayer}
          showAIReasoning={showAIReasoning}
          aiReasoning={ai.aiReasoning}
          requestingRematch={requestingRematch}
          drawOfferedBy={match.draw_offered_by}
          musicControls={{
            isPlaying: music.isPlaying,
            volume: music.volume,
            isMuted: music.isMuted,
            toggleMusic: music.toggleMusic,
            toggleMute: music.toggleMute,
            updateVolume: music.updateVolume,
          }}
          onBack={() => navigate('/lobby')}
          onRematch={handleRematch}
          onForfeit={actions.handleForfeit}
          onOfferDraw={actions.handleOfferDraw}
          onAcceptDraw={() => actions.handleRespondDraw(true)}
          onDeclineDraw={() => actions.handleRespondDraw(false)}
          onToggleSpectate={handleToggleSpectate}
          onShowTutorial={() => setShowTutorial(true)}
          onToggleAIReasoning={() => setShowAIReasoning(!showAIReasoning)}
        />

        <div className="flex flex-col lg:grid lg:grid-cols-[280px_1fr_280px] gap-4 lg:gap-6 items-start">
          <MatchSidebar
            match={match}
            player1={player1}
            player2={player2}
            currentColor={currentColor}
            isAIMatch={isAIMatch}
            aiThinking={ai.aiThinking}
            timeRemaining={timeRemaining}
            discordAvatarUrl={discordAvatarUrl}
            spectators={spectators}
          />

          <MatchBoard
            match={match}
            gameKey={gameKey}
            engine={engine}
            boardSkin={boardSkin}
            lastMove={lastMove}
            winningPath={winningPath}
            isAggressiveMove={ai.isAggressiveMove}
            currentColor={currentColor}
            currentPlayer={currentPlayer}
            userPlayer={userPlayer}
            player1={player1}
            player2={player2}
            isAIMatch={isAIMatch}
            isAITurn={isAITurn}
            isPlayer={isPlayer}
            isSpectating={isSpectating}
            isDiscordLocalMatch={isDiscordLocalMatch}
            isLocalMatch={isLocalMatch}
            aiThinking={ai.aiThinking}
            showAIReasoning={showAIReasoning}
            aiReasoning={ai.aiReasoning}
            showConfetti={showConfetti}
            ratingResult={ratingResult}
            requestingRematch={requestingRematch}
            userId={userIdForMoves}
            onMove={handleMove}
            onSwapColors={actions.handleSwapColors}
            onRematch={handleRematch}
            onPlayAgainAI={actions.handlePlayAgainAI}
            onNavigate={navigate}
          />
        </div>
      </div>
    </div>
  );
}
