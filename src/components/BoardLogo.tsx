import { cn } from "@/lib/utils";
import { BoardWordmark } from "@/components/board/BoardWordmark";

type BoardLogoProps = {
  className?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
  showWordmark?: boolean;
  tone?: "dark" | "light";
};

export function BoardLogo({
  className,
  iconClassName,
  wordmarkClassName,
  showWordmark = true,
  tone = "dark",
}: BoardLogoProps) {
  return (
    <div className={cn("flex items-center", className)}>
      {!showWordmark ? (
        <div
          className={cn(
            "board-domino-mark",
            tone === "dark" ? "text-[#0e0e0f]" : "text-white",
            iconClassName,
          )}
          aria-hidden="true"
        />
      ) : null}
      {showWordmark && (
        <BoardWordmark
          size="compact"
          tone={tone}
          className={wordmarkClassName}
        />
      )}
    </div>
  );
}
