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
  return (
    <div
      aria-label="BOARD"
      className={cn(
        "board-wordmark",
        size === "hero" ? "board-wordmark--hero" : "board-wordmark--compact",
        tone === "light" ? "board-wordmark--light text-white" : "text-[#0e0e0f]",
        className,
      )}
    >
      <span aria-hidden="true" className="board-wordmark__cluster">
        <span className="board-wordmark__text">BOAR</span>
        <span className="board-wordmark__tile" />
        <span className="board-wordmark__text board-wordmark__text--last">D</span>
      </span>
    </div>
  );
}
