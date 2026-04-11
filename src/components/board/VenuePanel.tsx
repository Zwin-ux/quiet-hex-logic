import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type VenuePanelProps = {
  eyebrow?: string;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
  tone?: "light" | "dark";
};

export function VenuePanel({
  eyebrow,
  title,
  description,
  children,
  className,
  tone = "light",
}: VenuePanelProps) {
  const isDark = tone === "dark";

  return (
    <section
      className={cn(
        "board-panel board-panel-cut rounded-[1.15rem] p-5 md:p-7",
        isDark && "border-white/10 bg-[#101114] text-white before:bg-white/10",
        className,
      )}
    >
      {eyebrow ? (
        <p className={cn("board-rail-label", isDark && "text-white/45")}>{eyebrow}</p>
      ) : null}
      {title ? (
        <div className={cn("board-section-title mt-4", isDark && "text-white")}>
          {title}
        </div>
      ) : null}
      {description ? (
        <div className={cn("board-copy mt-4", isDark && "text-white/70")}>
          {description}
        </div>
      ) : null}
      {children ? <div className={cn((title || description || eyebrow) && "mt-6")}>{children}</div> : null}
    </section>
  );
}
