import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useMatchState } from "@/hooks/useMatchState";
import { useMatchActions } from "@/hooks/useMatchActions";
import { useAIOpponent } from "@/hooks/useAIOpponent";
import { useMatchTimer } from "@/hooks/useMatchTimer";
import { useAmbientMusic } from "@/hooks/useAmbientMusic";
import { TutorialOverlay } from "@/components/TutorialOverlay";
import { BoardWordmark } from "@/components/board/BoardWordmark";
import { SiteFrame } from "@/components/board/SiteFrame";
import { StateTag } from "@/components/board/StateTag";
import { MatchHeader } from "@/components/match/MatchHeader";
import { MatchBoard } from "@/components/match/MatchBoard";
import { MatchLoading, MatchWaiting } from "@/components/match/MatchLoadingStates";
import { toast } from "sonner";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

function RailBlock({
  label,
  value,
  inverse = false,
}: {
  label: string;
  value: string;
  inverse?: boolean;
}) {
  return (
    <div className={`border px-3 py-3 ${inverse ? "border-white text-[#f6f4f0]" : "border-black text-black"}`}>
      <p className={`text-[11px] uppercase tracking-[0.16em] ${inverse ? "text-[#c7c7cc]" : "text-black/55"}`}>{label}</p>
      <p className={`mt-2 text-[1.7rem] font-medium leading-tight tracking-[-0.04em] ${inverse ? "text-[#f6f4f0]" : "text-black"}`}>{value}</p>
    </div>
  );
}

export default function Match() {
  useDocumentTitle("Match");
  const { matchId } = useParams();
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
    isDiscordEnvironment,
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
  }, [music.stopMusic]);

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

  if (!match || !engine) return <MatchLoading />;
  if (match.status === "waiting") return <MatchWaiting onCancel={() => navigate("/play")} />;

  const discordAvatarUrl =
    isDiscordLocalMatch && discordUser?.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=128`
      : undefined;

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

  const formatClock = (seconds: number | null) => {
    if (seconds == null) return "off";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const roomMode = isAIMatch ? "practice" : isDiscordLocalMatch || isLocalMatch || isLocalAIMatch ? "local" : "network";

  return (
    <SiteFrame showNav={false} className="ios-safe-area" contentClassName="max-w-[1480px] pb-12 pt-6 md:pt-8">
      {showTutorial ? <TutorialOverlay onClose={() => setShowTutorial(false)} /> : null}

      <div className="space-y-6">
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
          spectatorCount={spectators.length}
          musicControls={{
            isPlaying: music.isPlaying,
            volume: music.volume,
            isMuted: music.isMuted,
            toggleMusic: music.toggleMusic,
            toggleMute: music.toggleMute,
            updateVolume: music.updateVolume,
          }}
          onBack={() => navigate("/play")}
          onRematch={handleRematch}
          onForfeit={actions.handleForfeit}
          onOfferDraw={actions.handleOfferDraw}
          onAcceptDraw={() => actions.handleRespondDraw(true)}
          onDeclineDraw={() => actions.handleRespondDraw(false)}
          onToggleSpectate={handleToggleSpectate}
          onShowTutorial={() => setShowTutorial(true)}
          onToggleAIReasoning={() => setShowAIReasoning(!showAIReasoning)}
        />

        <div className="grid gap-6 xl:grid-cols-[238px_minmax(0,1fr)_238px] xl:items-start">
          <aside className="space-y-4 border border-black bg-black px-4 py-4 text-[#f6f4f0] xl:sticky xl:top-6">
            <BoardWordmark className="text-[30px] text-[#f6f4f0]" tone="light" />
            <h2 className="font-display text-[2rem] font-bold leading-none tracking-[-0.04em]">Live Rail</h2>
            <p className="text-[15px] leading-7 text-[#c7c7cc]">
              Status and spectatorship stay in one persistent rail.
            </p>
            <RailBlock inverse label="Seat A" value={player1?.username || "Unknown"} />
            <RailBlock inverse label="Seat B" value={player2?.username || "Waiting"} />
            <RailBlock inverse label="Watchers" value={!isAIMatch ? `${spectators.length} live now` : "practice"} />
            <RailBlock inverse label="Clock" value={formatClock(timeRemaining)} />
          </aside>

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

          <aside className="space-y-4 border border-black bg-[#fbfaf8] px-4 py-4 xl:sticky xl:top-6">
            <h2 className="font-display text-[2rem] font-bold leading-none tracking-[-0.04em] text-black">
              Control Rail
            </h2>
            <p className="text-[15px] leading-7 text-black/68">
              Controls and replay context stay subordinate to the board.
            </p>
            <RailBlock label="Mode" value={roomMode} />
            <RailBlock label="Replay" value={match.status === "finished" ? "review mode ready" : "replay ready"} />
            <RailBlock label="Chat" value={!isAIMatch && spectators.length > 0 ? "public / moderated" : "quiet room"} />
            <RailBlock
              label="Actions"
              value={match.status === "finished" ? "rematch / exit" : isAIMatch ? "play / learn" : "forfeit / draw"}
            />
            {isAIMatch && currentColor === 2 && match.status === "active" ? (
              <AIThinkingIndicator isThinking={ai.aiThinking} difficulty={match.ai_difficulty} />
            ) : null}
            {discordAvatarUrl ? <StateTag>{discordUser?.username}</StateTag> : null}
          </aside>
        </div>
      </div>
    </SiteFrame>
  );
}
