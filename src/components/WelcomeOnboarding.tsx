import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { AsciiGameCard } from "@/components/board/AsciiGameCard";
import { CounterBlock } from "@/components/board/CounterBlock";
import { SectionRail } from "@/components/board/SectionRail";
import { SiteFrame } from "@/components/board/SiteFrame";
import { StateTag } from "@/components/board/StateTag";
import { VenuePanel } from "@/components/board/VenuePanel";
import { Button } from "@/components/ui/button";
import { buildAuthRoute } from "@/lib/authRedirect";
import { listGames } from "@/lib/engine/registry";
import { getGameMeta } from "@/lib/gameMetadata";
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
  const [showBoardPicker, setShowBoardPicker] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const selectedDefinition = games.find((game) => game.key === selectedGame) ?? games[0];

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
    <SiteFrame showNav={false} contentClassName="py-10 md:py-14">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <SectionRail
          eyebrow="Instant practice"
          title="Sit down and play."
          description="Pick a board. Open a local seat. Account stays secondary until you want worlds or events."
          status={<StateTag tone="success">local ready</StateTag>}
          actions={
            <Button variant="outline" onClick={handleSignIn}>
              Use account
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          }
        />

        <div className={cn("mt-10 grid gap-6", showBoardPicker && "xl:grid-cols-[1.05fr_0.95fr]")}>
          <VenuePanel
            eyebrow="Quick seat"
            title={selectedDefinition ? `Start ${selectedDefinition.displayName} now` : "Start local practice"}
            description="One button opens a local board on starter pressure. Account stays secondary."
            titleBarEnd={<StateTag tone="success">1 click</StateTag>}
          >
            <div className="space-y-5">
              <AsciiGameCard gameKey={selectedGame} size="feature" />

              <div className="grid gap-3 sm:grid-cols-3">
                <CounterBlock label="account" value="optional" />
                <CounterBlock label="pressure" value="starter" />
                <CounterBlock
                  label="size"
                  value={
                    selectedDefinition
                      ? `${selectedDefinition.defaultBoardSize}x${selectedDefinition.defaultBoardSize}`
                      : "ready"
                  }
                />
              </div>

              <Button
                variant="hero"
                size="lg"
                className="h-auto w-full justify-between px-4 py-4 text-left"
                onClick={handleQuickStart}
                disabled={isStarting || isCreating}
              >
                <div>
                  <p className="text-base font-semibold">
                    {selectedDefinition
                      ? `Start local ${selectedDefinition.displayName}`
                      : "Start local practice"}
                  </p>
                  <p className="board-rail-label mt-1 text-[10px] text-[#d7d7dc]">
                    local / starter
                  </p>
                </div>
                {isStarting || isCreating ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ArrowUpRight className="h-5 w-5" />
                )}
              </Button>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-4">
                <div className="retro-warning-strip text-sm">
                  Account adds worlds, history, and events.
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBoardPicker((current) => !current)}
                >
                  {showBoardPicker ? "Hide boards" : "Switch board"}
                </Button>
              </div>
            </div>
          </VenuePanel>

          {showBoardPicker ? (
            <VenuePanel
              eyebrow="Systems"
              title="Choose a board"
              description="Hex sits in the fast seat. Switch here if you want a different first match."
              titleBarEnd={<StateTag tone="normal">starter</StateTag>}
            >
              <div className="board-ledger">
                {games.map((game, index) => {
                  const meta = getGameMeta(game.key);
                  const Icon = meta.icon;
                  const isSelected = selectedGame === game.key;

                  return (
                    <button
                      key={game.key}
                      onClick={() => setSelectedGame(game.key)}
                      className={`board-ledger-row w-full text-left transition-none md:grid-cols-[48px_minmax(0,1fr)_180px] ${
                        isSelected ? "bg-black text-white" : "hover:bg-black/[0.025]"
                      }`}
                    >
                      <div
                        className={`board-rail-label pt-1 text-[10px] ${
                          isSelected ? "text-white/55" : "text-black/45"
                        }`}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <div
                            className={`retro-inset flex h-11 w-11 items-center justify-center ${
                              isSelected ? "bg-[#d7d7dc]" : "bg-white"
                            }`}
                          >
                            <Icon
                              className={`h-5 w-5 ${
                                isSelected ? "text-black" : meta.accentClass
                              }`}
                            />
                          </div>
                          <div>
                            <h2
                              className={`text-2xl font-bold tracking-[-0.05em] ${
                                isSelected ? "text-white" : "text-foreground"
                              }`}
                            >
                              {game.displayName}
                            </h2>
                            <p
                              className={`mt-1 text-sm ${
                                isSelected ? "text-white/70" : "text-muted-foreground"
                              }`}
                            >
                              {meta.tagline}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div
                        className={`flex items-center justify-between border-l pl-4 ${
                          isSelected ? "border-white/25" : "border-black"
                        }`}
                      >
                        <span
                          className={`board-rail-label text-[10px] ${
                            isSelected ? "text-white/55" : "text-black/45"
                          }`}
                        >
                          {game.defaultBoardSize} seat
                        </span>
                        <ArrowUpRight
                          className={`h-4 w-4 ${
                            isSelected ? "text-white/55" : "text-black/45"
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </VenuePanel>
          ) : null}
        </div>
      </div>
    </SiteFrame>
  );
}
