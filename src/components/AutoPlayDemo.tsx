import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { HexBoard } from '@/components/HexBoard';
import { Hex } from '@/lib/hex/engine';
import { SimpleHexAI } from '@/lib/hex/simpleAI';

const AutoPlayDemo = () => {
  const [board, setBoard] = useState<Uint8Array>(new Uint8Array(49)); // 7x7
  const [lastMove, setLastMove] = useState<number | undefined>(undefined);
  const [winningPath, setWinningPath] = useState<number[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [caption, setCaption] = useState("Watch the game unfold...");
  const engineRef = useRef<Hex>(new Hex(7, true));
  const moveTimeoutRef = useRef<NodeJS.Timeout>();
  const resetTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!isPlaying) return;

    const makeMove = () => {
      const engine = engineRef.current;
      
      // Check if game is already won
      const winner = engine.winner();
      if (winner) {
        const path = engine.getWinningPath();
        setWinningPath(path || []);
        setCaption(winner === 1 ? "Indigo connects West to East!" : "Ochre connects North to South!");
        
        // Reset after showing win
        resetTimeoutRef.current = setTimeout(() => {
          resetGame();
        }, 3000);
        return;
      }

      // Get AI move
      const ai = new SimpleHexAI(engine, 'medium');
      const { cell } = ai.getMove();

      // Apply move
      try {
        engine.play(cell);
        setBoard(new Uint8Array(engine.board));
        setLastMove(cell);
        setCurrentPlayer(engine.turn as 1 | 2);
        
        // Update caption
        if (engine.board.filter(c => c !== 0).length < 3) {
          setCaption("Opening moves...");
        } else if (engine.board.filter(c => c !== 0).length < 15) {
          setCaption("Building connections...");
        } else {
          setCaption("Racing to complete the path...");
        }

        // Schedule next move
        moveTimeoutRef.current = setTimeout(makeMove, 800);
      } catch (error) {
        console.error('Move failed, resetting:', error);
        resetGame();
      }
    };

    // Start the first move
    moveTimeoutRef.current = setTimeout(makeMove, 1000);

    return () => {
      if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current);
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    };
  }, [isPlaying]);

  const resetGame = () => {
    setIsPlaying(false);
    setWinningPath([]);
    setLastMove(undefined);
    
    setTimeout(() => {
      engineRef.current = new Hex(7, true);
      setBoard(new Uint8Array(49));
      setCurrentPlayer(1);
      setCaption("Watch the game unfold...");
      setIsPlaying(true);
    }, 500);
  };

  return (
    <section className="py-12 px-6 bg-gradient-to-b from-background to-accent/5">
      <div className="max-w-3xl mx-auto">
        <Card className="p-6 shadow-soft border border-border bg-background/50 backdrop-blur">
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm font-mono text-muted-foreground">{caption}</p>
            
            <div className="w-full max-w-md">
              <HexBoard
                size={7}
                board={board}
                lastMove={lastMove}
                winningPath={winningPath}
                onCellClick={() => {}}
                disabled={true}
              />
            </div>

            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                currentPlayer === 1 && !winningPath.length
                  ? 'border-indigo bg-indigo/10' 
                  : 'border-border bg-background/50'
              }`}>
                <div className="w-2 h-2 rounded-full bg-indigo" />
                <span className="text-xs font-mono">Indigo</span>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                currentPlayer === 2 && !winningPath.length
                  ? 'border-ochre bg-ochre/10' 
                  : 'border-border bg-background/50'
              }`}>
                <div className="w-2 h-2 rounded-full bg-ochre" />
                <span className="text-xs font-mono">Ochre</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default AutoPlayDemo;
