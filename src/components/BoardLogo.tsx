import { cn } from "@/lib/utils";

type BoardLogoProps = {
  className?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
  showWordmark?: boolean;
  tone?: "dark" | "light";
};

const CELLS = [
  "col-start-1 row-start-1",
  "col-start-1 row-start-2",
  "col-start-1 row-start-3",
  "col-start-2 row-start-1",
  "col-start-2 row-start-3",
  "col-start-3 row-start-1",
  "col-start-3 row-start-2",
  "col-start-3 row-start-3",
] as const;

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
          "grid h-9 w-9 grid-cols-3 grid-rows-3 gap-[3px] rounded-[12px] border p-[4px]",
          isDark ? "border-[#0a0a0a] bg-[#0a0a0a]" : "border-white/20 bg-white/10",
          iconClassName,
        )}
        aria-hidden="true"
      >
        {CELLS.map((cell) => (
          <span
            key={cell}
            className={cn(
              "rounded-[2px]",
              cell,
              isDark ? "bg-white" : "bg-[#0a0a0a]",
            )}
          />
        ))}
      </div>
      {showWordmark && (
        <span
          className={cn(
            "text-[1.05rem] font-bold uppercase tracking-[-0.09em]",
            isDark ? "text-[#0a0a0a]" : "text-white",
            wordmarkClassName,
          )}
        >
          BOARD
        </span>
      )}
    </div>
  );
}
