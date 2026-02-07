import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { CheckersEngine, CheckersMove, CheckersPiece } from '@/lib/checkers/engine';

function isDarkSquare(index: number): boolean {
  const r = Math.floor(index / 8);
  const c = index % 8;
  return (r + c) % 2 === 1;
}

function ownerOf(piece: CheckersPiece): 0 | 1 | 2 {
  if (piece === 1 || piece === 3) return 1;
  if (piece === 2 || piece === 4) return 2;
  return 0;
}

function isKing(piece: CheckersPiece): boolean {
  return piece === 3 || piece === 4;
}

function samePrefix(a: number[], b: number[]): boolean {
  if (a.length > b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

interface CheckersBoardProps {
  engine: CheckersEngine;
  disabled?: boolean;
  lastMovePath?: number[] | null;
  onMove: (move: CheckersMove) => void;
}

export function CheckersBoard({ engine, disabled = false, lastMovePath, onMove }: CheckersBoardProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [path, setPath] = useState<number[]>([]);

  const legalMoves = useMemo(() => engine.legalMoves(), [engine]);

  const movesFromSelected = useMemo(() => {
    if (selected === null) return [];
    return legalMoves.filter((m) => m.path[0] === selected);
  }, [legalMoves, selected]);

  const movesWithPrefix = useMemo(() => {
    if (path.length === 0) return [];
    return movesFromSelected.filter((m) => samePrefix(path, m.path));
  }, [movesFromSelected, path]);

  const nextDestinations = useMemo(() => {
    if (selected === null) return new Set<number>();
    if (path.length === 0) return new Set<number>(movesFromSelected.map((m) => m.path[1]).filter((x) => x !== undefined) as number[]);

    const out = new Set<number>();
    for (const m of movesWithPrefix) {
      const next = m.path[path.length];
      if (next !== undefined) out.add(next);
    }
    return out;
  }, [movesFromSelected, movesWithPrefix, path, selected]);

  const resetSelection = () => {
    setSelected(null);
    setPath([]);
  };

  const handleSquareClick = (i: number) => {
    if (disabled) return;

    const piece = engine.pieceAt(i);
    const pieceOwner = ownerOf(piece);

    // Start selection.
    if (selected === null) {
      if (pieceOwner === engine.turn) {
        setSelected(i);
        setPath([i]);
      }
      return;
    }

    // Clicking selected again cancels (only when at the start of a move).
    if (i === selected && path.length <= 1) {
      resetSelection();
      return;
    }

    // Allow reselection of another own piece only before committing the first step.
    if (path.length === 1 && pieceOwner === engine.turn) {
      setSelected(i);
      setPath([i]);
      return;
    }

    // Destination choice.
    if (!nextDestinations.has(i)) return;

    const nextPath = [...path, i];
    const exact = movesFromSelected.find((m) => m.path.length === nextPath.length && samePrefix(nextPath, m.path));
    const stillHasContinuation = movesFromSelected.some((m) => m.path.length > nextPath.length && samePrefix(nextPath, m.path));

    setPath(nextPath);

    if (exact && !stillHasContinuation) {
      onMove({ path: nextPath });
      resetSelection();
    }
  };

  const lastSet = useMemo(() => new Set(lastMovePath ?? []), [lastMovePath]);

  return (
    <div className="w-full max-w-[min(100vw-1.5rem,560px)] aspect-square rounded-xl border overflow-hidden bg-card">
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full select-none">
        {Array.from({ length: 64 }).map((_, i) => {
          const r = Math.floor(i / 8);
          const c = i % 8;
          const dark = isDarkSquare(i);
          const piece = engine.pieceAt(i);
          const pieceOwner = ownerOf(piece);

          const isSelected = selected === i;
          const isOnPath = path.includes(i);
          const isNext = nextDestinations.has(i);
          const isLast = lastSet.has(i);

          return (
            <button
              key={i}
              type="button"
              disabled={disabled || (!dark && piece === 0)}
              onClick={() => handleSquareClick(i)}
              className={cn(
                'relative flex items-center justify-center',
                dark ? 'bg-[#2b2a28]' : 'bg-[#e9e3d5]',
                disabled && 'cursor-not-allowed opacity-90',
                isSelected && 'outline outline-2 outline-offset-[-2px] outline-indigo-500',
              )}
            >
              {isLast && dark && <span className="absolute inset-0 bg-amber-400/20" />}
              {isOnPath && dark && <span className="absolute inset-0 bg-sky-400/15" />}
              {isNext && dark && <span className="absolute w-3 h-3 rounded-full bg-emerald-400/80" />}

              {piece !== 0 && (
                <span
                  className={cn(
                    'relative w-10 h-10 md:w-11 md:h-11 rounded-full shadow-[0_8px_18px_rgba(0,0,0,0.45)] ring-1 ring-inset ring-white/10',
                    pieceOwner === 1 ? 'bg-indigo border-2 border-indigo-200/20' : 'bg-ochre border-2 border-amber-200/20'
                  )}
                >
                  {isKing(piece) && (
                    <span className="absolute inset-0 grid place-items-center text-white text-lg font-black drop-shadow">
                      K
                    </span>
                  )}
                </span>
              )}

              {/* Coordinate hint on empty light squares for subtle structure */}
              {!dark && piece === 0 && (
                <span className="absolute text-[10px] opacity-30 font-mono">
                  {String.fromCharCode('a'.charCodeAt(0) + c)}
                  {8 - r}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

