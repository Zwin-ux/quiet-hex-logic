import { Connect4 } from '@/lib/connect4/engine';

interface Connect4BoardProps {
  engine: Connect4;
  lastMove: number | null;
  disabled: boolean;
  onMove: (col: number) => void;
}

const CELL_SIZE = 56;
const GAP = 4;

function getColor(value: 0 | 1 | 2): string {
  if (value === 1) return 'hsl(0 72% 51%)';    // red
  if (value === 2) return 'hsl(48 96% 53%)';   // yellow
  return 'transparent';
}

export function Connect4Board({ engine, lastMove, disabled, onMove }: Connect4BoardProps) {
  const { cols, rows } = engine;
  const boardWidth = cols * (CELL_SIZE + GAP) + GAP;
  const boardHeight = rows * (CELL_SIZE + GAP) + GAP;

  const handleColumnClick = (col: number) => {
    if (disabled) return;
    if (!engine.legal(col)) return;
    onMove(col);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="rounded-xl p-1 shadow-lg"
        style={{
          background: 'hsl(223 45% 29%)',
          width: boardWidth,
        }}
      >
        {/* Render rows top-down (row 5 at top, row 0 at bottom) */}
        {Array.from({ length: rows }, (_, ri) => {
          const row = rows - 1 - ri;
          return (
            <div key={row} className="flex" style={{ gap: GAP, padding: `${GAP / 2}px ${GAP}px` }}>
              {Array.from({ length: cols }, (_, col) => {
                const value = engine.get(col, row);
                const isLastMove = lastMove === col && engine.heights[col] - 1 === row;
                return (
                  <button
                    key={col}
                    className="rounded-full border-2 transition-all duration-150 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      background: value === 0 ? 'hsl(223 30% 22%)' : getColor(value),
                      borderColor: isLastMove ? 'white' : 'hsl(223 30% 18%)',
                      cursor: disabled || value !== 0 ? 'default' : 'pointer',
                      boxShadow: value !== 0 ? 'inset 0 -3px 6px rgba(0,0,0,0.3)' : 'inset 0 2px 4px rgba(0,0,0,0.4)',
                    }}
                    onClick={() => handleColumnClick(col)}
                    disabled={disabled || !engine.legal(col)}
                    aria-label={`Column ${col + 1}${value === 1 ? ', Red' : value === 2 ? ', Yellow' : ', empty'}`}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Column labels */}
      <div className="flex" style={{ width: boardWidth, padding: `0 ${GAP}px` }}>
        {Array.from({ length: cols }, (_, col) => (
          <button
            key={col}
            className="flex-1 text-center text-xs font-mono text-muted-foreground hover:text-primary transition-colors py-1"
            style={{ width: CELL_SIZE + GAP }}
            onClick={() => handleColumnClick(col)}
            disabled={disabled || !engine.legal(col)}
          >
            {col + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
