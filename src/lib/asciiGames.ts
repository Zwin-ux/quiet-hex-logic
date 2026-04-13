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
    note: "Bridge pressure",
    status: "route live",
    speedMs: 920,
    frames: [
      String.raw`north edge   route 01
   a b c d e f
1   . . . . . .
 2   x . . . o .
  3   . x . . o .
   4   . . x . . o
    5   . . . . . .
     6   . . . . . .
south edge   east pull`,
      String.raw`north edge   route 02
   a b c d e f
1   . . . . . .
 2   x x . . o .
  3   . x . . o .
   4   . . x . . o
    5   . . . . . .
     6   . . . . . .
south edge   bridge set`,
      String.raw`north edge   route 03
   a b c d e f
1   . . . . . .
 2   x x . . o .
  3   . x x . o .
   4   . . x . o o
    5   . . . . . .
     6   . . . . . .
south edge   center claim`,
      String.raw`north edge   route 04
   a b c d e f
1   . . . . . .
 2   x x . . o .
  3   . x x x o .
   4   . . x . o o
    5   . . . x . .
     6   . . . . . .
south edge   link held`,
      String.raw`north edge   route 05
   a b c d e f
1   . . . . . .
 2   x x . . o .
  3   . x x x o .
   4   . . x x o o
    5   . . . x x .
     6   . . . . . .
south edge   pressure on`,
      String.raw`north edge   route 06
   a b c d e f
1   . . . . . .
 2   x x . . o .
  3   . x x x o .
   4   . . x x o o
    5   . . . x x o
     6   . . . . x .
south edge   bridge live`,
    ],
  },
  chess: {
    key: "chess",
    label: "Chess",
    note: "Center break",
    status: "tempo shift",
    speedMs: 1180,
    frames: [
      String.raw`white feed   line 01
8 r n b q k b n r
7 p p p p . p p p
6 . . . . p . . .
5 . . . P . . . .
4 . . . . P . . .
3 . . N . . N . .
2 P P P . . P P P
1 R . B Q K B . R
  a b c d e f g h`,
      String.raw`white feed   line 02
8 r n b q k b n r
7 p p p p . p p p
6 . . . . p . . .
5 . . . P . . . .
4 . . . . P . . .
3 . . N . . N . .
2 P P P . . P P P
1 R . B Q K . R .
  a b c d e f g h`,
      String.raw`black feed   line 03
8 r n b q k . n r
7 p p p p . p p p
6 . . . . p . . .
5 . . b P . . . .
4 . . . . P . . .
3 . . N . . N . .
2 P P P . . P P P
1 R . B Q K . R .
  a b c d e f g h`,
      String.raw`white feed   line 04
8 r n b q k . n r
7 p p p . . p p p
6 . . . . p . . .
5 . . b p . . . .
4 . . . . P . . .
3 . . N . . N . .
2 P P P . Q P P P
1 R . B . K . R .
  a b c d e f g h`,
      String.raw`white feed   line 05
8 r n b q k . n r
7 p p p . . p p p
6 . . . . p . . .
5 . . b p . . . .
4 . . . . P . . .
3 . . N . . N . .
2 P P P . Q P P P
1 R . B . K R . .
  a b c d e f g h`,
      String.raw`black feed   line 06
8 r n b q . . k r
7 p p p . . p p p
6 . . . . p . . .
5 . . b p . . . .
4 . . . . P . . .
3 . . N . . N . .
2 P P P . Q P P P
1 R . B . . R K .
  a b c d e f g h`,
    ],
  },
  checkers: {
    key: "checkers",
    label: "Checkers",
    note: "Jump chain",
    status: "capture set",
    speedMs: 1040,
    frames: [
      String.raw`jump lane    read 01
8 o . o . o . o .
7 . o . o . o . o
6 o . o . . . o .
5 . . . . x . . .
4 . . . x . . . .
3 . x . . . x . x
2 x . x . x . x .
1 . x . x . x . x`,
      String.raw`jump lane    read 02
8 o . o . o . o .
7 . o . o . o . o
6 o . . . . . o .
5 . . o . x . . .
4 . . . . . . . .
3 . x . . . x . x
2 x . x . x . x .
1 . x . x . x . x`,
      String.raw`jump lane    read 03
8 o . o . o . . .
7 . o . o . . . o
6 o . . . o . . .
5 . . . . . . . .
4 . . . . . . . .
3 . x . . . x . x
2 x . x . x . x .
1 . x . x . x . x`,
      String.raw`jump lane    read 04
8 o . o . o . . .
7 . o . o . . . o
6 o . . . o . . .
5 . . . . . . . .
4 . . . . O . . .
3 . x . . . x . x
2 x . x . x . x .
1 . x . x . x . x`,
      String.raw`jump lane    read 05
8 o . o . . . . .
7 . o . o . . . o
6 o . . . o . . .
5 . . . . . . . .
4 . . . . O . . .
3 . x . . . x . x
2 x . x . x . x .
1 . x . x . x . x`,
      String.raw`jump lane    read 06
8 o . o . . . . .
7 . o . . . . . o
6 o . . . o . . .
5 . . . . . . . .
4 . . . . O . . .
3 . x . . . x . x
2 x . x . x . x .
1 . x . x . x . x`,
    ],
  },
  ttt: {
    key: "ttt",
    label: "Tic Tac Toe",
    note: "Fork build",
    status: "read fast",
    speedMs: 820,
    frames: [
      String.raw`fork scan 01
 X | . | O
---+---+---
 . | X | .
---+---+---
 O | . | .
x to build`,
      String.raw`fork scan 02
 X | . | O
---+---+---
 . | X | .
---+---+---
 O | . | X
corner armed`,
      String.raw`fork scan 03
 X | O | O
---+---+---
 . | X | .
---+---+---
 O | . | X
black blocks`,
      String.raw`fork scan 04
 X | O | O
---+---+---
 . | X | .
---+---+---
 O | X | X
lane split`,
      String.raw`fork scan 05
 X | O | O
---+---+---
 O | X | .
---+---+---
 O | X | X
read complete`,
      String.raw`fork scan 06
 X | O | O
---+---+---
 O | X | X
---+---+---
 O | X | X
board sealed`,
    ],
  },
  connect4: {
    key: "connect4",
    label: "Connect 4",
    note: "Column trap",
    status: "stack rising",
    speedMs: 940,
    frames: [
      String.raw`drop line 01
 1 2 3 4 5 6 7
|.|.|.|.|.|.|.|
|.|.|.|.|.|.|.|
|.|.|.|.|.|.|.|
|.|.|.|x|.|.|.|
|.|.|o|x|.|.|.|
|.|o|x|o|.|.|.|
+-+-+-+-+-+-+-+`,
      String.raw`drop line 02
 1 2 3 4 5 6 7
|.|.|.|.|.|.|.|
|.|.|.|.|.|.|.|
|.|.|.|x|.|.|.|
|.|.|o|x|.|.|.|
|.|x|o|x|.|.|.|
|.|o|x|o|.|.|.|
+-+-+-+-+-+-+-+`,
      String.raw`drop line 03
 1 2 3 4 5 6 7
|.|.|.|x|.|.|.|
|.|.|.|o|.|.|.|
|.|.|.|x|.|.|.|
|.|.|o|x|.|.|.|
|.|x|o|x|.|.|.|
|.|o|x|o|.|.|.|
+-+-+-+-+-+-+-+`,
      String.raw`drop line 04
 1 2 3 4 5 6 7
|.|.|o|x|.|.|.|
|.|.|x|o|.|.|.|
|.|.|o|x|.|.|.|
|.|.|o|x|.|.|.|
|.|x|o|x|.|.|.|
|.|o|x|o|.|.|.|
+-+-+-+-+-+-+-+`,
      String.raw`drop line 05
 1 2 3 4 5 6 7
|.|.|o|x|.|.|.|
|.|.|x|o|.|.|.|
|.|x|o|x|.|.|.|
|.|x|o|x|.|.|.|
|.|x|o|x|.|.|.|
|.|o|x|o|.|.|.|
+-+-+-+-+-+-+-+`,
      String.raw`drop line 06
 1 2 3 4 5 6 7
|.|.|o|x|.|.|.|
|.|x|x|o|.|.|.|
|.|x|o|x|.|.|.|
|.|x|o|x|.|.|.|
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
