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
  status?: ReactNode;
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
  status,
}: SectionRailProps) {
  return (
    <section className={cn("retro-window", className)}>
      <div className="retro-window__titlebar">
        <div className="min-w-0">
          <p className="retro-window__eyebrow">{eyebrow}</p>
          <div className={cn("retro-window__title mt-1", titleClassName)}>{title}</div>
        </div>
        {status ? <div className="shrink-0">{status}</div> : null}
      </div>

      <div className="retro-window__body retro-window__body--soft">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="min-w-0">
            {description ? (
              <div className={cn("board-copy max-w-4xl", descriptionClassName)}>{description}</div>
            ) : null}
            {meta ? (
              <div className="board-meta-stack mt-5 border-t border-black pt-4">
                {meta}
              </div>
            ) : null}
          </div>

          {actions ? (
            <div className="retro-command-rail border-t-0 pt-0 lg:min-w-[220px] lg:justify-end">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
