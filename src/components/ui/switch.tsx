import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center border-2 border-black bg-white transition-none [border-color:#808080_#ffffff_#ffffff_#808080] [box-shadow:inset_1px_1px_0_#404040,inset_-1px_-1px_0_#dfdfdf] data-[state=checked]:bg-[#00aa00] data-[state=unchecked]:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-dotted focus-visible:outline-black focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-4 w-4 border border-black bg-[#c0c0c0] transition-transform data-[state=checked]:translate-x-[22px] data-[state=unchecked]:translate-x-[2px]",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
