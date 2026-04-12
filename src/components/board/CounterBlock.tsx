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
      <span>{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}
