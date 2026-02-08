import React from 'react';
import { Button } from '@/components/ui/button';
import { AIThinkingIndicator } from '@/components/AIThinkingIndicator';
import { AnimatedRatingChange } from '@/components/AnimatedRatingChange';
import { VictoryConfetti } from '@/components/VictoryConfetti';
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
    match, gameKey, engine, boardSkin, lastMove, winningPath, isAggressiveMove,
    currentColor, currentPlayer, userPlayer, player1, player2,
    isAIMatch, isAITurn, isPlayer, isSpectating, isDiscordLocalMatch, isLocalMatch,
    aiThinking, showAIReasoning, aiReasoning,
    showConfetti, ratingResult, requestingRematch,
    userId, onMove, onSwapColors, onRematch, onPlayAgainAI, onNavigate,
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

  return (
    <div className="order-2 lg:order-2 flex flex-col items-center gap-3 md:gap-6 w-full">
      {showAIReasoning && aiReasoning && (
        <div className="p-3 border rounded-lg bg-card max-w-md mx-auto">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-mono text-xs font-medium mb-1">AI Reasoning</p>
              <p className="text-xs text-muted-foreground">{aiReasoning}</p>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-[min(100vw-1.5rem,560px)] lg:max-w-none aspect-square lg:aspect-auto">
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
          <div className="h-full flex items-center justify-center border rounded-xl bg-card/50 text-muted-foreground">
            <div className="text-center space-y-2 p-6">
              <div className="font-mono text-sm">No board UI registered for</div>
              <div className="font-display text-2xl font-bold">{gameKey}</div>
              <div className="text-xs">
                Add a <span className="font-mono">boardComponent</span> in <span className="font-mono">src/lib/engine/registry.ts</span>.
              </div>
              <Button variant="outline" size="sm" onClick={() => onNavigate('/docs')}>
                Open Docs
              </Button>
            </div>
          </div>
        )}
      </div>

      {match.status === 'active' && (
        <div className="px-4 py-2 rounded-full bg-card/80 backdrop-blur-sm border">
          <p className="font-mono text-sm text-center">
            {isSpectating
              ? `Watching ${currentPlayer?.username || 'opponent'}'s turn`
              : (currentPlayer?.profile_id === userId || (isDiscordLocalMatch && currentPlayer?.profile_id === 'discord-player'))
                ? 'Your turn'
                : `Waiting for ${currentPlayer?.username || 'opponent'}...`}
          </p>
        </div>
      )}

      {isAIMatch && currentColor === 2 && match.status === 'active' && (
        <div className="lg:hidden w-full">
          <AIThinkingIndicator isThinking={aiThinking} difficulty={match.ai_difficulty} />
        </div>
      )}

      {match.status === 'finished' && (match.winner || match.result === 'draw') && (
        <>
          <VictoryConfetti
            isActive={showConfetti && !!match.winner && match.winner === userPlayer?.color}
            winnerColor={(match.winner || 1) as 1 | 2}
          />
          <div className="mt-4 md:mt-6 p-4 md:p-8 border-2 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-md mx-auto">
            <div className="text-center space-y-3 md:space-y-4">
              <h2 className="font-body text-2xl md:text-4xl font-bold text-primary">
                {match.result === 'draw'
                  ? 'Draw'
                  : match.winner === userPlayer?.color ? 'Victory!' : isAIMatch && match.winner === 2 ? 'Computer Wins' : 'Game Over'}
              </h2>
              <div className="space-y-3 p-4 bg-card rounded-lg border">
                {match.result === 'draw' ? (
                  <p className="text-xl font-bold text-muted-foreground">Game drawn</p>
                ) : (
                  <>
                    <p className="text-2xl font-bold" style={{ color: match.winner === 1 ? 'hsl(223 45% 29%)' : 'hsl(40 76% 43%)' }}>
                      {match.winner === 1 ? player1?.username : player2?.username} wins!
                    </p>
                    <div className="flex items-center justify-center gap-3 text-lg font-semibold">
                      <span className="px-3 py-1 rounded-full" style={{
                        backgroundColor: match.winner === 1 ? 'hsl(223 45% 29% / 0.2)' : 'hsl(40 76% 43% / 0.2)',
                        color: match.winner === 1 ? 'hsl(223 45% 29%)' : 'hsl(40 76% 43%)'
                      }}>
                        {match.winner === 1 ? (gameKey === 'chess' ? 'White' : gameKey === 'connect4' ? 'Red' : 'Indigo') : (gameKey === 'chess' ? 'Black' : gameKey === 'connect4' ? 'Yellow' : 'Ochre')}
                      </span>
                      <span className="text-muted-foreground">&#8226;</span>
                      <span className="text-muted-foreground">
                        {gameKey === 'chess'
                          ? 'Checkmate'
                          : gameKey === 'hex'
                            ? (match.winner === 1 ? 'West to East' : 'North to South')
                            : 'Game Over'}
                      </span>
                    </div>
                  </>
                )}

                {match.is_ranked && ratingResult && (
                  <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Rating Changes</p>
                    <div className="flex flex-col gap-3">
                      {player1 && !player1.is_bot && (
                        <AnimatedRatingChange
                          oldRating={match.winner === 1 ? ratingResult.winner.old : ratingResult.loser.old}
                          newRating={match.winner === 1 ? ratingResult.winner.new : ratingResult.loser.new}
                          change={match.winner === 1 ? ratingResult.winner.change : ratingResult.loser.change}
                          playerName={player1.username}
                          isWinner={match.winner === 1}
                          delay={500}
                        />
                      )}
                      {player2 && !player2.is_bot && (
                        <AnimatedRatingChange
                          oldRating={match.winner === 2 ? ratingResult.winner.old : ratingResult.loser.old}
                          newRating={match.winner === 2 ? ratingResult.winner.new : ratingResult.loser.new}
                          change={match.winner === 2 ? ratingResult.winner.change : ratingResult.loser.change}
                          playerName={player2.username}
                          isWinner={match.winner === 2}
                          delay={700}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center pt-4">
                {isAIMatch ? (
                  <Button size="lg" onClick={onPlayAgainAI} className="gap-2 font-semibold h-12 text-base">
                    <RefreshCw className="h-5 w-5" />
                    Play Again
                  </Button>
                ) : isPlayer && !isLocalMatch && (
                  <Button size="lg" onClick={onRematch} disabled={requestingRematch} className="gap-2 font-semibold h-12 text-base">
                    <RefreshCw className={`h-5 w-5 ${requestingRematch ? 'animate-spin' : ''}`} />
                    {requestingRematch ? 'Creating...' : 'Rematch'}
                  </Button>
                )}
                <Button size="lg" variant="outline" onClick={() => onNavigate('/lobby')} className="gap-2 h-12 text-base">
                  <ArrowLeft className="h-5 w-5" />
                  {isAIMatch ? 'New Game' : 'Exit'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

