import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap border border-[#0e0e0f] bg-[#fbfaf8] text-[15px] font-medium tracking-[-0.01em] text-[#0e0e0f] ring-offset-background transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-black focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[#fbfaf8] hover:bg-[#efebe3]",
        destructive: "bg-[#0e0e0f] text-[#f6f4f0] hover:bg-[#202124]",
        outline: "bg-transparent hover:bg-[#efebe3]",
        secondary: "bg-[#efebe3] hover:bg-[#e6dfd3]",
        ghost:
          "border-transparent bg-transparent hover:bg-[#efebe3] active:translate-x-0 active:translate-y-0",
        link:
          "border-transparent bg-transparent p-0 text-[#0e0e0f] underline underline-offset-2 hover:bg-transparent hover:text-[#525257] active:translate-x-0 active:translate-y-0",
        hero: "bg-[#0e0e0f] text-[#f6f4f0] hover:bg-[#202124]",
        quiet: "border-transparent bg-transparent text-[#525257] hover:bg-[#efebe3] hover:text-[#0e0e0f]",
        success: "bg-[#0e0e0f] text-[#f6f4f0] hover:bg-[#202124]",
        support:
          "rounded-full border-4 border-[#ffe600] bg-[linear-gradient(90deg,#ff3af2_0%,#7b2fff_52%,#00f5d4_100%)] font-black uppercase tracking-[0.18em] text-white shadow-[0_0_28px_rgba(255,58,242,0.35),8px_8px_0_#ffe600,16px_16px_0_#7b2fff] hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_0_34px_rgba(255,58,242,0.5),10px_10px_0_#ffe600,20px_20px_0_#7b2fff] active:translate-y-0 active:scale-[0.99]",
        supportOutline:
          "rounded-full border-4 border-dashed border-[#00f5d4] bg-[#171024]/70 font-bold uppercase tracking-[0.16em] text-white shadow-[0_0_20px_rgba(0,245,212,0.18),8px_8px_0_#ff3af2] hover:-translate-y-0.5 hover:border-[#ffe600] hover:bg-[#211739] active:translate-y-0 active:scale-[0.99]",
        supportGhost:
          "rounded-full border-4 border-transparent bg-white/8 font-bold uppercase tracking-[0.16em] text-white hover:border-[#ff6b35] hover:bg-white/16 active:scale-[0.99]",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 px-3 text-[13px]",
        lg: "h-12 px-6 py-2.5 text-[16px]",
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
