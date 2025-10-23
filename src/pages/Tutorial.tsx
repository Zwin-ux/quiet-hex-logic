import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ArrowLeft, Home, Sparkles } from 'lucide-react';
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
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 1,
    title: 'Welcome to Hexology',
    description: 'Hexology is a connection game played on a hexagonal grid. Two players compete to connect opposite sides of the board.',
    instruction: 'Click Next to learn the basics',
    showBoard: false,
  },
  {
    id: 2,
    title: 'The Board',
    description: 'The game is played on a diamond-shaped board made of hexagons. Each player has two opposite sides to connect.',
    instruction: 'Indigo connects West to East. Ochre connects North to South.',
    boardSize: 7,
    showBoard: true,
    allowInteraction: false,
  },
  {
    id: 3,
    title: 'Place Your First Stone',
    description: 'Click any empty hexagon to place your stone. Stones of the same color that touch each other form connections.',
    instruction: 'Try clicking on the center hexagon to place an Indigo stone',
    boardSize: 7,
    showBoard: true,
    allowInteraction: true,
    expectedMoves: [24], // Center of 7x7 board
  },
  {
    id: 4,
    title: 'Building Connections',
    description: 'Your goal is to create an unbroken chain of your colored stones from one side to the opposite side.',
    instruction: '💡 Adjacent stones of the same color form connections. Try placing stones to visualize paths across the board.',
    boardSize: 7,
    showBoard: true,
    allowInteraction: true,
  },
  {
    id: 5,
    title: 'The Pie Rule',
    description: 'After the first move, the second player may choose to swap colors. This balancing mechanism ensures fairness.',
    instruction: 'The pie rule prevents first-player advantage by giving the second player a choice',
    showBoard: false,
  },
  {
    id: 6,
    title: 'No Draws Possible',
    description: 'In Hexology, every game must end with a winner. It\'s mathematically impossible for the board to fill without one player connecting their sides.',
    instruction: 'This elegant property makes every game decisive',
    showBoard: false,
  },
  {
    id: 7,
    title: 'Strategy Matters',
    description: 'Think ahead! Each move should either strengthen your connection or block your opponent. The center of the board is often crucial.',
    instruction: 'Control the center, but don\'t forget to defend your sides',
    boardSize: 7,
    showBoard: true,
    allowInteraction: false,
  },
  {
    id: 8,
    title: 'Ready to Play!',
    description: 'You\'ve learned the basics of Hexology. Now it\'s time to put your knowledge to the test.',
    instruction: 'Play as a guest or sign in to track your progress and challenge friends',
    showBoard: false,
  },
];

export default function Tutorial() {
  const [currentStep, setCurrentStep] = useState(0);
  const [board, setBoard] = useState<Uint8Array>(new Uint8Array(49)); // 7x7 board
  const [lastMove, setLastMove] = useState<number | undefined>(undefined);
  const [winningPath, setWinningPath] = useState<number[]>([]);
  const [engine, setEngine] = useState<Hex | null>(null);
  const navigate = useNavigate();
  
  const step = TUTORIAL_STEPS[currentStep];

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

  // Reset board when step changes (but keep size the same to prevent unnecessary resets)
  useEffect(() => {
    const size = step.boardSize || 7;
    // Only reset if the board size changed or if we moved to a non-interactive step
    if (board.length !== size * size || !step.allowInteraction) {
      setBoard(new Uint8Array(size * size));
      setLastMove(undefined);
      setWinningPath([]);
      setEngine(new Hex(size, true));
    }
  }, [currentStep, step.boardSize, step.allowInteraction]);

  const handleCellClick = (cell: number) => {
    if (!engine || !step.allowInteraction || board[cell] !== 0) return;
    
    // Place a stone
    const newBoard = new Uint8Array(board);
    newBoard[cell] = 1; // Indigo stone
    setBoard(newBoard);
    setLastMove(cell);
    
    // Update engine and check for win
    const testEngine = new Hex(step.boardSize || 7, true);
    for (let i = 0; i < newBoard.length; i++) {
      if (newBoard[i] !== 0) {
        try {
          testEngine.play(i);
        } catch (e) {
          // Skip invalid moves during reconstruction
        }
      }
    }
    
    const winner = testEngine.winner();
    if (winner) {
      const path = testEngine.getWinningPath();
      setWinningPath(path || []);
      toast.success('You created a winning path!', { 
        description: 'Indigo connected West to East!' 
      });
    }
    
    // Check if it's the expected move
    if (step.expectedMoves && step.expectedMoves.includes(cell)) {
      toast.success('Great move!', { description: 'You placed a stone correctly' });
    } else if (step.expectedMoves) {
      toast('Try clicking the center hexagon', { description: 'Follow the instruction' });
    }
  };

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Tutorial complete - offer options
      navigate('/lobby');
    }
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
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-body text-2xl font-semibold text-foreground">
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
          <Card className="p-8 shadow-paper border-2 border-border h-fit">
            <Badge className="mb-4 font-mono">
              Lesson {step.id}
            </Badge>
            
            <h2 className="font-body text-3xl font-semibold text-foreground mb-4">
              {step.title}
            </h2>
            
            <p className="font-body text-lg text-muted-foreground leading-relaxed mb-6">
              {step.description}
            </p>

            <div className="bg-accent/20 border-l-4 border-indigo p-4 rounded-r-lg mb-6">
              <p className="font-body text-foreground">
                💡 {step.instruction}
              </p>
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
              
              <Button
                onClick={handleNext}
                className={`flex-1 gap-2 ${currentStep === 0 ? 'w-full' : ''}`}
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

            {/* Special actions for final step */}
            {currentStep === TUTORIAL_STEPS.length - 1 && (
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground mb-4 font-body">
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
            <Card className="p-8 shadow-paper border-2 border-border">
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
                    Interactive board - try clicking on hexagons!
                  </p>
                </div>
              )}
            </Card>
          )}

          {/* Placeholder when no board */}
          {!step.showBoard && (
            <Card className="p-8 shadow-paper border-2 border-border flex items-center justify-center bg-gradient-to-br from-indigo/5 via-accent/10 to-ochre/5">
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
