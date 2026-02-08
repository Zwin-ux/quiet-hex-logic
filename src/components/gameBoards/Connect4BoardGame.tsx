import { Connect4Board } from '@/components/connect4/Connect4Board';
import type { Connect4Adapter, Connect4Move } from '@/lib/engine/adapters/connect4Adapter';

export function Connect4BoardGame(props: {
  engine: Connect4Adapter;
  lastMove: Connect4Move | null;
  disabled: boolean;
  onMove: (move: Connect4Move) => void;
}) {
  const { engine, lastMove, disabled, onMove } = props;
  const raw = (engine as any).c4;

  return (
    <Connect4Board
      engine={raw}
      lastMove={typeof lastMove === 'number' ? lastMove : null}
      disabled={disabled}
      onMove={(col) => onMove(col)}
    />
  );
}

