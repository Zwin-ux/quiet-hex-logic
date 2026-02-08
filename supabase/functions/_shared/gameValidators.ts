import { HexServerValidator } from './validators/hex.ts';
import { ChessServerValidator } from './validators/chess.ts';
import { TttServerValidator } from './validators/ttt.ts';
import { CheckersServerValidator } from './validators/checkers.ts';
import { Connect4ServerValidator } from './validators/connect4.ts';
import type { ServerValidator } from './validators/types.ts';

/** Create the correct server-side validator for a game key. */
export function createValidator(gameKey: string, match: any): ServerValidator {
  const rules = (match as any)?.rules ?? null;
  switch (gameKey) {
    case 'chess': {
      const startFen = typeof rules?.startFen === 'string' && rules.startFen.trim() ? rules.startFen.trim() : undefined;
      return new ChessServerValidator({ startFen });
    }
    case 'ttt': return new TttServerValidator({ misere: rules?.misere === true });
    case 'checkers': return new CheckersServerValidator({
      mandatoryCapture: rules?.mandatoryCapture !== false,
      draw: {
        threefoldRepetition: rules?.draw?.threefoldRepetition !== false,
        noCaptureHalfMoves: rules?.draw?.noCaptureHalfMoves,
      },
    });
    case 'connect4': {
      const cols = Number.isInteger((match as any).size) ? Number((match as any).size) : 7;
      const connect = Number.isInteger(rules?.connect) ? Number(rules.connect) : 4;
      return new Connect4ServerValidator(cols, 6, connect);
    }
    default: {
      const pieRule = typeof rules?.pieRule === 'boolean' ? rules.pieRule : !!match.pie_rule;
      return new HexServerValidator(match.size, pieRule);
    }
  }
}
