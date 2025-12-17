import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { Button } from './ui/button';
import { BoardSkin, getDefaultSkin } from '@/lib/boardSkins';

interface HexBoardProps {
  size: number;
  board: Uint8Array;
  lastMove?: number;
  winningPath?: number[];
  onCellClick?: (cell: number) => void;
  disabled?: boolean;
  onSwapColors?: () => void;
  canSwap?: boolean;
  skin?: BoardSkin;
}

interface AnimatedCell {
  cell: number;
  timestamp: number;
  type: 'place' | 'ripple';
}

// Easing function for bouncy effect
const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// Easing function for smooth reveal
const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3);
};

const HexBoardComponent = ({ 
  size, 
  board, 
  lastMove, 
  winningPath = [],
  onCellClick,
  disabled = false,
  onSwapColors,
  canSwap = false,
  skin = getDefaultSkin()
}: HexBoardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredCell, setHoveredCell] = useState<number | null>(null);
  const [animatedCells, setAnimatedCells] = useState<AnimatedCell[]>([]);
  const animationRef = useRef<number>();
  const lastRenderTime = useRef<number>(0);
  
  // Track winning path animation
  const [winPathAnimStart, setWinPathAnimStart] = useState<number | null>(null);
  const prevWinningPathRef = useRef<number[]>([]);

  // Track new placements for animation
  useEffect(() => {
    if (lastMove !== undefined) {
      // Add main placement animation
      setAnimatedCells(prev => [
        ...prev, 
        { cell: lastMove, timestamp: Date.now(), type: 'place' }
      ]);
    }
  }, [lastMove]);

  // Start winning path trace animation when path appears
  useEffect(() => {
    if (winningPath.length > 0 && prevWinningPathRef.current.length === 0) {
      setWinPathAnimStart(Date.now());
    } else if (winningPath.length === 0) {
      setWinPathAnimStart(null);
    }
    prevWinningPathRef.current = winningPath;
  }, [winningPath]);

  // Clean up old animations
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setAnimatedCells(prev => prev.filter(a => now - a.timestamp < 400));
    }, 50);
    return () => clearInterval(cleanup);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const now = Date.now();
    const shouldAnimate = winningPath.length > 0 || animatedCells.length > 0;
    
    // Throttle to 60fps for smooth animations
    if (shouldAnimate && now - lastRenderTime.current < 16) {
      animationRef.current = requestAnimationFrame(() => {
        setHoveredCell(prev => prev);
      });
      return;
    }
    lastRenderTime.current = now;

    // Set canvas size for retina displays (only if dimensions changed)
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const newWidth = rect.width * dpr;
    const newHeight = rect.height * dpr;
    
    if (canvas.width !== newWidth || canvas.height !== newHeight) {
      canvas.width = newWidth;
      canvas.height = newHeight;
      ctx.scale(dpr, dpr);
    }

    // Calculate hex dimensions
    const padding = 40;
    const availableWidth = rect.width - 2 * padding;
    const availableHeight = rect.height - 2 * padding;
    
    const hexRadius = Math.min(
      availableWidth / ((size - 1) * 1.5 + 2),
      availableHeight / (size * Math.sqrt(3) + 1)
    );

    const hexWidth = hexRadius * 2;
    const hexHeight = Math.sqrt(3) * hexRadius;

    // Center the board
    const boardWidth = (size - 1) * hexRadius * 1.5 + hexWidth;
    const boardHeight = size * hexHeight;
    const offsetX = (rect.width - boardWidth) / 2;
    const offsetY = (rect.height - boardHeight) / 2;

    // Draw board background
    ctx.fillStyle = skin.colors.background;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw edge markers
    ctx.font = `${hexRadius * 0.4}px "IBM Plex Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // West/East markers (Player 1)
    ctx.fillStyle = skin.colors.edgePlayer1;
    ctx.fillText('W', offsetX - 20, offsetY + boardHeight / 2);
    ctx.fillText('E', offsetX + boardWidth + 20, offsetY + boardHeight / 2);

    // North/South markers (Player 2)
    ctx.fillStyle = skin.colors.edgePlayer2;
    ctx.fillText('N', offsetX + boardWidth / 2, offsetY - 20);
    ctx.fillText('S', offsetX + boardWidth / 2, offsetY + boardHeight + 20);

    // Draw hexagons
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const cell = row * size + col;
        const x = offsetX + col * hexRadius * 1.5 + hexRadius;
        const y = offsetY + row * hexHeight + (col % 2 === 1 ? hexHeight / 2 : 0) + hexRadius * Math.sqrt(3) / 2;

        // Draw hex cell
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const hx = x + hexRadius * 0.9 * Math.cos(angle);
          const hy = y + hexRadius * 0.9 * Math.sin(angle);
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();

        // Fill based on state
        const color = board[cell];
        const winPathIndex = winningPath.indexOf(cell);
        const isInWinPath = winPathIndex !== -1;
        const isLast = cell === lastMove;
        const isHovered = cell === hoveredCell && !color && !disabled;
        
        // Calculate winning path trace animation
        let isWinningRevealed = false;
        let winRevealProgress = 0;
        if (isInWinPath && winPathAnimStart) {
          const elapsed = Date.now() - winPathAnimStart;
          const delayPerCell = 80; // ms delay between each cell reveal
          const revealDuration = 300; // ms for each cell to fully reveal
          const cellDelay = winPathIndex * delayPerCell;
          const cellElapsed = elapsed - cellDelay;
          
          if (cellElapsed > 0) {
            isWinningRevealed = true;
            winRevealProgress = Math.min(1, cellElapsed / revealDuration);
          }
        } else if (isInWinPath && !winPathAnimStart) {
          // No animation, just show it
          isWinningRevealed = true;
          winRevealProgress = 1;
        }
        
        // Check if this cell is being animated
        const animatedCell = animatedCells.find(a => a.cell === cell && a.type === 'place');
        const animDuration = 250; // Faster animation
        const animationProgress = animatedCell 
          ? Math.min(1, (Date.now() - animatedCell.timestamp) / animDuration)
          : 1;
        
        // Bouncy scale animation
        const scale = animatedCell ? easeOutBack(animationProgress) : 1;
        // Start from tiny, overshoot, then settle
        const displayScale = animatedCell ? scale * 1.0 : 1;

        if (color === 1) {
          // Player 1 stone with bouncy animation
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(displayScale, displayScale);
          ctx.translate(-x, -y);
          
          // Glow effect during animation
          if (animatedCell && animationProgress < 1) {
            ctx.shadowColor = skin.colors.player1Glow;
            ctx.shadowBlur = 20 * (1 - animationProgress);
          }
          
          ctx.fillStyle = isWinningRevealed ? skin.colors.player1Winning : skin.colors.player1;
          
          // Draw winning path with pulsing glow and trace effect
          if (isWinningRevealed) {
            const baseGlow = easeOutCubic(winRevealProgress);
            const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
            ctx.shadowColor = skin.colors.player1Glow;
            ctx.shadowBlur = 35 * baseGlow * pulse;
            
            // Add scale pop when cell is revealed
            if (winRevealProgress < 1) {
              const popScale = 1 + 0.15 * easeOutCubic(winRevealProgress) * (1 - winRevealProgress);
              ctx.translate(x, y);
              ctx.scale(popScale, popScale);
              ctx.translate(-x, -y);
            }
          }
          
          ctx.fill();
          ctx.shadowBlur = 0;
          
          // Ring indicator for last move
          if (isLast && !animatedCell) {
            ctx.strokeStyle = skin.colors.player2;
            ctx.lineWidth = 3;
            ctx.stroke();
          }
          
          ctx.restore();
        } else if (color === 2) {
          // Player 2 stone with bouncy animation
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(displayScale, displayScale);
          ctx.translate(-x, -y);
          
          // Glow effect during animation
          if (animatedCell && animationProgress < 1) {
            ctx.shadowColor = skin.colors.player2Glow;
            ctx.shadowBlur = 20 * (1 - animationProgress);
          }
          
          ctx.fillStyle = isWinningRevealed ? skin.colors.player2Winning : skin.colors.player2;
          
          // Draw winning path with pulsing glow and trace effect
          if (isWinningRevealed) {
            const baseGlow = easeOutCubic(winRevealProgress);
            const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
            ctx.shadowColor = skin.colors.player2Glow;
            ctx.shadowBlur = 35 * baseGlow * pulse;
            
            // Add scale pop when cell is revealed
            if (winRevealProgress < 1) {
              const popScale = 1 + 0.15 * easeOutCubic(winRevealProgress) * (1 - winRevealProgress);
              ctx.translate(x, y);
              ctx.scale(popScale, popScale);
              ctx.translate(-x, -y);
            }
          }
          
          ctx.fill();
          ctx.shadowBlur = 0;
          
          // Ring indicator for last move
          if (isLast && !animatedCell) {
            ctx.strokeStyle = skin.colors.player1;
            ctx.lineWidth = 3;
            ctx.stroke();
          }
          
          ctx.restore();
        } else {
          // Empty cell with hover effect
          if (isHovered) {
            // Slightly larger and glowing when hovered
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.15)';
            ctx.shadowBlur = 8;
            ctx.fillStyle = skin.colors.emptyHover;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.restore();
          } else {
            ctx.fillStyle = skin.colors.empty;
            ctx.fill();
          }
          ctx.strokeStyle = skin.colors.emptyBorder;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    }
    
    // Re-render animation for winning path glow and placement animations
    if (shouldAnimate) {
      animationRef.current = requestAnimationFrame(() => {
        setHoveredCell(prev => prev);
      });
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [size, board, lastMove, winningPath, winPathAnimStart, hoveredCell, disabled, animatedCells, skin]);

  // Point-in-hexagon test for accurate click detection
  const pointInHex = (px: number, py: number, cx: number, cy: number, size: number): boolean => {
    const dx = Math.abs(px - cx);
    const dy = Math.abs(py - cy);
    
    // Hexagon bounds check
    if (dx > size || dy > size * 0.866) return false;
    
    // Check if point is inside hexagon using diagonal edges
    return dy <= size * 0.866 - dx * 0.577;
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled || !onCellClick) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate hex geometry
    const padding = 40;
    const availableWidth = rect.width - 2 * padding;
    const hexRadius = availableWidth / ((size - 1) * 1.5 + 2);
    const hexHeight = Math.sqrt(3) * hexRadius;

    const boardWidth = (size - 1) * hexRadius * 1.5 + hexRadius * 2;
    const offsetX = (rect.width - boardWidth) / 2;
    const offsetY = (rect.height - size * hexHeight) / 2;

    // Find hex at click position using proper point-in-polygon test
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const cx = offsetX + col * hexRadius * 1.5 + hexRadius;
        const cy = offsetY + row * hexHeight + (col % 2 === 1 ? hexHeight / 2 : 0) + hexRadius * Math.sqrt(3) / 2;
        
        if (pointInHex(x, y, cx, cy, hexRadius * 0.9)) {
          const clickedCell = row * size + col;
          if (board[clickedCell] === 0) {
            onCellClick(clickedCell);
            return;
          }
        }
      }
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const padding = 40;
    const availableWidth = rect.width - 2 * padding;
    const hexRadius = availableWidth / ((size - 1) * 1.5 + 2);
    const hexHeight = Math.sqrt(3) * hexRadius;

    const boardWidth = (size - 1) * hexRadius * 1.5 + hexRadius * 2;
    const offsetX = (rect.width - boardWidth) / 2;
    const offsetY = (rect.height - size * hexHeight) / 2;

    let hovering: number | null = null;

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const cx = offsetX + col * hexRadius * 1.5 + hexRadius;
        const cy = offsetY + row * hexHeight + (col % 2 === 1 ? hexHeight / 2 : 0) + hexRadius * Math.sqrt(3) / 2;
        
        if (pointInHex(x, y, cx, cy, hexRadius * 0.9)) {
          const cell = row * size + col;
          if (!board[cell]) {
            hovering = cell;
          }
          break;
        }
      }
      if (hovering !== null) break;
    }

    if (hovering !== hoveredCell) {
      setHoveredCell(hovering);
    }
  }, [disabled, size, board, hoveredCell]);

  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null);
  }, []);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`aspect-square rounded-lg shadow-2xl ring-4 ring-primary/20 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        style={{ 
          width: 'min(92vw, 1400px)',
          maxWidth: '100%',
          imageRendering: 'crisp-edges',
          boxShadow: '0 20px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)'
        }}
      />
      {canSwap && onSwapColors && (
        <Button
          onClick={onSwapColors}
          size="lg"
          className="absolute top-4 right-4 animate-pulse shadow-lg"
        >
          Swap Colors (Pie Rule)
        </Button>
      )}
    </div>
  );
};

export const HexBoard = memo(HexBoardComponent, (prevProps, nextProps) => {
  // Custom comparison for memo optimization
  return (
    prevProps.size === nextProps.size &&
    prevProps.lastMove === nextProps.lastMove &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.canSwap === nextProps.canSwap &&
    prevProps.skin === nextProps.skin &&
    prevProps.board.length === nextProps.board.length &&
    prevProps.board.every((val, idx) => val === nextProps.board[idx]) &&
    prevProps.winningPath?.length === nextProps.winningPath?.length &&
    prevProps.winningPath?.every((val, idx) => val === nextProps.winningPath[idx])
  );
});
