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
  "col-start-2 row-start-2",
  "col-start-2 row-start-3",
  "col-start-3 row-start-1",
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
          "grid h-8 w-8 grid-cols-3 grid-rows-3 gap-[2px] rounded-[10px] p-[3px]",
          isDark ? "bg-[#0a0a0a]" : "bg-white ring-1 ring-black/12",
          iconClassName,
        )}
        aria-hidden="true"
      >
        {CELLS.map((cell) => (
          <span
            key={cell}
            className={cn(
              "rounded-[3px]",
              cell,
              isDark ? "bg-white" : "bg-[#0a0a0a]",
            )}
          />
        ))}
      </div>
      {showWordmark && (
        <span
          className={cn(
            "text-[1.05rem] font-black uppercase tracking-[-0.08em]",
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
