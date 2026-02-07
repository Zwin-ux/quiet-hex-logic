import { Hexagon, Crown, Circle, Hash, Grid2x2 } from 'lucide-react';

export type GameMeta = {
  key: string;
  icon: typeof Hexagon;
  tagline: string;
  accentVar: string;
  accentClass: string;
  bgClass: string;
  borderClass: string;
};

export const GAME_METADATA: Record<string, GameMeta> = {
  hex: {
    key: 'hex',
    icon: Hexagon,
    tagline: 'Connect opposite sides',
    accentVar: '--game-hex',
    accentClass: 'text-game-hex',
    bgClass: 'bg-game-hex/10',
    borderClass: 'border-game-hex/30',
  },
  chess: {
    key: 'chess',
    icon: Crown,
    tagline: 'The classic strategy game',
    accentVar: '--game-chess',
    accentClass: 'text-game-chess',
    bgClass: 'bg-game-chess/10',
    borderClass: 'border-game-chess/30',
  },
  checkers: {
    key: 'checkers',
    icon: Circle,
    tagline: 'Jump and capture',
    accentVar: '--game-checkers',
    accentClass: 'text-game-checkers',
    bgClass: 'bg-game-checkers/10',
    borderClass: 'border-game-checkers/30',
  },
  ttt: {
    key: 'ttt',
    icon: Hash,
    tagline: 'Three in a row',
    accentVar: '--game-ttt',
    accentClass: 'text-game-ttt',
    bgClass: 'bg-game-ttt/10',
    borderClass: 'border-game-ttt/30',
  },
  connect4: {
    key: 'connect4',
    icon: Grid2x2,
    tagline: 'Four in a line',
    accentVar: '--game-connect4',
    accentClass: 'text-game-connect4',
    bgClass: 'bg-game-connect4/10',
    borderClass: 'border-game-connect4/30',
  },
};

export function getGameMeta(key: string): GameMeta {
  return GAME_METADATA[key] ?? GAME_METADATA.hex;
}
