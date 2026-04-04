import { memo, useState, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, Target, ShieldCheck, Zap } from "lucide-react";
import type { AIDifficulty } from "@/lib/hex/simpleAI";
import { listGames } from "@/lib/engine/registry";
import { getGameMeta } from "@/lib/gameMetadata";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { createLocalAIMatch } from "@/lib/localAiMatch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const DIFFICULTIES = [
  { id: "easy", label: "Starter", icon: Zap },
  { id: "medium", label: "Club", icon: Target },
  { id: "hard", label: "Serious", icon: Trophy },
  { id: "expert", label: "Relentless", icon: ShieldCheck },
] as const;

export const GameGrid = memo(
  forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
    ({ className, ...props }, ref) => {
      const navigate = useNavigate();
      const { user } = useAuth();
      const [loadingDifficulty, setLoadingDifficulty] = useState<string | null>(null);
      const [selectedGame, setSelectedGame] = useState<string | null>(null);
      const games = listGames();

      const handleStart = async (gameKey: string, difficulty: AIDifficulty) => {
        setLoadingDifficulty(difficulty);
        try {
          let currentUser = user;
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

          const { error: playerError } = await supabase
            .from("match_players")
            .insert({
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
          setLoadingDifficulty(null);
        }
      };

      return (
        <section
          id="games"
          ref={ref}
          className={cn("bg-[#f5f4ef] px-6 py-20", className)}
          {...props}
        >
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[#737373]">
                  Practice Instantly
                </p>
                <h2 className="mt-4 text-4xl font-black tracking-[-0.08em] text-[#0a0a0a] md:text-5xl">
                  Solo play should launch immediately.
                </h2>
                <p className="mt-4 text-lg font-medium leading-8 text-[#555]">
                  Practice is the fast path into BOARD. Pick a game, choose a
                  level, and start without fighting setup.
                </p>
              </div>
              <div className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[#4f4f4f]">
                Guest practice supported
              </div>
            </div>

            {selectedGame && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                <div
                  className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
                  onClick={() => setSelectedGame(null)}
                />
                <div className="relative w-full max-w-lg rounded-[2rem] border border-black/10 bg-white p-6 shadow-[0_22px_70px_rgba(0,0,0,0.12)]">
                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#737373]">
                    Difficulty
                  </p>
                  <h3 className="mt-3 text-3xl font-black tracking-[-0.06em] text-[#0a0a0a]">
                    Choose the kind of match you want.
                  </h3>
                  <div className="mt-6 grid gap-3">
                    {DIFFICULTIES.map((difficulty) => (
                      <Button
                        key={difficulty.id}
                        variant="outline"
                        className="h-16 justify-between rounded-[1.35rem] border-black/10 bg-white px-5 text-left shadow-none hover:bg-black/5"
                        onClick={() => handleStart(selectedGame, difficulty.id)}
                        disabled={loadingDifficulty === difficulty.id}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-black/10 bg-[#f3f3f1]">
                            <difficulty.icon className="h-5 w-5 text-[#0a0a0a]" />
                          </div>
                          <div>
                            <p className="text-base font-bold text-[#0a0a0a]">
                              {difficulty.label}
                            </p>
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#7a7a7a]">
                              {difficulty.id}
                            </p>
                          </div>
                        </div>
                        {loadingDifficulty === difficulty.id ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/25 border-t-black" />
                        ) : null}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    className="mt-4 h-12 w-full rounded-full text-[#5e5e5e] hover:bg-black/5 hover:text-black"
                    onClick={() => setSelectedGame(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
              {games.map((game) => {
                const meta = getGameMeta(game.key);
                const Icon = meta.icon;
                const isSelected = selectedGame === game.key;

                return (
                  <button
                    key={game.key}
                    onClick={() => setSelectedGame(game.key)}
                    disabled={Boolean(loadingDifficulty)}
                    className={cn(
                      "rounded-[1.8rem] border p-6 text-left transition-all duration-200",
                      "border-black/10 bg-white hover:-translate-y-0.5 hover:border-black/20 hover:bg-[#fafaf8]",
                      isSelected && "border-black bg-black text-white hover:bg-black",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-14 w-14 items-center justify-center rounded-[1.2rem] border",
                        isSelected
                          ? "border-white/15 bg-white/10"
                          : "border-black/10 bg-[#f3f3f1]",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-7 w-7",
                          isSelected ? "text-white" : "text-[#0a0a0a]",
                        )}
                      />
                    </div>
                    <h3
                      className={cn(
                        "mt-6 text-2xl font-black tracking-[-0.05em]",
                        isSelected ? "text-white" : "text-[#0a0a0a]",
                      )}
                    >
                      {game.displayName}
                    </h3>
                    <p
                      className={cn(
                        "mt-2 text-xs font-bold uppercase tracking-[0.22em]",
                        isSelected ? "text-white/60" : "text-[#767676]",
                      )}
                    >
                      {meta.tagline}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      );
    },
  ),
);

GameGrid.displayName = "GameGrid";
