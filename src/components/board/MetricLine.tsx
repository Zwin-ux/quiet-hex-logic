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
      <div className="flex items-center gap-2 text-muted-foreground">
        {Icon ? <Icon className="h-4 w-4" /> : null}
        <span className="board-rail-label tracking-[0.2em]">{label}</span>
      </div>
      <span className="text-lg font-bold tracking-[-0.03em] text-foreground">{value}</span>
    </div>
  );
}
