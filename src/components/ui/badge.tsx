import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center border-2 border-black px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-dotted focus-visible:outline-black focus-visible:outline-offset-2",
  {
    variants: {
      variant: {
        default: "bg-[#000080] text-white [border-color:#5555ff_#000040_#000040_#5555ff]",
        secondary: "bg-[#ffff00] text-black",
        destructive: "bg-[#ff0000] text-white [border-color:#ff5555_#800000_#800000_#ff5555]",
        outline: "bg-white text-black",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
