import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type BoardSceneKey = "hex" | "chess" | "checkers" | "ttt" | "connect4";
export type BoardSceneState = "static" | "idle" | "selected" | "loading" | "success";

type IconBaseProps = React.SVGProps<SVGSVGElement> & {
  decorative?: boolean;
  size?: number;
};

export type BoardSceneProps = IconBaseProps & {
  game: BoardSceneKey;
  state?: BoardSceneState;
};

export type BoardMarkProps = IconBaseProps & {
  game: BoardSceneKey;
};

const TRANSITION_EASE = [0.22, 1, 0.36, 1] as const;
const LOOP_EASE = [0.4, 0, 0.2, 1] as const;

function SceneSvg({
  children,
  className,
  decorative = true,
  game,
  size,
  title,
  ...props
}: IconBaseProps & {
  children: React.ReactNode;
  game: BoardSceneKey;
  title: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden={decorative ? true : undefined}
      role={decorative ? "presentation" : "img"}
      aria-label={decorative ? undefined : title}
      width={size}
      height={size}
      className={cn("board-scene", `board-scene--${game}`, className)}
      {...props}
    >
      {!decorative ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

function MarkSvg({
  children,
  className,
  decorative = true,
  game,
  size,
  title,
  ...props
}: IconBaseProps & {
  children: React.ReactNode;
  game: BoardSceneKey;
  title: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden={decorative ? true : undefined}
      role={decorative ? "presentation" : "img"}
      aria-label={decorative ? undefined : title}
      width={size}
      height={size}
      className={cn("board-mark", `board-mark--${game}`, className)}
      {...props}
    >
      {!decorative ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

function getSceneTitle(game: BoardSceneKey) {
  switch (game) {
    case "hex":
      return "Hex scene";
    case "chess":
      return "Chess scene";
    case "checkers":
      return "Checkers scene";
    case "ttt":
      return "Tic Tac Toe scene";
    case "connect4":
      return "Connect 4 scene";
  }
}

function getMarkTitle(game: BoardSceneKey) {
  switch (game) {
    case "hex":
      return "Hex mark";
    case "chess":
      return "Chess mark";
    case "checkers":
      return "Checkers mark";
    case "ttt":
      return "Tic Tac Toe mark";
    case "connect4":
      return "Connect 4 mark";
  }
}

function HexMark(props: IconBaseProps) {
  return (
    <MarkSvg game="hex" title={getMarkTitle("hex")} {...props}>
      <path
        d="M7.5 5.6 4.9 7.1v3L7.5 11.6 10.1 10.1v-3L7.5 5.6Zm9 4.2-2.6 1.5-2.6-1.5V6.9l2.6-1.5 2.6 1.5v2.9Zm-4.5 6.2-2.6 1.5L6.8 16V13l2.6-1.5L12 13v3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M8.8 8.6 12 8.6M9.4 13.5l2-1.1M13.3 10.8l1.8 1"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </MarkSvg>
  );
}

function ChessMark(props: IconBaseProps) {
  return (
    <MarkSvg game="chess" title={getMarkTitle("chess")} {...props}>
      <path
        d="M8 17.5h8m-7-9.2L10.5 12 12 9.7 13.5 12 15 8.3l1.2 9.2H7.8L9 8.3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10.1 6.8 12 5l1.9 1.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </MarkSvg>
  );
}

function CheckersMark(props: IconBaseProps) {
  return (
    <MarkSvg game="checkers" title={getMarkTitle("checkers")} {...props}>
      <circle cx="8.2" cy="14.2" r="3.1" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="15.8" cy="9.8" r="3.1" stroke="currentColor" strokeWidth="1.7" />
      <path d="M10.8 12.7 13.3 11.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </MarkSvg>
  );
}

function TttMark(props: IconBaseProps) {
  return (
    <MarkSvg game="ttt" title={getMarkTitle("ttt")} {...props}>
      <path d="M8 5.7v12.6M16 5.7v12.6M5.7 8h12.6M5.7 16h12.6" stroke="currentColor" strokeWidth="1.5" />
      <path d="m7.3 7.3 2 2m0-2-2 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="16.2" cy="16.2" r="1.8" stroke="currentColor" strokeWidth="1.7" />
    </MarkSvg>
  );
}

function Connect4Mark(props: IconBaseProps) {
  return (
    <MarkSvg game="connect4" title={getMarkTitle("connect4")} {...props}>
      <rect x="5.8" y="5.8" width="12.4" height="12.4" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M10 6.7v10.6M14 6.7v10.6M6.8 10h10.4M6.8 14h10.4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="14" r="1.35" fill="currentColor" />
    </MarkSvg>
  );
}

function HexScene({ state = "static", ...props }: BoardSceneProps) {
  const prefersReducedMotion = useReducedMotion();
  const isLoading = state === "loading" && !prefersReducedMotion;
  const isSelected = (state === "selected" || state === "success") && !prefersReducedMotion;
  const isIdle = state === "idle" && !prefersReducedMotion;

  return (
    <SceneSvg game="hex" title={getSceneTitle("hex")} {...props}>
      <path
        d="M7 5.6 4.4 7.1v3L7 11.6l2.6-1.5v-3L7 5.6Zm10 4.3-2.6 1.5-2.6-1.5V7l2.6-1.5L17 7v2.9Zm-5 6.1-2.6 1.5L6.8 16V13l2.6-1.5L12 13v3Z"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinejoin="round"
      />
      <motion.path
        d="M8.8 8.6 12 8.6 15.2 10.5"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
        initial={false}
        animate={
          isLoading
            ? { pathLength: [0.2, 1, 0.2], opacity: [0.35, 1, 0.35] }
            : isSelected
              ? { pathLength: [0.3, 1], opacity: [0.55, 1] }
              : isIdle
                ? { opacity: [0.5, 0.9, 0.5] }
                : { pathLength: 1, opacity: 0.78 }
        }
        transition={
          isLoading
            ? { duration: 1.05, repeat: Infinity, ease: LOOP_EASE }
            : { duration: 0.22, ease: TRANSITION_EASE }
        }
      />
      <motion.circle
        cx="15.2"
        cy="10.5"
        r="1.35"
        fill="currentColor"
        initial={false}
        animate={
          isLoading
            ? { scale: [0.84, 1.15, 0.84] }
            : isSelected
              ? { scale: [0.8, 1.12, 1] }
              : { scale: 1 }
        }
        transition={isLoading ? { duration: 1.05, repeat: Infinity, ease: LOOP_EASE } : { duration: 0.2 }}
      />
    </SceneSvg>
  );
}

function ChessScene({ state = "static", ...props }: BoardSceneProps) {
  const prefersReducedMotion = useReducedMotion();
  const isLoading = state === "loading" && !prefersReducedMotion;
  const isSelected = (state === "selected" || state === "success") && !prefersReducedMotion;
  const isIdle = state === "idle" && !prefersReducedMotion;

  return (
    <SceneSvg game="chess" title={getSceneTitle("chess")} {...props}>
      <path
        d="M8.1 17.5h7.8m-6.9-9.1L10.4 12 12 9.8 13.6 12 15 8.4l1.15 9.1H7.85L9 8.4Z"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10.1 6.8 12 5l1.9 1.8" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
      <motion.path
        d="M15.7 8.6 18.6 5.7"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
        initial={false}
        animate={
          isLoading
            ? { pathLength: [0.15, 1, 0.15], opacity: [0.3, 0.95, 0.3] }
            : isSelected
              ? { pathLength: [0.2, 1], opacity: [0.45, 1] }
              : isIdle
                ? { opacity: [0.35, 0.65, 0.35] }
                : { pathLength: 1, opacity: 0.55 }
        }
        transition={
          isLoading
            ? { duration: 0.92, repeat: Infinity, ease: LOOP_EASE }
            : { duration: 0.22, ease: TRANSITION_EASE }
        }
      />
    </SceneSvg>
  );
}

function CheckersScene({ state = "static", ...props }: BoardSceneProps) {
  const prefersReducedMotion = useReducedMotion();
  const isLoading = state === "loading" && !prefersReducedMotion;
  const isSelected = (state === "selected" || state === "success") && !prefersReducedMotion;
  const isIdle = state === "idle" && !prefersReducedMotion;

  return (
    <SceneSvg game="checkers" title={getSceneTitle("checkers")} {...props}>
      <circle cx="8.2" cy="14.2" r="3.1" stroke="currentColor" strokeWidth="1.65" />
      <motion.g
        initial={false}
        animate={
          isLoading
            ? { x: [0, 1.8, 0], y: [0, -1.2, 0] }
            : isSelected
              ? { x: [0, 1.6, 2.2], y: [0, -1.1, -2.2] }
              : isIdle
                ? { y: [0, -0.6, 0] }
                : { x: 0, y: 0 }
        }
        transition={
          isLoading
            ? { duration: 0.98, repeat: Infinity, ease: LOOP_EASE }
            : { duration: 0.24, ease: TRANSITION_EASE }
        }
      >
        <circle cx="15.4" cy="9.6" r="3.1" stroke="currentColor" strokeWidth="1.65" />
      </motion.g>
      <motion.path
        d="M10.8 12.7 13.3 11.3 16.2 8.5"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeDasharray="0.01 2.4"
        initial={false}
        animate={
          isLoading
            ? { opacity: [0.25, 0.8, 0.25] }
            : isSelected
              ? { opacity: [0.35, 1] }
              : isIdle
                ? { opacity: [0.22, 0.46, 0.22] }
                : { opacity: 0.34 }
        }
        transition={
          isLoading
            ? { duration: 0.98, repeat: Infinity, ease: LOOP_EASE }
            : { duration: 0.22, ease: TRANSITION_EASE }
        }
      />
    </SceneSvg>
  );
}

function TttScene({ state = "static", ...props }: BoardSceneProps) {
  const prefersReducedMotion = useReducedMotion();
  const isLoading = state === "loading" && !prefersReducedMotion;
  const isSelected = (state === "selected" || state === "success") && !prefersReducedMotion;
  const isIdle = state === "idle" && !prefersReducedMotion;

  return (
    <SceneSvg game="ttt" title={getSceneTitle("ttt")} {...props}>
      <path d="M8 5.7v12.6M16 5.7v12.6M5.7 8h12.6M5.7 16h12.6" stroke="currentColor" strokeWidth="1.5" />
      <path d="m7.4 7.4 2 2m0-2-2 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="16.1" cy="8" r="1.8" stroke="currentColor" strokeWidth="1.7" />
      <motion.path
        d="m14.6 14.6 3 3m0-3-3 3"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
        initial={false}
        animate={
          isLoading
            ? { pathLength: [0.15, 1, 0.15], opacity: [0.25, 0.95, 0.25] }
            : isSelected
              ? { pathLength: [0, 1], opacity: [0.2, 1] }
              : isIdle
                ? { opacity: [0.25, 0.52, 0.25] }
                : { pathLength: 1, opacity: 0.42 }
        }
        transition={
          isLoading
            ? { duration: 1.1, repeat: Infinity, ease: LOOP_EASE }
            : { duration: 0.2, ease: TRANSITION_EASE }
        }
      />
    </SceneSvg>
  );
}

function Connect4Scene({ state = "static", ...props }: BoardSceneProps) {
  const prefersReducedMotion = useReducedMotion();
  const isLoading = state === "loading" && !prefersReducedMotion;
  const isSelected = (state === "selected" || state === "success") && !prefersReducedMotion;
  const isIdle = state === "idle" && !prefersReducedMotion;

  return (
    <SceneSvg game="connect4" title={getSceneTitle("connect4")} {...props}>
      <rect x="6" y="6.3" width="12" height="11.8" rx="3" stroke="currentColor" strokeWidth="1.65" />
      <path d="M10 6.9v10.5M14 6.9v10.5M7 10.2h10M7 13.9h10" stroke="currentColor" strokeWidth="1.45" />
      <circle cx="10" cy="14" r="1.25" fill="currentColor" />
      <circle cx="14" cy="14" r="1.25" fill="currentColor" />
      <motion.circle
        cx="14"
        cy="8.1"
        r="1.25"
        fill="currentColor"
        initial={false}
        animate={
          isLoading
            ? { cy: [8.1, 11.3, 8.1], opacity: [0.45, 1, 0.45] }
            : isSelected
              ? { cy: [8.1, 11.3], opacity: [0.45, 1] }
              : isIdle
                ? { opacity: [0.4, 0.7, 0.4] }
                : { cy: 11.3, opacity: 0.78 }
        }
        transition={
          isLoading
            ? { duration: 1.08, repeat: Infinity, ease: LOOP_EASE }
            : { duration: 0.22, ease: TRANSITION_EASE }
        }
      />
    </SceneSvg>
  );
}

export function BoardScene({ game, state = "static", ...props }: BoardSceneProps) {
  switch (game) {
    case "hex":
      return <HexScene game={game} state={state} {...props} />;
    case "chess":
      return <ChessScene game={game} state={state} {...props} />;
    case "checkers":
      return <CheckersScene game={game} state={state} {...props} />;
    case "ttt":
      return <TttScene game={game} state={state} {...props} />;
    case "connect4":
      return <Connect4Scene game={game} state={state} {...props} />;
  }
}

export function BoardMark({ game, ...props }: BoardMarkProps) {
  switch (game) {
    case "hex":
      return <HexMark {...props} />;
    case "chess":
      return <ChessMark {...props} />;
    case "checkers":
      return <CheckersMark {...props} />;
    case "ttt":
      return <TttMark {...props} />;
    case "connect4":
      return <Connect4Mark {...props} />;
  }
}

function createGameMark(game: BoardSceneKey) {
  const Comp = function GameMark(props: IconBaseProps) {
    return <BoardMark game={game} {...props} />;
  };

  Comp.displayName = `${game[0].toUpperCase()}${game.slice(1)}BoardMark`;
  return Comp;
}

export const HexBoardMark = createGameMark("hex");
export const ChessBoardMark = createGameMark("chess");
export const CheckersBoardMark = createGameMark("checkers");
export const TttBoardMark = createGameMark("ttt");
export const Connect4BoardMark = createGameMark("connect4");
