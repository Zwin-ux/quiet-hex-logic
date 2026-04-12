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

  const turnTone =
    match.status !== "active"
      ? "normal"
      : isSpectating
        ? "warning"
        : currentPlayer?.profile_id === userId ||
            (isDiscordLocalMatch && currentPlayer?.profile_id === "discord-player")
          ? "success"
          : "normal";

  return (
    <div className="order-2 flex w-full flex-col items-center gap-4 lg:gap-6">
      {showAIReasoning && aiReasoning ? (
        <VenuePanel
          eyebrow="Reasoning"
          title="Engine note"
          description={aiReasoning}
          className="w-full max-w-3xl"
          state="warning"
          titleBarEnd={<StateTag tone="warning">Expert only</StateTag>}
        >
          <div className="retro-status-strip justify-between bg-white">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span>Why this move</span>
            </div>
            <span>Analysis open</span>
          </div>
        </VenuePanel>
      ) : null}

      <section className="retro-window w-full">
        <div className="retro-window__titlebar">
          <div>
            <p className="retro-window__eyebrow">Board well</p>
            <h2 className="retro-window__title mt-1">
              {Board ? `${gameDef?.displayName ?? gameKey} board` : "Missing board UI"}
            </h2>
          </div>
          <StateTag tone={turnTone}>{match.status === "active" ? "active" : "result"}</StateTag>
        </div>

        <div className="retro-window__body !bg-[#f3f0e5] p-3 md:p-4">
          <div className="retro-inset bg-white p-2">
            <div className="aspect-square w-full bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,241,233,0.92))]">
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
          </div>
        </div>
      </section>

      {match.status === "active" ? (
        <div className="w-full">
          {turnTone === "warning" ? (
            <div className="retro-warning-strip text-center">{statusCopy}</div>
          ) : (
            <div className="retro-status-strip justify-between bg-white px-4 py-3">
              <span>Turn state</span>
              <StateTag tone={turnTone}>{statusCopy}</StateTag>
            </div>
          )}
        </div>
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
            className="w-full max-w-3xl"
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

            <div className="retro-command-rail">
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
