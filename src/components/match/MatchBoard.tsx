import React from 'react';
import { Button } from '@/components/ui/button';
import { AIThinkingIndicator } from '@/components/AIThinkingIndicator';
import { AnimatedRatingChange } from '@/components/AnimatedRatingChange';
import { VictoryConfetti } from '@/components/VictoryConfetti';
import { VenuePanel } from '@/components/board/VenuePanel';
import { Sparkles, ArrowLeft, RefreshCw } from 'lucide-react';
import type { MatchData, Player, RatingResult } from '@/hooks/useMatchState';
import type { BoardSkin } from '@/lib/boardSkins';
import { getGameOrNull } from '@/lib/engine/registry';
import type { GameEngine } from '@/lib/engine/types';

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
    match.status !== 'active' ||
    !(currentPlayer?.profile_id === userId || (isDiscordLocalMatch && currentPlayer?.profile_id === 'discord-player')) ||
    isSpectating ||
    !isPlayer ||
    isAITurn;

  const canSwap =
    gameKey === 'hex' &&
    match.pie_rule &&
    (engine as any)?.hex?.ply === 1 &&
    !(engine as any)?.hex?.swapped &&
    (currentPlayer?.profile_id === userId || (isDiscordLocalMatch && currentPlayer?.profile_id === 'discord-player')) &&
    match.status === 'active';

  const statusCopy = isSpectating
    ? `Watching ${currentPlayer?.username || 'opponent'}`
    : (currentPlayer?.profile_id === userId || (isDiscordLocalMatch && currentPlayer?.profile_id === 'discord-player'))
      ? 'Your move'
      : `Waiting for ${currentPlayer?.username || 'opponent'}`;

  return (
    <div className="order-2 flex w-full flex-col items-center gap-4 lg:gap-6">
      {showAIReasoning && aiReasoning ? (
        <VenuePanel
          eyebrow="Reasoning"
          title="Why the engine wants this move"
          description={aiReasoning}
          className="w-full max-w-2xl bg-[#f6f4ed]"
        >
          <div className="flex items-center gap-2 border-t border-black/10 pt-4 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            Expert mode only
          </div>
        </VenuePanel>
      ) : null}

      <div className="board-panel board-panel-cut w-full overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,241,233,0.92))] p-3 md:p-4">
        <div className="w-full aspect-square">
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
            <div className="flex h-full items-center justify-center border border-black/10 bg-white/70 text-muted-foreground">
              <div className="space-y-2 p-6 text-center">
                <div className="font-mono text-xs uppercase tracking-[0.2em]">Missing board UI</div>
                <div className="font-display text-2xl font-bold">{gameKey}</div>
                <div className="text-xs">
                  Add a <span className="font-mono">boardComponent</span> in <span className="font-mono">src/lib/engine/registry.ts</span>.
                </div>
                <Button variant="outline" size="sm" onClick={() => onNavigate('/docs')}>
                  Open docs
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {match.status === 'active' ? (
        <div className="w-full border-y border-black/10 px-3 py-3 text-center">
          <p className="board-rail-label text-[10px] text-black/45">Turn state</p>
          <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground">{statusCopy}</p>
        </div>
      ) : null}

      {isAIMatch && currentColor === 2 && match.status === 'active' ? (
        <div className="w-full lg:hidden">
          <AIThinkingIndicator isThinking={aiThinking} difficulty={match.ai_difficulty} />
        </div>
      ) : null}

      {match.status === 'finished' && (match.winner || match.result === 'draw') ? (
        <>
          <VictoryConfetti
            isActive={showConfetti && !!match.winner && match.winner === userPlayer?.color}
            winnerColor={(match.winner || 1) as 1 | 2}
          />

          <VenuePanel
            eyebrow="Instance result"
            title={
              match.result === 'draw'
                ? 'Draw'
                : match.winner === userPlayer?.color
                  ? 'Victory'
                  : isAIMatch && match.winner === 2
                    ? 'Computer wins'
                    : 'Game over'
            }
            description={
              match.result === 'draw'
                ? 'The game ended level.'
                : `${match.winner === 1 ? player1?.username : player2?.username} closed the instance.`
            }
            className="w-full max-w-2xl"
          >
            {match.is_ranked && ratingResult ? (
              <div className="space-y-3 border-t border-black/10 pt-4">
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

            <div className="flex flex-col gap-2 border-t border-black/10 pt-5 sm:flex-row">
              {isAIMatch ? (
                <Button onClick={onPlayAgainAI} className="justify-between sm:w-auto">
                  <RefreshCw className="h-4 w-4" />
                  Play again
                </Button>
              ) : isPlayer && !isLocalMatch ? (
                <Button onClick={onRematch} disabled={requestingRematch} className="justify-between sm:w-auto">
                  <RefreshCw className={`h-4 w-4 ${requestingRematch ? 'animate-spin' : ''}`} />
                  {requestingRematch ? 'Creating...' : 'Rematch'}
                </Button>
              ) : null}

              <Button variant="outline" onClick={() => onNavigate('/play')} className="justify-between sm:w-auto">
                <ArrowLeft className="h-4 w-4" />
                {isAIMatch ? 'Back to play' : 'Exit room'}
              </Button>
            </div>
          </VenuePanel>
        </>
      ) : null}
    </div>
  );
});
