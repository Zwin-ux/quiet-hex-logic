import { cn } from "@/lib/utils";

type BoardWordmarkProps = {
  className?: string;
  size?: "hero" | "compact";
  tone?: "dark" | "light";
};

export function BoardWordmark({
  className,
  size = "compact",
  tone = "dark",
}: BoardWordmarkProps) {
  const hero = size === "hero";
  const light = tone === "light";

  return (
    <div
      aria-label="BOARD"
      className={cn(
        "board-wordmark",
        hero ? "board-wordmark--hero" : "board-wordmark--compact",
        light ? "text-white" : "text-[#0a0a0a]",
        className,
      )}
    >
      <span aria-hidden="true" className="board-wordmark__glyph">
        B
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "board-wordmark__glyph",
          hero && "board-wordmark__glyph--outline",
        )}
      >
        O
      </span>
      <span aria-hidden="true" className="board-wordmark__tile" />
      <span aria-hidden="true" className="board-wordmark__glyph board-wordmark__glyph--lift">
        A
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "board-wordmark__glyph board-wordmark__glyph--drop",
          hero && "board-wordmark__glyph--outline",
        )}
      >
        R
      </span>
      <span aria-hidden="true" className="board-wordmark__glyph">
        D
      </span>
    </div>
  );
}
