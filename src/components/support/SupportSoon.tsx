import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type SupportSoonProps = {
  detail: string;
  tone?: "dark" | "paper";
  className?: string;
};

export function SupportSoon({
  detail,
  tone = "dark",
  className,
}: SupportSoonProps) {
  return (
    <div className={cn("support-soon", tone === "paper" && "support-soon--paper", className)}>
      <span className="support-soon__stamp">
        <Sparkles className="h-3.5 w-3.5" />
        SOOON
      </span>
      <span className="support-soon__detail">{detail}</span>
    </div>
  );
}
