import { memo, forwardRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { BoardWordmark } from "@/components/board/BoardWordmark";
import { Button } from "@/components/ui/button";
import { ASCII_GAME_ORDER, getAsciiGamePreview } from "@/lib/asciiGames";
import { getGame } from "@/lib/engine/registry";
import { getGameMeta } from "@/lib/gameMetadata";
import { cn } from "@/lib/utils";

const HERO_PREVIEW_KEY = "hex";
const HERO_ARENA_FEEDS = ASCII_GAME_ORDER.map((key, index) => {
  const preview = getAsciiGamePreview(key);
  const meta = getGameMeta(key);

  return {
    key,
    label: preview.label,
    note: preview.note,
    status: preview.status,
    accentClass: meta.accentClass,
    frame:
      preview.frames[Math.min(index + 1, preview.frames.length - 1)] ?? preview.frames[0],
  };
});

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
                  <BoardWordmark size="hero" className="mt-6 text-[#090909]" />
                  <h1 className="board-public-display mt-10 max-w-[10ch] text-[clamp(3.3rem,6.6vw,6.8rem)] text-[#090909]">
                    Walk in. Pick a table.
                  </h1>
                  <p className="board-public-copy mt-6 max-w-[29rem] text-[1.05rem] md:text-[1.16rem]">
                    Local first. Rooms later.
                  </p>
                </div>

                <div className="flex flex-col gap-5 border-t border-black/10 pt-6">
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="hero"
                        size="lg"
                        className="min-w-[178px] justify-between bg-[#090909] text-[#f3efe6] hover:bg-[#17181c]"
                        onClick={startNow}
                      >
                        <span>Start local</span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-10 border border-black/12 px-3 text-[12px] uppercase tracking-[0.14em] text-[#17181c] hover:bg-black hover:text-[#f3efe6]"
                        onClick={() => navigate("/events")}
                      >
                        May 1 open
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-10 border border-black/12 px-3 text-[12px] uppercase tracking-[0.14em] text-[#17181c] hover:bg-black hover:text-[#f3efe6]"
                        onClick={() => navigate("/hiring")}
                      >
                        Crew call
                      </Button>
                    </div>
                  </div>

                  <motion.p
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                    className="board-public-label text-[#5c5750]"
                  >
                    Hex / {heroGame.defaultBoardSize}x{heroGame.defaultBoardSize} / local now
                  </motion.p>
                </div>
              </div>

              <div className="landing-stage__object">
                <div className="landing-stage__object-rail">
                  <span className="board-public-label text-white/68">boards live</span>
                </div>

                <div className="landing-stage__arena-grid">
                  {HERO_ARENA_FEEDS.map((feed, index) => (
                    <motion.article
                      key={feed.key}
                      initial={{ opacity: 0, y: 18, rotate: index % 2 === 0 ? -1.4 : 1.2, scale: 0.98 }}
                      animate={{
                        opacity: 1,
                        y: [0, index % 2 === 0 ? -6 : 6, 0],
                        rotate: index % 2 === 0 ? [-1.4, -0.7, -1.4] : [1.2, 0.5, 1.2],
                        scale: 1,
                      }}
                      transition={{
                        opacity: { duration: 0.34, delay: index * 0.06 },
                        scale: { duration: 0.34, delay: index * 0.06 },
                        y: {
                          duration: 6.2 + index * 0.45,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 0.2 + index * 0.04,
                        },
                        rotate: {
                          duration: 7.4 + index * 0.3,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 0.15 + index * 0.04,
                        },
                      }}
                      className={cn(
                        "landing-stage__arena-card",
                        index === 0 && "landing-stage__arena-card--wide",
                        index === HERO_ARENA_FEEDS.length - 1 && "landing-stage__arena-card--tall",
                      )}
                    >
                      <div className="landing-stage__monitor landing-stage__monitor--manual">
                        <div className="landing-stage__monitor-signal" />
                        <div className="landing-stage__monitor-meta flex">
                          <span className={feed.accentClass}>{feed.label}</span>
                          <span>{feed.status}</span>
                        </div>
                        <div className="landing-stage__monitor-viewport">
                          <pre className="landing-stage__monitor-pre">{feed.frame}</pre>
                        </div>
                        <div className="landing-stage__monitor-footer">
                          <span>{feed.note}</span>
                          <span>table {String(index + 1).padStart(2, "0")}</span>
                        </div>
                      </div>
                    </motion.article>
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
