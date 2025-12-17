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

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'sparkle' | 'burst' | 'trail';
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
  const particlesRef = useRef<Particle[]>([]);

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

    // Draw coordinate labels
    ctx.font = `bold ${Math.max(10, hexRadius * 0.35)}px "IBM Plex Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Column labels (A, B, C...) at top and bottom
    for (let col = 0; col < size; col++) {
      const label = String.fromCharCode(65 + col); // A, B, C...
      const x = offsetX + col * hexRadius * 1.5 + hexRadius;
      const topY = offsetY - hexRadius * 0.6;
      const bottomY = offsetY + boardHeight + hexRadius * 0.6;
      
      ctx.fillStyle = skin.colors.edgePlayer2;
      ctx.fillText(label, x, topY);
      ctx.fillText(label, x + (size % 2 === 0 ? hexHeight / 2 : 0), bottomY);
    }
    
    // Row labels (1, 2, 3...) at left and right
    for (let row = 0; row < size; row++) {
      const label = String(row + 1);
      const y = offsetY + row * hexHeight + hexRadius * Math.sqrt(3) / 2;
      const leftX = offsetX - hexRadius * 0.8;
      const rightX = offsetX + boardWidth + hexRadius * 0.8;
      
      ctx.fillStyle = skin.colors.edgePlayer1;
      ctx.fillText(label, leftX, y);
      ctx.fillText(label, rightX, y + (size - 1) * hexHeight / 2);
    }

    // Draw edge markers
    ctx.font = `${hexRadius * 0.4}px "IBM Plex Mono", monospace`;

    // West/East markers (Player 1)
    ctx.fillStyle = skin.colors.edgePlayer1;
    ctx.fillText('W', offsetX - hexRadius * 1.8, offsetY + boardHeight / 2);
    ctx.fillText('E', offsetX + boardWidth + hexRadius * 1.8, offsetY + boardHeight / 2);

    // North/South markers (Player 2)
    ctx.fillStyle = skin.colors.edgePlayer2;
    ctx.fillText('N', offsetX + boardWidth / 2, offsetY - hexRadius * 1.2);
    ctx.fillText('S', offsetX + boardWidth / 2, offsetY + boardHeight + hexRadius * 1.2);

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
    
    // Draw smooth curved winning path line with enhanced effects
    if (winningPath.length >= 2 && winPathAnimStart) {
      const elapsed = Date.now() - winPathAnimStart;
      const delayPerCell = 80;
      const totalAnimTime = winningPath.length * delayPerCell + 300;
      const lineProgress = Math.min(1, elapsed / totalAnimTime);
      
      // Calculate center positions for each winning cell
      const pathPoints: { x: number; y: number }[] = [];
      for (const cell of winningPath) {
        const [col, row] = [cell % size, Math.floor(cell / size)];
        const x = offsetX + col * hexRadius * 1.5 + hexRadius;
        const y = offsetY + row * hexHeight + (col % 2 === 1 ? hexHeight / 2 : 0) + hexRadius * Math.sqrt(3) / 2;
        pathPoints.push({ x, y });
      }
      
      if (pathPoints.length >= 2) {
        // Determine line color based on winner (check first cell)
        const firstCell = winningPath[0];
        const winnerColor = board[firstCell];
        const lineColor = winnerColor === 1 ? skin.colors.player1Glow : skin.colors.player2Glow;
        const solidColor = winnerColor === 1 ? skin.colors.player1 : skin.colors.player2;
        
        // Calculate how many points to draw based on animation progress
        const pointsToDraw = Math.floor(pathPoints.length * lineProgress);
        const partialProgress = (pathPoints.length * lineProgress) - pointsToDraw;
        
        // Helper function to draw path
        const drawPath = (ctx: CanvasRenderingContext2D, endIndex: number, partial: number) => {
          ctx.beginPath();
          ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
          
          for (let i = 0; i < endIndex && i < pathPoints.length - 1; i++) {
            const current = pathPoints[i];
            const next = pathPoints[i + 1];
            const midX = (current.x + next.x) / 2;
            const midY = (current.y + next.y) / 2;
            ctx.quadraticCurveTo(current.x, current.y, midX, midY);
          }
          
          if (endIndex < pathPoints.length - 1 && endIndex >= 0) {
            const current = pathPoints[endIndex];
            const next = pathPoints[endIndex + 1];
            const partialX = current.x + (next.x - current.x) * partial;
            const partialY = current.y + (next.y - current.y) * partial;
            ctx.lineTo(partialX, partialY);
          } else if (endIndex === pathPoints.length - 1) {
            ctx.lineTo(pathPoints[pathPoints.length - 1].x, pathPoints[pathPoints.length - 1].y);
          }
        };
        
        // Draw outer glow layer (widest, most diffuse)
        ctx.save();
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = hexRadius * 0.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = lineColor;
        ctx.shadowBlur = 40;
        ctx.globalAlpha = 0.3;
        drawPath(ctx, pointsToDraw, partialProgress);
        ctx.stroke();
        ctx.restore();
        
        // Draw middle glow layer
        ctx.save();
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = hexRadius * 0.35;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = lineColor;
        ctx.shadowBlur = 25;
        ctx.globalAlpha = 0.5;
        drawPath(ctx, pointsToDraw, partialProgress);
        ctx.stroke();
        ctx.restore();
        
        // Draw core line (bright and thick)
        ctx.save();
        ctx.strokeStyle = solidColor;
        ctx.lineWidth = hexRadius * 0.22;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = lineColor;
        ctx.shadowBlur = 15;
        ctx.globalAlpha = 1;
        drawPath(ctx, pointsToDraw, partialProgress);
        ctx.stroke();
        ctx.restore();
        
        // Draw inner bright highlight
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = hexRadius * 0.08;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.7;
        drawPath(ctx, pointsToDraw, partialProgress);
        ctx.stroke();
        ctx.restore();
        
        // Generate and update particles
        if (lineProgress > 0) {
          const particles = particlesRef.current;
          
          // Spawn new particles along the path
          if (elapsed % 50 < 16) { // Spawn every ~50ms
            const spawnCount = Math.min(5, Math.floor(lineProgress * 5) + 1);
            for (let i = 0; i < spawnCount; i++) {
              const pathIndex = Math.floor(Math.random() * Math.min(pointsToDraw + 1, pathPoints.length));
              const point = pathPoints[pathIndex];
              if (point) {
                // Sparkle particles
                particles.push({
                  x: point.x + (Math.random() - 0.5) * hexRadius * 0.5,
                  y: point.y + (Math.random() - 0.5) * hexRadius * 0.5,
                  vx: (Math.random() - 0.5) * 3,
                  vy: (Math.random() - 0.5) * 3 - 1,
                  life: 1,
                  maxLife: 1,
                  size: Math.random() * 4 + 2,
                  color: Math.random() > 0.5 ? lineColor : 'rgba(255, 255, 255, 0.9)',
                  type: 'sparkle'
                });
              }
            }
          }
          
          // Burst particles when animation completes
          if (lineProgress >= 1 && elapsed < totalAnimTime + 100) {
            const lastPoint = pathPoints[pathPoints.length - 1];
            const firstPoint = pathPoints[0];
            for (let i = 0; i < 15; i++) {
              const angle = (Math.PI * 2 * i) / 15;
              const speed = Math.random() * 4 + 2;
              // Burst from both ends
              [firstPoint, lastPoint].forEach(point => {
                particles.push({
                  x: point.x,
                  y: point.y,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  life: 1,
                  maxLife: 1,
                  size: Math.random() * 6 + 3,
                  color: Math.random() > 0.3 ? lineColor : solidColor,
                  type: 'burst'
                });
              });
            }
          }
          
          // Update and draw particles
          for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.05; // Gravity
            p.vx *= 0.98; // Drag
            p.life -= 0.02;
            
            if (p.life <= 0) {
              particles.splice(i, 1);
              continue;
            }
            
            ctx.save();
            ctx.globalAlpha = p.life * 0.8;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = p.type === 'sparkle' ? 8 : 12;
            
            if (p.type === 'sparkle') {
              // Draw star sparkle
              ctx.beginPath();
              const spikes = 4;
              const outerRadius = p.size * p.life;
              const innerRadius = outerRadius * 0.4;
              for (let j = 0; j < spikes * 2; j++) {
                const radius = j % 2 === 0 ? outerRadius : innerRadius;
                const angle = (j * Math.PI) / spikes + elapsed * 0.01;
                const sx = p.x + Math.cos(angle) * radius;
                const sy = p.y + Math.sin(angle) * radius;
                if (j === 0) ctx.moveTo(sx, sy);
                else ctx.lineTo(sx, sy);
              }
              ctx.closePath();
              ctx.fill();
            } else {
              // Draw circular burst particle
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }
          
          // Keep particles array manageable
          if (particles.length > 200) {
            particles.splice(0, particles.length - 200);
          }
        }
      }
    } else if (winningPath.length === 0) {
      // Clear particles when no winning path
      particlesRef.current = [];
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
