import type { ComponentType, SVGProps } from "react";
import {
  HexBoardMark,
  ChessBoardMark,
  CheckersBoardMark,
  TttBoardMark,
  Connect4BoardMark,
} from "@/components/board/BoardScene";

export type GameMeta = {
  key: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { decorative?: boolean; size?: number }>;
  tagline: string;
  accentVar: string;
  accentClass: string;
  bgClass: string;
  borderClass: string;
};

export const GAME_METADATA: Record<string, GameMeta> = {
  hex: {
    key: 'hex',
    icon: HexBoardMark,
    tagline: 'Bridge both sides',
    accentVar: '--game-hex',
    accentClass: 'text-game-hex',
    bgClass: 'bg-game-hex/10',
    borderClass: 'border-game-hex/30',
  },
  chess: {
    key: 'chess',
    icon: ChessBoardMark,
    tagline: 'Force checkmate',
    accentVar: '--game-chess',
    accentClass: 'text-game-chess',
    bgClass: 'bg-game-chess/10',
    borderClass: 'border-game-chess/30',
  },
  checkers: {
    key: 'checkers',
    icon: CheckersBoardMark,
    tagline: 'Jump pieces',
    accentVar: '--game-checkers',
    accentClass: 'text-game-checkers',
    bgClass: 'bg-game-checkers/10',
    borderClass: 'border-game-checkers/30',
  },
  ttt: {
    key: 'ttt',
    icon: TttBoardMark,
    tagline: 'Make three',
    accentVar: '--game-ttt',
    accentClass: 'text-game-ttt',
    bgClass: 'bg-game-ttt/10',
    borderClass: 'border-game-ttt/30',
  },
  connect4: {
    key: 'connect4',
    icon: Connect4BoardMark,
    tagline: 'Drop four',
    accentVar: '--game-connect4',
    accentClass: 'text-game-connect4',
    bgClass: 'bg-game-connect4/10',
    borderClass: 'border-game-connect4/30',
  },
};

export const SHOWCASE_GAME_KEYS = ["hex", "chess", "checkers", "connect4"] as const;

export function getGameMeta(key: string): GameMeta {
  return GAME_METADATA[key] ?? GAME_METADATA.hex;
}
