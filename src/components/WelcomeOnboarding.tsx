import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { BoardLogo } from "@/components/BoardLogo";
import { SiteFrame } from "@/components/board/SiteFrame";
import { Button } from "@/components/ui/button";
import { buildAuthRoute } from "@/lib/authRedirect";
import { listGames } from "@/lib/engine/registry";
import { getGameMeta, SHOWCASE_GAME_KEYS } from "@/lib/gameMetadata";
import { cn } from "@/lib/utils";

interface WelcomeOnboardingProps {
  onComplete: () => void;
  onCreateMatch: (
    difficulty: "easy" | "medium" | "hard" | "expert",
    size: number,
    gameKey?: string,
  ) => void;
  isCreating: boolean;
}

export function WelcomeOnboarding({
  onComplete,
  onCreateMatch,
  isCreating,
}: WelcomeOnboardingProps) {
  const navigate = useNavigate();
  const games = listGames();
  const [selectedGame, setSelectedGame] = useState<string>(games[0]?.key ?? "hex");
  const [showAllBoards, setShowAllBoards] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const displayedGames = useMemo(() => {
    if (showAllBoards) return games;
    return games.filter((game) =>
      SHOWCASE_GAME_KEYS.includes(game.key as (typeof SHOWCASE_GAME_KEYS)[number]),
    );
  }, [games, showAllBoards]);

  const selectedDefinition =
    games.find((game) => game.key === selectedGame) ?? displayedGames[0] ?? games[0];

  const handleQuickStart = async () => {
    if (!selectedDefinition) return;
    setIsStarting(true);
    try {
      onCreateMatch("easy", selectedDefinition.defaultBoardSize, selectedDefinition.key);
      onComplete();
    } catch (error) {
      console.error("Failed to create guest session:", error);
      setIsStarting(false);
    }
  };

  const handleSignIn = () => {
    onComplete();
    navigate(buildAuthRoute());
  };

  return (
    <SiteFrame showNav={false} contentClassName="pb-12 pt-10 md:pb-16 md:pt-14">
      <section className="system-onboarding-shell animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="system-onboarding-head">
          <BoardLogo variant="wordmark" tone="dark" wordmarkClassName="text-[2rem] md:text-[2.4rem]" />
          <div className="system-onboarding-copy">
            <h1 className="system-onboarding-title">Pick a board</h1>
            <p className="system-onboarding-subtitle">
              Start local first. Sign in later for rooms and events.
            </p>
          </div>
        </div>

        <div className="system-onboarding-list" role="listbox" aria-label="Board choices">
          {displayedGames.map((game) => {
            const meta = getGameMeta(game.key);
            const Icon = meta.icon;
            const selected = selectedGame === game.key;

            return (
              <button
                key={game.key}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => setSelectedGame(game.key)}
                className={cn(
                  "system-onboarding-choice",
                  selected && "is-selected",
                )}
              >
                <div className="system-onboarding-choice__main">
                  <div className="system-onboarding-choice__glyph">
                    <Icon className={cn("h-4 w-4", selected ? "text-[#090909]" : meta.accentClass)} />
                  </div>
                  <div className="system-onboarding-choice__copy">
                    <h2 className="system-onboarding-choice__title">{game.displayName}</h2>
                    <p className="system-onboarding-choice__meta">
                      {meta.tagline} / {game.defaultBoardSize}x{game.defaultBoardSize}
                    </p>
                  </div>
                </div>
                {selected ? <span className="system-onboarding-choice__state">Ready</span> : null}
              </button>
            );
          })}
        </div>

        <div className="system-onboarding-actions">
          <Button
            variant="hero"
            size="lg"
            className="system-onboarding-start"
            onClick={handleQuickStart}
            disabled={isStarting || isCreating || !selectedDefinition}
          >
            <span>
              {selectedDefinition ? `Start ${selectedDefinition.displayName}` : "Start local"}
            </span>
            {isStarting || isCreating ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          </Button>

          <div className="system-onboarding-links">
            <button
              type="button"
              onClick={() => setShowAllBoards((current) => !current)}
              className="system-onboarding-link"
            >
              {showAllBoards ? "Less boards" : "More boards"}
            </button>
            <button type="button" onClick={handleSignIn} className="system-onboarding-link">
              Sign in
            </button>
          </div>
        </div>
      </section>
    </SiteFrame>
  );
}
