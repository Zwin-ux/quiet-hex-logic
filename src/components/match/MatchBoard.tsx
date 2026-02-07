import { HexBoard } from '@/components/HexBoard';
import { ChessBoard } from '@/components/chess/ChessBoard';
import { TicTacToeBoard } from '@/components/ttt/TicTacToeBoard';
import { CheckersBoard } from '@/components/checkers/CheckersBoard';
import { Connect4Board } from '@/components/connect4/Connect4Board';
import { AIThinkingIndicator } from '@/components/AIThinkingIndicator';
import { AnimatedRatingChange } from '@/components/AnimatedRatingChange';
import { VictoryConfetti } from '@/components/VictoryConfetti';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowLeft, RefreshCw } from 'lucide-react';
import type { MatchData, Player, RatingResult } from '@/hooks/useMatchState';
import type { BoardSkin } from '@/lib/boardSkins';
import type { ChessEngine } from '@/lib/chess/engine';
import type { TicTacToe } from '@/lib/ttt/engine';
import type { CheckersEngine, CheckersMove } from '@/lib/checkers/engine';
import type { Connect4 } from '@/lib/connect4/engine';

interface MatchBoardProps {
  match: MatchData;
  gameKey: 'hex' | 'chess' | 'ttt' | 'checkers' | 'connect4';
  engine: any;
  boardSkin: BoardSkin;
  lastMove: number | undefined;
  lastChessMoveUci: string | null;
  lastTttMove: number | null;
  lastCheckersMovePath: number[] | null;
  lastConnect4Move: number | null;
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
  onCellClick: (cell: number) => void;
  onChessMove: (move: { uci: string; promotion?: 'q' | 'r' | 'b' | 'n' }) => void;
  onTttMove: (cell: number) => void;
  onCheckersMove: (move: CheckersMove) => void;
  onConnect4Move: (col: number) => void;
  onSwapColors: () => void;
  onRematch: () => void;
  onPlayAgainAI: () => void;
  onNavigate: (to: string) => void;
}

export function MatchBoard({
  match, gameKey, engine, boardSkin, lastMove, lastChessMoveUci, lastTttMove, winningPath, isAggressiveMove,
  lastCheckersMovePath, lastConnect4Move,
  currentColor, currentPlayer, userPlayer, player1, player2,
  isAIMatch, isAITurn, isPlayer, isSpectating, isDiscordLocalMatch, isLocalMatch,
  aiThinking, showAIReasoning, aiReasoning,
  showConfetti, ratingResult, requestingRematch,
  userId, onCellClick, onChessMove, onTttMove, onCheckersMove, onConnect4Move, onSwapColors, onRematch, onPlayAgainAI, onNavigate,
}: MatchBoardProps) {
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
        {gameKey === 'connect4' ? (
          <Connect4Board
            engine={engine as Connect4}
            lastMove={lastConnect4Move}
            disabled={
              match.status !== 'active' ||
              !(currentPlayer?.profile_id === userId || (isDiscordLocalMatch && currentPlayer?.profile_id === 'discord-player')) ||
              isSpectating ||
              !isPlayer
            }
            onMove={onConnect4Move}
          />
        ) : gameKey === 'ttt' ? (
          <TicTacToeBoard
            engine={engine as TicTacToe}
            lastMove={lastTttMove}
            disabled={
              match.status !== 'active' ||
              !(currentPlayer?.profile_id === userId || (isDiscordLocalMatch && currentPlayer?.profile_id === 'discord-player')) ||
              isSpectating ||
              !isPlayer
            }
            onMove={onTttMove}
          />
        ) : gameKey === 'checkers' ? (
          <CheckersBoard
            engine={engine as CheckersEngine}
            lastMovePath={lastCheckersMovePath}
            disabled={
              match.status !== 'active' ||
              !(currentPlayer?.profile_id === userId || (isDiscordLocalMatch && currentPlayer?.profile_id === 'discord-player')) ||
              isSpectating ||
              !isPlayer
            }
            onMove={onCheckersMove}
          />
        ) : gameKey === 'chess' ? (
          <ChessBoard
            engine={engine as ChessEngine}
            lastMoveUci={lastChessMoveUci}
            disabled={
              match.status !== 'active' ||
              !(currentPlayer?.profile_id === userId || (isDiscordLocalMatch && currentPlayer?.profile_id === 'discord-player')) ||
              isSpectating ||
              !isPlayer
            }
            onMove={onChessMove}
          />
        ) : (
          <HexBoard
            size={match.size}
            board={engine.board}
            lastMove={lastMove}
            winningPath={winningPath}
            onCellClick={onCellClick}
            skin={boardSkin}
            isAggressive={isAggressiveMove}
            disabled={
              match.status !== 'active' ||
              !(currentPlayer?.profile_id === userId || (isDiscordLocalMatch && currentPlayer?.profile_id === 'discord-player')) ||
              isAITurn ||
              isSpectating ||
              !isPlayer
            }
            canSwap={
              match.pie_rule &&
              engine.ply === 1 &&
              !engine.swapped &&
              (currentPlayer?.profile_id === userId || (isDiscordLocalMatch && currentPlayer?.profile_id === 'discord-player')) &&
              match.status === 'active'
            }
            onSwapColors={onSwapColors}
          />
        )}
      </div>

      {match.status === 'active' && (
        <div className="px-4 py-2 rounded-full bg-card/80 backdrop-blur-sm border">
          <p className="font-mono text-sm text-center">
            {isSpectating
              ? `Watching ${currentPlayer?.username || 'opponent'}'s turn`
              : (currentPlayer?.profile_id === userId || (isDiscordLocalMatch && currentPlayer?.profile_id === 'discord-player'))
                ? "Your turn"
                : `Waiting for ${currentPlayer?.username || 'opponent'}...`}
          </p>
        </div>
      )}

      {/* Mobile AI Thinking below board */}
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
              {isAIMatch && match.winner === userPlayer?.color && (
                <p className="text-lg text-primary font-semibold">
                  You defeated the {match.ai_difficulty?.toUpperCase()} AI!
                </p>
              )}
              {isAIMatch && match.winner !== userPlayer?.color && (
                <div className="text-base text-muted-foreground space-y-1">
                  <p className="font-semibold">The AI found a winning path.</p>
                  <p className="text-sm italic">Analyze the board and try a different strategy next time.</p>
                </div>
              )}

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
}
