export type AsciiGamePreview = {
  key: string;
  label: string;
  note: string;
  status: string;
  speedMs: number;
  frames: string[];
};

export const ASCII_GAME_PREVIEWS: Record<string, AsciiGamePreview> = {
  hex: {
    key: "hex",
    label: "Hex",
    note: "Connection race",
    status: "route live",
    speedMs: 1200,
    frames: [
      String.raw`north edge
      . . . . .
     x . . o .
    . x . o .
   . . x . o
  . . . x o .
 south edge`,
      String.raw`north edge
      . . . . .
     x . . o .
    . x x o .
   . . x o o
  . . . x o .
 south edge`,
      String.raw`north edge
      . . . . .
     x . . o .
    . x x o .
   . . x x o
  . . . x o x
 south edge`,
    ],
  },
  chess: {
    key: "chess",
    label: "Chess",
    note: "Pressure line",
    status: "tempo shift",
    speedMs: 1450,
    frames: [
      String.raw`8 r n b q k b n r
7 p p p p . p p p
6 . . . . p . . .
5 . . . P p . . .
4 . . . . P . . .
3 . . N . . N . .
2 P P P . . P P P
1 R . B Q K B . R
  a b c d e f g h`,
      String.raw`8 r n b q k . n r
7 p p p p . p p p
6 . . . . p . . .
5 . . b P p . . .
4 . . . . P . . .
3 . . N . . N . .
2 P P P . . P P P
1 R . B Q K B . R
  a b c d e f g h`,
      String.raw`8 r n b q k . n r
7 p p p . . p p p
6 . . . . p . . .
5 . . b p P . . .
4 . . . . . . . .
3 . . N . . N . .
2 P P P . Q P P P
1 R . B . K B . R
  a b c d e f g h`,
    ],
  },
  checkers: {
    key: "checkers",
    label: "Checkers",
    note: "Jump chain",
    status: "capture set",
    speedMs: 1300,
    frames: [
      String.raw`8 o . o . o . o .
7 . o . o . o . o
6 o . o . . . o .
5 . . . . x . . .
4 . . . x . . . .
3 . x . . . x . x
2 x . x . x . x .
1 . x . x . x . x`,
      String.raw`8 o . o . o . o .
7 . o . o . o . o
6 o . . . . . o .
5 . . o . x . . .
4 . . . . . . . .
3 . x . . . x . x
2 x . x . x . x .
1 . x . x . x . x`,
      String.raw`8 o . o . o . o .
7 . o . o . . . o
6 o . . . . . . .
5 . . o . . . . .
4 . . . . o . . .
3 . x . . . x . x
2 x . x . x . x .
1 . x . x . x . x`,
    ],
  },
  ttt: {
    key: "ttt",
    label: "Tic Tac Toe",
    note: "Quick read",
    status: "fork built",
    speedMs: 1000,
    frames: [
      String.raw` X | . | O
---+---+---
 . | X | .
---+---+---
 O | . | .`,
      String.raw` X | . | O
---+---+---
 . | X | .
---+---+---
 O | . | X`,
      String.raw` X | O | O
---+---+---
 . | X | .
---+---+---
 O | . | X`,
    ],
  },
  connect4: {
    key: "connect4",
    label: "Connect 4",
    note: "Column trap",
    status: "stack rising",
    speedMs: 1100,
    frames: [
      String.raw`|.|.|.|.|.|.|.|
|.|.|.|.|.|.|.|
|.|.|.|.|.|.|.|
|.|.|.|x|.|.|.|
|.|.|o|x|.|.|.|
|.|o|x|o|.|.|.|
+-+-+-+-+-+-+-+`,
      String.raw`|.|.|.|.|.|.|.|
|.|.|.|.|.|.|.|
|.|.|.|x|.|.|.|
|.|.|o|x|.|.|.|
|.|x|o|x|.|.|.|
|.|o|x|o|.|.|.|
+-+-+-+-+-+-+-+`,
      String.raw`|.|.|.|x|.|.|.|
|.|.|.|o|.|.|.|
|.|.|.|x|.|.|.|
|.|.|o|x|.|.|.|
|.|x|o|x|.|.|.|
|.|o|x|o|.|.|.|
+-+-+-+-+-+-+-+`,
    ],
  },
};

export const ASCII_GAME_ORDER = ["hex", "chess", "checkers", "ttt", "connect4"] as const;

export function getAsciiGamePreview(key: string): AsciiGamePreview {
  return ASCII_GAME_PREVIEWS[key] ?? ASCII_GAME_PREVIEWS.hex;
}
