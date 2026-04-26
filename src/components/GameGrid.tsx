import { memo, useState, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Trophy, Target, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { AIDifficulty } from "@/lib/hex/simpleAI";
import { createLocalAIMatch } from "@/lib/localAiMatch";
import { listGames, getGame } from "@/lib/engine/registry";
import { getAsciiGamePreview } from "@/lib/asciiGames.ts";
import { getGameMeta, SHOWCASE_GAME_KEYS } from "@/lib/gameMetadata";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DIFFICULTIES = [
  { id: "easy", label: "Starter", icon: Zap },
  { id: "medium", label: "Club", icon: Target },
  { id: "hard", label: "Serious", icon: Trophy },
  { id: "expert", label: "Relentless", icon: ShieldCheck },
] as const;

export const PracticeDesk = memo(
  forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
    ({ className, ...props }, ref) => {
      const navigate = useNavigate();
      const { user } = useAuth();
      const [selectedDifficulty, setSelectedDifficulty] = useState<AIDifficulty>("easy");
      const [showSetup, setShowSetup] = useState(false);
      const [loadingDifficulty, setLoadingDifficulty] = useState<string | null>(null);
      const games = listGames().filter((game) =>
        SHOWCASE_GAME_KEYS.includes(game.key as (typeof SHOWCASE_GAME_KEYS)[number]),
      );
      const [selectedGame, setSelectedGame] = useState<string | null>(games[0]?.key ?? null);
      const selectedDefinition = selectedGame ? getGame(selectedGame) : null;
      const selectedMeta = selectedGame ? getGameMeta(selectedGame) : null;
      const preview = selectedGame ? getAsciiGamePreview(selectedGame) : null;
      const previewFrame = preview
        ? preview.frames[Math.min(2, preview.frames.length - 1)] ?? preview.frames[0]
        : null;

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

      const launchDisabled = Boolean(loadingDifficulty) || !selectedGame;

      return (
        <section
          id="games"
          ref={ref}
          className={cn("board-public-section bg-transparent py-20", className)}
          {...props}
        >
          <div className="board-page-width board-public mx-auto px-4 md:px-6 lg:px-8">
            <div className="max-w-[52rem]">
              <h2 className="board-public-display mt-5 max-w-[11ch] text-[clamp(2.25rem,4vw,4.1rem)] text-[#0a0a0a]">
                Flagship boards.
              </h2>
            </div>

            <div className="landing-practice-shell mt-10">
              <div className="landing-practice-shell__grid">
                <div className="landing-practice-list">
                  {games.map((game, index) => {
                    const meta = getGameMeta(game.key);
                    const Icon = meta.icon;
                    const isSelected = selectedGame === game.key;

                    return (
                      <button
                        key={game.key}
                        type="button"
                        onClick={() => setSelectedGame(game.key)}
                        disabled={Boolean(loadingDifficulty)}
                        className={cn("landing-game-row", isSelected && "landing-game-row--active")}
                      >
                        <span className="board-public-label text-current/48">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <Icon
                              className={cn(
                                "h-5 w-5 shrink-0",
                                isSelected ? "text-[#f8f6ef]" : "text-[#23252b]",
                              )}
                            />
                            <h3 className="board-public-display text-[1.65rem] text-current">
                              {game.displayName}
                            </h3>
                          </div>
                          <p
                            className={cn(
                              "board-public-copy mt-2 text-sm",
                              isSelected ? "text-[#d5d0c5]" : "text-[#5d5d5d]",
                            )}
                          >
                            {meta.tagline}
                          </p>
                        </div>
                        <span className="board-public-label justify-self-start text-current/48 md:justify-self-end">
                          {game.defaultBoardSize}x{game.defaultBoardSize}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="landing-practice-preview">
                  {selectedDefinition && selectedMeta && preview ? (
                    <>
                      <div className="space-y-3">
                        <h3 className="board-public-display text-[clamp(2rem,3vw,3rem)] text-[#0a0a0a]">
                          {selectedDefinition.displayName}
                        </h3>
                        <p className="board-public-copy max-w-[28rem] text-[1rem]">
                          {selectedMeta.tagline}
                        </p>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.12fr)_220px]">
                        <div className="relative overflow-hidden border border-black/14 bg-[#111214] text-[#f5f1e8] shadow-[0_22px_60px_rgba(0,0,0,0.14)] lg:col-span-2">
                          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
                            <span className="board-public-label text-[#d8d1c2]">
                              {preview.label} / live set
                            </span>
                            <span className="board-public-label text-[#8e8a80]">
                              frame 03
                            </span>
                          </div>
                          <pre
                            aria-label={`${preview.label} board specimen.`}
                            className="m-0 overflow-x-auto px-4 py-5 font-['IBM_Plex_Mono'] text-[0.74rem] font-semibold leading-[1.18] tracking-[0.04em] text-[#f5f1e8]"
                          >
                            {previewFrame}
                          </pre>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-5">
                        <div className="landing-practice-meta">
                          <span>{selectedDifficulty}</span>
                          <span>{selectedDefinition.defaultBoardSize}x{selectedDefinition.defaultBoardSize}</span>
                          <span>arena set</span>
                        </div>
                        <button
                          type="button"
                          className="board-public-label text-[#23252b] underline decoration-black/25 underline-offset-4"
                          onClick={() => setShowSetup((current) => !current)}
                          disabled={launchDisabled}
                        >
                          {showSetup ? "Hide AI" : "Set AI"}
                        </button>
                      </div>

                      {showSetup ? (
                        <div className="landing-difficulty-list">
                          {DIFFICULTIES.map((difficulty) => (
                            <button
                              key={difficulty.id}
                              type="button"
                              className={cn(
                                "landing-difficulty-row",
                                selectedDifficulty === difficulty.id &&
                                  "landing-difficulty-row--active",
                              )}
                              onClick={() => setSelectedDifficulty(difficulty.id)}
                              disabled={launchDisabled}
                            >
                              <div className="flex items-center gap-4">
                                <div className="landing-difficulty-row__icon">
                                  <difficulty.icon className="h-5 w-5 text-[#0a0a0a]" />
                                </div>
                                <p className="board-public-display text-[1.18rem] text-[#0a0a0a]">
                                  {difficulty.label}
                                </p>
                              </div>
                            </button>
                      ))}
                        </div>
                      ) : null}

                      <Button
                        variant="hero"
                        size="lg"
                        className="landing-launch-row h-auto items-start md:items-center"
                        onClick={() => handleStart(selectedDefinition.key, selectedDifficulty)}
                        disabled={launchDisabled}
                      >
                        <div className="text-left">
                          <p className="text-[1rem] font-semibold leading-tight tracking-[-0.03em] text-[#f8f6ef] md:text-[1.15rem]">
                            Start local {selectedDefinition.displayName}
                          </p>
                          <p className="board-public-label mt-2 whitespace-normal leading-6 text-[#d5d0c5] md:whitespace-nowrap">
                            {selectedDifficulty} AI
                          </p>
                        </div>
                        {loadingDifficulty ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/25 border-t-white" />
                        ) : (
                          <ArrowUpRight className="h-5 w-5 text-[#d5d0c5]" />
                        )}
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>
      );
    },
  ),
);

PracticeDesk.displayName = "PracticeDesk";
