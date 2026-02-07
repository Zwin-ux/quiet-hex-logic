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
  hintCell?: number | null;
  isAggressive?: boolean;
}

interface AnimatedCell {
  cell: number;
  timestamp: number;
  type: 'place' | 'ripple' | 'aggressive';
}

interface ImpactEvent {
  x: number;
  y: number;
  timestamp: number;
  color: string;
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
  skin = getDefaultSkin(),
  hintCell = null,
  isAggressive = false
}: HexBoardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredCell, setHoveredCell] = useState<number | null>(null);
  const [animatedCells, setAnimatedCells] = useState<AnimatedCell[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [impactEvents, setImpactEvents] = useState<ImpactEvent[]>([]);
  const animationRef = useRef<number>();
  const lastRenderTime = useRef<number>(0);
  
  // Track winning path animation
  const [winPathAnimStart, setWinPathAnimStart] = useState<number | null>(null);
  const prevWinningPathRef = useRef<number[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  
  // Board entrance animation - ripple reveal from center
  const [boardMountTime] = useState<number>(() => Date.now());
  const entranceAnimDuration = 600; // Total duration for board to fully appear

  // Track new placements for animation
  useEffect(() => {
    if (lastMove !== undefined) {
      // Add main placement animation
      setAnimatedCells(prev => [
        ...prev, 
        { 
          cell: lastMove, 
          timestamp: Date.now(), 
          type: isAggressive ? 'aggressive' : 'place' 
        }
      ]);

      // If aggressive, trigger a massive impact shockwave
      if (isAggressive && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const [col, row] = [lastMove % size, Math.floor(lastMove / size)];
        
        // Calculate coords (simplified estimate for center)
        const padding = 40;
        const availableWidth = rect.width - 2 * padding;
        const availableHeight = rect.height - 2 * padding;
        const hexRadius = Math.min(
          availableWidth / ((size - 1) * 1.5 + 2),
          availableHeight / (size * Math.sqrt(3) + 1)
        );
        const hexHeight = Math.sqrt(3) * hexRadius;
        const boardWidth = (size - 1) * hexRadius * 1.5 + hexRadius * 2;
        const boardHeight = size * hexHeight;
        const offsetX = (rect.width - boardWidth) / 2;
        const offsetY = (rect.height - boardHeight) / 2;
        
        const x = offsetX + col * hexRadius * 1.5 + hexRadius;
        const y = offsetY + row * hexHeight + (col % 2 === 1 ? hexHeight / 2 : 0) + hexRadius * Math.sqrt(3) / 2;

        setImpactEvents(prev => [
          ...prev,
          { x, y, timestamp: Date.now(), color: board[lastMove] === 1 ? skin.colors.player1 : skin.colors.player2 }
        ]);
      }
    }
  }, [lastMove, isAggressive, size, board, skin]);

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
    const isEntranceAnimating = now - boardMountTime < entranceAnimDuration + 400; // Include stagger time
    const shouldAnimate = isEntranceAnimating || winningPath.length > 0 || animatedCells.length > 0 || !!skin.animationType;
    
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

    // Calculate board intensity (percentage full)
    const stonesCount = board.filter(cell => cell !== 0).length;
    const isGameOver = winningPath.length > 0;
    const intensity = (1 + (stonesCount / board.length)) * (isGameOver ? 2.5 : 1); // 1.0 to 5.0
    
    // Board layout calculations
    const boardWidth = (size - 1) * hexRadius * 1.5 + hexWidth;
    const boardHeight = size * hexHeight;
    const offsetX = (rect.width - boardWidth) / 2;
    const offsetY = (rect.height - boardHeight) / 2;

    // Draw board background
    ctx.fillStyle = skin.colors.background;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Filter out old impact events
    const validImpacts = impactEvents.filter(impact => now - impact.timestamp < 1000);
    if (validImpacts.length !== impactEvents.length) {
      setImpactEvents(validImpacts);
    }

    // Render background animations if applicable
    if (skin.animationType === 'galaxy') {
      const time = now / 2000;
      ctx.save();
      for (let i = 0; i < 60; i++) {
        const baseX = ((Math.sin(i * 123.4 + time * 0.2) + 1) / 2) * rect.width;
        const baseY = ((Math.cos(i * 567.8 + time * 0.1) + 1) / 2) * rect.height;
        
        // Mouse reactivity
        const distToMouse = Math.sqrt((mousePos.x - baseX) ** 2 + (mousePos.y - baseY) ** 2);
        const mouseFactor = Math.max(0, 1 - distToMouse / 150);
        const x = baseX + (baseX - mousePos.x) * mouseFactor * 0.3;
        const y = baseY + (baseY - mousePos.y) * mouseFactor * 0.3;

        const size = (Math.sin(time * intensity + i) + 1.2) * (1.5 + mouseFactor);
        const opacity = (Math.sin(time * 2 * intensity + i) + 1) / 2 * 0.6;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (skin.animationType === 'aurora') {
      const time = now / (3000 / intensity);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 4; i++) {
        const xOffset = Math.sin(time + i) * 100 + (mousePos.x / rect.width) * 50;
        const gradient = ctx.createLinearGradient(0, 0, rect.width, 0);
        const color = i === 0 ? 'rgba(0, 255, 150, 0.08)' : i === 1 ? 'rgba(0, 150, 255, 0.08)' : i === 2 ? 'rgba(150, 0, 255, 0.08)' : 'rgba(255, 100, 200, 0.08)';
        
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop((0.2 + i * 0.2 + xOffset / 1000) % 1, color);
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, rect.width, rect.height);
      }
      ctx.restore();
    }

    // Render Impact Shockwaves
    validImpacts.forEach(impact => {
      const elapsed = now - impact.timestamp;
      const progress = elapsed / 1000;
      const radius = progress * rect.width * 0.8;
      const opacity = 1 - progress;
      
      ctx.save();
      ctx.beginPath();
      ctx.arc(impact.x, impact.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = impact.color;
      ctx.lineWidth = 4 * (1 - progress);
      ctx.globalAlpha = opacity * 0.3;
      ctx.stroke();
      ctx.restore();
    });

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

    // Draw hexagons with entrance animation
    const entranceElapsed = now - boardMountTime;
    const boardCenterX = size / 2;
    const boardCenterY = size / 2;
    
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const cell = row * size + col;
        const x = offsetX + col * hexRadius * 1.5 + hexRadius;
        const y = offsetY + row * hexHeight + (col % 2 === 1 ? hexHeight / 2 : 0) + hexRadius * Math.sqrt(3) / 2;

        // Calculate entrance animation based on distance from center (ripple effect)
        const distFromCenter = Math.sqrt(
          Math.pow(col - boardCenterX, 2) + Math.pow(row - boardCenterY, 2)
        );
        const maxDist = Math.sqrt(2) * size / 2;
        const cellDelay = (distFromCenter / maxDist) * 300; // Stagger up to 300ms
        const cellEntranceProgress = Math.min(1, Math.max(0, (entranceElapsed - cellDelay) / entranceAnimDuration));
        const entranceScale = easeOutCubic(cellEntranceProgress);
        const entranceOpacity = cellEntranceProgress;

        // Skip drawing if not yet visible
        if (cellEntranceProgress <= 0) continue;

        // Helper function to draw hex path
        const drawHexPath = (radiusMultiplier: number = 0.9) => {
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const hx = x + hexRadius * radiusMultiplier * Math.cos(angle);
            const hy = y + hexRadius * radiusMultiplier * Math.sin(angle);
            if (i === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          ctx.closePath();
        };

        // Fill based on state
        const color = board[cell];
        const winPathIndex = winningPath.indexOf(cell);
        const isInWinPath = winPathIndex !== -1;
        const isLast = cell === lastMove;
        const isHovered = cell === hoveredCell && !color && !disabled;
        
        // Calculate winning path animation
        // Since winningPath is now an unordered set of all winning cells,
        // we animate all cells together with a quick fade-in
        let isWinningRevealed = false;
        let winRevealProgress = 0;
        if (isInWinPath && winPathAnimStart) {
          const elapsed = Date.now() - winPathAnimStart;
          const revealDuration = 400; // ms for all cells to fully reveal together

          isWinningRevealed = true;
          winRevealProgress = Math.min(1, elapsed / revealDuration);
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
          // Player 1 stone with bouncy animation + entrance animation
          ctx.save();
          ctx.globalAlpha = entranceOpacity;
          ctx.translate(x, y);
          ctx.scale(displayScale * entranceScale, displayScale * entranceScale);
          ctx.translate(-x, -y);
          
          // Glow effect during animation
          if (animatedCell && animationProgress < 1) {
            const isAggressiveType = animatedCell.type === 'aggressive';
            ctx.shadowColor = skin.colors.player1Glow;
            ctx.shadowBlur = (isAggressiveType ? 40 : 20) * (1 - animationProgress);
            
            if (isAggressiveType) {
              drawHexPath();
              ctx.strokeStyle = skin.colors.player1Winning;
              ctx.lineWidth = 2;
              ctx.stroke();
            }
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
          
          drawHexPath();
          ctx.fill();
          ctx.shadowBlur = 0;
          
          // Ring indicator for last move
          if (isLast && !animatedCell) {
            drawHexPath();
            ctx.strokeStyle = skin.colors.player2;
            ctx.lineWidth = 3;
            ctx.stroke();
          }
          
          ctx.restore();
        } else if (color === 2) {
          // Player 2 stone with bouncy animation + entrance animation
          ctx.save();
          ctx.globalAlpha = entranceOpacity;
          ctx.translate(x, y);
          ctx.scale(displayScale * entranceScale, displayScale * entranceScale);
          ctx.translate(-x, -y);
          
          // Glow effect during animation
          if (animatedCell && animationProgress < 1) {
            const isAggressiveType = animatedCell.type === 'aggressive';
            ctx.shadowColor = skin.colors.player2Glow;
            ctx.shadowBlur = (isAggressiveType ? 40 : 20) * (1 - animationProgress);
            
            if (isAggressiveType) {
              drawHexPath();
              ctx.strokeStyle = skin.colors.player2Winning;
              ctx.lineWidth = 2;
              ctx.stroke();
            }
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
          
          drawHexPath();
          ctx.fill();
          ctx.shadowBlur = 0;
          
          // Ring indicator for last move
          if (isLast && !animatedCell) {
            drawHexPath();
            ctx.strokeStyle = skin.colors.player1;
            ctx.lineWidth = 3;
            ctx.stroke();
          }
          
          ctx.restore();
          
          // Draw AI hint (best alternative)
          if (hintCell === cell && board[cell] === 0) {
            ctx.save();
            ctx.globalAlpha = 0.4 * entranceOpacity;
            ctx.strokeStyle = '#fbbf24'; // Amber-400
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const angle = (Math.PI / 3) * i + Math.PI / 6;
              const px = x + hexRadius * 0.8 * Math.cos(angle);
              const py = y + hexRadius * 0.8 * Math.sin(angle);
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
            
            // Subtle glow
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#fbbf24';
            ctx.stroke();
            ctx.restore();
          }
        } else {
          // Empty cell with hover effect + entrance animation
          ctx.save();
          ctx.globalAlpha = entranceOpacity;
          ctx.translate(x, y);
          ctx.scale(entranceScale, entranceScale);
          ctx.translate(-x, -y);
          
          if (isHovered) {
            // Slightly larger and glowing when hovered
            ctx.shadowColor = 'rgba(0,0,0,0.15)';
            ctx.shadowBlur = 8;
            ctx.fillStyle = skin.colors.emptyHover;
            drawHexPath();
            ctx.fill();
            ctx.shadowBlur = 0;
          } else {
            ctx.fillStyle = skin.colors.empty;
            drawHexPath();
            ctx.fill();
          }
          drawHexPath();
          ctx.strokeStyle = skin.colors.emptyBorder;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        }
      }
    }
    
    // Draw connections between adjacent winning cells with glow effect
    if (winningPath.length >= 2 && winPathAnimStart) {
      const elapsed = Date.now() - winPathAnimStart;
      const revealDuration = 400;
      const lineProgress = Math.min(1, elapsed / revealDuration);

      // Create a set of winning cells for quick lookup
      const winningSet = new Set(winningPath);

      // Get cell center position
      const getCellCenter = (cell: number) => {
        const col = cell % size;
        const row = Math.floor(cell / size);
        const x = offsetX + col * hexRadius * 1.5 + hexRadius;
        const y = offsetY + row * hexHeight + (col % 2 === 1 ? hexHeight / 2 : 0) + hexRadius * Math.sqrt(3) / 2;
        return { x, y };
      };

      // Get neighbors for a cell
      const getNeighbors = (cell: number): number[] => {
        const col = cell % size;
        const row = Math.floor(cell / size);
        const neighbors: number[] = [];

        // Odd-q offset coordinate neighbors
        const DIRS_EVEN = [[1, -1], [1, 0], [0, 1], [-1, 0], [-1, -1], [0, -1]];
        const DIRS_ODD = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [0, -1]];
        const dirs = col % 2 === 0 ? DIRS_EVEN : DIRS_ODD;

        for (const [dc, dr] of dirs) {
          const nc = col + dc;
          const nr = row + dr;
          if (nc >= 0 && nr >= 0 && nc < size && nr < size) {
            neighbors.push(nr * size + nc);
          }
        }
        return neighbors;
      };

      // Determine line color based on winner
      const firstCell = winningPath[0];
      const winnerColor = board[firstCell];
      const lineColor = winnerColor === 1 ? skin.colors.player1Glow : skin.colors.player2Glow;
      const solidColor = winnerColor === 1 ? skin.colors.player1 : skin.colors.player2;

      // Draw connections between adjacent winning cells
      const drawnConnections = new Set<string>();

      for (const cell of winningPath) {
        const neighbors = getNeighbors(cell);
        for (const neighbor of neighbors) {
          if (winningSet.has(neighbor)) {
            // Create a unique key for this connection (smaller cell first)
            const key = cell < neighbor ? `${cell}-${neighbor}` : `${neighbor}-${cell}`;
            if (!drawnConnections.has(key)) {
              drawnConnections.add(key);

              const p1 = getCellCenter(cell);
              const p2 = getCellCenter(neighbor);

              // Draw glow line
              ctx.save();
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);

              ctx.strokeStyle = lineColor;
              ctx.lineWidth = hexRadius * 0.35 * lineProgress;
              ctx.lineCap = 'round';
              ctx.shadowColor = lineColor;
              ctx.shadowBlur = 20 * lineProgress;
              ctx.globalAlpha = 0.6 * lineProgress;
              ctx.stroke();

              // Draw core line
              ctx.strokeStyle = solidColor;
              ctx.lineWidth = hexRadius * 0.18 * lineProgress;
              ctx.shadowBlur = 10;
              ctx.globalAlpha = lineProgress;
              ctx.stroke();
              ctx.restore();
            }
          }
        }
      }

      // Spawn particles on winning cells
      const particles = particlesRef.current;
      if (elapsed % 80 < 16 && lineProgress > 0.5) {
        const randomCell = winningPath[Math.floor(Math.random() * winningPath.length)];
        const point = getCellCenter(randomCell);
        particles.push({
          x: point.x + (Math.random() - 0.5) * hexRadius * 0.5,
          y: point.y + (Math.random() - 0.5) * hexRadius * 0.5,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2 - 0.5,
          life: 1,
          maxLife: 1,
          size: Math.random() * 3 + 2,
          color: Math.random() > 0.5 ? lineColor : 'rgba(255, 255, 255, 0.9)',
          type: 'sparkle'
        });
      }

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.03;
        p.vx *= 0.98;
        p.life -= 0.015;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.life * 0.8;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (particles.length > 100) {
        particles.splice(0, particles.length - 100);
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
  }, [size, board, lastMove, winningPath, winPathAnimStart, hoveredCell, disabled, animatedCells, skin, hintCell, mousePos, impactEvents]);

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
    if (disabled) return;
    
    // Add impact event for animation
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setImpactEvents(prev => [
        ...prev.slice(-4), // Limit to last 5 impacts for performance
        { x, y, timestamp: Date.now(), color: skin.colors.player1 } 
      ]);
    }

    if (onCellClick && hoveredCell !== null) {
      onCellClick(hoveredCell);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || disabled) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePos({ x, y });

    // Calculate layout for collision detection
    const padding = 40;
    const availableWidth = rect.width - 2 * padding;
    const availableHeight = rect.height - 2 * padding;
    
    const hexRadius = Math.min(
      availableWidth / ((size - 1) * 1.5 + 2),
      availableHeight / (size * Math.sqrt(3) + 1)
    );
    const hexHeight = Math.sqrt(3) * hexRadius;
    const boardWidth = (size - 1) * hexRadius * 1.5 + hexRadius * 2;
    const boardHeight = size * hexHeight;
    const offsetX = (rect.width - boardWidth) / 2;
    const offsetY = (rect.height - boardHeight) / 2;

    let closestCell = null;
    let minDist = Infinity;

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const cx = offsetX + col * hexRadius * 1.5 + hexRadius;
        const cy = offsetY + row * hexHeight + (col % 2 === 1 ? hexHeight / 2 : 0) + hexRadius * Math.sqrt(3) / 2;

        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (dist < hexRadius && dist < minDist) {
          if (pointInHex(x, y, cx, cy, hexRadius)) {
            minDist = dist;
            closestCell = row * size + col;
          }
        }
      }
    }

    if (closestCell !== null && board[closestCell] !== 0) {
      setHoveredCell(null);
    } else {
      setHoveredCell(closestCell);
    }
  };

  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null);
  }, []);

  // Touch event handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    // Calculate layout for collision detection
    const padding = 40;
    const availableWidth = rect.width - 2 * padding;
    const availableHeight = rect.height - 2 * padding;
    
    const hexRadius = Math.min(
      availableWidth / ((size - 1) * 1.5 + 2),
      availableHeight / (size * Math.sqrt(3) + 1)
    );
    const hexHeight = Math.sqrt(3) * hexRadius;
    const boardWidth = (size - 1) * hexRadius * 1.5 + hexRadius * 2;
    const boardHeight = size * hexHeight;
    const offsetX = (rect.width - boardWidth) / 2;
    const offsetY = (rect.height - boardHeight) / 2;

    // Find closest empty cell with expanded touch radius (1.3x for mobile friendliness)
    let closestCell = null;
    let minDist = Infinity;
    const touchRadius = hexRadius * 1.3; // 30% larger touch target

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const cx = offsetX + col * hexRadius * 1.5 + hexRadius;
        const cy = offsetY + row * hexHeight + (col % 2 === 1 ? hexHeight / 2 : 0) + hexRadius * Math.sqrt(3) / 2;

        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (dist < touchRadius && dist < minDist) {
          const cell = row * size + col;
          if (board[cell] === 0) { // Only select empty cells
            minDist = dist;
            closestCell = cell;
          }
        }
      }
    }

    if (closestCell !== null) {
      setHoveredCell(closestCell);
    }
  }, [disabled, size, board]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled || hoveredCell === null) return;
    e.preventDefault(); // Prevent double-tap zoom
    
    // Add impact effect
    const canvas = canvasRef.current;
    if (canvas && e.changedTouches[0]) {
      const touch = e.changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      setImpactEvents(prev => [
        ...prev.slice(-4),
        { x, y, timestamp: Date.now(), color: skin.colors.player1 }
      ]);
    }
    
    if (onCellClick) {
      onCellClick(hoveredCell);
    }
    setHoveredCell(null);
  }, [disabled, hoveredCell, onCellClick, skin.colors.player1]);

  return (
    <div className="relative touch-none">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`aspect-square rounded-lg shadow-2xl ring-4 ring-primary/20 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        style={{ 
          width: 'min(92vw, 1400px)',
          maxWidth: '100%',
          imageRendering: 'crisp-edges',
          boxShadow: '0 20px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          touchAction: 'none',
          willChange: 'transform',
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
