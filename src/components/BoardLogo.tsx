import { cn } from "@/lib/utils";
import { BOARD_MONOGRAM_PATH, BoardWordmark } from "@/components/board/BoardWordmark";

type BoardLogoProps = {
  className?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
  variant?: "split" | "wordmark" | "mark";
  tone?: "dark" | "light";
};

function BoardMonogram({
  className,
  tone,
  decorative = false,
  shell = false,
}: {
  className?: string;
  tone: "dark" | "light";
  decorative?: boolean;
  shell?: boolean;
}) {
  return (
    <span
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : "BOARD"}
      className={cn(
        "board-wordmark inline-flex",
        shell && "board-logo__mark-shell",
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
  variant = "split",
  tone = "dark",
}: BoardLogoProps) {
  if (variant === "mark") {
    return (
      <span className={cn("board-logo", className)}>
        <BoardMonogram tone={tone} className={iconClassName} />
      </span>
    );
  }

  if (variant === "wordmark") {
    return (
      <span className={cn("board-logo", className)}>
        <BoardWordmark
          size="compact"
          tone={tone}
          className={cn("board-logo__wordmark", wordmarkClassName)}
        />
      </span>
    );
  }

  return (
    <span className={cn("board-logo board-logo--split", className)} aria-label="BOARD" role="img">
      <BoardMonogram
        tone={tone}
        shell
        className={cn("board-logo__mark", iconClassName)}
        decorative
      />
      <BoardWordmark
        size="compact"
        tone={tone}
        leadGlyph="trimmed"
        className={cn("board-logo__wordmark board-logo__wordmark--trimmed", wordmarkClassName)}
        decorative
      />
    </span>
  );
}
