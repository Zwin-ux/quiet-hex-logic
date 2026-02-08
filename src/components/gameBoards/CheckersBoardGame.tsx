import { CheckersBoard } from '@/components/checkers/CheckersBoard';
import type { CheckersAdapter, CheckersMove } from '@/lib/engine/adapters/checkersAdapter';

export function CheckersBoardGame(props: {
  engine: CheckersAdapter;
  lastMove: CheckersMove | null;
  disabled: boolean;
  onMove: (move: CheckersMove) => void;
}) {
  const { engine, lastMove, disabled, onMove } = props;
  const raw = (engine as any).checkers;

  return (
    <CheckersBoard
      engine={raw}
      lastMovePath={lastMove?.path ?? null}
      disabled={disabled}
      onMove={onMove}
    />
  );
}

