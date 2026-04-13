import { cn } from "@/lib/utils";

type BoardWordmarkProps = {
  className?: string;
  size?: "hero" | "compact";
  tone?: "dark" | "light";
};

const B_SHAPE = "M0 0H54L82 18V58L66 74L82 90V138L54 156H0V0ZM24 24V60H46L58 52V32L46 24H24ZM24 84V132H45L58 124V96L45 84H24Z";
const O_SHAPE = "M28 0H82L110 24V132L82 156H28L0 132V24L28 0ZM38 24L24 36V120L38 132H72L86 120V36L72 24H38Z";
const A_SHAPE = "M0 156L48 0H88L136 156H110L99 122H37L26 156H0ZM45 98H91L68 27L45 98Z";
const A_BAR = "M44 104H93V122H44Z";
const R_BOWL = "M0 0H54L82 20V68L64 84L94 156H66L42 94H24V156H0V0ZM24 24V70H46L58 60V34L46 24H24Z";
const R_LEG = "M45 82H71L97 156H69Z";
const D_SHAPE = "M0 0H50L96 30V126L50 156H0V0ZM24 24V132H42L72 112V44L42 24H24Z";

export function BoardWordmark({
  className,
  size = "compact",
  tone = "dark",
}: BoardWordmarkProps) {
  return (
    <span
      aria-label="BOARD"
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
        viewBox="0 0 620 156"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g fill="currentColor">
          <path d={B_SHAPE} />
          <path d={O_SHAPE} transform="translate(112 0)" />
          <path d={A_SHAPE} transform="translate(236 0)" />
          <path d={A_BAR} transform="translate(236 0)" />
          <path d={R_BOWL} transform="translate(388 0)" />
          <path d={R_LEG} transform="translate(388 0)" />
          <path d={D_SHAPE} transform="translate(520 0)" />
        </g>
      </svg>
    </span>
  );
}
