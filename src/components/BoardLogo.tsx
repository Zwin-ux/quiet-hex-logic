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
  const isDark = tone === "dark";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "board-domino-mark",
          isDark ? "text-[#0a0a0a]" : "text-white",
          iconClassName,
        )}
        aria-hidden="true"
      />
      {showWordmark && (
        <BoardWordmark
          size="compact"
          tone={isDark ? "dark" : "light"}
          className={wordmarkClassName}
        />
      )}
    </div>
  );
}
