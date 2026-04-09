import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionRailProps = {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function SectionRail({
  eyebrow,
  title,
  description,
  actions,
  className,
}: SectionRailProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-black/10 pb-6 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="max-w-3xl">
        <p className="board-rail-label">{eyebrow}</p>
        <div className="mt-3 text-balance text-4xl font-bold tracking-[-0.08em] text-foreground md:text-5xl">
          {title}
        </div>
        {description ? (
          <div className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
            {description}
          </div>
        ) : null}
      </div>

      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
