import type { BoardSkin } from '@/lib/boardSkins';
import { HexBoard } from '@/components/HexBoard';
import type { HexAdapter, HexMove } from '@/lib/engine/adapters/hexAdapter';

export function HexBoardGame(props: {
  engine: HexAdapter;
  matchSize: number;
  boardSkin: BoardSkin;
  winningPath: number[];
  lastMove: HexMove | null;
  isAggressiveMove: boolean;
  disabled: boolean;
  canSwap: boolean;
  onMove: (move: HexMove) => void;
}) {
  const { engine, matchSize, boardSkin, winningPath, lastMove, isAggressiveMove, disabled, canSwap, onMove } = props;
  const raw = (engine as any).hex;

  return (
    <HexBoard
      size={matchSize}
      board={raw.board}
      lastMove={typeof lastMove === 'number' ? lastMove : undefined}
      winningPath={winningPath}
      onCellClick={(cell) => onMove(cell)}
      skin={boardSkin}
      isAggressive={isAggressiveMove}
      disabled={disabled}
      canSwap={canSwap}
      onSwapColors={() => onMove(null)}
    />
  );
}

