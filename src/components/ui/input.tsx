import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.ComponentProps<"input"> {
  variant?: "default" | "support";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = "default", ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-[46px] w-full border border-[#0e0e0f] bg-[#fbfaf8] px-4 py-2 text-[16px] text-[#0e0e0f] ring-offset-background placeholder:text-[#7d7a74] focus-visible:outline focus-visible:outline-2 focus-visible:outline-black focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-[#efebe3] disabled:opacity-70 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          variant === "support" &&
            "h-14 rounded-full border-4 border-[#ff3af2] bg-[#171024]/82 px-5 text-white placeholder:text-white/46 shadow-[0_0_22px_rgba(255,58,242,0.16),8px_8px_0_#00f5d4] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffe600] focus-visible:ring-offset-4 focus-visible:ring-offset-[#7b2fff] disabled:border-white/14 disabled:bg-white/10",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
