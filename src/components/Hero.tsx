import { memo, forwardRef } from "react";
import { CalendarRange, RadioTower, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MetricLine } from "@/components/board/MetricLine";
import { SkeletalBoardScene } from "@/components/board/SkeletalBoardScene";
import { VenuePanel } from "@/components/board/VenuePanel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Hero = memo(
  forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
    ({ className, ...props }, ref) => {
      const navigate = useNavigate();

      const scrollToGames = () => {
        document.getElementById("games")?.scrollIntoView({ behavior: "smooth" });
      };

      return (
        <section ref={ref} className={cn("relative overflow-hidden", className)} {...props}>
          <div className="relative mx-auto max-w-[1440px] pb-16 pt-8 md:pb-24">
            <div className="grid items-center gap-8 xl:grid-cols-[1.02fr_0.98fr]">
              <div className="max-w-4xl">
                <p className="mb-5 board-rail-label">BOARD / Quiet Hex Logic</p>
                <h1 className="max-w-5xl text-balance text-5xl font-bold tracking-[-0.1em] text-[#0a0a0a] sm:text-6xl md:text-7xl lg:text-[6.5rem] lg:leading-[0.92]">
                  Future venue infrastructure for board worlds.
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-[#4e4d48] md:text-2xl md:leading-10">
                  BOARD gives clubs, creators, and local organizers a live system
                  for rooms, events, spectatorship, and host-owned competition.
                </p>
                <p className="mt-4 max-w-2xl text-sm font-semibold uppercase tracking-[0.22em] text-[#6f6b64]">
                  Chess first. Built for finals boards, lessons, leagues, table
                  nights, and live play that grows past one game.
                </p>

                <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                  <Button
                    size="lg"
                    className="clip-stage h-14 bg-[#0a0a0a] px-8 text-base font-semibold text-white shadow-none hover:bg-[#1b1b1b]"
                    onClick={() => navigate("/worlds")}
                  >
                    View Live Worlds
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 border-black/10 bg-white px-8 text-base font-semibold text-black shadow-none hover:bg-black/5"
                    onClick={scrollToGames}
                  >
                    Start Practice
                  </Button>
                </div>

                <div className="mt-12 grid gap-4 border-t border-black/10 pt-6 md:grid-cols-3">
                  <div>
                    <p className="board-rail-label">World</p>
                    <p className="mt-2 max-w-sm text-base leading-7 text-[#5b5a54]">
                      A recurring venue with identity, members, moderation, and
                      host control.
                    </p>
                  </div>
                  <div>
                    <p className="board-rail-label">Instance</p>
                    <p className="mt-2 max-w-sm text-base leading-7 text-[#5b5a54]">
                      Rooms feel like live objects: finals boards, challenges,
                      analysis spaces, and teaching tables.
                    </p>
                  </div>
                  <div>
                    <p className="board-rail-label">Event</p>
                    <p className="mt-2 max-w-sm text-base leading-7 text-[#5b5a54]">
                      Pairings and standings sit on top of those spaces without
                      flattening the experience into bracket sludge.
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative">
                <SkeletalBoardScene />
                <VenuePanel
                  tone="dark"
                  eyebrow="Live system fragment"
                  title="Northside club open"
                  className="absolute inset-x-4 bottom-4 md:inset-x-auto md:-bottom-8 md:right-6 md:w-[320px]"
                >
                  <MetricLine icon={Users} label="Presence" value="42 in venue" />
                  <MetricLine icon={RadioTower} label="Instance" value="Final board live" />
                  <MetricLine icon={CalendarRange} label="Event" value="Quarterfinals" />
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
