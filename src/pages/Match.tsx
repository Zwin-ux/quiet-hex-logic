import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useMatchState } from '@/hooks/useMatchState';
import { useMatchActions } from '@/hooks/useMatchActions';
import { useAIOpponent } from '@/hooks/useAIOpponent';
import { useMatchTimer } from '@/hooks/useMatchTimer';
import { useAmbientMusic } from '@/hooks/useAmbientMusic';
import { TutorialOverlay } from '@/components/TutorialOverlay';
import { SiteFrame } from '@/components/board/SiteFrame';
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
    isDiscordLocalMatch, isLocalMatch, isLocalAIMatch,
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

  const player1 = players.find(p => p.color === 1);
  const player2 = players.find(p => p.color === 2);
  const currentColor = match?.turn ? (match.turn % 2 === 1 ? 1 : 2) : 1;
  const currentPlayer = players.find(p => p.color === currentColor);
  const userPlayer = players.find(p => p.profile_id === user?.id || p.profile_id === 'discord-player' || p.profile_id === 'local-player');
  const isPlayer = !!userPlayer || isDiscordLocalMatch || isLocalMatch || isLocalAIMatch;
  const isAIMatch = match?.ai_difficulty != null;
  const isAITurn = isAIMatch && currentColor === 2;
  const gameKey = (match?.game_key ?? 'hex') as string;

  // Trigger AI move when it's AI's turn (for server-backed matches)
  useEffect(() => {
    if (!match || !engine || isDiscordLocalMatch || isLocalMatch || isLocalAIMatch) return;
    if (match.status !== 'active') return;
    const currentColor = match.turn % 2 === 1 ? 1 : 2;
    const isAIMatch = match.ai_difficulty != null;
    const isAITurn = isAIMatch && currentColor === 2;
    if (isAITurn && !engine.winner() && lastAITurnProcessed.current !== match.turn) {
      lastAITurnProcessed.current = match.turn;
      ai.makeAIMove(engine, match);
    }
  }, [match, engine, isDiscordLocalMatch, isLocalMatch, isLocalAIMatch, lastAITurnProcessed, ai]);

  /** Browser-local AI move handler for all games. */
  const handleLocalAIMove = useCallback((move: any) => {
    if (!engine || !match) return;
    if (actions.moveInProgress.current || ai.aiMoveInProgress.current) return;
    const gameKey = (match.game_key ?? 'hex') as string;
    const currentColor = match.turn % 2 === 1 ? 1 : 2;
    const localPlayerId = isDiscordLocalMatch ? 'discord-player' : 'local-player';
    const humanCanAct = currentPlayer?.profile_id === localPlayerId;

    if (currentColor !== 1) {
      actions.playErrorSound();
      toast.error('Wait for the computer to move');
      return;
    }
    if (!humanCanAct) {
      actions.playErrorSound();
      toast.error('Not your turn');
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
          ai.makeLocalAIMove(newEngine, match.ai_difficulty!, gameKey);
        }
      }, 100);
    }
  }, [engine, match, currentPlayer, isDiscordLocalMatch, actions, ai, setEngine, setLastMove, setMatch, setWinningPath, setShowConfetti]);

  const handleMove = useCallback((move: any) => {
    if (isDiscordLocalMatch || isLocalAIMatch) {
      handleLocalAIMove(move);
      return;
    }
    actions.handleMove(move);
  }, [isDiscordLocalMatch, isLocalAIMatch, actions, handleLocalAIMove]);

  // Loading / Waiting states
  if (!match || !engine) return <MatchLoading />;
  if (match.status === 'waiting') return <MatchWaiting onCancel={() => navigate('/play')} />;

  const discordAvatarUrl = isDiscordLocalMatch && discordUser?.avatar
    ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=128`
    : undefined;

  // Local matches aren't associated with an authenticated profile; allow the current side-to-move to act.
  const userIdForMoves = (isLocalMatch || isLocalAIMatch) ? currentPlayer?.profile_id : user?.id;

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
    <SiteFrame showNav={false} className="ios-safe-area" contentClassName="max-w-[1500px] pb-12 pt-6 md:pt-8">
      {showTutorial && <TutorialOverlay onClose={() => setShowTutorial(false)} />}

      <div className="px-0 py-0">
        <MatchHeader
          match={match}
          isAIMatch={isAIMatch}
          isPlayer={isPlayer}
          isSpectating={isSpectating}
          isLocalMatch={isLocalMatch || isLocalAIMatch}
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
          onBack={() => navigate('/play')}
          onRematch={handleRematch}
          onForfeit={actions.handleForfeit}
          onOfferDraw={actions.handleOfferDraw}
          onAcceptDraw={() => actions.handleRespondDraw(true)}
          onDeclineDraw={() => actions.handleRespondDraw(false)}
          onToggleSpectate={handleToggleSpectate}
          onShowTutorial={() => setShowTutorial(true)}
          onToggleAIReasoning={() => setShowAIReasoning(!showAIReasoning)}
        />

        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[300px_minmax(0,1fr)_300px] lg:gap-6 items-start">
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
            isLocalMatch={isLocalMatch || isLocalAIMatch}
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
    </SiteFrame>
  );
}
