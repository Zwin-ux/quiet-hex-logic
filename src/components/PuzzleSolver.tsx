import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RotateCcw, Check, X, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Puzzle } from '@/hooks/usePuzzles';
import { useAuth } from '@/hooks/useAuth';
import { usePuzzles } from '@/hooks/usePuzzles';
import { HexBoard } from './HexBoard';
import { Hex } from '@/lib/hex/engine';

interface PuzzleSolverProps {
  puzzle: Puzzle;
  onBack: () => void;
  onComplete: (success: boolean) => void;
}

export default function PuzzleSolver({ puzzle, onBack, onComplete }: PuzzleSolverProps) {
  const { user } = useAuth();
  const { recordAttempt } = usePuzzles(user?.id);
  const [game, setGame] = useState<Hex | null>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [solved, setSolved] = useState(false);
  const [failed, setFailed] = useState(false);
  const [startTime] = useState(Date.now());
  const [showHint, setShowHint] = useState(false);

  // Initialize puzzle
  useEffect(() => {
    const newGame = new Hex(puzzle.board_size);
    
    // Apply setup moves
    puzzle.setup_moves.forEach(move => {
      newGame.play(move.cell);
    });
    
    setGame(newGame);
    setCurrentMoveIndex(0);
    setSolved(false);
    setFailed(false);
    setShowHint(false);
  }, [puzzle]);

  const handleMove = useCallback((cell: number) => {
    if (!game || solved || failed) return;

    const expectedMove = puzzle.solution_moves[currentMoveIndex];
    
    if (cell === expectedMove.cell) {
      // Correct move
      game.play(cell);
      setGame(game.clone());
      
      const nextIndex = currentMoveIndex + 1;
      setCurrentMoveIndex(nextIndex);
      
      if (nextIndex >= puzzle.solution_moves.length) {
        // Puzzle solved!
        setSolved(true);
        const timeSeconds = Math.floor((Date.now() - startTime) / 1000);
        recordAttempt(puzzle.id, true, timeSeconds);
        toast.success('Puzzle solved!');
        onComplete(true);
      }
    } else {
      // Wrong move
      setFailed(true);
      recordAttempt(puzzle.id, false);
      toast.error('Incorrect move. Try again!');
    }
  }, [game, solved, failed, puzzle, currentMoveIndex, startTime, recordAttempt, onComplete]);

  const handleReset = () => {
    const newGame = new Hex(puzzle.board_size);
    puzzle.setup_moves.forEach(move => {
      newGame.play(move.cell);
    });
    setGame(newGame);
    setCurrentMoveIndex(0);
    setSolved(false);
    setFailed(false);
    setShowHint(false);
  };

  if (!game) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Puzzles
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowHint(prev => !prev)}>
              <Lightbulb className="h-4 w-4 mr-1" />
              Hint
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>
        </div>

        {/* Puzzle Info */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{puzzle.title}</h2>
                <p className="text-sm text-muted-foreground">{puzzle.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Rating: {puzzle.rating}</Badge>
                <Badge variant="outline" className="capitalize">{puzzle.difficulty}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        {solved && (
          <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
            <Check className="h-6 w-6 text-green-500" />
            <div>
              <p className="font-semibold text-green-600">Puzzle Solved!</p>
              <p className="text-sm text-muted-foreground">
                Time: {Math.floor((Date.now() - startTime) / 1000)}s
              </p>
            </div>
          </div>
        )}

        {failed && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
            <X className="h-6 w-6 text-red-500" />
            <div>
              <p className="font-semibold text-red-600">Incorrect Move</p>
              <p className="text-sm text-muted-foreground">Click Reset to try again</p>
            </div>
          </div>
        )}

        {showHint && !solved && !failed && (
          <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="text-sm text-amber-600">
              Hint: Look for a move that creates a winning connection or blocks your opponent's path.
            </p>
          </div>
        )}

        {/* Board */}
        <div className="flex justify-center">
          <div className="max-w-[500px] w-full">
            <HexBoard
              size={game.n}
              board={game.board}
              onCellClick={handleMove}
              disabled={solved || failed}
              lastMove={currentMoveIndex > 0 ? puzzle.solution_moves[currentMoveIndex - 1]?.cell : undefined}
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>You are playing as <span className="text-red-500 font-semibold">Red</span>. Find the winning move!</p>
          <p className="mt-1">Move {currentMoveIndex + 1} of {puzzle.solution_moves.length}</p>
        </div>
      </div>
    </div>
  );
}
