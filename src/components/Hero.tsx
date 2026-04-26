import { memo, forwardRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { BoardWordmark } from "@/components/board/BoardWordmark";
import { getAsciiGamePreview } from "@/lib/asciiGames";
import { SHOWCASE_GAME_KEYS } from "@/lib/gameMetadata";
import { cn } from "@/lib/utils";

const HERO_ARENA_FEEDS = SHOWCASE_GAME_KEYS.map((key, index) => {
  const preview = getAsciiGamePreview(key);

  return {
    key,
    tableLabel: index === 0 ? "Lead table" : `Table ${String(index + 1).padStart(2, "0")}`,
    accent:
      key === "hex"
        ? "hsl(var(--game-hex))"
        : key === "chess"
          ? "hsl(var(--game-chess))"
          : key === "checkers"
            ? "hsl(var(--game-checkers))"
            : "hsl(var(--game-connect4))",
    frame:
      preview.frames[Math.min(index + 1, preview.frames.length - 1)] ?? preview.frames[0],
  };
});

export const LandingHero = memo(
  forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => {
    const shouldReduceMotion = useReducedMotion();
    const ease = [0.22, 1, 0.36, 1] as const;

    return (
      <section
        ref={ref}
        className={cn("relative overflow-hidden px-4 pt-4 md:px-6 md:pt-8", className)}
        {...props}
      >
        <div className="mx-auto max-w-[1520px]">
          <div className="landing-stage landing-stage--launcher">
            <div className="landing-stage__grid landing-stage__grid--launcher lg:grid-cols-[minmax(0,0.96fr)_minmax(360px,1.04fr)]">
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.34, ease }}
                className="landing-stage__copy landing-stage__copy--launcher board-public"
              >
                <div className="max-w-[640px]">
                  <BoardWordmark size="hero" className="mt-6 text-[#090909]" />
                  <motion.h1
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.32, delay: 0.06, ease }}
                    className="board-public-display mt-10 max-w-[11ch] text-[clamp(2.1rem,4.5vw,4.4rem)] text-[#090909]"
                  >
                    Choose a board. Start instantly.
                  </motion.h1>
                </div>

                <motion.div
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.12, ease }}
                  className="flex items-center gap-4 border-t border-black/10 pt-5"
                >
                  <Link
                    to="/events"
                    className="board-public-label text-[#5c5750] underline decoration-black/20 underline-offset-4 transition-colors duration-200 hover:text-[#090909]"
                  >
                    Events
                  </Link>
                </motion.div>
              </motion.div>

              <div className="landing-stage__object landing-stage__object--launcher">
                <div className="landing-stage__arena-grid">
                  {HERO_ARENA_FEEDS.map((feed, index) => (
                    <motion.article
                      key={feed.key}
                      initial={
                        shouldReduceMotion
                          ? false
                          : {
                              opacity: 0,
                              y: 16,
                              rotate: index % 2 === 0 ? -0.9 : 0.7,
                              scale: 0.985,
                            }
                      }
                      animate={
                        shouldReduceMotion
                          ? { opacity: 1, y: 0, rotate: index % 2 === 0 ? -0.9 : 0.7, scale: 1 }
                          : {
                              opacity: 1,
                              y: [0, index === 0 ? -5 : 4, 0],
                              rotate:
                                index % 2 === 0
                                  ? [-0.9, -0.45, -0.9]
                                  : [0.7, 0.35, 0.7],
                              scale: 1,
                            }
                      }
                      transition={{
                        opacity: { duration: 0.32, delay: index * 0.05, ease },
                        scale: { duration: 0.32, delay: index * 0.05, ease },
                        y: {
                          duration: index === 0 ? 7.4 : 9 + index * 0.5,
                          repeat: shouldReduceMotion ? 0 : Infinity,
                          ease: "easeInOut",
                          delay: 0.18 + index * 0.05,
                        },
                        rotate: {
                          duration: index === 0 ? 8.2 : 10 + index * 0.35,
                          repeat: shouldReduceMotion ? 0 : Infinity,
                          ease: "easeInOut",
                          delay: 0.14 + index * 0.05,
                        },
                      }}
                      className={cn(
                        "landing-stage__arena-card",
                        index === 0 && "landing-stage__arena-card--lead",
                        index === 0 && "landing-stage__arena-card--wide",
                        index === HERO_ARENA_FEEDS.length - 1 && "landing-stage__arena-card--tall",
                      )}
                    >
                      <div className="landing-stage__monitor landing-stage__monitor--launcher">
                        <div className="landing-stage__monitor-meta flex">
                          <span style={{ color: feed.accent }}>{feed.tableLabel}</span>
                        </div>
                        <div className="landing-stage__monitor-viewport">
                          <pre className="landing-stage__monitor-pre">{feed.frame}</pre>
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
