import { cn } from '@/lib/utils';
import type { TicTacToe } from '@/lib/ttt/engine';

interface TicTacToeBoardProps {
  engine: TicTacToe;
  disabled?: boolean;
  lastMove?: number | null;
  onMove: (cell: number) => void;
}

export function TicTacToeBoard({ engine, disabled = false, lastMove, onMove }: TicTacToeBoardProps) {
  return (
    <div className="w-full max-w-[min(100vw-1.5rem,560px)] aspect-square rounded-xl border overflow-hidden bg-card">
      <div className="grid grid-cols-3 grid-rows-3 w-full h-full">
        {Array.from({ length: 9 }).map((_, cell) => {
          const v = engine.board[cell];
          const label = v === 1 ? 'X' : v === 2 ? 'O' : '';
          return (
            <button
              key={cell}
              type="button"
              disabled={disabled}
              onClick={() => onMove(cell)}
              className={cn(
                'flex items-center justify-center text-5xl md:text-6xl font-mono font-bold',
                'border border-border/70',
                'bg-background hover:bg-muted/40 transition-colors',
                disabled && 'opacity-80 cursor-not-allowed',
                lastMove === cell && 'bg-amber-400/15',
                v === 1 && 'text-indigo',
                v === 2 && 'text-ochre',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

