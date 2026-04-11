import { memo, forwardRef } from "react";
import {
  ArrowUpRight,
  CalendarRange,
  RadioTower,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BoardWordmark } from "@/components/board/BoardWordmark";
import { MetricLine } from "@/components/board/MetricLine";
import { SkeletalBoardScene } from "@/components/board/SkeletalBoardScene";
import { cn } from "@/lib/utils";

const liveTape = [
  { label: "World", value: "Northside Club", note: "host online / two rooms warming" },
  { label: "Event", value: "Spring Open", note: "quarterfinal rail seeded" },
  { label: "Instance", value: "Board 03", note: "clock live / replay on" },
  { label: "Presence", value: "42 inside", note: "players / hosts / commentators" },
] as const;

const entryRail = [
  {
    label: "Open worlds",
    note: "Host-owned venues and recurring rooms.",
    href: "/worlds",
  },
  {
    label: "Open events",
    note: "Brackets, rounds, and current boards.",
    href: "/events",
  },
  {
    label: "Practice locally",
    note: "Start a table immediately.",
    href: "/play",
  },
] as const;

const Hero = memo(
  forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
    ({ className, ...props }, ref) => {
      const navigate = useNavigate();

      return (
        <section ref={ref} className={cn("relative overflow-hidden", className)} {...props}>
          <div className="relative mx-auto board-page-width pb-12 pt-6 md:pb-16 md:pt-8">
            <div className="board-panel clip-stage overflow-hidden bg-[#fbfaf6]">
              <div className="absolute inset-0 board-grid opacity-35" />
              <div className="absolute inset-0 board-topography opacity-70" />

              <div className="relative grid gap-8 px-5 py-6 md:px-8 md:py-8 xl:grid-cols-[1.08fr_0.92fr] xl:gap-10 xl:px-10 xl:py-10">
                <div className="flex min-h-[600px] flex-col justify-between gap-10">
                  <div className="space-y-5">
                    <p className="board-rail-label text-[10px] text-black/45">Live board worlds</p>
                    <BoardWordmark size="hero" />
                    <p className="max-w-xl text-[clamp(1.06rem,1.55vw,1.34rem)] leading-[1.56] text-[#4f4c46]">
                      Worlds, rooms, and live boards for clubs, creators, schools,
                      and recurring competition.
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    {entryRail.map((item) => (
                      <button
                        key={item.href}
                        onClick={() => navigate(item.href)}
                        className="group flex min-h-[172px] flex-col justify-between border border-black/10 bg-white/78 p-4 text-left transition-colors duration-200 hover:bg-black hover:text-white"
                      >
                        <div className="space-y-3">
                          <p className="board-rail-label text-[10px] text-current/50">Entry</p>
                          <h2 className="text-[1.45rem] font-bold leading-[0.96] tracking-[-0.07em] text-current">
                            {item.label}
                          </h2>
                          <p className="text-sm leading-7 text-current/72">{item.note}</p>
                        </div>
                        <div className="flex items-center justify-between border-t border-current/15 pt-4">
                          <span className="board-rail-label text-[10px] text-current/50">open</span>
                          <ArrowUpRight className="h-4 w-4 text-current" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative flex flex-col gap-5">
                  <div className="absolute left-5 top-5 z-[4] max-w-[240px] border border-black/10 bg-white/84 px-3 py-3 backdrop-blur-[4px]">
                    <p className="board-rail-label text-[10px] text-black/45">Current host view</p>
                    <p className="mt-2 text-sm leading-6 text-[#4f4c46]">
                      Finals board, side analysis, and recurring room logic all stay
                      inside the same world.
                    </p>
                  </div>

                  <SkeletalBoardScene className="min-h-[600px] rounded-none border-0 bg-transparent" />

                  <div className="absolute inset-x-5 bottom-5 z-[4] grid gap-4 lg:grid-cols-[1fr_280px]">
                    <div className="border border-black/10 bg-white/84 p-5 backdrop-blur-[4px]">
                      <p className="board-rail-label text-[10px] text-black/45">Room signal</p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <span className="board-meta-chip text-black/55">final board</span>
                        <span className="board-meta-chip text-black/55">spectators live</span>
                        <span className="board-meta-chip text-black/55">moderated rail</span>
                        <span className="board-meta-chip text-black/55">replay trace on</span>
                      </div>
                    </div>

                    <div className="border border-black/10 bg-[#111215] p-5 text-white">
                      <MetricLine icon={Users} label="Seats" value="18 active" />
                      <MetricLine icon={RadioTower} label="Watchers" value="24 inside" />
                      <MetricLine icon={CalendarRange} label="Round" value="QF / board 03" />
                      <MetricLine icon={ShieldCheck} label="Host state" value="moderated" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative border-t border-black/10 px-5 py-2 md:px-8 xl:px-10">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {liveTape.map((item) => (
                    <div key={item.label} className="grid gap-1 border-l border-black/10 pl-4 py-3 first:border-l-0 first:pl-0">
                      <p className="board-rail-label text-[10px] text-black/45">{item.label}</p>
                      <p className="text-base font-semibold tracking-[-0.04em] text-foreground">{item.value}</p>
                      <p className="text-sm leading-6 text-muted-foreground">{item.note}</p>
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

Hero.displayName = "Hero";

export default Hero;
