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
}

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
  const mouseMoveTimeout = useRef<number>();

  // Track new placements for animation
  useEffect(() => {
    if (lastMove !== undefined) {
      setAnimatedCells(prev => [...prev, { cell: lastMove, timestamp: Date.now() }]);
    }
  }, [lastMove]);

  // Clean up old animations
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setAnimatedCells(prev => prev.filter(a => now - a.timestamp < 500));
    }, 100);
    return () => clearInterval(cleanup);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const now = Date.now();
    const shouldAnimate = winningPath.length > 0 || animatedCells.length > 0;
    
    // Throttle animations to 30fps for better performance
    if (shouldAnimate && now - lastRenderTime.current < 33) {
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
        const isWinning = winningPath.includes(cell);
        const isLast = cell === lastMove;
        const isHovered = cell === hoveredCell && !color && !disabled;
        
        // Check if this cell is being animated
        const animatedCell = animatedCells.find(a => a.cell === cell);
        const animationProgress = animatedCell 
          ? Math.min(1, (Date.now() - animatedCell.timestamp) / 300)
          : 1;
        const scale = animatedCell ? 0.5 + (animationProgress * 0.5) : 1;

        if (color === 1) {
          // Player 1 stone with scale animation
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(scale, scale);
          ctx.translate(-x, -y);
          
          ctx.fillStyle = isWinning ? skin.colors.player1Winning : skin.colors.player1;
          
          // Draw winning path with pulsing glow
          if (isWinning) {
            const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
            ctx.shadowColor = skin.colors.player1Glow;
            ctx.shadowBlur = 25 * pulse;
          }
          
          ctx.fill();
          ctx.shadowBlur = 0;
          
          if (isLast) {
            ctx.strokeStyle = skin.colors.player2;
            ctx.lineWidth = 3;
            ctx.stroke();
          }
          
          ctx.restore();
        } else if (color === 2) {
          // Player 2 stone with scale animation
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(scale, scale);
          ctx.translate(-x, -y);
          
          ctx.fillStyle = isWinning ? skin.colors.player2Winning : skin.colors.player2;
          
          // Draw winning path with pulsing glow
          if (isWinning) {
            const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
            ctx.shadowColor = skin.colors.player2Glow;
            ctx.shadowBlur = 25 * pulse;
          }
          
          ctx.fill();
          ctx.shadowBlur = 0;
          
          if (isLast) {
            ctx.strokeStyle = skin.colors.player1;
            ctx.lineWidth = 3;
            ctx.stroke();
          }
          
          ctx.restore();
        } else {
          // Empty cell
          ctx.fillStyle = isHovered ? skin.colors.emptyHover : skin.colors.empty;
          ctx.fill();
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
  }, [size, board, lastMove, winningPath, hoveredCell, disabled, animatedCells, skin]);

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

    // Debounce mouse move for better performance
    if (mouseMoveTimeout.current) {
      clearTimeout(mouseMoveTimeout.current);
    }

    mouseMoveTimeout.current = window.setTimeout(() => {
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

      setHoveredCell(hovering);
    }, 16); // ~60fps
  }, [disabled, size, board]);

  const handleMouseLeave = useCallback(() => {
    if (mouseMoveTimeout.current) {
      clearTimeout(mouseMoveTimeout.current);
    }
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
