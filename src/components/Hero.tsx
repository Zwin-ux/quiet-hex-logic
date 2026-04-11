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
          <div className="relative mx-auto board-page-width pb-14 pt-8 md:pb-20">
            <div className="grid items-start gap-8 xl:grid-cols-[1.02fr_0.98fr]">
              <div className="max-w-4xl pt-4">
                <p className="mb-5 board-rail-label">BOARD / Quiet Hex Logic</p>
                <h1 className="board-display-title max-w-[8.4ch] text-[#0a0a0a]">
                  Future venue infrastructure for board worlds.
                </h1>
                <p className="board-copy-lg mt-6 max-w-2xl">
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
                    className="h-14 px-8 text-base"
                    onClick={() => navigate("/worlds")}
                  >
                    View Live Worlds
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 px-8 text-base text-black"
                    onClick={scrollToGames}
                  >
                    Start Practice
                  </Button>
                </div>

                <div className="mt-12 grid gap-6 border-t border-black/10 pt-6 md:grid-cols-3">
                  <div>
                    <p className="board-rail-label">World</p>
                    <p className="board-copy mt-3 max-w-sm">
                      A recurring venue with identity, members, moderation, and
                      host control.
                    </p>
                  </div>
                  <div>
                    <p className="board-rail-label">Instance</p>
                    <p className="board-copy mt-3 max-w-sm">
                      Rooms feel like live objects: finals boards, challenges,
                      analysis spaces, and teaching tables.
                    </p>
                  </div>
                  <div>
                    <p className="board-rail-label">Event</p>
                    <p className="board-copy mt-3 max-w-sm">
                      Pairings and standings sit on top of those spaces without
                      flattening the experience into bracket sludge.
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative pt-4 xl:pt-10">
                <SkeletalBoardScene />
                <VenuePanel
                  tone="dark"
                  eyebrow="Live system fragment"
                  title="Northside club open"
                  className="absolute inset-x-4 bottom-4 md:inset-x-auto md:bottom-6 md:right-6 md:w-[320px]"
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
