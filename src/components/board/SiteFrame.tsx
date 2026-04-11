import type { ReactNode } from "react";
import { NavBar } from "@/components/NavBar";
import { cn } from "@/lib/utils";

type SiteFrameProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  showNav?: boolean;
};

export function SiteFrame({
  children,
  className,
  contentClassName,
  showNav = true,
}: SiteFrameProps) {
  return (
    <div className={cn("board-shell", className)}>
      <div className="pointer-events-none fixed inset-0">
        <div className="board-grid absolute inset-0 opacity-70" />
        <div className="board-topography absolute inset-0 opacity-80" />
        <div className="absolute inset-x-0 top-0 h-48 board-texture-fade opacity-80" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/[0.03] to-transparent" />
      </div>

      {showNav ? <NavBar /> : null}

      <main
        className={cn(
          "board-page-width relative z-10 mx-auto px-5 pb-20 pt-24 md:px-8 lg:px-10",
          contentClassName,
        )}
      >
        {children}
      </main>
    </div>
  );
}
