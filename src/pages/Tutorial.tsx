import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ArrowLeft, Home, Sparkles, RotateCcw } from 'lucide-react';
import { HexBoard } from '@/components/HexBoard';
import { Hex } from '@/lib/hex/engine';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  instruction: string;
  boardSize?: number;
  showBoard?: boolean;
  allowInteraction?: boolean;
  expectedMoves?: number[];
  winCondition?: 'connect' | 'place' | 'none';
  requiredPath?: { start: number; end: number; color: number }; // Must connect these cells
  prefilledBoard?: number[][]; // [cell, color] pairs
  canProceedWithoutWin?: boolean; // Allow skipping if too hard
  maxMoves?: number; // Fail if exceed this
  showPieRuleDemo?: boolean;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 1,
    title: 'Welcome to Hexology — Learn Hex',
    description: 'Hex is a connection game played on a hexagonal grid. Two players compete to connect opposite sides of the board.',
    instruction: 'Click Next to learn the basics',
    showBoard: false,
    winCondition: 'none',
  },
  {
    id: 2,
    title: 'The Board',
    description: 'The game is played on a diamond-shaped board made of hexagons. Each player has two opposite sides to connect.',
    instruction: 'Indigo connects West to East. Ochre connects North to South.',
    boardSize: 5,
    showBoard: true,
    allowInteraction: false,
    winCondition: 'none',
  },
  {
    id: 3,
    title: 'Connecting Sides: Example',
    description: 'Here\'s an example of how Indigo wins by creating a path from West to East. Notice how the stones touch each other, forming an unbroken chain.',
    instruction: 'Study this winning path - each stone connects to the next',
    boardSize: 5,
    showBoard: true,
    allowInteraction: false,
    winCondition: 'none',
    prefilledBoard: [
      [0, 1], [5, 1], [10, 1], [11, 1], [12, 1], [17, 1], [22, 1]
    ],
  },
  {
    id: 4,
    title: 'Your Turn: Build a Bridge',
    description: 'Now you try! Complete the Indigo path from West to East by connecting these stones together.',
    instruction: 'Click to place Indigo stones and complete the connection',
    boardSize: 5,
    showBoard: true,
    allowInteraction: true,
    winCondition: 'connect',
    prefilledBoard: [
      [0, 1], [2, 1], [4, 1] // Top row with two easy gaps to fill (1 and 3)
    ],
    maxMoves: 6,
  },
  {
    id: 5,
    title: 'The Pie Rule Explained',
    description: 'After the first move, the second player can swap colors. If the opening move is too strong, you can take it for yourself!',
    instruction: 'The pie rule keeps the game fair',
    boardSize: 5,
    showBoard: true,
    allowInteraction: false,
    showPieRuleDemo: true,
    winCondition: 'none',
    prefilledBoard: [
      [12, 1] // Center stone
    ],
  },
  {
    id: 6,
    title: 'Pie Rule: Your Choice',
    description: 'Your opponent played in the center (strong position). Would you want to swap colors and take this stone? In a real game, you\'d decide!',
    instruction: 'After seeing this, think: swap or play your own color?',
    boardSize: 5,
    showBoard: true,
    allowInteraction: false,
    winCondition: 'none',
    prefilledBoard: [
      [12, 2] // Same stone but now ochre (swapped)
    ],
  },
  {
    id: 7,
    title: 'Block Your Opponent',
    description: 'Ochre is trying to connect North to South. You\'re playing Indigo. Stop them while building your own path!',
    instruction: 'Place stones to block Ochre AND connect West to East',
    boardSize: 5,
    showBoard: true,
    allowInteraction: true,
    winCondition: 'connect',
    prefilledBoard: [
      [2, 2], [7, 2], [17, 2] // Ochre pieces forming a threat
    ],
    maxMoves: 10,
    canProceedWithoutWin: true,
  },
  {
    id: 8,
    title: 'Advanced: Diagonal Breakthrough',
    description: 'Watch how Indigo wins by cutting diagonally through Ochre\'s defenses. Ochre blocked two routes, but Indigo found the third path—a classic tactical breakthrough.',
    instruction: 'Study the glowing winning path—notice how it bridges between Ochre\'s walls',
    boardSize: 7,
    showBoard: true,
    allowInteraction: false,
    winCondition: 'none',
    prefilledBoard: [
      // Indigo's winning diagonal path (West to East through row 4)
      [0, 1], [7, 1], [14, 1], [15, 1], [22, 1], [29, 1], [30, 1], [31, 1], [32, 1], [33, 1], [34, 1],
      
      // Ochre's upper defensive wall (blocking route 1)
      [2, 2], [3, 2], [9, 2], [10, 2], [16, 2], [17, 2],
      
      // Ochre's middle defensive wall (blocking route 2)
      [23, 2], [24, 2], [25, 2],
      
      // Ochre's lower attempted block (too late)
      [35, 2], [36, 2], [42, 2], [43, 2],
      
      // Additional Indigo stones showing alternative attempts
      [1, 1], [8, 1],
      
      // Additional Ochre reinforcements
      [4, 2], [11, 2], [18, 2]
    ],
  },
  {
    id: 9,
    title: 'Ready to Play!',
    description: 'You\'ve mastered the basics of Hex. Now it\'s time to put your skills to the test against real opponents or AI.',
    instruction: 'Play as a guest or sign in to track your progress and challenge friends',
    showBoard: false,
    winCondition: 'none',
  },
];

export default function Tutorial() {
  const [currentStep, setCurrentStep] = useState(0);
  const [board, setBoard] = useState<Uint8Array>(new Uint8Array(25)); // 5x5 default
  const [lastMove, setLastMove] = useState<number | undefined>(undefined);
  const [winningPath, setWinningPath] = useState<number[]>([]);
  const [engine, setEngine] = useState<Hex | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [hasWon, setHasWon] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const navigate = useNavigate();
  
  const step = TUTORIAL_STEPS[currentStep];
  const canProceed = step.winCondition === 'none' || hasWon || step.canProceedWithoutWin;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && currentStep < TUTORIAL_STEPS.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else if (e.key === 'ArrowLeft' && currentStep > 0) {
        setCurrentStep(prev => prev - 1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentStep]);

  // Reset board when step changes
  useEffect(() => {
    const size = step.boardSize || 5;
    const newBoard = new Uint8Array(size * size);
    
    // Apply prefilled board
    if (step.prefilledBoard) {
      step.prefilledBoard.forEach(([cell, color]) => {
        newBoard[cell] = color;
      });
    }
    
    setBoard(newBoard);
    setLastMove(undefined);
    setWinningPath([]);
    setMoveCount(0);
    setHasWon(false);
    setHasFailed(false);
    
    // Create engine and apply prefilled state deterministically (no turn alternation)
    const baseEngine = new Hex(size, true);
    if (step.prefilledBoard) {
      step.prefilledBoard.forEach(([cell, color]) => {
        baseEngine.board[cell] = color as 1 | 2;
      });
    }
    // Rebuild connectivity from board state
    const rebuilt = baseEngine.clone();

    // If prefilled board already shows a win and step is non-interactive, show the path
    const winner = rebuilt.winner();
    if (winner && !step.allowInteraction) {
      const path = rebuilt.getWinningPath();
      setWinningPath(path || []);
    }

    setEngine(rebuilt);
  }, [currentStep]);

  const handleCellClick = (cell: number) => {
    if (!engine || !step.allowInteraction || board[cell] !== 0 || hasWon || hasFailed) return;
    
    const newMoveCount = moveCount + 1;
    setMoveCount(newMoveCount);
    
    // Place a stone on the visual board
    const newBoard = new Uint8Array(board);
    newBoard[cell] = 1; // Indigo for tutorial
    setBoard(newBoard);
    setLastMove(cell);
    
    // Update engine deterministically (bypass alternating turns)
    const updated = engine.clone();
    updated.board[cell] = 1;
    const rebuilt = updated.clone();
    setEngine(rebuilt);
    
    // Check for win
    const winner = rebuilt.winner();
    if (winner === 1) {
      const path = rebuilt.getWinningPath();
      setWinningPath(path || []);
      setHasWon(true);
      
      if (step.winCondition === 'connect') {
        toast.success('Perfect! You connected West to East!', { 
          description: 'Click Next to continue',
          duration: 4000
        });
      } else {
        toast.success('Excellent move!', { 
          description: 'You found a winning path!' 
        });
      }
      return;
    }

    // Auto-fail if we reached the move cap without a win
    if (step.maxMoves && newMoveCount >= step.maxMoves) {
      setHasFailed(true);
      toast.error('Too many moves!', { 
        description: 'Try again with a more direct path' 
      });
      return;
    }
    
    if (step.expectedMoves && step.expectedMoves.includes(cell)) {
      toast.success('Great placement!');
    }
  };

  const handleNext = () => {
    if (!canProceed) {
      toast.error('Complete the objective first!', {
        description: step.winCondition === 'connect' 
          ? 'Connect West to East to proceed' 
          : 'Place the required stones'
      });
      return;
    }
    
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      navigate('/lobby');
    }
  };

  const handleReset = () => {
    const size = step.boardSize || 5;
    const newBoard = new Uint8Array(size * size);
    
    if (step.prefilledBoard) {
      step.prefilledBoard.forEach(([cell, color]) => {
        newBoard[cell] = color;
      });
    }
    
    setBoard(newBoard);
    setLastMove(undefined);
    setWinningPath([]);
    setMoveCount(0);
    setHasWon(false);
    setHasFailed(false);
    
    const baseEngine = new Hex(size, true);
    if (step.prefilledBoard) {
      step.prefilledBoard.forEach(([cell, color]) => {
        baseEngine.board[cell] = color as 1 | 2;
      });
    }
    const rebuilt = baseEngine.clone();
    setEngine(rebuilt);
    
    toast.success('Board reset');
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePlayAsGuest = async () => {
    try {
      // Create a guest AI match with Easy difficulty
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .insert({
          owner: null, // Guest match
          size: 7,
          pie_rule: true, // Enable pie rule for consistency
          status: 'active',
          ai_difficulty: 'easy',
        })
        .select()
        .single();

      if (matchError) throw matchError;

      toast.success('Guest match created!', {
        description: 'Playing against Easy AI'
      });

      navigate(`/match/${match.id}`);
    } catch (error: any) {
      toast.error('Failed to create match', {
        description: error.message
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-semibold text-foreground">
              Tutorial
            </h1>
          </div>
          <Button variant="outline" onClick={() => navigate('/')} className="gap-2">
            <Home className="h-4 w-4" />
            Home
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            {TUTORIAL_STEPS.map((s, idx) => (
              <div
                key={s.id}
                className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                  idx < currentStep 
                    ? 'bg-ochre' 
                    : idx === currentStep 
                    ? 'bg-indigo' 
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground font-mono">
            Step {step.id} of {TUTORIAL_STEPS.length}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Content Panel */}
          <Card className="p-8 shadow-lg border-2 border-border h-fit">
            <Badge className="mb-4 font-mono">
              Lesson {step.id}
            </Badge>
            
            <h2 className="font-display text-3xl font-semibold text-foreground mb-4">
              {step.title}
            </h2>
            
            <p className="font-display text-lg text-muted-foreground leading-relaxed mb-6">
              {step.description}
            </p>

            <div className={`border-l-4 p-4 rounded-r-lg mb-6 ${
              hasFailed 
                ? 'bg-destructive/20 border-destructive' 
                : hasWon 
                ? 'bg-indigo/20 border-indigo' 
                : 'bg-accent/20 border-indigo'
            }`}>
              <p className="font-display text-foreground">
                {hasFailed && '❌ '}
                {hasWon && '✅ '}
                {!hasFailed && !hasWon && '💡 '}
                {hasFailed ? 'Too many moves! Try a more direct path.' : step.instruction}
              </p>
              
              {step.winCondition === 'connect' && !hasWon && !hasFailed && (
                <p className="text-sm text-muted-foreground mt-2">
                  {step.maxMoves && `Moves: ${moveCount}/${step.maxMoves}`}
                </p>
              )}
              
              {hasWon && step.winCondition !== 'none' && (
                <p className="text-sm text-indigo font-semibold mt-2">
                  Objective complete! Click Next to continue.
                </p>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-3">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  className="flex-1 gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </Button>
              )}
              
              {step.allowInteraction && (hasFailed || moveCount > 0) && (
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="flex-1 gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              )}
              
              <Button
                onClick={handleNext}
                disabled={!canProceed}
                className={`flex-1 gap-2 ${currentStep === 0 ? 'w-full' : ''} ${!canProceed ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {currentStep < TUTORIAL_STEPS.length - 1 ? (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  'Go to Lobby'
                )}
              </Button>
            </div>

            {step.showPieRuleDemo && (
              <div className="mt-4 p-4 bg-indigo/10 border border-indigo/30 rounded-lg">
                <p className="text-sm font-display text-foreground mb-2">
                  <strong>Pie Rule Visualization:</strong>
                </p>
                <p className="text-sm text-muted-foreground">
                  Before: Indigo places center stone → After: Ochre swaps and takes that stone
                </p>
                <p className="text-xs text-muted-foreground mt-2 italic">
                  Next step shows what the board looks like after swapping!
                </p>
              </div>
            )}

            {/* Special actions for final step */}
            {currentStep === TUTORIAL_STEPS.length - 1 && (
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground mb-4 font-display">
                  Quick start options:
                </p>
                <div className="grid gap-3">
                  <Button
                    onClick={handlePlayAsGuest}
                    variant="secondary"
                    className="w-full gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Play as Guest (vs Easy AI)
                  </Button>
                  <Button
                    onClick={() => navigate('/auth')}
                    variant="outline"
                    className="w-full"
                  >
                    Sign In to Track Progress
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Board Panel */}
          {step.showBoard && (
            <Card className="p-8 shadow-lg border-2 border-border">
              <div className="flex items-center justify-center">
                <HexBoard
                  size={step.boardSize || 7}
                  board={board}
                  lastMove={lastMove}
                  winningPath={winningPath}
                  onCellClick={step.allowInteraction ? handleCellClick : undefined}
                  disabled={!step.allowInteraction}
                />
              </div>
              
              {step.allowInteraction && (
                <div className="mt-4 p-4 bg-accent/10 rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground font-mono text-center">
                    {step.winCondition === 'connect' 
                      ? '🎯 Click hexagons to place Indigo stones and connect West to East!' 
                      : 'Interactive board - try clicking on hexagons!'}
                  </p>
                  {hasWon && (
                    <p className="text-sm text-indigo font-semibold text-center mt-2">
                      ✅ Objective Complete!
                    </p>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* Placeholder when no board */}
          {!step.showBoard && (
            <Card className="p-8 shadow-lg border-2 border-border flex items-center justify-center bg-gradient-to-br from-indigo/5 via-accent/10 to-ochre/5">
              <div className="text-center">
                <div className="text-8xl mb-6 opacity-10">⬡</div>
              </div>
            </Card>
          )}
        </div>

        {/* Keyboard Hint */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground font-mono">
            Use ← → arrow keys or click buttons to navigate
          </p>
        </div>
      </div>
    </div>
  );
}
