import { memo, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { AsciiGameDeck } from "@/components/board/AsciiGameDeck";
import { BoardWordmark } from "@/components/board/BoardWordmark";
import { cn } from "@/lib/utils";

const entryRail = [
  { label: "Enter Worlds", href: "/worlds" },
  { label: "Start Local Practice", href: "/play" },
  { label: "View Events", href: "/events" },
] as const;

const liveTape = [
  "WORLD 03 / PUBLIC",
  "12 LIVE TABLES",
  "2 FINALS QUEUED",
  "8 WATCHING",
  "HOST ONLINE",
] as const;

const Hero = memo(
  forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => {
    const navigate = useNavigate();

    return (
      <section ref={ref} className={cn("relative overflow-hidden", className)} {...props}>
        <div className="board-page-width relative mx-auto pb-12 pt-4 md:pb-16 md:pt-8">
          <div className="relative border border-[#0e0e0f] bg-[#f6f4f0] px-6 py-8 md:px-10 md:py-10">
            <div className="absolute inset-0 board-grid opacity-25" />
            <div className="absolute inset-0 board-topography opacity-70" />

            <div className="relative grid gap-10 xl:grid-cols-[0.95fr_1.05fr] xl:gap-14">
              <div className="max-w-[520px]">
                <BoardWordmark size="hero" />
                <h1 className="mt-8 max-w-[460px] text-[clamp(2rem,3.1vw,3rem)] font-medium leading-[1.14] tracking-[-0.05em] text-[#0e0e0f]">
                  Host a board world, not just a tournament page.
                </h1>
                <p className="mt-4 max-w-[430px] text-[17px] leading-8 text-[#525257] md:text-[18px]">
                  BOARD is a venue system for worlds, rooms, instances, hosts,
                  spectators, and live events. Alpha stays chess-first, but the
                  system reads broader than one game.
                </p>
                <p className="board-rail-label mt-5 text-[11px] text-[#525257]">
                  moving ascii boards preview every game system live
                </p>

                <div className="mt-8 inline-flex flex-col gap-3 border border-[#0e0e0f] bg-[#fbfaf8] p-5">
                  <p className="board-rail-label text-[11px] text-[#525257]">Entry Desk</p>
                  {entryRail.map((item) => (
                    <button
                      key={item.href}
                      onClick={() => navigate(item.href)}
                      className="inline-flex w-fit items-center border border-[#0e0e0f] bg-transparent px-3 py-2 text-[16px] font-medium text-[#0e0e0f] transition-colors duration-150 hover:bg-[#efebe3]"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <p className="board-rail-label mb-5 text-[11px] text-[#525257]">Ascii rack</p>
                <AsciiGameDeck />
              </div>
            </div>

            <div className="relative mt-12 flex flex-wrap gap-3 border border-[#0e0e0f] bg-[#fbfaf8] p-3 md:mt-16 md:w-fit">
              {liveTape.map((item) => (
                <div
                  key={item}
                  className="border border-[#0e0e0f] px-3 py-2 text-[12px] font-medium uppercase tracking-[0.08em] text-[#0e0e0f]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }),
);

Hero.displayName = "Hero";

export default Hero;
