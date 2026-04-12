import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CounterBlockProps = {
  label: string;
  value: ReactNode;
  className?: string;
};

export function CounterBlock({ label, value, className }: CounterBlockProps) {
  return (
    <div className={cn("retro-counter", className)}>
      <span className="board-rail-label text-[10px] text-black/48">{label}</span>
      <span className="text-[2rem] font-black leading-none tracking-[-0.06em] text-foreground">
        {value}
      </span>
    </div>
  );
}
