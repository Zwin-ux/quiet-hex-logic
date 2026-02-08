import { ChessBoard } from '@/components/chess/ChessBoard';
import type { ChessAdapter, ChessMove } from '@/lib/engine/adapters/chessAdapter';

export function ChessBoardGame(props: {
  engine: ChessAdapter;
  lastMove: ChessMove | null;
  disabled: boolean;
  onMove: (move: ChessMove) => void;
}) {
  const { engine, lastMove, disabled, onMove } = props;
  const raw = (engine as any).chess;

  return (
    <ChessBoard
      engine={raw}
      lastMoveUci={lastMove?.uci ?? null}
      disabled={disabled}
      onMove={onMove}
    />
  );
}

