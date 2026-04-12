import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full border-2 border-black bg-white px-3 py-2 text-sm text-black ring-offset-background placeholder:text-[#808080] [border-color:#808080_#ffffff_#ffffff_#808080] [box-shadow:inset_1px_1px_0_#404040,inset_-1px_-1px_0_#dfdfdf] focus-visible:outline focus-visible:outline-2 focus-visible:outline-dotted focus-visible:outline-black focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-[#c0c0c0] disabled:opacity-70 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
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
