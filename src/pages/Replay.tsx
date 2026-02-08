import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePremium } from '@/hooks/usePremium';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward,  Download,
  FileText,
  FileJson,
  Brain,
  Loader2,
  Crown,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HexBoard } from '@/components/HexBoard';
import { ChessBoard } from '@/components/chess/ChessBoard';
import { TicTacToeBoard } from '@/components/ttt/TicTacToeBoard';
import { CheckersBoard } from '@/components/checkers/CheckersBoard';
import { Connect4Board } from '@/components/connect4/Connect4Board';
import { getGame, createEngine } from '@/lib/engine/registry';
import type { GameEngine } from '@/lib/engine/types';
import type { Hex } from '@/lib/hex/engine';
import type { ChessEngine } from '@/lib/chess/engine';
import type { TicTacToe } from '@/lib/ttt/engine';
import type { CheckersEngine } from '@/lib/checkers/engine';
import type { Connect4 } from '@/lib/connect4/engine';
import { generateHexReplay, generateJsonReplay, downloadReplay } from '@/lib/replayExport';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type MoveRecord = {
  ply: number;
  move: Record<string, unknown>;
  color: number;
  cell?: number | null;
};

type AnalyzedMove = MoveRecord & {
  rating?: 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
  comment?: string;
  best_alternative?: number;
};

type MatchData = {
  id: string;
  size: number;
  winner: number | null;
  pie_rule: boolean;
  created_at: string;
  game_key?: string | null;
  players: Array<{
    color: number;
    profile: { username: string };
    is_bot: boolean;
  }>;
};

type Analysis = {
  summary: string;
  keyMoments: string[];
  moves: AnalyzedMove[];
};

const ratingColors: Record<string, string> = {
  excellent: 'bg-green-500 text-white',
  good: 'bg-blue-500 text-white',
  inaccuracy: 'bg-yellow-500 text-black',
  mistake: 'bg-orange-500 text-white',
  blunder: 'bg-red-500 text-white',
};

export default function Replay() {
  const { matchId } = useParams();
  const [match, setMatch] = useState<MatchData | null>(null);
  const [moves, setMoves] = useState<MoveRecord[]>([]);
  const [currentPly, setCurrentPly] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [engine, setEngine] = useState<GameEngine<any> | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showHints, setShowHints] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const { isPremium } = usePremium(user?.id);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!matchId) return;
    fetchMatchData();
  }, [matchId]);

  useEffect(() => {
    if (!match || moves.length === 0) return;
    const gameKey = match.game_key ?? 'hex';

    try {
      const adapter = createEngine(gameKey, { boardSize: match.size, pieRule: match.pie_rule });
      for (let i = 0; i < currentPly && i < moves.length; i++) {
        const moveData = moves[i].move ?? { cell: moves[i].cell };
        const move = adapter.deserializeMove(moveData);
        adapter.applyMove(move);
      }
      setEngine(adapter);
    } catch (e) {
      console.error('Replay engine error:', e);
    }
  }, [currentPly, match, moves]);

  useEffect(() => {
    if (!playing) return;

    const interval = setInterval(() => {
      setCurrentPly(prev => {
        if (prev >= moves.length) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [playing, moves.length]);

  const fetchMatchData = async () => {
    if (!matchId) return;

    setLoading(true);
    setLoadError(null);

    try {
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select(`
          id,
          size,
          winner,
          pie_rule,
          created_at,
          game_key,
          players:match_players(
            color,
            is_bot,
            profile:profiles(username)
          )
        `)
        .eq('id', matchId)
        .maybeSingle();

      if (matchError) {
        console.error('Match fetch error:', matchError);
        throw new Error(matchError.message || 'Failed to load match data');
      }

      if (!matchData) {
        throw new Error('Match not found. It may have been deleted or you may not have permission to view it.');
      }

      const { data: movesData, error: movesError } = await supabase
        .from('moves')
        .select('*')
        .eq('match_id', matchId)
        .order('ply', { ascending: true });

      if (movesError) {
        console.error('Moves fetch error:', movesError);
        throw new Error(movesError.message || 'Failed to load move history');
      }

      setMatch(matchData as unknown as MatchData);
      setMoves(movesData || []);
    } catch (error: any) {
      console.error('Replay load error:', error);
      setLoadError(error.message || 'Failed to load replay');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (currentPly >= moves.length) {
      setCurrentPly(0);
    }
    setPlaying(!playing);
  };

  const handleSliderChange = (value: number[]) => {
    setCurrentPly(value[0]);
    setPlaying(false);
  };

  const handleExportHex = () => {
    if (!match) return;
    const content = generateHexReplay(match, moves);
    const dateStr = new Date(match.created_at).toISOString().split('T')[0];
    downloadReplay(content, `hexology-${dateStr}.hex`, 'text/plain');
    toast.success('Replay exported as HEX');
  };

  const handleExportJson = () => {
    if (!match) return;
    const content = generateJsonReplay(match, moves);
    const dateStr = new Date(match.created_at).toISOString().split('T')[0];
    downloadReplay(content, `hexology-${dateStr}.json`, 'application/json');
    toast.success('Replay exported as JSON');
  };

  const handleAnalyze = async () => {
    if (!matchId || !isPremium) {
      if (!isPremium) {
        toast.error('Premium required', { description: 'Game analysis is a premium feature.' });
      }
      return;
    }

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-game', {
        body: { matchId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setAnalysis(data);
      toast.success('Analysis complete!');
    } catch (err: any) {
      console.error('Analysis error:', err);
      toast.error('Analysis failed', { description: err.message });
    } finally {
      setAnalyzing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Loading replay...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
        <Card className="p-8 max-w-md text-center space-y-4">
          <h2 className="text-xl font-semibold text-destructive">Failed to Load Replay</h2>
          <p className="text-muted-foreground">{loadError}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => fetchMatchData()}>
              Try Again
            </Button>
            <Button onClick={() => navigate('/history')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to History
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!match || !engine) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
        <Card className="p-8 max-w-md text-center space-y-4">
          <h2 className="text-xl font-semibold">Match Not Found</h2>
          <p className="text-muted-foreground">This match could not be loaded.</p>
          <Button onClick={() => navigate('/history')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to History
          </Button>
        </Card>
      </div>
    );
  }

  const gameKey = (match.game_key ?? 'hex') as string;
  const gameDef = (() => { try { return getGame(gameKey); } catch { return null; } })();
  const player1 = match.players.find(p => p.color === 1);
  const player2 = match.players.find(p => p.color === 2);
  const currentMove = analysis?.moves?.find(m => m.ply === currentPly);

  const p1Label = gameKey === 'chess' ? 'White' : gameKey === 'connect4' ? 'Red' : 'Indigo';
  const p2Label = gameKey === 'chess' ? 'Black' : gameKey === 'connect4' ? 'Yellow' : 'Ochre';

  /** Get the inner raw engine for game-specific board props. */
  const rawEngine = (engine as any)?.hex ?? (engine as any)?._engine ?? engine;

  /** Format a move for the move list display. */
  const formatMove = (move: MoveRecord): string => {
    const data = move.move ?? { cell: move.cell };
    if (gameKey === 'hex') {
      return data.cell === null || data.cell === undefined ? 'Swap' : `Cell ${data.cell}`;
    }
    if (gameKey === 'chess') return (data.uci as string) ?? '?';
    if (gameKey === 'ttt') return `Cell ${data.cell}`;
    if (gameKey === 'checkers') return `Path ${(data.path as number[])?.join('-') ?? '?'}`;
    if (gameKey === 'connect4') return `Col ${data.col}`;
    return JSON.stringify(data);
  };

  /** Get the last-move value for the current ply (used by board components). */
  const getLastMove = () => {
    if (currentPly === 0) return undefined;
    const data = moves[currentPly - 1].move ?? { cell: moves[currentPly - 1].cell };
    if (gameKey === 'hex') return data.cell;
    if (gameKey === 'chess') return data.uci as string;
    if (gameKey === 'ttt') return data.cell as number;
    if (gameKey === 'checkers') return data.path as number[];
    if (gameKey === 'connect4') return data.col as number;
    return undefined;
  };

  const renderBoard = () => {
    if (!engine) return null;

    if (gameKey === 'connect4') {
      return (
        <Connect4Board
          engine={rawEngine as Connect4}
          lastMove={getLastMove() as number | undefined}
          disabled={true}
          onMove={() => {}}
        />
      );
    }
    if (gameKey === 'ttt') {
      return (
        <TicTacToeBoard
          engine={rawEngine as TicTacToe}
          lastMove={getLastMove() as number | undefined}
          disabled={true}
          onMove={() => {}}
        />
      );
    }
    if (gameKey === 'checkers') {
      return (
        <CheckersBoard
          engine={rawEngine as CheckersEngine}
          lastMovePath={getLastMove() as number[] | undefined}
          disabled={true}
          onMove={() => {}}
        />
      );
    }
    if (gameKey === 'chess') {
      return (
        <ChessBoard
          engine={rawEngine as ChessEngine}
          lastMoveUci={getLastMove() as string | undefined}
          disabled={true}
          onMove={() => {}}
        />
      );
    }
    // Default: Hex
    const hexEngine = rawEngine as Hex;
    return (
      <HexBoard
        size={match.size}
        board={hexEngine.board}
        lastMove={currentPly > 0 ? (moves[currentPly - 1].move?.cell ?? moves[currentPly - 1].cell) : undefined}
        hintCell={showHints ? (analysis?.moves.find(m => m.ply === currentPly + 1)?.best_alternative) : null}
        disabled={true}
        winningPath={match.winner ? hexEngine.getWinningPath() : undefined}
      />
    );
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => navigate('/history')} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to History
          </Button>

          <div className="flex gap-2">
            {gameKey === 'hex' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={handleExportHex}>
                    <FileText className="h-4 w-4 mr-2" />
                    HEX Format
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportJson}>
                    <FileJson className="h-4 w-4 mr-2" />
                    JSON Format
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {isPremium ? (
              <>
                <Button
                variant="outline"
                size="sm"
                onClick={handleAnalyze}
                disabled={analyzing || !!analysis}
                className="gap-2"
              >
                {analyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                  {analysis ? 'Analyzed' : 'Analyze'}
                </Button>
                {analysis && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHints(!showHints)}
                    className={cn(
                      "gap-2 transition-colors",
                      showHints ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground"
                    )}
                  >
                    <Sparkles className="h-4 w-4" />
                    {showHints ? 'Hints On' : 'Hints Off'}
                  </Button>
                )}
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/premium')}
                className="gap-2 text-amber-600 border-amber-400"
              >
                <Crown className="h-4 w-4" />
                Analyze (Pro)
              </Button>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Board */}
          <div>
            <Card className="p-6 shadow-lg border-2">
              {renderBoard()}
            </Card>

            {/* Current Move Analysis */}
            {analysis && currentMove && currentMove.rating && (
              <Card className="mt-4 p-4">
                <div className="flex items-center gap-3">
                  <Badge className={ratingColors[currentMove.rating]}>
                    {currentMove.rating.charAt(0).toUpperCase() + currentMove.rating.slice(1)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {currentMove.comment}
                  </span>
                </div>
              </Card>
            )}
          </div>

          {/* Controls */}
          <div className="space-y-6">
            <Card className="p-6 shadow-lg border-2">
              <div className="mb-6">
                <h2 className="font-body text-2xl font-semibold mb-4">
                  {gameDef?.displayName ?? 'Match'} Replay
                </h2>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Game:</span>
                    <Badge className="font-mono">{gameDef?.displayName ?? gameKey}</Badge>
                  </div>
                  {(gameKey === 'hex' || match.size) && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Board Size:</span>
                      <Badge className="font-mono">{match.size}×{match.size}</Badge>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{p1Label}:</span>
                    <span className="font-body font-semibold">
                      {player1?.is_bot ? 'AI' : player1?.profile.username}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{p2Label}:</span>
                    <span className="font-body font-semibold">
                      {player2?.is_bot ? 'AI' : player2?.profile.username}
                    </span>
                  </div>
                  {match.winner && (
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Winner:</span>
                      <Badge className={match.winner === 1 ? 'bg-indigo' : 'bg-ochre'}>
                        {match.winner === 1 ? p1Label : p2Label}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPly(0)}
                    disabled={currentPly === 0}
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={handlePlayPause}
                    disabled={currentPly >= moves.length && !playing}
                  >
                    {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPly(moves.length)}
                    disabled={currentPly >= moves.length}
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                  <span className="ml-auto text-sm text-muted-foreground font-mono">
                    Move {currentPly} / {moves.length}
                  </span>
                </div>

                <Slider
                  value={[currentPly]}
                  onValueChange={handleSliderChange}
                  max={moves.length}
                  step={1}
                  className="w-full"
                />
              </div>
            </Card>

            {/* Analysis Summary */}
            {analysis && (
              <Card className="p-6 shadow-lg border-2 border-indigo/30 bg-indigo/5">
                <h3 className="font-body text-lg font-semibold mb-3 flex items-center gap-2">
                  <Brain className="h-5 w-5 text-indigo" />
                  AI Analysis
                </h3>
                <p className="text-sm text-muted-foreground mb-4">{analysis.summary}</p>
                {analysis.keyMoments?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Key Moments:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {analysis.keyMoments.map((moment, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-indigo">•</span>
                          {moment}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            )}

            {/* Move List */}
            <Card className="p-6 shadow-lg border-2 max-h-96 overflow-y-auto">
              <h3 className="font-body text-lg font-semibold mb-4">Move History</h3>
              <div className="space-y-2">
                {moves.map((move, idx) => {
                  const analyzedMove = analysis?.moves?.find(m => m.ply === move.ply);
                  return (
                    <div
                      key={idx}
                      onClick={() => setCurrentPly(idx + 1)}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                        idx < currentPly ? 'bg-accent' : 'opacity-40 hover:opacity-60'
                      } ${idx === currentPly - 1 ? 'ring-2 ring-indigo' : ''}`}
                    >
                      <span className="font-mono text-sm">
                        {idx + 1}. {formatMove(move)}
                      </span>
                      <div className="flex items-center gap-2">
                        {analyzedMove?.rating && (
                          <Badge className={`text-xs ${ratingColors[analyzedMove.rating]}`}>
                            {analyzedMove.rating.slice(0, 3)}
                          </Badge>
                        )}
                        <Badge variant="outline" className={move.color === 1 ? 'border-indigo' : 'border-ochre'}>
                          {move.color === 1 ? p1Label : p2Label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
