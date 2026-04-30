import { useCallback, useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useMatchState } from "@/hooks/useMatchState";
import { useMatchActions } from "@/hooks/useMatchActions";
import { useAIOpponent } from "@/hooks/useAIOpponent";
import { useMatchTimer } from "@/hooks/useMatchTimer";
import { useAmbientMusic } from "@/hooks/useAmbientMusic";
import { TutorialOverlay } from "@/components/TutorialOverlay";
import { AIThinkingIndicator } from "@/components/AIThinkingIndicator";
import { LiveSurface, SystemSection, UtilityPill, UtilityStrip } from "@/components/board/SystemSurface";
import { SiteFrame } from "@/components/board/SiteFrame";
import { MatchHeader } from "@/components/match/MatchHeader";
import { MatchBoard } from "@/components/match/MatchBoard";
import { MatchLoading, MatchWaiting } from "@/components/match/MatchLoadingStates";
import { toast } from "sonner";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

function formatClock(seconds: number | null) {
  if (seconds == null) return "off";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function Match() {
  useDocumentTitle("Match");
  const { matchId } = useParams();
  const location = useLocation();
  const [showTutorial, setShowTutorial] = useState(false);
  const [showAIReasoning, setShowAIReasoning] = useState(false);
  const [requestingRematch, setRequestingRematch] = useState(false);

  const state = useMatchState(matchId);
  const {
    match,
    setMatch,
    players,
    engine,
    setEngine,
    lastMove,
    setLastMove,
    winningPath,
    setWinningPath,
    boardSkin,
    ratingResult,
    setRatingResult,
    showConfetti,
    setShowConfetti,
    lastAITurnProcessed,
    isDiscordLocalMatch,
    isLocalMatch,
    isLocalAIMatch,
    spectators,
    isSpectating,
    joinAsSpectator,
    leaveAsSpectator,
    user,
    discordUser,
    loadMatch,
    navigate,
  } = state;

  const actions = useMatchActions({
    match,
    setMatch,
    engine,
    setEngine,
    players,
    user,
    isDiscordLocalMatch,
    isLocalMatch,
    isSpectating,
    setLastMove,
    setWinningPath,
    setRatingResult,
    setShowConfetti,
    loadMatch,
    navigate,
  });

  const ai = useAIOpponent({
    setEngine,
    setMatch,
    setLastMove,
    setWinningPath,
    setShowConfetti,
    loadMatch,
    playPlaceSound: actions.playPlaceSound,
    playWinSound: actions.playWinSound,
    playLoseSound: actions.playLoseSound,
  });

  const { timeRemaining } = useMatchTimer({ match, endMatch: actions.endMatch });
  const music = useAmbientMusic();

  useEffect(() => {
    return () => {
      music.stopMusic();
    };
  }, [music]);

  const player1 = players.find((p) => p.color === 1);
  const player2 = players.find((p) => p.color === 2);
  const currentColor = match?.turn ? (match.turn % 2 === 1 ? 1 : 2) : 1;
  const currentPlayer = players.find((p) => p.color === currentColor);
  const userPlayer = players.find(
    (p) => p.profile_id === user?.id || p.profile_id === "discord-player" || p.profile_id === "local-player",
  );
  const isPlayer = !!userPlayer || isDiscordLocalMatch || isLocalMatch || isLocalAIMatch;
  const isAIMatch = match?.ai_difficulty != null;
  const isAITurn = isAIMatch && currentColor === 2;
  const gameKey = (match?.game_key ?? "hex") as string;
  const worldContext = (location.state as { worldId?: string; worldName?: string } | null) ?? null;
  const isWorldContext = Boolean(worldContext?.worldId);

  useEffect(() => {
    if (!match || !engine || isDiscordLocalMatch || isLocalMatch || isLocalAIMatch) return;
    if (match.status !== "active") return;
    const turnColor = match.turn % 2 === 1 ? 1 : 2;
    const aiTurn = match.ai_difficulty != null && turnColor === 2;
    if (aiTurn && !engine.winner() && lastAITurnProcessed.current !== match.turn) {
      lastAITurnProcessed.current = match.turn;
      ai.makeAIMove(engine, match);
    }
  }, [match, engine, isDiscordLocalMatch, isLocalMatch, isLocalAIMatch, lastAITurnProcessed, ai]);

  const handleLocalAIMove = useCallback(
    (move: any) => {
      if (!engine || !match) return;
      if (actions.moveInProgress.current || ai.aiMoveInProgress.current) return;
      const localPlayerId = isDiscordLocalMatch ? "discord-player" : "local-player";
      const humanCanAct = currentPlayer?.profile_id === localPlayerId;

      if (currentColor !== 1) {
        actions.playErrorSound();
        toast.error("Wait for the computer to move");
        return;
      }
      if (!humanCanAct) {
        actions.playErrorSound();
        toast.error("Not your turn");
        return;
      }
      if (!engine.isLegal(move)) {
        actions.playErrorSound();
        toast.error("Invalid move");
        return;
      }

      actions.moveInProgress.current = true;
      ai.setIsAggressiveMove(false);
      actions.playPlaceSound();

      const newEngine = engine.clone();
      newEngine.applyMove(move);
      setEngine(newEngine);
      setLastMove(move);
      setMatch((prev) => (prev ? { ...prev, turn: prev.turn + 1 } : null));

      const winner = newEngine.winner();
      if (winner) {
        if (gameKey === "hex") {
          setWinningPath((newEngine as any).getWinningPath?.() || (newEngine as any).hex?.getWinningPath?.() || []);
        }
        setMatch((prev) => (prev ? { ...prev, status: "finished", winner } : null));
        actions.playWinSound();
        setShowConfetti(true);
        toast.success("Victory!", { description: "You won!", duration: 5000 });
        actions.moveInProgress.current = false;
        return;
      }

      if (newEngine.isDraw()) {
        setMatch((prev) => (prev ? { ...prev, status: "finished", winner: null, result: "draw" } : null));
        toast.success("Draw", { description: "Game ended in a draw", duration: 5000 });
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
    },
    [actions, ai, currentColor, currentPlayer, engine, gameKey, isDiscordLocalMatch, match, setEngine, setLastMove, setMatch, setShowConfetti, setWinningPath],
  );

  const handleMove = useCallback(
    (move: any) => {
      if (isDiscordLocalMatch || isLocalAIMatch) {
        handleLocalAIMove(move);
        return;
      }
      actions.handleMove(move);
    },
    [actions, handleLocalAIMove, isDiscordLocalMatch, isLocalAIMatch],
  );

  if (!match || !engine) {
    return <MatchLoading visualMode={isWorldContext ? "world" : "mono"} label={isWorldContext ? "World board" : "Instance loading"} />;
  }
  if (match.status === "waiting") {
    return (
      <MatchWaiting
        onCancel={() => navigate(isWorldContext && worldContext?.worldId ? `/worlds/${worldContext.worldId}` : "/play")}
        visualMode={isWorldContext ? "world" : "mono"}
        label={isWorldContext ? "World queue" : "Queue state"}
      />
    );
  }

  const userIdForMoves = isLocalMatch || isLocalAIMatch ? currentPlayer?.profile_id : user?.id;

  const handleToggleSpectate = async () => {
    if (!user) return;
    try {
      if (isSpectating) {
        await leaveAsSpectator(user.id);
        toast.success("Left spectator mode");
      } else {
        await joinAsSpectator(user.id);
        toast.success("Joined as spectator");
      }
    } catch {
      toast.error("Failed to toggle spectator mode");
    }
  };

  const handleRematch = async () => {
    if (!matchId) return;
    setRequestingRematch(true);
    await actions.handleRematch(matchId, isPlayer);
    setRequestingRematch(false);
  };

  const roomMode = isAIMatch ? "practice" : isDiscordLocalMatch || isLocalMatch || isLocalAIMatch ? "local" : "network";

  return (
    <SiteFrame
      showNav={false}
      visualMode={isWorldContext ? "world" : "mono"}
      className="ios-safe-area"
      contentClassName="max-w-[1480px] pb-12 pt-6 md:pt-8"
    >
      {showTutorial ? <TutorialOverlay onClose={() => setShowTutorial(false)} /> : null}

      <LiveSurface
        header={
          <MatchHeader
            match={match}
            systemVariant={isWorldContext ? "world" : "default"}
            contextLabel={worldContext?.worldName ?? null}
            isAIMatch={isAIMatch}
            isPlayer={isPlayer}
            isSpectating={isSpectating}
            isLocalMatch={isLocalMatch || isLocalAIMatch}
            userPlayer={userPlayer}
            showAIReasoning={showAIReasoning}
            aiReasoning={ai.aiReasoning}
            requestingRematch={requestingRematch}
            drawOfferedBy={match.draw_offered_by}
            spectatorCount={spectators.length}
            musicControls={{
              isPlaying: music.isPlaying,
              volume: music.volume,
              isMuted: music.isMuted,
              toggleMusic: music.toggleMusic,
              toggleMute: music.toggleMute,
              updateVolume: music.updateVolume,
            }}
            onBack={() => navigate(isWorldContext && worldContext?.worldId ? `/worlds/${worldContext.worldId}` : "/play")}
            onRematch={handleRematch}
            onForfeit={actions.handleForfeit}
            onOfferDraw={actions.handleOfferDraw}
            onAcceptDraw={() => actions.handleRespondDraw(true)}
            onDeclineDraw={() => actions.handleRespondDraw(false)}
            onToggleSpectate={handleToggleSpectate}
            onShowTutorial={() => setShowTutorial(true)}
            onToggleAIReasoning={() => setShowAIReasoning(!showAIReasoning)}
          />
        }
        board={
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
            timeRemaining={timeRemaining}
            userId={userIdForMoves}
            onMove={handleMove}
            onSwapColors={actions.handleSwapColors}
            onRematch={handleRematch}
            onPlayAgainAI={actions.handlePlayAgainAI}
            onNavigate={navigate}
          />
        }
        rail={
          <div className="space-y-4">
            <SystemSection label="Seats" title="Current room">
              <div className="space-y-3">
                <div className="match-rail-metric">
                  <p className="match-rail-metric__label">Seat A</p>
                  <p className="match-rail-metric__value">{player1?.username || "Unknown"}</p>
                </div>
                <div className="match-rail-metric">
                  <p className="match-rail-metric__label">Seat B</p>
                  <p className="match-rail-metric__value">{player2?.username || "Waiting"}</p>
                </div>
                <div className="match-rail-metric">
                  <p className="match-rail-metric__label">Watchers</p>
                  <p className="match-rail-metric__value">
                    {!isAIMatch ? `${spectators.length} live` : "practice"}
                  </p>
                </div>
                <div className="match-rail-metric">
                  <p className="match-rail-metric__label">Clock</p>
                  <p className="match-rail-metric__value">{formatClock(timeRemaining)}</p>
                </div>
              </div>
            </SystemSection>

            <UtilityStrip>
              <UtilityPill strong>{roomMode}</UtilityPill>
              <UtilityPill>{match.status === "finished" ? "resolved" : "active"}</UtilityPill>
              <UtilityPill>{match.status === "finished" ? "review ready" : "replay ready"}</UtilityPill>
            </UtilityStrip>

            {isAIMatch && currentColor === 2 && match.status === "active" ? (
              <AIThinkingIndicator isThinking={ai.aiThinking} difficulty={match.ai_difficulty} />
            ) : null}

            {discordUser?.username ? (
              <UtilityStrip>
                <UtilityPill strong>{discordUser.username}</UtilityPill>
              </UtilityStrip>
            ) : null}
          </div>
        }
      />
    </SiteFrame>
  );
}
