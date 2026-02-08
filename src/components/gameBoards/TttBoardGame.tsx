import { TicTacToeBoard } from '@/components/ttt/TicTacToeBoard';
import type { TttAdapter, TttMove } from '@/lib/engine/adapters/tttAdapter';

export function TttBoardGame(props: {
  engine: TttAdapter;
  lastMove: TttMove | null;
  disabled: boolean;
  onMove: (move: TttMove) => void;
}) {
  const { engine, lastMove, disabled, onMove } = props;
  const raw = (engine as any).ttt;

  return (
    <TicTacToeBoard
      engine={raw}
      lastMove={typeof lastMove === 'number' ? lastMove : null}
      disabled={disabled}
      onMove={(cell) => onMove(cell)}
    />
  );
}

