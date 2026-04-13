import { cn } from "@/lib/utils";
import { BoardWordmark } from "@/components/board/BoardWordmark";

type BoardLogoProps = {
  className?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
  showWordmark?: boolean;
  tone?: "dark" | "light";
};

function BoardMonogram({ className, tone }: { className?: string; tone: "dark" | "light" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "board-wordmark inline-flex",
        tone === "light" ? "board-wordmark--light text-white" : "text-[#0e0e0f]",
        className,
      )}
    >
      <svg
        className="board-wordmark__monogram"
        viewBox="0 0 82 156"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0 0H54L82 18V58L66 74L82 90V138L54 156H0V0ZM24 24V60H46L58 52V32L46 24H24ZM24 84V132H45L58 124V96L45 84H24Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

export function BoardLogo({
  className,
  iconClassName,
  wordmarkClassName,
  showWordmark = true,
  tone = "dark",
}: BoardLogoProps) {
  return (
    <div className={cn("flex items-center", className)}>
      {showWordmark ? (
        <BoardWordmark
          size="compact"
          tone={tone}
          className={wordmarkClassName}
        />
      ) : (
        <BoardMonogram tone={tone} className={iconClassName} />
      )}
    </div>
  );
}
