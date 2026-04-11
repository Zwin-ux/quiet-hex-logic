import { memo, forwardRef } from "react";
import { Eye, Gavel, LayoutGrid, RadioTower, UserCog, Waves } from "lucide-react";
import { VenuePanel } from "@/components/board/VenuePanel";
import { MetricLine } from "@/components/board/MetricLine";
import { cn } from "@/lib/utils";

const worldBlueprint = [
  { label: "Identity", value: "name, members, recurrence" },
  { label: "Host control", value: "roles, moderation, room rules" },
  { label: "Event rail", value: "rounds, standings, schedules" },
  { label: "Live objects", value: "boards, lesson tables, analysis rooms" },
] as const;

const liveSurfaces = [
  {
    title: "Final board",
    note: "Clock, broadcast, spectatorship, and host override all in one place.",
  },
  {
    title: "Analysis room",
    note: "Replay, side lines, and teaching flow without breaking the main event rail.",
  },
  {
    title: "Qualifier table",
    note: "Fast seat turnover, direct invites, and recurring world context.",
  },
] as const;

const hostActions = [
  {
    icon: LayoutGrid,
    title: "Spawn room",
    description: "Create a live instance with rules, seats, visibility, and clock settings.",
  },
  {
    icon: Gavel,
    title: "Run round",
    description: "Advance the event without disconnecting it from the rooms people are already in.",
  },
  {
    icon: Eye,
    title: "Open spectate",
    description: "Make the board legible to viewers instead of hiding the live object behind a static bracket.",
  },
] as const;

export const FeaturesShowcase = memo(
  forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
    ({ className, ...props }, ref) => {
      return (
        <section ref={ref} className={cn("border-y border-black/10 bg-transparent py-14 md:py-16", className)} {...props}>
          <div className="mx-auto board-page-width space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
              <VenuePanel
                eyebrow="World blueprint"
                title="A world holds the recurring competition identity."
                description="This is the core object. Events and live boards inherit context from the world instead of pretending every match is its own isolated page."
                className="bg-white/92"
              >
                <div className="board-ledger mt-2">
                  {worldBlueprint.map((item) => (
                    <div key={item.label} className="board-ledger-row md:grid-cols-[140px_minmax(0,1fr)]">
                      <p className="board-rail-label text-[10px] text-black/45">{item.label}</p>
                      <p className="text-sm leading-7 text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>
              </VenuePanel>

              <VenuePanel
                eyebrow="Presence rail"
                title="People should feel present around the object."
                description="Hosts, players, commentators, and spectators are part of the live surface. Presence is not a leftover status badge."
                className="bg-[#fbfaf6]"
              >
                <MetricLine icon={UserCog} label="Host mode" value="seat control + moderation" />
                <MetricLine icon={RadioTower} label="Broadcast" value="event rail + room audio path" />
                <MetricLine icon={Waves} label="Spectatorship" value="entry, watch state, replay" />
              </VenuePanel>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
              <VenuePanel
                eyebrow="Live surfaces"
                title="What people actually enter."
                description="BOARD should feel like adjacent live spaces inside one venue system, not detached pages with different moods."
              >
                <div className="board-ledger mt-2">
                  {liveSurfaces.map((surface, index) => (
                    <div key={surface.title} className="board-ledger-row md:grid-cols-[56px_minmax(0,1fr)]">
                      <div className="board-rail-label text-[10px] text-black/45">
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold tracking-[-0.05em] text-foreground">{surface.title}</h3>
                        <p className="mt-3 text-sm leading-7 text-muted-foreground">{surface.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </VenuePanel>

              <VenuePanel
                eyebrow="Host action rail"
                title="The venue changes because the host changes it."
                description="If a surface cannot be tied back to a real operation, it does not belong on the page."
                className="bg-white/92"
              >
                <div className="grid gap-4 md:grid-cols-3">
                  {hostActions.map((action) => (
                    <div key={action.title} className="border-t border-black/10 pt-4">
                      <div className="flex h-11 w-11 items-center justify-center border border-black/10 bg-[#faf9f4] text-foreground">
                        <action.icon className="h-4 w-4" />
                      </div>
                      <h3 className="mt-4 text-lg font-bold tracking-[-0.04em] text-foreground">{action.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">{action.description}</p>
                    </div>
                  ))}
                </div>
              </VenuePanel>
            </div>
          </div>
        </section>
      );
    },
  ),
);

FeaturesShowcase.displayName = "FeaturesShowcase";
