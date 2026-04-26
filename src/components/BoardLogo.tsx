import { cn } from "@/lib/utils";
import { BOARD_MONOGRAM_PATH, BoardWordmark } from "@/components/board/BoardWordmark";

type BoardLogoProps = {
  className?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
  showWordmark?: boolean;
  tone?: "dark" | "light";
};

function BoardMonogram({
  className,
  tone,
  decorative = false,
}: {
  className?: string;
  tone: "dark" | "light";
  decorative?: boolean;
}) {
  return (
    <span
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : "BOARD"}
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
          d={BOARD_MONOGRAM_PATH}
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
    <span className={cn("board-logo", className)}>
      {showWordmark ? (
        <BoardWordmark
          size="compact"
          tone={tone}
          className={cn("board-logo__wordmark", wordmarkClassName)}
        />
      ) : (
        <BoardMonogram tone={tone} className={iconClassName} />
      )}
    </span>
  );
}
