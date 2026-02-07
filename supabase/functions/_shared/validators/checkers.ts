import type { ServerValidator, MoveContext, MoveResult } from './types.ts';

type CheckersPiece = 0 | 1 | 2 | 3 | 4;

function ownerOf(p: CheckersPiece): 0 | 1 | 2 {
  if (p === 1 || p === 3) return 1;
  if (p === 2 || p === 4) return 2;
  return 0;
}
function isKing(p: CheckersPiece): boolean { return p === 3 || p === 4; }
function promote(p: CheckersPiece): CheckersPiece {
  if (p === 1) return 3; if (p === 2) return 4; return p;
}
function rowOf(i: number) { return Math.floor(i / 8); }
function colOf(i: number) { return i % 8; }
function idx(r: number, c: number) { return r * 8 + c; }
function inBounds(r: number, c: number) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
function isDark(i: number) { return (rowOf(i) + colOf(i)) % 2 === 1; }

export class CheckersServerValidator implements ServerValidator {
  private board: Uint8Array;
  private player: 1 | 2 = 1;
  private ply = 1;
  private repetition = new Map<string, number>();
  private noCaptureHalfMoves = 0;

  constructor() {
    this.board = new Uint8Array(64);
    this.reset();
    this.recordPos();
  }

  private reset(): void {
    this.board.fill(0);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const i = idx(r, c);
        if (!isDark(i)) continue;
        if (r <= 2) this.board[i] = 2;
        else if (r >= 5) this.board[i] = 1;
      }
    }
    this.player = 1;
    this.ply = 1;
  }

  private hash(): string {
    return `${this.player}:${Array.from(this.board).join('')}`;
  }

  private recordPos(): void {
    const h = this.hash();
    this.repetition.set(h, (this.repetition.get(h) ?? 0) + 1);
  }

  private pieceAt(i: number): CheckersPiece {
    return (this.board[i] ?? 0) as CheckersPiece;
  }

  private stepsFrom(board: Uint8Array, from: number, piece: CheckersPiece, captureOnly: boolean): Array<{ to: number; over?: number }> {
    const r = rowOf(from);
    const c = colOf(from);
    const dirs: Array<[number, number]> = [];
    if (isKing(piece) || this.player === 1) dirs.push([-1, -1], [-1, 1]);
    if (isKing(piece) || this.player === 2) dirs.push([1, -1], [1, 1]);

    const out: Array<{ to: number; over?: number }> = [];
    for (const [dr, dc] of dirs) {
      const r1 = r + dr, c1 = c + dc;
      const r2 = r + dr * 2, c2 = c + dc * 2;
      if (!captureOnly && inBounds(r1, c1)) {
        const to = idx(r1, c1);
        if (isDark(to) && (board[to] ?? 0) === 0) out.push({ to });
      }
      if (inBounds(r2, c2) && inBounds(r1, c1)) {
        const over = idx(r1, c1);
        const to = idx(r2, c2);
        if (!isDark(to) || (board[to] ?? 0) !== 0) continue;
        const overPiece = (board[over] ?? 0) as CheckersPiece;
        const overOwner = ownerOf(overPiece);
        if (overOwner !== 0 && overOwner !== this.player) out.push({ to, over });
      }
    }
    return out;
  }

  private hasAnyCapture(): boolean {
    for (let i = 0; i < 64; i++) {
      const p = this.pieceAt(i);
      if (ownerOf(p) !== this.player) continue;
      if (this.stepsFrom(this.board, i, p, true).some(s => s.over !== undefined)) return true;
    }
    return false;
  }

  private legalMoves(): number[][] {
    const mustCapture = this.hasAnyCapture();
    const out: number[][] = [];
    for (let i = 0; i < 64; i++) {
      const p = this.pieceAt(i);
      if (ownerOf(p) !== this.player) continue;
      if (mustCapture) {
        this.genCapturesFrom(this.board, i, p, [i], out);
      } else {
        for (const s of this.stepsFrom(this.board, i, p, false)) {
          if (s.over !== undefined) continue;
          out.push([i, s.to]);
        }
      }
    }
    return out;
  }

  private genCapturesFrom(board: Uint8Array, from: number, piece: CheckersPiece, path: number[], out: number[][]): void {
    const steps = this.stepsFrom(board, from, piece, true).filter(s => s.over !== undefined);
    if (steps.length === 0) {
      if (path.length >= 2) out.push([...path]);
      return;
    }
    const king = isKing(piece);
    for (const s of steps) {
      const to = s.to, over = s.over!;
      const nextBoard = new Uint8Array(board);
      nextBoard[from] = 0;
      nextBoard[over] = 0;
      nextBoard[to] = piece;
      if (!king && ((this.player === 1 && rowOf(to) === 0) || (this.player === 2 && rowOf(to) === 7))) {
        out.push([...path, to]);
        continue;
      }
      this.genCapturesFrom(nextBoard, to, piece, [...path, to], out);
    }
  }

  private legal(path: number[]): boolean {
    if (!Array.isArray(path) || path.length < 2) return false;
    if (!path.every(x => Number.isInteger(x) && x >= 0 && x < 64)) return false;
    const legal = this.legalMoves();
    return legal.some(m => m.length === path.length && m.every((v, i) => v === path[i]));
  }

  private play(path: number[]): { captured: boolean } {
    if (!this.legal(path)) throw new Error('Illegal move');

    let cur = path[0]!;
    let piece = this.pieceAt(cur);
    this.board[cur] = 0;
    let captured = false;

    for (let i = 1; i < path.length; i++) {
      const to = path[i]!;
      const r0 = rowOf(cur), r1 = rowOf(to);
      if (Math.abs(r1 - r0) === 2) {
        const mid = idx((r0 + r1) / 2, (colOf(cur) + colOf(to)) / 2);
        this.board[mid] = 0;
        captured = true;
      }
      cur = to;
    }

    const finalRow = rowOf(cur);
    if (!isKing(piece) && ((this.player === 1 && finalRow === 0) || (this.player === 2 && finalRow === 7))) {
      piece = promote(piece);
    }
    this.board[cur] = piece;

    this.player = this.player === 1 ? 2 : 1;
    this.ply += 1;

    return { captured };
  }

  private winner(): 0 | 1 | 2 {
    let hasPiece = false;
    for (let i = 0; i < 64; i++) {
      if (ownerOf(this.pieceAt(i)) === this.player) { hasPiece = true; break; }
    }
    if (!hasPiece) return this.player === 1 ? 2 : 1;
    if (this.legalMoves().length === 0) return this.player === 1 ? 2 : 1;
    return 0;
  }

  replayMove(moveRecord: any): void {
    const p = (moveRecord?.move as any)?.path as any[] | undefined;
    if (!Array.isArray(p) || p.length < 2) return;
    const played = this.play(p.map(x => Number(x)));
    if (played.captured) this.noCaptureHalfMoves = 0;
    else this.noCaptureHalfMoves += 1;
    this.recordPos();
  }

  applyProposedMove(move: unknown, _cell: number | null | undefined, ctx: MoveContext): MoveResult {
    const proposedPath = (move as any)?.path as unknown;
    if (!Array.isArray(proposedPath) || proposedPath.length < 2) throw new Error('Missing checkers path');

    const path = proposedPath.map((x: any) => Number(x));
    if (!path.every((x: any) => Number.isInteger(x) && x >= 0 && x < 64)) throw new Error('Invalid path');

    if (this.player !== ctx.currentPlayerColor) throw new Error('Invalid move history');

    if (!this.legal(path)) throw new Error('Illegal move');

    const played = this.play(path);
    if (played.captured) this.noCaptureHalfMoves = 0;
    else this.noCaptureHalfMoves += 1;
    this.recordPos();

    const repCount = this.repetition.get(this.hash()) ?? 0;
    const drawByRep = repCount >= 3;
    const drawByNoCapture = this.noCaptureHalfMoves >= 50;

    const w = this.winner();
    let newStatus: 'active' | 'finished' = 'active';
    let winner: 0 | 1 | 2 = 0;
    let result: 'p1' | 'p2' | 'draw' | null = null;

    if (w) {
      newStatus = 'finished';
      winner = w;
      result = w === 1 ? 'p1' : 'p2';
    } else if (drawByRep || drawByNoCapture) {
      newStatus = 'finished';
      result = 'draw';
    }

    return {
      moveInsert: {
        match_id: ctx.matchId,
        ply: ctx.currentTurn,
        color: ctx.currentPlayerColor,
        cell: null,
        move: { path },
        notation: null,
        action_id: ctx.actionId,
      },
      newTurn: ctx.currentTurn + 1,
      newStatus,
      winner,
      result,
    };
  }
}
