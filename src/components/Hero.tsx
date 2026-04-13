import { memo, forwardRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { BoardWordmark } from "@/components/board/BoardWordmark";
import { Button } from "@/components/ui/button";
import { getGame } from "@/lib/engine/registry";
import { FIRST_TOURNAMENT } from "@/lib/launchAnnouncements";
import { cn } from "@/lib/utils";

const HERO_PREVIEW_KEY = "hex";

const venueRail = [
  {
    label: "HOST",
    value: "Open rooms, share one invite, and keep the bracket attached.",
  },
  {
    label: "WATCH",
    value: "Follow live tables, finals, and replays from the same place.",
  },
  {
    label: "RANKED",
    value: "Verify once with World ID, then use the same account in ranked play.",
  },
] as const;

export const LandingHero = memo(
  forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => {
    const navigate = useNavigate();
    const heroGame = getGame(HERO_PREVIEW_KEY);

    const startNow = () => {
      navigate("/play", {
        state: {
          createAI: true,
          difficulty: "easy",
          gameKey: HERO_PREVIEW_KEY,
          boardSize: heroGame.defaultBoardSize,
        },
      });
    };

    return (
      <section ref={ref} className={cn("relative overflow-hidden px-4 pt-4 md:px-6 md:pt-8", className)} {...props}>
        <div className="mx-auto max-w-[1520px]">
          <div className="landing-stage">
            <div className="landing-stage__grid lg:grid-cols-[minmax(0,1.12fr)_minmax(380px,0.88fr)]">
              <div className="landing-stage__copy board-public">
                <div className="max-w-[820px]">
                  <p className="board-public-label text-[#5c5750]">BOARD / local play / rooms and brackets</p>
                  <BoardWordmark size="hero" className="mt-6 text-[#090909]" />
                  <h1 className="board-public-display mt-10 max-w-[10ch] text-[clamp(3.3rem,6.6vw,6.8rem)] text-[#090909]">
                    Start local. Open the room later.
                  </h1>
                  <p className="board-public-copy mt-6 max-w-[29rem] text-[1.05rem] md:text-[1.16rem]">
                    Practice in seconds. When more people show up, turn the same table into rooms, invites, and finals.
                  </p>
                </div>

                <div className="flex flex-col gap-8 border-t border-black/10 pt-6 md:flex-row md:items-end md:justify-between">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <Button
                        variant="hero"
                        size="lg"
                        className="min-w-[178px] justify-between bg-[#090909] text-[#f3efe6] hover:bg-[#17181c]"
                        onClick={startNow}
                      >
                        <span>Start local</span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                      <p className="board-public-label max-w-[30rem] leading-7 text-[#5c5750]">
                        Hex / {heroGame.defaultBoardSize}x{heroGame.defaultBoardSize} / no sign-in
                      </p>
                    </div>

                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                      className="flex flex-wrap items-center gap-3 border border-black/12 bg-white/58 px-4 py-3"
                    >
                      <p className="board-public-label text-[#5c5750]">FOUNDING OPEN</p>
                      <p className="board-public-copy text-[0.95rem] text-[#17181c]">
                        {FIRST_TOURNAMENT.fullDate} / {FIRST_TOURNAMENT.time}
                      </p>
                      <Button
                        variant="ghost"
                        className="h-10 border border-black/12 px-3 text-[12px] uppercase tracking-[0.14em] text-[#17181c] hover:bg-black hover:text-[#f3efe6]"
                        onClick={() => navigate("/events")}
                      >
                        View event
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-10 border border-black/12 px-3 text-[12px] uppercase tracking-[0.14em] text-[#17181c] hover:bg-black hover:text-[#f3efe6]"
                        onClick={() => navigate("/hiring")}
                      >
                        Crew call
                      </Button>
                    </motion.div>
                  </div>

                  <div className="max-w-[18rem]">
                    <p className="board-public-label text-[#5c5750]">NEXT</p>
                    <p className="board-public-copy mt-2 text-[0.96rem] text-[#17181c]">
                      Open a room, post the invite, and keep the bracket on the same surface.
                    </p>
                  </div>
                </div>
              </div>

              <div className="landing-stage__object">
                <div className="landing-stage__object-rail">
                  <span className="board-public-label text-white/68">HEX / room monitor</span>
                  <span className="board-public-label text-white/44">live table / route 03</span>
                </div>

                <div className="landing-stage__piece-frame">
                  <img
                    src="/board/board-piece-cluster.svg"
                    alt="Stacked low-poly board pieces."
                    className="landing-stage__piece-image"
                  />
                </div>

                <div className="landing-stage__note-grid">
                  {venueRail.map((item) => (
                    <div key={item.label} className="landing-stage__note">
                      <p className="board-public-label text-white/58">{item.label}</p>
                      <p className="board-public-copy text-[0.98rem] text-[#ddd6c9]">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }),
);

LandingHero.displayName = "LandingHero";

export default LandingHero;
