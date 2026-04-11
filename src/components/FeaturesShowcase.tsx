import { memo, forwardRef } from "react";
import { Eye, Gavel, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

const worldBlueprint = [
  { label: "Identity", value: "name, members, recurrence" },
  { label: "Host control", value: "roles, moderation, room rules" },
  { label: "Event rail", value: "rounds, standings, schedules" },
  { label: "Live objects", value: "boards, lesson tables, side analysis" },
] as const;

const liveSurfaces = [
  {
    title: "Final board",
    note: "Clock, watch lane, host override, replay trace.",
  },
  {
    title: "Analysis room",
    note: "Teaching flow, side lines, and post-game review.",
  },
  {
    title: "Qualifier table",
    note: "Fast seat turnover with recurring world context.",
  },
] as const;

const hostActions = [
  {
    icon: LayoutGrid,
    title: "Spawn room",
    note: "Rules, seats, visibility, and clock state.",
  },
  {
    icon: Gavel,
    title: "Run round",
    note: "Advance the event without breaking room continuity.",
  },
  {
    icon: Eye,
    title: "Open spectate",
    note: "Let viewers enter the live board, not just a bracket.",
  },
] as const;

export const FeaturesShowcase = memo(
  forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
    ({ className, ...props }, ref) => {
      return (
        <section
          ref={ref}
          className={cn("border-y border-black/10 bg-transparent py-14 md:py-16", className)}
          {...props}
        >
          <div className="mx-auto board-page-width">
            <div className="grid gap-8 border-t border-black/10 py-8 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="space-y-4">
                <p className="board-rail-label">World blueprint</p>
                <h2 className="board-section-title max-w-xs text-foreground">
                  Worlds keep rooms and events in one operating system.
                </h2>
                <p className="board-copy max-w-sm">
                  A world is the recurring venue. Rooms and events inherit context
                  from it instead of resetting every time a new match starts.
                </p>
              </div>

              <div className="board-ledger border-t-0">
                {worldBlueprint.map((item) => (
                  <div
                    key={item.label}
                    className="board-ledger-row md:grid-cols-[148px_minmax(0,1fr)]"
                  >
                    <p className="board-rail-label text-[10px] text-black/45">{item.label}</p>
                    <p className="text-sm leading-7 text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-8 border-t border-black/10 py-8 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="space-y-4">
                <p className="board-rail-label">Live surfaces</p>
                <h2 className="board-section-title max-w-xs text-foreground">
                  People enter live boards, not marketing sections.
                </h2>
                <p className="board-copy max-w-sm">
                  Finals boards, analysis rooms, and qualifier tables should read like
                  adjacent spaces inside one venue.
                </p>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
                <div className="board-ledger border-t-0">
                  {liveSurfaces.map((surface, index) => (
                    <div
                      key={surface.title}
                      className="board-ledger-row md:grid-cols-[56px_minmax(0,1fr)]"
                    >
                      <p className="board-rail-label text-[10px] text-black/45">
                        {String(index + 1).padStart(2, "0")}
                      </p>
                      <div>
                        <h3 className="text-[1.35rem] font-bold leading-[0.98] tracking-[-0.06em] text-foreground">
                          {surface.title}
                        </h3>
                        <p className="mt-2 text-sm leading-7 text-muted-foreground">
                          {surface.note}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="board-ledger border-t-0">
                  {hostActions.map((action) => (
                    <div
                      key={action.title}
                      className="board-ledger-row md:grid-cols-[56px_minmax(0,1fr)]"
                    >
                      <div className="flex h-10 w-10 items-center justify-center border border-black/10 bg-[#f7f5ee] text-foreground">
                        <action.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-[1.2rem] font-bold leading-[0.98] tracking-[-0.05em] text-foreground">
                          {action.title}
                        </h3>
                        <p className="mt-2 text-sm leading-7 text-muted-foreground">
                          {action.note}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      );
    },
  ),
);

FeaturesShowcase.displayName = "FeaturesShowcase";
