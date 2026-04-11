import { memo, forwardRef } from "react";
import {
  ArrowUpRight,
  CalendarRange,
  RadioTower,
  ShieldCheck,
  Users,
  Waves,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MetricLine } from "@/components/board/MetricLine";
import { SkeletalBoardScene } from "@/components/board/SkeletalBoardScene";
import { VenuePanel } from "@/components/board/VenuePanel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const liveTape = [
  { label: "World", value: "Northside Club", note: "2 rooms warming, host online" },
  { label: "Event", value: "Spring Open", note: "quarterfinal rail seeded" },
  { label: "Instance", value: "Final board", note: "clock live, spectators inside" },
  { label: "Presence", value: "42 in venue", note: "hosts, players, commentators" },
] as const;

const roomModes = [
  {
    id: "01",
    title: "Final board",
    description: "Clock pressure, spectator lane, host intervention, replay trace.",
  },
  {
    id: "02",
    title: "Lesson room",
    description: "Seat rotation, coaching rail, side analysis, low-friction practice.",
  },
  {
    id: "03",
    title: "Creator table",
    description: "Audience presence, challenge flow, recurring venue identity.",
  },
] as const;

const actionRail = [
  { label: "Open worlds", href: "/worlds" },
  { label: "Event directory", href: "/events" },
  { label: "Practice desk", href: "/play" },
] as const;

const Hero = memo(
  forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
    ({ className, ...props }, ref) => {
      const navigate = useNavigate();

      return (
        <section ref={ref} className={cn("relative overflow-hidden", className)} {...props}>
          <div className="relative mx-auto board-page-width pb-14 pt-6 md:pb-20 md:pt-8">
            <div className="board-ledger border-b border-black/10">
              {liveTape.map((item, index) => (
                <div
                  key={item.label}
                  className={cn(
                    "board-ledger-row py-4 md:grid-cols-[110px_minmax(0,1fr)_260px]",
                    index === 0 && "border-t-0",
                  )}
                >
                  <div className="board-rail-label text-[10px] text-black/45">{item.label}</div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold tracking-[-0.04em] text-foreground">{item.value}</p>
                  </div>
                  <p className="text-sm leading-7 text-muted-foreground">{item.note}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
              <div className="flex flex-col gap-6">
                <VenuePanel
                  eyebrow="Venue kernel"
                  title={
                    <>
                      BOARD runs worlds,
                      <br />
                      rooms, and live boards.
                    </>
                  }
                  description="Not a startup homepage. Not a fake dashboard. A host system for recurring competition."
                  className="min-h-[260px] bg-white/92"
                >
                  <div className="space-y-3 border-t border-black/10 pt-5">
                    <Button className="h-12 w-full justify-between px-4" onClick={() => navigate("/worlds")}>
                      Open worlds
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" className="h-12 w-full justify-between px-4" onClick={() => navigate("/events")}>
                      Open event directory
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </div>
                </VenuePanel>

                <div className="board-panel board-panel-cut rounded-[1.15rem] bg-[#fbfaf6] p-5 md:p-6">
                  <p className="board-rail-label">Entry rail</p>
                  <div className="mt-5 space-y-4">
                    {actionRail.map((item) => (
                      <button
                        key={item.href}
                        onClick={() => navigate(item.href)}
                        className="flex w-full items-center justify-between border-t border-black/10 pt-4 text-left transition-colors hover:text-black/70"
                      >
                        <span className="text-base font-semibold tracking-[-0.03em] text-foreground">
                          {item.label}
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative min-h-[620px]">
                <SkeletalBoardScene className="min-h-[620px]" />

                <div className="absolute left-5 right-5 top-5 z-[4] flex flex-wrap items-center gap-3">
                  <span className="board-meta-chip border border-black/10 bg-white/82 px-3 py-2 text-[10px]">
                    world / Northside Club
                  </span>
                  <span className="board-meta-chip border border-black/10 bg-white/82 px-3 py-2 text-[10px]">
                    event / quarterfinal rail
                  </span>
                  <span className="board-meta-chip border border-black/10 bg-white/82 px-3 py-2 text-[10px]">
                    instance / board 03 live
                  </span>
                </div>

                <div className="absolute inset-x-5 bottom-5 z-[4] grid gap-4 lg:grid-cols-[1fr_280px]">
                  <div className="board-panel board-panel-cut rounded-[1.15rem] bg-white/84 p-5 backdrop-blur-[3px]">
                    <p className="board-rail-label">Scene note</p>
                    <h1 className="mt-4 text-[clamp(2.2rem,4.8vw,4.8rem)] font-display leading-[0.9] tracking-[-0.085em] text-foreground">
                      Venue infrastructure for live board worlds.
                    </h1>
                    <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
                      Clubs, creators, schools, and local organizers need rooms, rails,
                      spectatorship, and event logic that feel like one world instead of a stack of pages.
                    </p>
                  </div>

                  <div className="board-panel board-panel-cut rounded-[1.15rem] bg-[#101114] p-5 text-white">
                    <MetricLine icon={Users} label="Seats" value="18 active" />
                    <MetricLine icon={RadioTower} label="Spectators" value="24 watching" />
                    <MetricLine icon={CalendarRange} label="Round" value="QF / board 03" />
                    <MetricLine icon={ShieldCheck} label="Host state" value="moderated" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="board-panel board-panel-cut rounded-[1.15rem] bg-white/90 p-5 md:p-6">
                  <p className="board-rail-label">Live room modes</p>
                  <div className="mt-5 space-y-4">
                    {roomModes.map((mode) => (
                      <div key={mode.id} className="border-t border-black/10 pt-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-lg font-bold tracking-[-0.04em] text-foreground">{mode.title}</p>
                          <span className="board-rail-label text-[10px] text-black/45">{mode.id}</span>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-muted-foreground">{mode.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <VenuePanel
                  eyebrow="Why it exists"
                  title="Pages are not enough."
                  description="BOARD starts from venue objects: worlds, rooms, instances, rails, and spectatorship. The homepage should feel like that system, not explain it away with feature boxes."
                  className="bg-[#fbfaf6]"
                >
                  <div className="flex items-center gap-3 border-t border-black/10 pt-5">
                    <Waves className="h-4 w-4 text-foreground" />
                    <p className="text-sm leading-7 text-muted-foreground">
                      One world can hold finals boards, side tables, lesson rooms, and a recurring event identity without flattening into a bracket page.
                    </p>
                  </div>
                </VenuePanel>
              </div>
            </div>
          </div>
        </section>
      );
    },
  ),
);

Hero.displayName = "Hero";

export default Hero;
