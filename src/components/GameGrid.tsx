import { memo, useState, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, Target, ShieldCheck, Zap } from "lucide-react";
import type { AIDifficulty } from "@/lib/hex/simpleAI";
import { listGames, getGame } from "@/lib/engine/registry";
import { getGameMeta } from "@/lib/gameMetadata";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { createLocalAIMatch } from "@/lib/localAiMatch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SectionRail } from "@/components/board/SectionRail";
import { VenuePanel } from "@/components/board/VenuePanel";

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
          setLoadingDifficulty(null);
        }
      };

      return (
        <section id="games" ref={ref} className={cn("bg-transparent py-20", className)} {...props}>
          <div className="mx-auto max-w-[1440px]">
            <SectionRail
              eyebrow="Practice desk"
              title="Local tables, live immediately."
              description={
                <>
                  Practice is the quick-entry surface. Pick a ruleset, choose the
                  pressure level, and start a table without waiting on world setup.
                </>
              }
              actions={<div className="text-sm font-semibold text-[#4f4f4f]">Guest practice stays available</div>}
            />

            <div className="mt-10 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="board-panel board-panel-cut rounded-[1.8rem] bg-white/90">
                {games.map((game, index) => {
                  const meta = getGameMeta(game.key);
                  const Icon = meta.icon;
                  const isSelected = selectedGame === game.key;

                  return (
                    <button
                      key={game.key}
                      onClick={() => setSelectedGame(game.key)}
                      disabled={Boolean(loadingDifficulty)}
                      className={cn(
                        "group relative grid w-full gap-3 border-b border-black/10 px-5 py-5 text-left transition-all duration-200 md:grid-cols-[48px_minmax(0,1fr)_140px]",
                        "last:border-b-0 hover:bg-black/[0.025]",
                        isSelected && "bg-black text-white hover:bg-black",
                      )}
                    >
                      <div className="board-rail-label text-[10px] text-current/50">
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <Icon className={cn("h-5 w-5", isSelected ? "text-white" : "text-black/80")} />
                          <h3
                            className={cn(
                              "text-2xl font-bold tracking-[-0.05em]",
                              isSelected ? "text-white" : "text-[#0a0a0a]",
                            )}
                          >
                            {game.displayName}
                          </h3>
                        </div>
                        <p
                          className={cn(
                            "mt-2 max-w-xl text-sm leading-7",
                            isSelected ? "text-white/65" : "text-[#66645f]",
                          )}
                        >
                          {meta.tagline}
                        </p>
                      </div>
                      <div className="flex items-center justify-start gap-2 md:justify-end">
                        <span
                          className={cn(
                            "board-rail-label text-[10px]",
                            isSelected ? "text-white/50" : "text-black/45",
                          )}
                        >
                          {game.defaultBoardSize}x{game.defaultBoardSize}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <VenuePanel
                eyebrow="Selected system"
                title={selectedGame ? getGame(selectedGame).displayName : "Choose a game"}
                description={
                  selectedGame
                    ? "Pick the intensity you want. These matches launch immediately and are tuned for repetition, study, and instinct."
                    : "Each ruleset opens a local practice path first. Select a game to expose the difficulty rail."
                }
                className="min-h-[420px] bg-[#fbfaf6]"
              >
                {selectedGame ? (
                  <div className="space-y-3">
                    {DIFFICULTIES.map((difficulty) => (
                      <Button
                        key={difficulty.id}
                        variant="outline"
                        className="h-auto w-full justify-between border-black/10 bg-white px-4 py-4 text-left hover:bg-black/5"
                        onClick={() => handleStart(selectedGame, difficulty.id)}
                        disabled={loadingDifficulty === difficulty.id}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-11 w-11 items-center justify-center rounded-[0.95rem] border border-black/10 bg-[#f5f4ef]">
                            <difficulty.icon className="h-5 w-5 text-[#0a0a0a]" />
                          </div>
                          <div>
                            <p className="text-base font-semibold text-[#0a0a0a]">
                              {difficulty.label}
                            </p>
                            <p className="board-rail-label text-[10px] text-[#7a7368]">
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
                ) : null}

                <div className="mt-8 border-t border-black/10 pt-5">
                  <p className="board-rail-label">Practice note</p>
                  <p className="mt-3 max-w-md text-sm leading-7 text-[#66645f]">
                    BOARD keeps solo play frictionless on purpose. The host-owned
                    layers matter more when you move into rooms, worlds, and events.
                  </p>
                </div>
              </VenuePanel>
            </div>
          </div>
        </section>
      );
    },
  ),
);

GameGrid.displayName = "GameGrid";
