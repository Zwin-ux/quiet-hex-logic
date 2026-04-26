import { cn } from "@/lib/utils";

type BoardWordmarkProps = {
  className?: string;
  size?: "hero" | "compact";
  tone?: "dark" | "light";
  decorative?: boolean;
};

export const BOARD_MONOGRAM_PATH =
  "M0 0H58L90 18V60L72 78L90 96V138L58 156H0V0ZM24 24V64H48L62 54V34L48 24H24ZM24 92V132H50L64 122V102L50 92H24Z";
const B_SHAPE = BOARD_MONOGRAM_PATH;
const O_SHAPE =
  "M28 0H86L114 24V132L86 156H28L0 132V24L28 0ZM40 24L24 38V118L40 132H74L90 118V38L74 24H40Z";
const A_SHAPE =
  "M0 156L44 0H94L138 156H112L101 122H37L26 156H0ZM44 98H94L69 24L44 98Z";
const A_BAR = "M46 102H92V120H46Z";
const R_BOWL =
  "M0 0H58L90 22V70L66 88L102 156H74L44 96H24V156H0V0ZM24 24V72H50L64 62V34L50 24H24Z";
const R_LEG = "M52 88H76L104 156H74Z";
const D_SHAPE =
  "M0 0H48L100 30V126L48 156H0V0ZM24 24V132H40L76 110V46L40 24H24Z";

export function BoardWordmark({
  className,
  size = "compact",
  tone = "dark",
  decorative = false,
}: BoardWordmarkProps) {
  return (
    <span
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : "BOARD"}
      className={cn(
        "board-wordmark",
        size === "hero" ? "board-wordmark--hero" : "board-wordmark--compact",
        tone === "light" ? "board-wordmark--light text-white" : "text-[#0e0e0f]",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        className="board-wordmark__svg"
        viewBox="0 0 634 156"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g fill="currentColor">
          <path d={B_SHAPE} />
          <path d={O_SHAPE} transform="translate(118 0)" />
          <path d={A_SHAPE} transform="translate(248 0)" />
          <path d={A_BAR} transform="translate(248 0)" />
          <path d={R_BOWL} transform="translate(396 0)" />
          <path d={R_LEG} transform="translate(396 0)" />
          <path d={D_SHAPE} transform="translate(534 0)" />
        </g>
      </svg>
    </span>
  );
}
