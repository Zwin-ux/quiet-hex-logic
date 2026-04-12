import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-[46px] w-full border border-[#0e0e0f] bg-[#fbfaf8] px-4 py-2 text-[16px] text-[#0e0e0f] ring-offset-background placeholder:text-[#7d7a74] focus-visible:outline focus-visible:outline-2 focus-visible:outline-black focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-[#efebe3] disabled:opacity-70 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
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
