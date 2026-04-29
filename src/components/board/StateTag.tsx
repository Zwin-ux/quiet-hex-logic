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
        tone === "success" && "retro-state-tag--strong",
        tone === "critical" && "retro-state-tag--strong",
        tone === "warning" && "retro-state-tag--quiet",
        className,
      )}
      data-tone={tone}
    >
      {children}
    </span>
  );
}
