import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionRailProps = {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
};

export function SectionRail({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className,
  titleClassName,
  descriptionClassName,
}: SectionRailProps) {
  return (
    <div
      className={cn(
        "grid gap-6 border-b border-black/10 pb-7 lg:grid-cols-[minmax(0,1fr)_auto]",
        className,
      )}
    >
      <div className="min-w-0 max-w-4xl">
        <p className="board-rail-label">{eyebrow}</p>
        <div className={cn("board-page-title mt-4 max-w-[11ch] text-foreground", titleClassName)}>
          {title}
        </div>
        {description ? (
          <div className={cn("board-copy mt-5 max-w-2xl md:board-copy-lg", descriptionClassName)}>
            {description}
          </div>
        ) : null}
        {meta ? <div className="board-meta-stack mt-6 border-t border-black/10 pt-4">{meta}</div> : null}
      </div>

      {actions ? <div className="flex flex-wrap items-start gap-3 lg:justify-end">{actions}</div> : null}
    </div>
  );
}
