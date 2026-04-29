import type { ReactNode } from "react";
import { NavBar } from "@/components/NavBar";
import { cn } from "@/lib/utils";

type SiteFrameProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  showNav?: boolean;
  navVariant?: "default" | "landing";
  contentMode?: "contained" | "full";
  shellVariant?: "default" | "landing";
};

export function SiteFrame({
  children,
  className,
  contentClassName,
  showNav = true,
  navVariant = "default",
  contentMode = "contained",
  shellVariant = navVariant === "landing" ? "landing" : "default",
}: SiteFrameProps) {
  return (
    <div className={cn("board-shell", className)} data-shell-variant={shellVariant}>
      <div className="pointer-events-none fixed inset-0">
        <div
          className={cn(
            "board-grid absolute inset-0",
            shellVariant === "landing" ? "opacity-[0.18]" : "opacity-[0.12]",
          )}
        />
        <div
          className={cn(
            "board-topography absolute inset-0",
            shellVariant === "landing" ? "opacity-[0.22]" : "opacity-[0.1]",
          )}
        />
        <div
          className={cn(
            "absolute inset-x-0 top-0 h-64 board-texture-fade",
            shellVariant === "landing" ? "opacity-[0.26]" : "opacity-[0.12]",
          )}
        />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/[0.02] to-transparent" />
      </div>

      {showNav ? <NavBar variant={navVariant} /> : null}

      <main
        className={cn(
          contentMode === "full"
            ? "relative z-10 pb-20 pt-24 md:pt-28"
            : "board-page-width relative z-10 mx-auto px-4 pb-20 pt-36 md:px-6 md:pt-32 lg:px-8",
          contentClassName,
        )}
      >
        {children}
      </main>
    </div>
  );
}
