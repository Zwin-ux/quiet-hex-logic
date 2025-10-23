import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Move {
  cell: number;
  player: 'indigo' | 'ochre';
}

// Pre-computed strategic game sequence (Medium AI quality)
const DEMO_SEQUENCE: Move[] = [
  { cell: 24, player: 'indigo' },  // Center opening
  { cell: 25, player: 'ochre' },   // Adjacent response
  { cell: 31, player: 'indigo' },  // Build east
  { cell: 18, player: 'ochre' },   // Build south
  { cell: 32, player: 'indigo' },  // Continue connection
  { cell: 26, player: 'ochre' },   // Block attempt
  { cell: 38, player: 'indigo' },  // Push toward east
  { cell: 33, player: 'ochre' },   // South progress
  { cell: 39, player: 'indigo' },  // Near east edge
  { cell: 40, player: 'ochre' },   // Block
  { cell: 45, player: 'indigo' },  // Bridge formation
  { cell: 41, player: 'ochre' },   // South continuation
  { cell: 46, player: 'indigo' },  // Complete bridge
  { cell: 48, player: 'ochre' },   // Final south push
  { cell: 47, player: 'indigo' },  // Winning connection
];

// Winning path for Indigo (connects west to east)
const WINNING_PATH = [24, 31, 32, 38, 39, 45, 46, 47];

const BOARD_SIZE = 7;

export function HeroGamePreview() {
  const [currentMove, setCurrentMove] = useState(0);
  const [board, setBoard] = useState<(0 | 1 | 2)[]>(Array(BOARD_SIZE * BOARD_SIZE).fill(0));
  const [showWinningPath, setShowWinningPath] = useState(false);
  const [caption, setCaption] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const captions = [
    "Connect your side",
    "Every move counts",
    "This is Hexology"
  ];

  useEffect(() => {
    const playGame = () => {
      if (currentMove < DEMO_SEQUENCE.length) {
        // Play next move
        const move = DEMO_SEQUENCE[currentMove];
        setBoard(prev => {
          const newBoard = [...prev];
          newBoard[move.cell] = move.player === 'indigo' ? 1 : 2;
          return newBoard;
        });
        setCurrentMove(prev => prev + 1);
      } else if (!showWinningPath) {
        // Show winning path
        setShowWinningPath(true);
        setTimeout(() => {
          // Reset after showing path
          setTimeout(() => {
            setBoard(Array(BOARD_SIZE * BOARD_SIZE).fill(0));
            setCurrentMove(0);
            setShowWinningPath(false);
            setCaption((prev) => (prev + 1) % captions.length);
          }, 2000);
        }, 1200);
      }
    };

    intervalRef.current = setInterval(playGame, showWinningPath ? 100 : 350);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [currentMove, showWinningPath, captions.length]);

  const getCellPosition = (index: number) => {
    const col = index % BOARD_SIZE;
    const row = Math.floor(index / BOARD_SIZE);
    const hexHeight = 100 / (BOARD_SIZE + 0.5);
    const hexWidth = hexHeight * 0.866; // Hex aspect ratio
    
    return {
      x: col * hexWidth + (row * hexWidth * 0.5) + 10,
      y: row * hexHeight * 0.75 + 5,
    };
  };

  return (
    <div className="relative w-full max-h-[70vh] aspect-square max-w-2xl mx-auto">
      {/* Floating caption */}
      <AnimatePresence mode="wait">
        <motion.div
          key={caption}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="absolute -top-16 left-1/2 -translate-x-1/2 text-center"
        >
          <p className="font-body text-2xl md:text-3xl font-semibold text-foreground">
            {captions[caption]}
          </p>
          <p className="font-mono text-sm text-muted-foreground mt-2">
            AI vs AI Demo
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Board container */}
      <div className="relative w-full h-full">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          style={{ filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.15))' }}
        >
          {/* Background gradient */}
          <defs>
            <linearGradient id="boardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--muted))" stopOpacity="0.3" />
              <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.1" />
            </linearGradient>
            
            {/* Glow effect for winning path */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Edge indicators */}
          {/* West edge (Indigo) */}
          <rect x="2" y="10" width="2" height="80" fill="hsl(var(--indigo))" opacity="0.3" rx="1" />
          {/* East edge (Indigo) */}
          <rect x="96" y="10" width="2" height="80" fill="hsl(var(--indigo))" opacity="0.3" rx="1" />
          {/* North edge (Ochre) */}
          <rect x="10" y="2" width="80" height="2" fill="hsl(var(--ochre))" opacity="0.3" rx="1" />
          {/* South edge (Ochre) */}
          <rect x="10" y="96" width="80" height="2" fill="hsl(var(--ochre))" opacity="0.3" rx="1" />

          {/* Hex cells */}
          {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map((_, index) => {
            const pos = getCellPosition(index);
            const cellState = board[index];
            const isInWinningPath = showWinningPath && WINNING_PATH.includes(index);
            
            return (
              <g key={index}>
                {/* Empty hex */}
                <motion.polygon
                  points={`
                    ${pos.x},${pos.y - 3}
                    ${pos.x + 4},${pos.y - 1.5}
                    ${pos.x + 4},${pos.y + 1.5}
                    ${pos.x},${pos.y + 3}
                    ${pos.x - 4},${pos.y + 1.5}
                    ${pos.x - 4},${pos.y - 1.5}
                  `}
                  fill="url(#boardGradient)"
                  stroke="hsl(var(--border))"
                  strokeWidth="0.2"
                  opacity="0.6"
                />

                {/* Stone */}
                <AnimatePresence>
                  {cellState !== 0 && (
                    <motion.circle
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 300, 
                        damping: 20 
                      }}
                      cx={pos.x}
                      cy={pos.y}
                      r="3.5"
                      fill={cellState === 1 ? 'hsl(var(--indigo))' : 'hsl(var(--ochre))'}
                      filter={isInWinningPath ? "url(#glow)" : undefined}
                      style={{
                        filter: isInWinningPath 
                          ? 'drop-shadow(0 0 8px hsl(var(--indigo))) drop-shadow(0 0 12px hsl(var(--indigo)))'
                          : undefined
                      }}
                    />
                  )}
                </AnimatePresence>

                {/* Winning path glow ring */}
                <AnimatePresence>
                  {isInWinningPath && (
                    <motion.circle
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ 
                        scale: [0.8, 1.3, 1.3],
                        opacity: [0, 0.8, 0]
                      }}
                      transition={{ 
                        duration: 1.2,
                        times: [0, 0.5, 1],
                        repeat: Infinity,
                        repeatDelay: 0.3
                      }}
                      cx={pos.x}
                      cy={pos.y}
                      r="4"
                      fill="none"
                      stroke="hsl(var(--indigo))"
                      strokeWidth="0.8"
                    />
                  )}
                </AnimatePresence>
              </g>
            );
          })}

          {/* Winning path connection lines */}
          <AnimatePresence>
            {showWinningPath && (
              <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
              >
                {WINNING_PATH.slice(0, -1).map((cell, idx) => {
                  const nextCell = WINNING_PATH[idx + 1];
                  const pos1 = getCellPosition(cell);
                  const pos2 = getCellPosition(nextCell);
                  
                  return (
                    <motion.line
                      key={`line-${idx}`}
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ 
                        duration: 0.3,
                        delay: idx * 0.15
                      }}
                      x1={pos1.x}
                      y1={pos1.y}
                      x2={pos2.x}
                      y2={pos2.y}
                      stroke="hsl(var(--indigo))"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      opacity="0.6"
                      filter="url(#glow)"
                    />
                  );
                })}
              </motion.g>
            )}
          </AnimatePresence>
        </svg>
      </div>

      {/* Progress indicator */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-1.5">
        {Array.from({ length: 3 }).map((_, idx) => (
          <motion.div
            key={idx}
            className="w-2 h-2 rounded-full bg-muted"
            animate={{
              backgroundColor: idx === caption 
                ? 'hsl(var(--primary))' 
                : 'hsl(var(--muted))'
            }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>
    </div>
  );
}
