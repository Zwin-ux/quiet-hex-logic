import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Clock, Trophy, Zap, RotateCcw, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Puzzle } from '@/hooks/usePuzzles';
import { HexBoard } from './HexBoard';
import { Hex } from '@/lib/hex/engine';
import { supabase } from '@/integrations/supabase/client';

interface PuzzleRushProps {
  puzzles: Puzzle[];
  userId: string | undefined;
  isPremium: boolean;
  onBack: () => void;
}

const TIME_LIMIT = 300; // 5 minutes

export default function PuzzleRush({ puzzles, userId, isPremium, onBack }: PuzzleRushProps) {
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'finished'>('ready');
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [score, setScore] = useState(0);
  const [puzzlesSolved, setPuzzlesSolved] = useState(0);
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [game, setGame] = useState<Hex | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ username: string; score: number; puzzles_solved: number }[]>([]);
  const [personalBest, setPersonalBest] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentPuzzle = puzzles[currentPuzzleIndex];

  // Fetch leaderboard
  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data } = await supabase
        .from('puzzle_rush_scores')
        .select('score, puzzles_solved, user_id')
        .order('score', { ascending: false })
        .limit(10);

      if (data) {
        const userIds = data.map(d => d.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);
        setLeaderboard(data.map(d => ({
          username: profileMap.get(d.user_id) || 'Unknown',
          score: d.score,
          puzzles_solved: d.puzzles_solved,
        })));
      }
    };

    const fetchPersonalBest = async () => {
      if (!userId) return;
      const { data } = await supabase
        .from('puzzle_rush_scores')
        .select('score')
        .eq('user_id', userId)
        .order('score', { ascending: false })
        .limit(1)
        .single();

      if (data) setPersonalBest(data.score);
    };

    fetchLeaderboard();
    fetchPersonalBest();
  }, [userId]);

  // Initialize puzzle
  useEffect(() => {
    if (!currentPuzzle || gameState !== 'playing') return;

    const newGame = new Hex(currentPuzzle.board_size);
    currentPuzzle.setup_moves.forEach(move => newGame.play(move.cell));
    setGame(newGame);
    setCurrentMoveIndex(0);
  }, [currentPuzzle, currentPuzzleIndex, gameState]);

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState('finished');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  // Save score when finished
  useEffect(() => {
    if (gameState === 'finished' && userId && score > 0) {
      const saveScore = async () => {
        await supabase.from('puzzle_rush_scores').insert({
          user_id: userId,
          score,
          puzzles_solved: puzzlesSolved,
          time_limit_seconds: TIME_LIMIT,
        });

        if (score > personalBest) {
          setPersonalBest(score);
          toast.success(`New personal best: ${score} points!`);
        }
      };
      saveScore();
    }
  }, [gameState, userId, score, puzzlesSolved, personalBest]);

  const startGame = () => {
    setGameState('playing');
    setTimeLeft(TIME_LIMIT);
    setScore(0);
    setPuzzlesSolved(0);
    setCurrentPuzzleIndex(0);
    setCurrentMoveIndex(0);
  };

  const handleMove = useCallback((cell: number) => {
    if (!game || !currentPuzzle || gameState !== 'playing') return;

    const expectedMove = currentPuzzle.solution_moves[currentMoveIndex];

    if (cell === expectedMove.cell) {
      game.play(cell);
      setGame(game.clone());

      const nextIndex = currentMoveIndex + 1;
      setCurrentMoveIndex(nextIndex);

      if (nextIndex >= currentPuzzle.solution_moves.length) {
        // Puzzle solved - award points based on difficulty
        const points = { beginner: 10, intermediate: 20, advanced: 30, master: 50 }[currentPuzzle.difficulty] || 10;
        setScore(prev => prev + points);
        setPuzzlesSolved(prev => prev + 1);
        toast.success(`+${points} points!`);

        // Move to next puzzle
        if (currentPuzzleIndex < puzzles.length - 1) {
          setCurrentPuzzleIndex(prev => prev + 1);
        } else {
          // Ran out of puzzles
          setGameState('finished');
          toast.info('Completed all available puzzles!');
        }
      }
    } else {
      // Wrong move - small time penalty
      setTimeLeft(prev => Math.max(0, prev - 5));
      toast.error('-5 seconds!');
    }
  }, [game, currentPuzzle, currentMoveIndex, gameState, puzzles.length, currentPuzzleIndex]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <Zap className="h-12 w-12 mx-auto mb-4 text-amber-500" />
            <h2 className="text-xl font-bold mb-2">Premium Feature</h2>
            <p className="text-muted-foreground mb-4">
              Puzzle Rush is a The Open Board+ exclusive feature. Upgrade to compete on the leaderboards!
            </p>
            <Button onClick={onBack}>Back to Puzzles</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button variant="ghost" onClick={onBack} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Puzzles
        </Button>

        {gameState === 'ready' && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Start Panel */}
            <Card className="border-2 border-indigo/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-6 w-6 text-amber-500" />
                  Puzzle Rush
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Solve as many puzzles as you can in 5 minutes! Wrong moves cost 5 seconds.
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>5 minutes</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Trophy className="h-4 w-4" />
                    <span>Personal Best: {personalBest}</span>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Points per puzzle:</p>
                  <ul className="list-disc list-inside ml-2">
                    <li>Beginner: 10 pts</li>
                    <li>Intermediate: 20 pts</li>
                    <li>Advanced: 30 pts</li>
                    <li>Master: 50 pts</li>
                  </ul>
                </div>
                <Button onClick={startGame} className="w-full" size="lg">
                  <Play className="h-4 w-4 mr-2" />
                  Start Rush
                </Button>
              </CardContent>
            </Card>

            {/* Leaderboard */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                {leaderboard.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No scores yet. Be the first!</p>
                ) : (
                  <div className="space-y-2">
                    {leaderboard.map((entry, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <span className={`font-bold ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-700' : ''}`}>
                            #{i + 1}
                          </span>
                          <span>{entry.username}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">{entry.puzzles_solved} solved</span>
                          <Badge variant="secondary">{entry.score} pts</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {gameState === 'playing' && game && currentPuzzle && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Stats Panel */}
            <Card className="lg:col-span-1">
              <CardContent className="p-4 space-y-4">
                <div className="text-center">
                  <div className={`text-4xl font-bold ${timeLeft <= 30 ? 'text-red-500 animate-pulse' : ''}`}>
                    {formatTime(timeLeft)}
                  </div>
                  <Progress value={(timeLeft / TIME_LIMIT) * 100} className="mt-2" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{score}</div>
                    <div className="text-xs text-muted-foreground">Points</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{puzzlesSolved}</div>
                    <div className="text-xs text-muted-foreground">Solved</div>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <div className="text-sm text-muted-foreground mb-1">Current Puzzle</div>
                  <div className="font-medium">{currentPuzzle.title}</div>
                  <Badge className="mt-1 capitalize">{currentPuzzle.difficulty}</Badge>
                </div>

                <div className="text-xs text-muted-foreground">
                  Move {currentMoveIndex + 1} of {currentPuzzle.solution_moves.length}
                </div>
              </CardContent>
            </Card>

            {/* Board */}
            <div className="lg:col-span-2 flex justify-center">
              <div className="max-w-[500px] w-full">
                <HexBoard
                  size={game.n}
                  board={game.board}
                  onCellClick={handleMove}
                  disabled={false}
                  lastMove={currentMoveIndex > 0 ? currentPuzzle.solution_moves[currentMoveIndex - 1]?.cell : undefined}
                />
              </div>
            </div>
          </div>
        )}

        {gameState === 'finished' && (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center space-y-4">
              <Trophy className="h-16 w-16 mx-auto text-amber-500" />
              <h2 className="text-2xl font-bold">Time's Up!</h2>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold">{score}</div>
                  <div className="text-sm text-muted-foreground">Final Score</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">{puzzlesSolved}</div>
                  <div className="text-sm text-muted-foreground">Puzzles Solved</div>
                </div>
              </div>
              {score > personalBest && (
                <Badge className="bg-amber-500 text-amber-950">New Personal Best!</Badge>
              )}
              <div className="flex gap-2 justify-center pt-4">
                <Button onClick={startGame}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Play Again
                </Button>
                <Button variant="outline" onClick={onBack}>
                  Back to Puzzles
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
