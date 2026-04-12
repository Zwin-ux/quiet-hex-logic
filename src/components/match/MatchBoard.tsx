import React from "react";
import { ArrowLeft, RefreshCw, Sparkles } from "lucide-react";
import { AIThinkingIndicator } from "@/components/AIThinkingIndicator";
import { AnimatedRatingChange } from "@/components/AnimatedRatingChange";
import { VictoryConfetti } from "@/components/VictoryConfetti";
import { StateTag } from "@/components/board/StateTag";
import { VenuePanel } from "@/components/board/VenuePanel";
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

  return (
    <div className="w-full space-y-4">
      {showAIReasoning && aiReasoning ? (
        <VenuePanel
          eyebrow="Reasoning"
          title="Engine note"
          description={aiReasoning}
          className="w-full"
          state="warning"
          titleBarEnd={<StateTag tone="warning">expert only</StateTag>}
        >
          <div className="retro-status-strip justify-between bg-white">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span>Why this move</span>
            </div>
            <span>analysis open</span>
          </div>
        </VenuePanel>
      ) : null}

      {match.status === "active" ? (
        <div className="retro-status-strip justify-between gap-3 bg-white px-4 py-4">
          <span>{statusCopy}</span>
          {timeRemaining != null ? <StateTag tone={timeRemaining <= 10 ? "critical" : timeRemaining <= 30 ? "warning" : "success"}>{formatTime(timeRemaining)}</StateTag> : null}
        </div>
      ) : null}

      <section className="border-2 border-black bg-[#fbfaf8] p-3 md:p-4">
        <div className="aspect-square w-full border border-black bg-[#f6f4f0] p-2 md:p-3">
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
            <div className="flex h-full items-center justify-center border border-black bg-white text-black">
              <div className="space-y-2 p-6 text-center">
                <div className="board-rail-label">Missing board UI</div>
                <div className="board-section-title">{gameKey}</div>
                <div className="text-xs">
                  Add a <span className="font-mono">boardComponent</span> in{" "}
                  <span className="font-mono">src/lib/engine/registry.ts</span>.
                </div>
                <Button variant="outline" size="sm" onClick={() => onNavigate("/docs")}>
                  Open docs
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="retro-status-strip flex-wrap gap-3 bg-white px-4 py-4">
        <StateTag>{`move ${Math.max(match.turn - 1, 0)}`}</StateTag>
        <StateTag tone={match.status === "active" ? "success" : "warning"}>
          {currentColor === 1 ? `${player1?.username || "seat a"} to move` : `${player2?.username || "seat b"} to move`}
        </StateTag>
        <StateTag>{match.status === "finished" ? "review ready" : "replay ready"}</StateTag>
      </div>

      {match.status === "active" && canSwap ? (
        <div className="retro-warning-strip w-full text-center">Swap colors is available on this turn.</div>
      ) : null}

      {isAIMatch && currentColor === 2 && match.status === "active" ? (
        <div className="w-full lg:hidden">
          <AIThinkingIndicator isThinking={aiThinking} difficulty={match.ai_difficulty} />
        </div>
      ) : null}

      {match.status === "finished" && (match.winner || match.result === "draw") ? (
        <>
          <VictoryConfetti
            isActive={showConfetti && !!match.winner && match.winner === userPlayer?.color}
            winnerColor={(match.winner || 1) as 1 | 2}
          />

          <VenuePanel
            eyebrow="Instance result"
            title={
              match.result === "draw"
                ? "Draw"
                : match.winner === userPlayer?.color
                  ? "Victory"
                  : isAIMatch && match.winner === 2
                    ? "Computer wins"
                    : "Game over"
            }
            description={
              match.result === "draw"
                ? "The board closed level."
                : `${match.winner === 1 ? player1?.username : player2?.username} closed the room.`
            }
            className="w-full"
            state={match.result === "draw" ? "warning" : match.winner === userPlayer?.color ? "normal" : "critical"}
            titleBarEnd={
              <StateTag tone={match.result === "draw" ? "warning" : match.winner === userPlayer?.color ? "success" : "critical"}>
                {match.result === "draw" ? "level" : match.winner === userPlayer?.color ? "won" : "closed"}
              </StateTag>
            }
          >
            {match.is_ranked && ratingResult ? (
              <div className="space-y-3 border-t border-black pt-4">
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
                <Button onClick={onPlayAgainAI}>
                  <RefreshCw className="h-4 w-4" />
                  Play again
                </Button>
              ) : isPlayer && !isLocalMatch ? (
                <Button onClick={onRematch} disabled={requestingRematch}>
                  <RefreshCw className={`h-4 w-4 ${requestingRematch ? "animate-spin" : ""}`} />
                  {requestingRematch ? "Creating..." : "Rematch"}
                </Button>
              ) : null}

              <Button variant="outline" onClick={() => onNavigate("/play")}>
                <ArrowLeft className="h-4 w-4" />
                {isAIMatch ? "Back to play" : "Exit room"}
              </Button>
            </div>
          </VenuePanel>
        </>
      ) : null}
    </div>
  );
});
