import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap border-2 text-[12px] font-bold uppercase tracking-[0.12em] text-black ring-offset-background transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-dotted focus-visible:outline-black focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 active:translate-x-px active:translate-y-px [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [border-color:#ffffff_#808080_#808080_#ffffff] [box-shadow:inset_-1px_-1px_0_#404040,inset_1px_1px_0_#dfdfdf] active:[border-color:#808080_#ffffff_#ffffff_#808080] active:[box-shadow:inset_1px_1px_0_#404040,inset_-1px_-1px_0_#dfdfdf]",
  {
    variants: {
      variant: {
        default: "bg-[#c0c0c0] hover:bg-[#d0d0d0]",
        destructive:
          "bg-[#ff0000] text-white hover:bg-[#ff2a2a] [border-color:#ff5555_#800000_#800000_#ff5555]",
        outline: "bg-white hover:bg-[#ffffcc]",
        secondary: "bg-[#ffffcc] hover:bg-[#fff7a6]",
        ghost:
          "border-transparent bg-transparent text-[#0000ff] shadow-none [box-shadow:none] hover:bg-transparent hover:text-[#ff0000] active:translate-x-0 active:translate-y-0 active:[box-shadow:none] active:[border-color:transparent]",
        link:
          "border-transparent bg-transparent p-0 text-[#0000ff] shadow-none [box-shadow:none] underline underline-offset-2 hover:bg-transparent hover:text-[#ff0000] active:translate-x-0 active:translate-y-0 active:[box-shadow:none] active:[border-color:transparent]",
        hero:
          "bg-[#0000ff] text-white hover:bg-[#2020ff] [border-color:#5555ff_#000080_#000080_#5555ff]",
        quiet: "bg-[#e8e8e8] hover:bg-white",
        success:
          "bg-[#00aa00] text-white hover:bg-[#00c000] [border-color:#00ff00_#006600_#006600_#00ff00]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-[11px]",
        lg: "h-11 px-6 py-2.5",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
