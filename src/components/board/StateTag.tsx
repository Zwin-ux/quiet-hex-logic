import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StateTagProps = {
  tone?: "normal" | "success" | "warning" | "critical";
  children: ReactNode;
  className?: string;
};

export function StateTag({ tone = "normal", children, className }: StateTagProps) {
  return (
    <span
      className={cn(
        "retro-state-tag",
        tone === "success" && "retro-state-tag--success",
        tone === "warning" && "retro-state-tag--warning",
        tone === "critical" && "retro-state-tag--critical",
        className,
      )}
      data-tone={tone}
    >
      {children}
    </span>
  );
}
