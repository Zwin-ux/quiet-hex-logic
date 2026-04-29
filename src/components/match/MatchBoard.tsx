import React from "react";
import { ArrowLeft, RefreshCw, Sparkles } from "lucide-react";
import { AnimatedRatingChange } from "@/components/AnimatedRatingChange";
import { VictoryConfetti } from "@/components/VictoryConfetti";
import { BoardScene, type BoardSceneKey } from "@/components/board/BoardScene";
import {
  SystemSection,
  UtilityPill,
  UtilityStrip,
} from "@/components/board/SystemSurface";
import { Button } from "@/components/ui/button";
import type { MatchData, Player, RatingResult } from "@/hooks/useMatchState";
import type { BoardSkin } from "@/lib/boardSkins";
import { getGameOrNull } from "@/lib/engine/registry";
import type { GameEngine } from "@/lib/engine/types";

interface MatchBoardProps {
  match: MatchData;
  gameKey: string;
  engine: GameEngine<any>;
  boardSkin: BoardSkin;
  lastMove: any | null;
  winningPath: number[];
  isAggressiveMove: boolean;
  currentColor: number;
  currentPlayer: Player | undefined;
  userPlayer: Player | undefined;
  player1: Player | undefined;
  player2: Player | undefined;
  isAIMatch: boolean;
  isAITurn: boolean;
  isPlayer: boolean;
  isSpectating: boolean;
  isDiscordLocalMatch: boolean;
  isLocalMatch: boolean;
  aiThinking: boolean;
  showAIReasoning: boolean;
  aiReasoning: string;
  showConfetti: boolean;
  ratingResult: RatingResult | null;
  requestingRematch: boolean;
  timeRemaining: number | null;
  userId: string | undefined;
  onMove: (move: any) => void;
  onSwapColors: () => void;
  onRematch: () => void;
  onPlayAgainAI: () => void;
  onNavigate: (to: string) => void;
}

export const MatchBoard = React.memo(function MatchBoard(props: MatchBoardProps) {
  const {
    match,
    gameKey,
    engine,
    boardSkin,
    lastMove,
    winningPath,
    isAggressiveMove,
    currentColor,
    currentPlayer,
    userPlayer,
    player1,
    player2,
    isAIMatch,
    isAITurn,
    isPlayer,
    isSpectating,
    isDiscordLocalMatch,
    isLocalMatch,
    aiThinking,
    showAIReasoning,
    aiReasoning,
    showConfetti,
    ratingResult,
    requestingRematch,
    timeRemaining,
    userId,
    onMove,
    onSwapColors,
    onRematch,
    onPlayAgainAI,
    onNavigate,
  } = props;

  const gameDef = getGameOrNull(gameKey);
  const Board = gameDef?.boardComponent ?? null;

  const disabled =
    match.status !== "active" ||
    !(currentPlayer?.profile_id === userId || (isDiscordLocalMatch && currentPlayer?.profile_id === "discord-player")) ||
    isSpectating ||
    !isPlayer ||
    isAITurn;

  const canSwap =
    gameKey === "hex" &&
    match.pie_rule &&
    (engine as any)?.hex?.ply === 1 &&
    !(engine as any)?.hex?.swapped &&
    (currentPlayer?.profile_id === userId || (isDiscordLocalMatch && currentPlayer?.profile_id === "discord-player")) &&
    match.status === "active";

  const statusCopy = isSpectating
    ? `Watching ${currentPlayer?.username || "opponent"}`
    : currentPlayer?.profile_id === userId ||
        (isDiscordLocalMatch && currentPlayer?.profile_id === "discord-player")
      ? "Your move"
      : `Waiting for ${currentPlayer?.username || "opponent"}`;

  const formatTime = (seconds: number | null) => {
    if (seconds == null) return "clock off";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const resultTitle =
    match.result === "draw"
      ? "Draw"
      : match.winner === userPlayer?.color
        ? "Victory"
        : isAIMatch && match.winner === 2
          ? "Computer wins"
          : "Game over";

  return (
    <div className="space-y-4">
      {showAIReasoning && aiReasoning ? (
        <SystemSection
          label="Engine note"
          title="Why this move"
          description={aiReasoning}
          actions={<UtilityPill strong>expert only</UtilityPill>}
        >
          <UtilityStrip>
            <UtilityPill><Sparkles className="h-3.5 w-3.5" /> analysis open</UtilityPill>
          </UtilityStrip>
        </SystemSection>
      ) : null}

      {match.status === "active" ? (
        <UtilityStrip>
          <UtilityPill strong>{statusCopy}</UtilityPill>
          <UtilityPill>{`move ${Math.max(match.turn - 1, 0)}`}</UtilityPill>
          <UtilityPill>
            {currentColor === 1 ? `${player1?.username || "seat a"} to move` : `${player2?.username || "seat b"} to move`}
          </UtilityPill>
          {timeRemaining != null ? (
            <UtilityPill strong={timeRemaining <= 30}>
              {formatTime(timeRemaining)}
            </UtilityPill>
          ) : null}
        </UtilityStrip>
      ) : null}

      <section className="match-stage">
        <div className="match-stage__inner">
          {Board ? (
            <Board
              engine={engine}
              matchSize={match.size}
              boardSkin={boardSkin}
              winningPath={winningPath}
              lastMove={lastMove}
              isAggressiveMove={isAggressiveMove}
              disabled={disabled}
              canSwap={canSwap}
              onMove={onMove}
              onSwapColors={onSwapColors}
            />
          ) : (
            <div className="match-stage__missing">
              <div className="space-y-3 p-6 text-center">
                <BoardScene game={gameKey as BoardSceneKey} state="static" decorative className="mx-auto h-10 w-10 text-[#090909]" />
                <div className="board-rail-label">Missing board UI</div>
                <div className="board-section-title">{gameKey}</div>
                <div className="text-xs">
                  Add a <span className="font-mono">boardComponent</span> in{" "}
                  <span className="font-mono">src/lib/engine/registry.ts</span>.
                </div>
                <Button variant="ghost" size="sm" className="border-0" onClick={() => onNavigate("/docs")}>
                  Open docs
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      <UtilityStrip>
        <UtilityPill>{match.status === "finished" ? "review ready" : "replay ready"}</UtilityPill>
        {canSwap ? <UtilityPill strong>swap available</UtilityPill> : null}
        {isAIMatch && match.status === "active" ? <UtilityPill>{aiThinking ? "computer thinking" : "computer ready"}</UtilityPill> : null}
      </UtilityStrip>

      {match.status === "finished" && (match.winner || match.result === "draw") ? (
        <>
          <VictoryConfetti
            isActive={showConfetti && !!match.winner && match.winner === userPlayer?.color}
            winnerColor={(match.winner || 1) as 1 | 2}
          />

          <SystemSection
            label="Resolved"
            title={resultTitle}
            description={
              match.result === "draw"
                ? "The board closed level."
                : `${match.winner === 1 ? player1?.username : player2?.username} closed the room.`
            }
            actions={
              <UtilityPill strong={match.result !== "draw"}>
                {match.result === "draw" ? "level" : match.winner === userPlayer?.color ? "won" : "closed"}
              </UtilityPill>
            }
          >
            {match.is_ranked && ratingResult ? (
              <div className="space-y-3 pt-2">
                <p className="board-rail-label">Rating changes</p>
                {player1 && !player1.is_bot ? (
                  <AnimatedRatingChange
                    oldRating={match.winner === 1 ? ratingResult.winner.old : ratingResult.loser.old}
                    newRating={match.winner === 1 ? ratingResult.winner.new : ratingResult.loser.new}
                    change={match.winner === 1 ? ratingResult.winner.change : ratingResult.loser.change}
                    playerName={player1.username}
                    isWinner={match.winner === 1}
                    delay={500}
                  />
                ) : null}
                {player2 && !player2.is_bot ? (
                  <AnimatedRatingChange
                    oldRating={match.winner === 2 ? ratingResult.winner.old : ratingResult.loser.old}
                    newRating={match.winner === 2 ? ratingResult.winner.new : ratingResult.loser.new}
                    change={match.winner === 2 ? ratingResult.winner.change : ratingResult.loser.change}
                    playerName={player2.username}
                    isWinner={match.winner === 2}
                    delay={700}
                  />
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              {isAIMatch ? (
                <Button onClick={onPlayAgainAI} variant="hero" className="border-0">
                  <RefreshCw className="h-4 w-4" />
                  Play again
                </Button>
              ) : isPlayer && !isLocalMatch ? (
                <Button onClick={onRematch} disabled={requestingRematch} variant="hero" className="border-0">
                  <RefreshCw className={`h-4 w-4 ${requestingRematch ? "animate-spin" : ""}`} />
                  {requestingRematch ? "Creating..." : "Rematch"}
                </Button>
              ) : null}

              <Button variant="ghost" className="border-0" onClick={() => onNavigate("/play")}>
                <ArrowLeft className="h-4 w-4" />
                {isAIMatch ? "Back to play" : "Exit room"}
              </Button>
            </div>
          </SystemSection>
        </>
      ) : null}
    </div>
  );
});
