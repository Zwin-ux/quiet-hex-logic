import { useEffect, useRef, useState } from 'react';

interface HexBoardProps {
  size: number;
  board: Uint8Array;
  lastMove?: number;
  winningPath?: number[];
  onCellClick?: (cell: number) => void;
  disabled?: boolean;
}

export const HexBoard = ({ 
  size, 
  board, 
  lastMove, 
  winningPath = [],
  onCellClick,
  disabled = false
}: HexBoardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredCell, setHoveredCell] = useState<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size for retina displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

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
    ctx.fillStyle = 'hsl(40 33% 98%)';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw edge markers
    ctx.font = `${hexRadius * 0.4}px "IBM Plex Mono", monospace`;
    ctx.fillStyle = 'hsl(0 0% 10% / 0.4)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // West/East markers (Indigo)
    ctx.fillStyle = 'hsl(223 45% 29% / 0.5)';
    ctx.fillText('W', offsetX - 20, offsetY + boardHeight / 2);
    ctx.fillText('E', offsetX + boardWidth + 20, offsetY + boardHeight / 2);

    // North/South markers (Ochre)
    ctx.fillStyle = 'hsl(40 76% 43% / 0.5)';
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

        if (color === 1) {
          // Indigo stone
          ctx.fillStyle = isWinning ? 'hsl(223 45% 35%)' : 'hsl(223 45% 29%)';
          ctx.fill();
          if (isLast) {
            ctx.strokeStyle = 'hsl(40 76% 43%)';
            ctx.lineWidth = 3;
            ctx.stroke();
          }
        } else if (color === 2) {
          // Ochre stone
          ctx.fillStyle = isWinning ? 'hsl(40 76% 50%)' : 'hsl(40 76% 43%)';
          ctx.fill();
          if (isLast) {
            ctx.strokeStyle = 'hsl(223 45% 29%)';
            ctx.lineWidth = 3;
            ctx.stroke();
          }
        } else {
          // Empty cell
          ctx.fillStyle = isHovered ? 'hsl(40 60% 85%)' : 'hsl(40 33% 96%)';
          ctx.fill();
          ctx.strokeStyle = 'hsl(39 13% 71%)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    }
  }, [size, board, lastMove, winningPath, hoveredCell, disabled]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled || !onCellClick) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate which cell was clicked (simplified - should use proper hex math)
    const padding = 40;
    const availableWidth = rect.width - 2 * padding;
    const hexRadius = availableWidth / ((size - 1) * 1.5 + 2);
    const hexHeight = Math.sqrt(3) * hexRadius;

    const boardWidth = (size - 1) * hexRadius * 1.5 + hexRadius * 2;
    const offsetX = (rect.width - boardWidth) / 2;
    const offsetY = (rect.height - size * hexHeight) / 2;

    // Find closest hex
    let closestCell = -1;
    let closestDist = Infinity;

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const cx = offsetX + col * hexRadius * 1.5 + hexRadius;
        const cy = offsetY + row * hexHeight + (col % 2 === 1 ? hexHeight / 2 : 0) + hexRadius * Math.sqrt(3) / 2;
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        
        if (dist < hexRadius && dist < closestDist) {
          closestCell = row * size + col;
          closestDist = dist;
        }
      }
    }

    if (closestCell >= 0 && !board[closestCell]) {
      onCellClick(closestCell);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
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
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        
        if (dist < hexRadius) {
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
  };

  const handleMouseLeave = () => {
    setHoveredCell(null);
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`w-full aspect-square ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      style={{ 
        maxWidth: '600px',
        imageRendering: 'crisp-edges'
      }}
    />
  );
};