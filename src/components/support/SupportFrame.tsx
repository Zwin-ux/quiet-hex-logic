import type { ReactNode } from "react";
import { NavBar } from "@/components/NavBar";
import { cn } from "@/lib/utils";

type SupportFrameProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  showNav?: boolean;
  navVariant?: "default" | "landing";
};

export function SupportFrame({
  children,
  className,
  contentClassName,
  showNav = true,
  navVariant = "default",
}: SupportFrameProps) {
  return (
    <div className={cn("support-shell", className)}>
      <div className="support-shell__backdrop">
        <div className="support-shell__mesh" />
        <div className="support-shell__dots" />
        <div className="support-shell__stripes" />
        <div className="support-shell__orb support-shell__orb--magenta" />
        <div className="support-shell__orb support-shell__orb--cyan" />
        <div className="support-shell__orb support-shell__orb--yellow" />
        <div className="support-shell__word">BOARD</div>
      </div>

      {showNav ? <NavBar variant={navVariant} /> : null}

      <main
        className={cn(
          "support-shell__content mx-auto max-w-[1280px] px-4 pb-24 pt-28 md:px-6 md:pt-32 lg:px-8",
          contentClassName,
        )}
      >
        {children}
      </main>
    </div>
  );
}
