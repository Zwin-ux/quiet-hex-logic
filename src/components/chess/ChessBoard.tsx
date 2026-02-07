import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { ChessEngine } from '@/lib/chess/engine';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Use unicode escapes to avoid encoding issues across toolchains/editors.
const pieceToGlyph: Record<string, string> = {
  pw: '\u2659', // white pawn
  nw: '\u2658', // white knight
  bw: '\u2657', // white bishop
  rw: '\u2656', // white rook
  qw: '\u2655', // white queen
  kw: '\u2654', // white king
  pb: '\u265F', // black pawn
  nb: '\u265E', // black knight
  bb: '\u265D', // black bishop
  rb: '\u265C', // black rook
  qb: '\u265B', // black queen
  kb: '\u265A', // black king
};

function square(fileIndex: number, rankIndexFromTop: number): string {
  const file = String.fromCharCode('a'.charCodeAt(0) + fileIndex);
  const rank = 8 - rankIndexFromTop;
  return `${file}${rank}`;
}

function fileIndexOf(sq: string): number {
  return sq.charCodeAt(0) - 'a'.charCodeAt(0);
}

function rankIndexFromTopOf(sq: string): number {
  const rank = Number(sq[1]);
  return 8 - rank;
}

function isPromotion(from: string, to: string, pieceType: string | null): boolean {
  if (pieceType !== 'p') return false;
  const toRank = Number(to[1]);
  return toRank === 8 || toRank === 1;
}

export type ChessBoardMove = { uci: string; promotion?: 'q' | 'r' | 'b' | 'n' };

interface ChessBoardProps {
  engine: ChessEngine;
  disabled?: boolean;
  highlightCheck?: boolean;
  lastMoveUci?: string | null;
  onMove: (move: ChessBoardMove) => void;
}

export function ChessBoard({ engine, disabled = false, highlightCheck = true, lastMoveUci, onMove }: ChessBoardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [promotion, setPromotion] = useState<{ from: string; to: string } | null>(null);

  const legalFromSelected = useMemo(() => {
    if (!selected) return [];
    return engine.legalMovesFrom(selected);
  }, [engine, selected]);

  const legalToSet = useMemo(() => new Set(legalFromSelected.map((m) => m.to)), [legalFromSelected]);

  const lastFrom = lastMoveUci?.slice(0, 2) ?? null;
  const lastTo = lastMoveUci?.slice(2, 4) ?? null;

  const board = engine.board(); // 8x8 from rank 8 -> 1

  const handleSquareClick = (sq: string) => {
    if (disabled) return;

    // If choosing a promotion, ignore board clicks.
    if (promotion) return;

    const r = rankIndexFromTopOf(sq);
    const c = fileIndexOf(sq);
    const piece = board[r]?.[c] ?? null;
    const pieceColor = piece?.color ?? null;
    const turnColor = engine.turn();

    if (!selected) {
      if (piece && pieceColor === turnColor) setSelected(sq);
      return;
    }

    if (sq === selected) {
      setSelected(null);
      return;
    }

    // Reselect another own piece.
    if (piece && pieceColor === turnColor) {
      setSelected(sq);
      return;
    }

    if (!legalToSet.has(sq)) return;

    const from = selected;
    const to = sq;

    // Promotion UI (default to queen but let user choose)
    const fromPiece = board[rankIndexFromTopOf(from)]?.[fileIndexOf(from)] ?? null;
    if (isPromotion(from, to, fromPiece?.type ?? null)) {
      setPromotion({ from, to });
      return;
    }

    onMove({ uci: `${from}${to}` });
    setSelected(null);
  };

  const choosePromotion = (p: 'q' | 'r' | 'b' | 'n') => {
    if (!promotion) return;
    onMove({ uci: `${promotion.from}${promotion.to}${p}`, promotion: p });
    setPromotion(null);
    setSelected(null);
  };

  const inCheck = highlightCheck && engine.inCheck();
  const checkSquare = useMemo(() => {
    if (!inCheck) return null;
    const king = engine.turn() === 'w' ? { type: 'k', color: 'w' } : { type: 'k', color: 'b' };
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r]?.[c];
        if (p && p.type === king.type && p.color === king.color) {
          return square(c, r);
        }
      }
    }
    return null;
  }, [board, engine, inCheck]);

  return (
    <div className="w-full max-w-[min(100vw-1.5rem,560px)] aspect-square rounded-xl border overflow-hidden bg-card">
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full select-none">
        {Array.from({ length: 64 }).map((_, i) => {
          const r = Math.floor(i / 8);
          const c = i % 8;
          const sq = square(c, r);
          const isDark = (r + c) % 2 === 1;

          const piece = board[r]?.[c] ?? null;
          const glyph = piece ? pieceToGlyph[`${piece.type}${piece.color}`] : '';

          const isSelected = selected === sq;
          const isLegalTo = selected && legalToSet.has(sq);
          const isLast = sq === lastFrom || sq === lastTo;
          const isCheck = checkSquare === sq;

          return (
            <button
              key={sq}
              type="button"
              onClick={() => handleSquareClick(sq)}
              className={cn(
                'relative flex items-center justify-center text-3xl md:text-4xl leading-none',
                isDark ? 'bg-[#2b2a28]' : 'bg-[#e9e3d5]',
                disabled && 'cursor-not-allowed opacity-90',
                isSelected && 'outline outline-2 outline-offset-[-2px] outline-indigo-500',
              )}
            >
              {/* last-move hint */}
              {isLast && <span className="absolute inset-0 bg-amber-400/20" />}

              {/* legal destination dot */}
              {isLegalTo && <span className="absolute w-3 h-3 rounded-full bg-emerald-400/80" />}

              {/* check highlight */}
              {isCheck && <span className="absolute inset-0 bg-red-500/20" />}

              <span className="relative drop-shadow-[0_1px_0_rgba(0,0,0,0.25)]">{glyph}</span>
            </button>
          );
        })}
      </div>

      <Dialog open={!!promotion} onOpenChange={(open) => { if (!open) setPromotion(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Choose Promotion</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2">
            <Button type="button" variant="outline" onClick={() => choosePromotion('q')}>Queen</Button>
            <Button type="button" variant="outline" onClick={() => choosePromotion('r')}>Rook</Button>
            <Button type="button" variant="outline" onClick={() => choosePromotion('b')}>Bishop</Button>
            <Button type="button" variant="outline" onClick={() => choosePromotion('n')}>Knight</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

