import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type VenuePanelProps = {
  eyebrow?: string;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
  tone?: "light" | "dark";
  state?: "normal" | "warning" | "critical";
  titleBarEnd?: ReactNode;
  bodyClassName?: string;
  footer?: ReactNode;
};

export function VenuePanel({
  eyebrow,
  title,
  description,
  children,
  className,
  tone = "light",
  state = "normal",
  titleBarEnd,
  bodyClassName,
  footer,
}: VenuePanelProps) {
  const titleBarTone =
    state === "critical"
      ? "retro-window__titlebar--critical"
      : state === "warning"
        ? "retro-window__titlebar--warning"
        : "";

  return (
    <section className={cn("retro-window", className)}>
      {(eyebrow || title || titleBarEnd) ? (
        <div className={cn("retro-window__titlebar", titleBarTone)}>
          <div className="min-w-0">
            {eyebrow ? <p className="retro-window__eyebrow">{eyebrow}</p> : null}
            {title ? <div className="retro-window__title mt-1">{title}</div> : null}
          </div>
          {titleBarEnd ? <div className="shrink-0">{titleBarEnd}</div> : null}
        </div>
      ) : null}

      <div
        className={cn(
          "retro-window__body",
          tone === "dark" ? "retro-window__body--shell" : "retro-window__body--soft",
          bodyClassName,
        )}
      >
        {description ? <div className="board-copy">{description}</div> : null}
        {children ? <div className={cn(description && "mt-5")}>{children}</div> : null}
      </div>

      {footer ? <div className="retro-window__footer">{footer}</div> : null}
    </section>
  );
}
