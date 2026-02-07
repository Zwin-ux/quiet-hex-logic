export type CheckersPlayer = 1 | 2;

// Piece encoding (uint8 for compactness)
// 0 empty
// 1 p1 man, 2 p2 man
// 3 p1 king, 4 p2 king
export type CheckersPiece = 0 | 1 | 2 | 3 | 4;

export type CheckersRules = {
  mandatoryCapture: boolean;
  draw: {
    threefoldRepetition: boolean;
    noCaptureHalfMoves: number; // e.g. 50
  };
};

export type CheckersResult = 'p1' | 'p2' | 'draw' | null;

export type CheckersMove = {
  // Path of landing squares (includes starting square as first element).
  // Example simple move: [from, to]
  // Example capture chain: [from, land1, land2, ...]
  path: number[];
};

const DEFAULT_RULES: CheckersRules = {
  mandatoryCapture: true,
  draw: { threefoldRepetition: true, noCaptureHalfMoves: 50 },
};

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

function promote(piece: CheckersPiece): CheckersPiece {
  if (piece === 1) return 3;
  if (piece === 2) return 4;
  return piece;
}

function opponent(player: CheckersPlayer): CheckersPlayer {
  return player === 1 ? 2 : 1;
}

function rowOf(i: number): number {
  return Math.floor(i / 8);
}

function colOf(i: number): number {
  return i % 8;
}

function idx(r: number, c: number): number {
  return r * 8 + c;
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

type Step = { to: number; captureOver?: number };

export class CheckersEngine {
  rules: CheckersRules;
  board: Uint8Array;
  turn: CheckersPlayer = 1;
  ply = 1; // keep parity with matches.turn (1-indexed)
  private _result: CheckersResult = null;

  constructor(rules?: Partial<CheckersRules>) {
    this.rules = {
      ...DEFAULT_RULES,
      ...(rules ?? {}),
      draw: { ...DEFAULT_RULES.draw, ...(rules?.draw ?? {}) },
    };
    this.board = new Uint8Array(64);
    this.reset();
  }

  reset(): void {
    this.board.fill(0);
    // Player 2 at top rows 0-2, player 1 at bottom rows 5-7.
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const i = idx(r, c);
        if (!isDarkSquare(i)) continue;
        if (r <= 2) this.board[i] = 2;
        else if (r >= 5) this.board[i] = 1;
      }
    }
    this.turn = 1;
    this.ply = 1;
    this._result = null;
  }

  clone(): CheckersEngine {
    const e = new CheckersEngine(this.rules);
    e.board = new Uint8Array(this.board);
    e.turn = this.turn;
    e.ply = this.ply;
    e._result = this._result;
    return e;
  }

  result(): CheckersResult {
    return this._result;
  }

  hash(): string {
    // Values are 0..4, so joining is unambiguous.
    return `${this.turn}:${Array.from(this.board).join('')}`;
  }

  winner(): 0 | 1 | 2 {
    if (this._result === 'p1') return 1;
    if (this._result === 'p2') return 2;
    return 0;
  }

  pieceAt(i: number): CheckersPiece {
    return (this.board[i] ?? 0) as CheckersPiece;
  }

  private stepsFrom(from: number, piece: CheckersPiece, captureOnly: boolean): Step[] {
    const r = rowOf(from);
    const c = colOf(from);
    const me = ownerOf(piece) as CheckersPlayer;
    const dirs: Array<[number, number]> = [];

    // Men move forward only; kings both.
    if (isKing(piece) || me === 1) dirs.push([-1, -1], [-1, 1]);
    if (isKing(piece) || me === 2) dirs.push([1, -1], [1, 1]);

    const out: Step[] = [];
    for (const [dr, dc] of dirs) {
      const r1 = r + dr;
      const c1 = c + dc;
      const r2 = r + dr * 2;
      const c2 = c + dc * 2;

      // Simple step
      if (!captureOnly && inBounds(r1, c1)) {
        const to = idx(r1, c1);
        if (isDarkSquare(to) && this.pieceAt(to) === 0) out.push({ to });
      }

      // Capture step
      if (inBounds(r2, c2) && inBounds(r1, c1)) {
        const over = idx(r1, c1);
        const to = idx(r2, c2);
        const overPiece = this.pieceAt(over);
        if (!isDarkSquare(to)) continue;
        if (this.pieceAt(to) !== 0) continue;
        const overOwner = ownerOf(overPiece);
        if (overOwner !== 0 && overOwner !== me) out.push({ to, captureOver: over });
      }
    }
    return out;
  }

  currentMustCapture(): boolean {
    return this.rules.mandatoryCapture && this.hasAnyCapture(this.turn);
  }

  hasAnyCapture(player: CheckersPlayer = this.turn): boolean {
    for (let i = 0; i < 64; i++) {
      const p = this.pieceAt(i);
      if (ownerOf(p) !== player) continue;
      if (this.stepsFrom(i, p, true).some((s) => s.captureOver !== undefined)) return true;
    }
    return false;
  }

  // Generate all legal moves for the current player (full paths, including forced multi-captures).
  legalMoves(player: CheckersPlayer = this.turn): CheckersMove[] {
    const mustCapture = this.rules.mandatoryCapture && this.hasAnyCapture(player);
    const out: CheckersMove[] = [];

    for (let i = 0; i < 64; i++) {
      const p = this.pieceAt(i);
      if (ownerOf(p) !== player) continue;

      if (mustCapture) {
        this.genCapturesFrom(this.board, i, p, player, [i], out);
      } else {
        for (const s of this.stepsFrom(i, p, false)) {
          // Only simple steps (non-captures).
          if (s.captureOver !== undefined) continue;
          out.push({ path: [i, s.to] });
        }
      }
    }

    return out;
  }

  private genCapturesFrom(
    board: Uint8Array,
    from: number,
    piece: CheckersPiece,
    player: CheckersPlayer,
    path: number[],
    out: CheckersMove[]
  ): void {
    const steps = this.stepsFromOnBoard(board, from, piece, player, true).filter((s) => s.captureOver !== undefined);
    if (steps.length === 0) {
      if (path.length >= 2) out.push({ path: [...path] });
      return;
    }

    const king = isKing(piece);
    for (const s of steps) {
      const to = s.to;
      const over = s.captureOver!;

      const nextBoard = new Uint8Array(board);
      nextBoard[from] = 0;
      nextBoard[over] = 0;
      nextBoard[to] = piece;

      const toRow = rowOf(to);
      if (!king) {
        // American checkers: crowning happens at end of move; if you reach the king row during a capture, the move ends.
        if ((player === 1 && toRow === 0) || (player === 2 && toRow === 7)) {
          out.push({ path: [...path, to] });
          continue;
        }
      }

      this.genCapturesFrom(nextBoard, to, piece, player, [...path, to], out);
    }
  }

  private stepsFromOnBoard(
    board: Uint8Array,
    from: number,
    piece: CheckersPiece,
    player: CheckersPlayer,
    captureOnly: boolean
  ): Step[] {
    const r = rowOf(from);
    const c = colOf(from);
    const dirs: Array<[number, number]> = [];

    if (isKing(piece) || player === 1) dirs.push([-1, -1], [-1, 1]);
    if (isKing(piece) || player === 2) dirs.push([1, -1], [1, 1]);

    const out: Step[] = [];
    for (const [dr, dc] of dirs) {
      const r1 = r + dr;
      const c1 = c + dc;
      const r2 = r + dr * 2;
      const c2 = c + dc * 2;

      if (!captureOnly && inBounds(r1, c1)) {
        const to = idx(r1, c1);
        if (isDarkSquare(to) && (board[to] ?? 0) === 0) out.push({ to });
      }

      if (inBounds(r2, c2) && inBounds(r1, c1)) {
        const over = idx(r1, c1);
        const to = idx(r2, c2);
        const overPiece = (board[over] ?? 0) as CheckersPiece;
        if (!isDarkSquare(to)) continue;
        if ((board[to] ?? 0) !== 0) continue;
        const overOwner = ownerOf(overPiece);
        if (overOwner !== 0 && overOwner !== player) out.push({ to, captureOver: over });
      }
    }
    return out;
  }

  legalMove(move: CheckersMove): boolean {
    if (!move?.path || !Array.isArray(move.path)) return false;
    if (move.path.length < 2) return false;
    if (!move.path.every((x) => Number.isInteger(x) && x >= 0 && x < 64)) return false;

    const from = move.path[0]!;
    const piece = this.pieceAt(from);
    if (ownerOf(piece) !== this.turn) return false;

    const mustCapture = this.rules.mandatoryCapture && this.hasAnyCapture(this.turn);
    const isCaptureAttempt = this.isCapturePath(move.path);
    if (mustCapture && !isCaptureAttempt) return false;

    // Validate step-by-step on a temp board.
    const tmp = this.clone();
    return tmp.tryApplyPath(move.path, { validateOnly: true, mustCapture });
  }

  play(move: CheckersMove): void {
    if (this._result) throw new Error('Game is over');
    if (!this.legalMove(move)) throw new Error('Illegal move');

    const mustCapture = this.rules.mandatoryCapture && this.hasAnyCapture(this.turn);
    const ok = this.tryApplyPath(move.path, { validateOnly: false, mustCapture });
    if (!ok) throw new Error('Illegal move');

    // Update result after move.
    this._result = this.computeResultAfterMove();
    this.turn = opponent(this.turn);
    this.ply += 1;

    // If game ended, keep turn/piece state as-is; caller uses result().
  }

  private isCapturePath(path: number[]): boolean {
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1]!;
      const b = path[i]!;
      const dr = Math.abs(rowOf(b) - rowOf(a));
      if (dr === 2) return true;
    }
    return false;
  }

  isCaptureMove(move: CheckersMove): boolean {
    return this.isCapturePath(move.path);
  }

  private tryApplyPath(
    path: number[],
    opts: { validateOnly: boolean; mustCapture: boolean }
  ): boolean {
    let cur = path[0]!;
    let piece = this.pieceAt(cur);
    if (ownerOf(piece) !== this.turn) return false;

    // We'll mutate this.board (or not) on validateOnly by applying and rolling back via clone in legalMove.
    this.board[cur] = 0;
    let didCapture = false;

    for (let stepIndex = 1; stepIndex < path.length; stepIndex++) {
      const next = path[stepIndex]!;
      if (this.pieceAt(next) !== 0) return false;
      if (!isDarkSquare(next)) return false;

      const r0 = rowOf(cur);
      const c0 = colOf(cur);
      const r1 = rowOf(next);
      const c1 = colOf(next);
      const dr = r1 - r0;
      const dc = c1 - c0;

      const absDr = Math.abs(dr);
      const absDc = Math.abs(dc);
      if (absDr !== absDc) return false;

      const me = this.turn;
      const king = isKing(piece);

      // Direction restriction for men on non-captures and captures.
      if (!king) {
        if (me === 1 && dr >= 0) return false;
        if (me === 2 && dr <= 0) return false;
      }

      if (absDr === 1) {
        if (opts.mustCapture) return false;
        // Single-step move only allowed as the only step.
        if (path.length !== 2) return false;
      } else if (absDr === 2) {
        const mid = idx((r0 + r1) / 2, (c0 + c1) / 2);
        const midPiece = this.pieceAt(mid);
        const midOwner = ownerOf(midPiece);
        if (midOwner === 0 || midOwner === me) return false;
        // Capture
        didCapture = true;
        this.board[mid] = 0;

        // In American checkers, if a man reaches the king row during a capture, the move ends immediately.
        if (!king) {
          if ((me === 1 && r1 === 0) || (me === 2 && r1 === 7)) {
            // Ensure this is the final landing square.
            if (stepIndex !== path.length - 1) return false;
          }
        }
      } else {
        return false;
      }

      cur = next;

      // If we're mid-capture, require continuation when possible with the same piece.
      const isLast = stepIndex === path.length - 1;
      if (!isLast && absDr !== 2) return false; // can't chain a non-capture
      if (isLast && absDr === 2) {
        // If the move ends after a capture, ensure no further captures exist from final square (forced continuation).
        // Exception: king-row landing for a man handled above (early termination).
        const landingRow = rowOf(cur);
        if (!king) {
          const becameKingRow = (me === 1 && landingRow === 0) || (me === 2 && landingRow === 7);
          if (becameKingRow) {
            // Move ends; promotion will happen after placement.
          } else if (this.stepsFrom(cur, piece, true).some((s) => s.captureOver !== undefined)) {
            return false;
          }
        } else if (this.stepsFrom(cur, piece, true).some((s) => s.captureOver !== undefined)) {
          return false;
        }
      }
    }

    // Place piece at final square, with promotion if applicable.
    const finalRow = rowOf(cur);
    if (!isKing(piece)) {
      if ((this.turn === 1 && finalRow === 0) || (this.turn === 2 && finalRow === 7)) {
        piece = promote(piece);
      }
    }
    this.board[cur] = piece;

    // If mandatory capture is enabled, a non-capture path is invalid when captures exist (checked earlier),
    // but also ensure the move actually captured when it looks like it should.
    if (opts.mustCapture && !didCapture) return false;

    return true;
  }

  private computeResultAfterMove(): CheckersResult {
    const next = opponent(this.turn);

    // Win if opponent has no pieces or no legal moves.
    let hasPiece = false;
    let hasMove = false;
    const mustCapture = this.rules.mandatoryCapture && this.hasAnyCapture(next);

    for (let i = 0; i < 64; i++) {
      const p = this.pieceAt(i);
      if (ownerOf(p) !== next) continue;
      hasPiece = true;
      const steps = this.stepsFrom(i, p, mustCapture);
      if (steps.length) {
        // If captureOnly, ensure at least one is a capture.
        if (!mustCapture || steps.some((s) => s.captureOver !== undefined)) {
          hasMove = true;
          break;
        }
      }
    }

    if (!hasPiece || !hasMove) return this.turn === 1 ? 'p1' : 'p2';
    return null;
  }
}
