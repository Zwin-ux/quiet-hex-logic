import { memo, useState, forwardRef, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { AIDifficulty } from "@/lib/hex/simpleAI";
import { createLocalAIMatch } from "@/lib/localAiMatch";
import { listGames, getGame } from "@/lib/engine/registry";
import { getGameMeta, SHOWCASE_GAME_KEYS } from "@/lib/gameMetadata";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const QUICKPLAY_DIFFICULTY: AIDifficulty = "easy";
const EASE = [0.22, 1, 0.36, 1] as const;

export const PracticeDesk = memo(
  forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
    ({ className, ...props }, ref) => {
      const navigate = useNavigate();
      const shouldReduceMotion = useReducedMotion();
      const { user } = useAuth();
      const [loadingGame, setLoadingGame] = useState<string | null>(null);
      const games = listGames().filter((game) =>
        SHOWCASE_GAME_KEYS.includes(game.key as (typeof SHOWCASE_GAME_KEYS)[number]),
      );

      const handleStart = async (gameKey: string) => {
        const difficulty = QUICKPLAY_DIFFICULTY;
        setLoadingGame(gameKey);

        try {
          const currentUser = user;
          const gameDef = games.find((game) => game.key === gameKey);
          const size = gameDef?.defaultBoardSize ?? 11;

          if (!currentUser) {
            const { id, payload } = createLocalAIMatch({
              difficulty,
              gameKey,
              boardSize: size,
            });

            navigate(`/match/${id}`, { state: payload });
            return;
          }

          const pieRule = gameDef?.supportsPieRule ?? false;

          const { data: newMatch, error: matchError } = await supabase
            .from("matches")
            .insert({
              game_key: gameKey,
              size,
              pie_rule: pieRule,
              status: "active",
              turn: 1,
              owner: currentUser.id,
              ai_difficulty: difficulty as any,
              allow_spectators: false,
            })
            .select("id")
            .single();

          if (matchError) throw matchError;

          const { error: playerError } = await supabase.from("match_players").insert({
            match_id: newMatch.id,
            profile_id: currentUser.id,
            color: 1,
            is_bot: false,
          });

          if (playerError) throw playerError;

          navigate(`/match/${newMatch.id}`, {
            state: { optimistic: true, userId: currentUser.id },
          });
        } catch (error: any) {
          console.error("Error creating match:", error);
          const isNetwork = error instanceof TypeError && /fetch/i.test(error.message);

          toast.error(
            isNetwork
              ? "Network error - server may be offline"
              : "Failed to create match. Please try again.",
          );
        } finally {
          setLoadingGame(null);
        }
      };

      return (
        <section
          id="games"
          ref={ref}
          className={cn("bg-transparent px-4 pb-6 pt-4 md:px-6 md:pb-8 md:pt-5", className)}
          {...props}
        >
          <div className="mx-auto max-w-[1520px]">
            <div className="landing-practice-shell">
              <div className="landing-quickplay-grid">
                {games.map((game, index) => {
                  const meta = getGameMeta(game.key);
                  const Icon = meta.icon;
                  const launching = loadingGame === game.key;

                  return (
                    <motion.button
                      key={game.key}
                      type="button"
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.65 }}
                      transition={{ duration: 0.3, delay: index * 0.04, ease: EASE }}
                      whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                      whileTap={shouldReduceMotion ? undefined : { y: 0, scale: 0.995 }}
                      onClick={() => handleStart(game.key)}
                      disabled={Boolean(loadingGame)}
                      className="landing-quickplay-card"
                      style={
                        {
                          "--quickplay-accent": `hsl(var(${meta.accentVar}))`,
                        } as CSSProperties
                      }
                    >
                      <div className="landing-quickplay-card__leading">
                        <div className="landing-quickplay-card__glyph">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h2 className="board-public-display text-[clamp(1.8rem,3.2vw,2.7rem)] text-[#090909]">
                          {game.displayName}
                        </h2>
                      </div>

                      <div className="landing-quickplay-card__action">
                        {launching ? (
                          <div className="landing-quickplay-card__spinner" />
                        ) : (
                          <>
                            <span>Play</span>
                            <ArrowUpRight className="landing-quickplay-card__arrow h-4 w-4" />
                          </>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <div className="landing-quickplay-links">
                <Link
                  to="/play"
                  className="board-public-label text-[#5c5750] underline decoration-black/20 underline-offset-4 transition-colors duration-200 hover:text-[#090909]"
                >
                  More options
                </Link>
              </div>
            </div>
          </div>
        </section>
      );
    },
  ),
);

PracticeDesk.displayName = "PracticeDesk";
