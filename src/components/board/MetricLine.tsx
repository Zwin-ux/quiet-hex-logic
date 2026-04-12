import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type MetricLineProps = {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  className?: string;
};

export function MetricLine({ label, value, icon: Icon, className }: MetricLineProps) {
  return (
    <div className={cn("board-metric-line", className)}>
      <div className="flex items-center gap-2 text-black/70">
        {Icon ? <Icon className="h-4 w-4 text-black" /> : null}
        <span className="board-rail-label font-mono uppercase tracking-[0.16em]">{label}</span>
      </div>
      <span className="font-mono text-[13px] font-bold uppercase tracking-[0.1em] text-foreground md:text-[15px]">
        {value}
      </span>
    </div>
  );
}
